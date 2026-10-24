import { BadRequestException, ConflictException, ForbiddenException,Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import { getAppTimeZone, startOfDayInTimeZone } from '../common/utils/timezone.util.js';
import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import type { UserRole } from '../common/types/user-role.type.js';
import { OPEN_ORDER_STATUSES } from '../guest/guest.constants.js';
import { RealtimeBus } from '../realtime/realtime.bus.js';
import { ORDER_LIST_DEFAULT_LIMIT, ORDER_TRANSITIONS, type OrderStatusValue } from './orders.constants.js';
import { ORDERS_ERRORS } from './orders.messages.js';
import { OrderPlacementService } from './order-placement.service.js';
import { toOrderResponseDto, type OrderItemRecord, type OrderRecord } from './order.mapper.js';
import type { CreateOrderDto } from './dto/body/create-order.dto.js';
import type { CreateTakeawayOrderDto } from './dto/body/create-takeaway-order.dto.js';
import type { ListOrdersQueryDto } from './dto/query/list-orders-query.dto.js';
import type { OrderResponseDto } from './dto/response/order-response.dto.js';

const CLOSED_ORDER_STATUSES = ['READY', 'CANCELLED'] as const;

function createdAtMs(order: OrderRecord): number {
    return new Date(toIsoTimestamp(order.createdAt)).getTime();
}

function byCreatedAtThenId(a: OrderRecord, b: OrderRecord): number {
    return createdAtMs(a) - createdAtMs(b) || a.id - b.id;
}

function byNewestFirst(a: OrderRecord, b: OrderRecord): number {
    return byCreatedAtThenId(b, a);
}

function tableNotFound(): BadRequestException {
    return new BadRequestException({
        code: ORDERS_ERRORS.TABLE_NOT_FOUND.code,
        message: ORDERS_ERRORS.TABLE_NOT_FOUND.message,
        details: [{ field: 'tableId', message: 'Table not found' }],
    });
}

@Injectable()
export class OrdersService {
    constructor(
        private readonly db: DatabaseService,
        private readonly config: ConfigService,
        private readonly realtime: RealtimeBus,
        private readonly placement: OrderPlacementService,
    ) { }

    private get orm() {
        return this.db.client.orm.public;
    }

    async create(dto: CreateOrderDto, userId: number): Promise<OrderResponseDto> {
        await this.requireTable(dto.tableId);
        this.placement.assertNoDuplicateLines(dto.items);
        const lines = await this.placement.buildLines(dto.items);
        const totalCents = this.placement.sumCents(lines);

        const order = await this.placement.place({
            tableId: dto.tableId,
            lockFailure: tableNotFound,
            lines,
            totalCents,
            source: 'WAITER',
            userId,
            customerName: dto.customerName ?? null,
            orderAccessTokenHash: null,
        });
        await this.placement.publishPlaced(order, dto.tableId);
        return this.findOne(order.id);
    }

    async createTakeaway(dto: CreateTakeawayOrderDto, userId: number): Promise<OrderResponseDto> {
        this.placement.assertNoDuplicateLines(dto.items);
        const lines = await this.placement.buildLines(dto.items);
        const totalCents = this.placement.sumCents(lines);

        const order = await this.placement.placeTakeaway({
            lines,
            totalCents,
            userId,
            customerName: dto.customerName,
        });
        this.placement.publishCreated(order);
        return this.findOne(order.id);
    }

    // updatedSince: every changed order, no limit (catch-up must not lose rows).
    // Default: every open order plus the newest closed orders of today (limit applies to closed only).
    async list(query: ListOrdersQueryDto): Promise<OrderResponseDto[]> {
        const rows = query.updatedSince
            ? await this.fetchUpdatedSince(query.updatedSince, query.status)
            : await this.fetchCurrent(query.status, query.limit ?? ORDER_LIST_DEFAULT_LIMIT);
        return this.toResponses(rows.sort(byCreatedAtThenId));
    }

    async findOne(id: number): Promise<OrderResponseDto> {
        const order = await this.orm.Order.where({ id }).first();
        if (!order) {
            throw new NotFoundException(ORDERS_ERRORS.NOT_FOUND);
        }
        const [response] = await this.toResponses([order]);
        return response!;
    }

    async changeStatus(id: number, target: OrderStatusValue, role: UserRole): Promise<OrderResponseDto> {
        const order = await this.orm.Order.where({ id }).first();
        if (!order) {
            throw new NotFoundException(ORDERS_ERRORS.NOT_FOUND);
        }
        this.assertTransition(order.status, target, role);
        await this.compareAndSetStatus(id, order.status, target);
        const response = await this.findOne(id);
        this.publishUpdated(response);
        return response;
    }

    private async requireTable(tableId: number): Promise<void> {
        const table = await this.orm.DiningTable.where({ id: tableId}).first();
        if (!table) {
            throw tableNotFound();
        }
    }

    // Runs after the status change is committed; publish() never throws
    private publishUpdated(order: OrderResponseDto): void {
        this.realtime.publish('order.updated', { id: order.id, status: order.status, updatedAt: order.updatedAt });
    }

    private assertTransition(from: string, to: string, role: UserRole): void {
        const allowedRoles = ORDER_TRANSITIONS[from]?.[to];
        if (!allowedRoles) {
            throw new ConflictException(ORDERS_ERRORS.TRANSITION_NOT_ALLOWED);
        }
        if (!allowedRoles.includes(role)) {
            throw new ForbiddenException(ORDERS_ERRORS.TRANSITION_FORBIDDEN);
        }
    }

    // One UPDATE guarded by the previous status: the loser of a race updates 0 rows
    private async compareAndSetStatus(id: number, from: string, to: OrderStatusValue): Promise<void> {
        const updated = await this.orm.Order.where({ id, status: from as OrderStatusValue }).updateAndCount({ status: to });
        if (updated !== 1) {
            throw new ConflictException(ORDERS_ERRORS.STATUS_CHANGED);
        }
    }

    private async fetchUpdatedSince(updatedSince: string, status?: OrderStatusValue): Promise<OrderRecord[]> {
        const since = new Date(updatedSince).toISOString();
        const base = this.orm.Order.where((o) => o.updatedAt.gt(since));
        return status ? base.where({ status }).all() : base.all();
    }

    // Every open order (any date) plus the newest `limit` closed orders of the current business day
    private async fetchCurrent(status: OrderStatusValue | undefined, limit: number): Promise<OrderRecord[]> {
        const dayStart = startOfDayInTimeZone(new Date(), getAppTimeZone(this.config)).toISOString();
        const open = await this.fetchOpen(status);
        const closed = await this.fetchNewestClosedToday(dayStart, status, limit);
        return [...open, ...closed];
    }

    private async fetchOpen(status?: OrderStatusValue): Promise<OrderRecord[]> {
        const statuses = status ? OPEN_ORDER_STATUSES.filter((s) => s === status) : OPEN_ORDER_STATUSES;
        const rows: OrderRecord[] = [];
        for (const open of statuses) {
            rows.push(...(await this.orm.Order.where({ status: open }).all()));
        }
        return rows;
    }

    private async fetchNewestClosedToday(dayStart: string, status: OrderStatusValue | undefined, limit: number): Promise<OrderRecord[]> {
        const statuses = status ? CLOSED_ORDER_STATUSES.filter((s) => s === status) : CLOSED_ORDER_STATUSES;
        const rows: OrderRecord[] = [];
        for (const closed of statuses) {
            rows.push(...(await this.orm.Order.where({ status: closed }).where((o) => o.createdAt.gte(dayStart)).all()));
        }
        return rows.sort(byNewestFirst).slice(0, limit);
    }

    private async toResponses(orders: OrderRecord[]): Promise<OrderResponseDto[]> {
        const [itemsByOrder, tableNumbers] = await Promise.all([
            this.loadItemsByOrder(orders.map((order) => order.id)),
            this.loadTableNumbers(),
        ]);
        return orders.map((order) =>
            toOrderResponseDto(order, itemsByOrder.get(order.id) ?? [], order.tableId === null ? null : (tableNumbers.get(order.tableId) ?? null)),
        );
    }

    private async loadItemsByOrder(orderIds: number[]): Promise<Map<number, OrderItemRecord[]>> {
        const grouped = new Map<number, OrderItemRecord[]>();
        if (orderIds.length === 0) {
            return grouped;
        }
        const items = await this.orm.OrderItem.where((i) => i.orderId.in(orderIds)).all();
        for (const item of items.sort((a, b) => a.id - b.id)) {
            const list = grouped.get(item.orderId) ?? [];
            list.push(item);
            grouped.set(item.orderId, list);
        }
        return grouped;
    }

    private async loadTableNumbers(): Promise<Map<number, number>> {
        const tables = await this.orm.DiningTable.all();
        return new Map(tables.map((table) => [table.id, table.number]));
    }
}
