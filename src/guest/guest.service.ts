import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { generateRandomToken } from '../common/utils/random-token.util.js';
import { sha256Hex } from '../common/utils/hashing.util.js';
import { centsToMoneyString, moneyToCents, toMoney } from '../common/utils/numeric.util.js';
import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import { RealtimeBus } from '../realtime/realtime.bus.js';
import { GUEST_ERRORS } from './guest.messages.js';
import { MAX_HEADER_TOKEN_LENGTH, MAX_OPEN_ORDERS_PER_TABLE, OPEN_ORDER_STATUSES } from './guest.constants.js';
import { toGuestMenu, toGuestOrderStatus } from './guest.mapper.js';
import type { CreateGuestOrderDto } from './dto/body/create-guest-order.dto.js';
import type { GuestMenuCategoryResponseDto } from './dto/response/guest-menu-response.dto.js';
import type { GuestOrderCreatedResponseDto, GuestOrderStatusResponseDto } from './dto/response/guest-order-response.dto.js';

type Tx = Parameters<Parameters<DatabaseService['client']['transaction']>[0]>[0];

interface TableRef {
    id: number;
    number: number;
    qrToken: string;
}

interface OrderLine {
    menuItemId: number;
    itemName: string;
    price: string;
    quantity: number;
}

interface PlacedOrder {
    id: number;
    status: string;
    updatedAt: string;
}

function validationFailed(message: string): BadRequestException {
    return new BadRequestException({
        code: COMMON_ERRORS.VALIDATION_FAILED.code,
        message: COMMON_ERRORS.VALIDATION_FAILED.message,
        details: [{ field: 'items', message }],
    });
}

function itemsError(error: { code: string; message: string }, detail: string): BadRequestException {
    return new BadRequestException({
        code: error.code,
        message: error.message,
        details: [{ field: 'items', message: detail }],
    });
}

@Injectable()
export class GuestService {
    private readonly logger = new Logger(GuestService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly realtime: RealtimeBus,
    ) { }

    private get orm() {
        return this.db.client.orm.public;
    }

    private async requireTable(token: string | undefined) {
        if (!token || token.length > MAX_HEADER_TOKEN_LENGTH) {
            throw new UnauthorizedException(GUEST_ERRORS.TABLE_TOKEN_INVALID);
        }
        const table = await this.orm.DiningTable.where({ qrToken: token }).first();
        if (!table) {
            throw new UnauthorizedException(GUEST_ERRORS.TABLE_TOKEN_INVALID);
        }
        return table;
    }

    async getMenu(tableToken: string | undefined): Promise<GuestMenuCategoryResponseDto[]> {
        await this.requireTable(tableToken);
        const [categories, items] = await Promise.all([
            this.orm.Category.all(),
            this.orm.MenuItem.where({ isAvailable: true }).all(),
        ]);
        return toGuestMenu(categories, items);
    }

    async createOrder(tableToken: string | undefined, dto: CreateGuestOrderDto): Promise<GuestOrderCreatedResponseDto> {
        const table = await this.requireTable(tableToken);
        this.assertNoDuplicateLines(dto);
        const lines = await this.buildLines(dto);
        const totalCents = this.sumCents(lines);
        const orderToken = generateRandomToken();

        const order = await this.persistOrder(table, lines, totalCents, orderToken);
        await this.publishPlaced(order, table.id);

        return {
            id: order.id,
            status: order.status,
            totalPrice: centsToMoneyString(totalCents),
            orderAccessToken: orderToken,
        };
    }

    private assertNoDuplicateLines(dto: CreateGuestOrderDto): void {
        const ids = dto.items.map((line) => line.menuItemId);
        const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
        if (duplicates.length > 0) {
            throw validationFailed(`Duplicate menuItemId: ${duplicates.join(', ')}`);
        }
    }

    private async buildLines(dto: CreateGuestOrderDto): Promise<OrderLine[]> {
        const menuRows = await this.orm.MenuItem.all();
        const menuById = new Map(menuRows.map((row) => [row.id, row]));
        const ids = dto.items.map((line) => line.menuItemId);

        const missing = ids.filter((id) => !menuById.has(id));
        if (missing.length > 0) {
            throw itemsError(GUEST_ERRORS.MENU_ITEM_NOT_FOUND, `Menu items not found: ${missing.join(', ')}`);
        }
        const unavailable = ids.filter((id) => !menuById.get(id)?.isAvailable);
        if (unavailable.length > 0) {
            throw itemsError(GUEST_ERRORS.ITEM_UNAVAILABLE, `Menu items unavailable: ${unavailable.join(', ')}`);
        }

        return dto.items.map((line) => {
            const item = menuById.get(line.menuItemId)!;
            return { menuItemId: item.id, itemName: item.name, price: item.price, quantity: line.quantity };
        });
    }

    private sumCents(lines: OrderLine[]): number {
        return lines.reduce((sum, line) => sum + moneyToCents(line.price) * line.quantity, 0);
    }

    private async persistOrder(table: TableRef, lines: OrderLine[], totalCents: number, orderToken: string): Promise<PlacedOrder> {
        let created: PlacedOrder | undefined;

        await this.db.client.transaction(async (tx) => {
            await this.lockTable(tx, table);
            await this.assertCapacity(tx, table.id);
            await this.markTableBusy(tx, table.id);
            created = await this.insertOrder(tx, table.id, lines, totalCents, orderToken);
        });

        if (!created) {
            throw new Error('Order transaction finished without a result');
        }
        return created;
    }

    // Runs after the commit. A failure here must never fail the order the guest already placed.
    private async publishPlaced(order: PlacedOrder, tableId: number): Promise<void> {
        try {
            this.realtime.publish('order.created', { id: order.id, status: order.status, updatedAt: order.updatedAt });
            const table = await this.orm.DiningTable.where({ id: tableId }).first();
            if (table) {
                this.realtime.publish('table.updated', { id: table.id, status: table.status, updatedAt: toIsoTimestamp(table.updatedAt) });
            }
        } catch (err: unknown) {
            this.logger.warn(`Realtime publish after order ${order.id} failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
    }

    // No-op UPDATE takes the row lock: concurrent orders for one table queue here.
    // qrToken in the filter also catches a rotation that happened after requireTable.
    private async lockTable(tx: Tx, table: TableRef): Promise<void> {
        const locked = await tx.orm.public.DiningTable
            .where({ id: table.id, qrToken: table.qrToken })
            .updateAndCount({ number: table.number });
        if (locked !== 1) {
            throw new UnauthorizedException(GUEST_ERRORS.TABLE_TOKEN_INVALID);
        }
    }

    private async assertCapacity(tx: Tx, tableId: number): Promise<void> {
        let open = 0;
        for (const status of OPEN_ORDER_STATUSES) {
            const rows = await tx.orm.public.Order.where({ tableId, status }).all();
            open += rows.length;
        }
        if (open >= MAX_OPEN_ORDERS_PER_TABLE) {
            throw new ConflictException(GUEST_ERRORS.TABLE_LIMIT_REACHED);
        }
    }

    // The table row is already locked by lockTable, so this cannot race with a "free table" call
    private async markTableBusy(tx: Tx, tableId: number): Promise<void> {
        await tx.orm.public.DiningTable.where({ id: tableId }).updateAndCount({ status: 'BUSY' });
    }

    private async insertOrder(tx: Tx, tableId: number, lines: OrderLine[], totalCents: number, orderToken: string): Promise<PlacedOrder> {
        const order = await tx.orm.public.Order.create({
            source: 'QR_TABLE',
            type: 'DINE_IN',
            totalPrice: toMoney(centsToMoneyString(totalCents)),
            orderAccessTokenHash: sha256Hex(orderToken),
            tableId,
        });
        for (const line of lines) {
            await tx.orm.public.OrderItem.create({
                itemName: line.itemName,
                quantity: line.quantity,
                priceAtOrderTime: toMoney(line.price),
                orderId: order.id,
                menuItemId: line.menuItemId,
            });
        }
        return { id: order.id, status: order.status, updatedAt: toIsoTimestamp(order.updatedAt) };
    }

    async getOrderStatus(
        tableToken: string | undefined,
        orderToken: string | undefined,
        orderId: number,
    ): Promise<GuestOrderStatusResponseDto> {
        const table = await this.requireTable(tableToken);
        if (!orderToken || orderToken.length > MAX_HEADER_TOKEN_LENGTH) {
            throw new UnauthorizedException(GUEST_ERRORS.ORDER_TOKEN_INVALID);
        }
        // One query covers unknown id, wrong token and another table's order: identical 404
        const order = await this.orm.Order
            .where({ id: orderId, tableId: table.id, orderAccessTokenHash: sha256Hex(orderToken) })
            .first();
        if (!order) {
            throw new NotFoundException(GUEST_ERRORS.ORDER_NOT_FOUND);
        }
        return toGuestOrderStatus(order);
    }
}
