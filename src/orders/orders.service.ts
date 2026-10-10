import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import { getAppTimeZone, startOfDayInTimeZone } from '../common/utils/timezone.util.js';
import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import type { UserRole } from '../common/types/user-role.type.js';
import { OPEN_ORDER_STATUSES } from '../guest/guest.constants.js';
import { ORDER_LIST_DEFAULT_LIMIT, ORDER_TRANSITIONS, type OrderStatusValue } from './orders.constants.js';
import { ORDERS_ERRORS } from './orders.messages.js';
import { toOrderResponseDto, type OrderItemRecord, type OrderRecord } from './order.mapper.js';
import type { ListOrdersQueryDto } from './dto/query/list-orders-query.dto.js';
import type { OrderResponseDto } from './dto/response/order-response.dto.js';

function createdAtMs(order: OrderRecord): number {
    return new Date(toIsoTimestamp(order.createdAt)).getTime();
}

function byCreatedAtThenId(a: OrderRecord, b: OrderRecord): number {
    return createdAtMs(a) - createdAtMs(b) || a.id - b.id;
}

@Injectable()
export class OrdersService {
    constructor(
        private readonly db: DatabaseService,
        private readonly config: ConfigService,
    ) { }

    private get orm() {
        return this.db.client.orm.public;
    }

    async list(query: ListOrdersQueryDto): Promise<OrderResponseDto[]> {
        const rows = query.updatedSince
            ? await this.fetchUpdatedSince(query.updatedSince, query.status)
            : await this.fetchCurrent(query.status);
        const page = rows.sort(byCreatedAtThenId).slice(0, query.limit ?? ORDER_LIST_DEFAULT_LIMIT);
        return this.toResponses(page);
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
        return this.findOne(id);
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

    // Today's orders (business day in APP_TIMEZONE) plus older orders that are still open
    private async fetchCurrent(status?: OrderStatusValue): Promise<OrderRecord[]> {
        const dayStart = startOfDayInTimeZone(new Date(), getAppTimeZone(this.config)).toISOString();
        const today = this.orm.Order.where((o) => o.createdAt.gte(dayStart));
        const todayRows = status ? await today.where({ status }).all() : await today.all();
        const olderOpen = await this.fetchOlderOpen(dayStart, status);
        return [...todayRows, ...olderOpen];
    }

    private async fetchOlderOpen(dayStart: string, status?: OrderStatusValue): Promise<OrderRecord[]> {
        const statuses = status ? OPEN_ORDER_STATUSES.filter((s) => s === status) : OPEN_ORDER_STATUSES;
        const rows: OrderRecord[] = [];
        for (const open of statuses) {
            const older = await this.orm.Order.where({ status: open }).where((o) => o.createdAt.lt(dayStart)).all();
            rows.push(...older);
        }
        return rows;
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
