import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { centsToMoneyString, moneyToCents, toMoney } from '../common/utils/numeric.util.js';
import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import { RealtimeBus } from '../realtime/realtime.bus.js';
import { GUEST_ERRORS } from '../guest/guest.messages.js';
import { MAX_OPEN_ORDERS_PER_TABLE, OPEN_ORDER_STATUSES } from '../guest/guest.constants.js';

type Tx = Parameters<Parameters<DatabaseService['client']['transaction']>[0]>[0];

export interface LineInput {
    menuItemId: number;
    quantity: number;
}

export interface OrderLine {
    menuItemId: number;
    itemName: string;
    price: string;
    quantity: number;
}

export interface PlacedOrder {
    id: number;
    status: string;
    updatedAt: string;
}

export interface PlaceOrderInput {
    tableId: number;
    // Guests pass the token they authenticated with, so a rotation after the lookup is caught
    qrToken?: string;
    // Thrown when the table row no longer matches (deleted or token rotated)
    lockFailure: () => Error;
    lines: OrderLine[];
    totalCents: number;
    source: 'QR_TABLE' | 'WAITER';
    userId: number | null;
    customerName: string | null;
    orderAccessTokenHash: string | null;
}

export interface PlaceTakeawayInput {
    lines: OrderLine[];
    totalCents: number;
    userId: number;
    customerName: string;
}

interface InsertOrderInput {
    type: 'DINE_IN' | 'TAKEAWAY';
    source: 'QR_TABLE' | 'WAITER';
    tableId: number | null;
    lines: OrderLine[];
    totalCents: number;
    userId: number | null;
    customerName: string | null;
    orderAccessTokenHash: string | null;
}

function itemsError(error: { code: string; message: string }, detail: string): BadRequestException {
    return new BadRequestException({
        code: error.code,
        message: error.message,
        details: [{ field: 'items', message: detail }],
    });
}

@Injectable()
export class OrderPlacementService {
    private readonly logger = new Logger(OrderPlacementService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly realtime: RealtimeBus,
    ) { }

    private get orm() {
        return this.db.client.orm.public;
    }

    assertNoDuplicateLines(items: LineInput[]): void {
        const ids = items.map((line) => line.menuItemId);
        const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
        if (duplicates.length > 0) {
            throw new BadRequestException({
                code: COMMON_ERRORS.VALIDATION_FAILED.code,
                message: COMMON_ERRORS.VALIDATION_FAILED.message,
                details: [{ field: 'items', message: `Duplicate menuItemId: ${duplicates.join(', ')}` }],
            });
        }
    }

    async buildLines(items: LineInput[]): Promise<OrderLine[]> {
        const menuRows = await this.orm.MenuItem.all();
        const menuById = new Map(menuRows.map((row) => [row.id, row]));
        const ids = items.map((line) => line.menuItemId);

        const missing = ids.filter((id) => !menuById.has(id));
        if (missing.length > 0) {
            throw itemsError(GUEST_ERRORS.MENU_ITEM_NOT_FOUND, `Menu items not found: ${missing.join(', ')}`);
        }
        const unavailable = ids.filter((id) => !menuById.get(id)?.isAvailable);
        if (unavailable.length > 0) {
            throw itemsError(GUEST_ERRORS.ITEM_UNAVAILABLE, `Menu items unavailable: ${unavailable.join(', ')}`);
        }

        return items.map((line) => {
            const item = menuById.get(line.menuItemId)!;
            return { menuItemId: item.id, itemName: item.name, price: item.price, quantity: line.quantity };
        });
    }

    sumCents(lines: OrderLine[]): number {
        return lines.reduce((sum, line) => sum + moneyToCents(line.price) * line.quantity, 0);
    }

    async place(input: PlaceOrderInput): Promise<PlacedOrder> {
        let created: PlacedOrder | undefined;

        await this.db.client.transaction(async (tx) => {
            await this.lockTable(tx, input);
            await this.assertCapacity(tx, input.tableId);
            created = await this.insertOrder(tx, { ...input, type: 'DINE_IN' });
        });

        return this.requireCreated(created);
    }

    // Takeaway has no table: no row lock and no open-order cap. The transaction keeps order and lines atomic.
    async placeTakeaway(input: PlaceTakeawayInput): Promise<PlacedOrder> {
        let created: PlacedOrder | undefined;

        await this.db.client.transaction(async (tx) => {
            created = await this.insertOrder(tx, {
                type: 'TAKEAWAY',
                source: 'WAITER',
                tableId: null,
                lines: input.lines,
                totalCents: input.totalCents,
                userId: input.userId,
                customerName: input.customerName,
                orderAccessTokenHash: null,
            });
        });

        return this.requireCreated(created);
    }

    // Runs after the commit. publish() never throws.
    publishCreated(order: PlacedOrder): void {
        this.realtime.publish('order.created', { id: order.id, status: order.status, updatedAt: order.updatedAt });
    }

    publishUpdated(order: PlacedOrder): void {
        this.realtime.publish('order.updated', { id: order.id, status: order.status, updatedAt: order.updatedAt });
    }

    // Runs after the commit. A failure here must never fail the order that was already placed.
    async publishPlaced(order: PlacedOrder, tableId: number): Promise<void> {
        try {
            this.publishCreated(order);
            const table = await this.orm.DiningTable.where({ id: tableId }).first();
            if (table) {
                this.realtime.publish('table.updated', { id: table.id, status: table.status, updatedAt: toIsoTimestamp(table.updatedAt) });
            }
        } catch (err: unknown) {
            this.logger.warn(`Realtime publish after order ${order.id} failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
    }

    private requireCreated(created: PlacedOrder | undefined): PlacedOrder {
        if (!created) {
            throw new Error('Order transaction finished without a result');
        }
        return created;
    }

    // The UPDATE takes the row lock: concurrent orders for one table queue here.
    // Setting BUSY is what placing an order does anyway; a failed capacity check rolls it back.
    private async lockTable(tx: Tx, input: PlaceOrderInput): Promise<void> {
        const filter = { id: input.tableId, ...(input.qrToken === undefined ? {} : { qrToken: input.qrToken }) };
        const locked = await tx.orm.public.DiningTable.where(filter).updateAndCount({ status: 'BUSY' });
        if (locked !== 1) {
            throw input.lockFailure();
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

    private async insertOrder(tx: Tx, input: InsertOrderInput): Promise<PlacedOrder> {
        const order = await tx.orm.public.Order.create({
            source: input.source,
            type: input.type,
            totalPrice: toMoney(centsToMoneyString(input.totalCents)),
            ...(input.tableId === null ? {} : { tableId: input.tableId }),
            ...(input.userId === null ? {} : { userId: input.userId }),
            ...(input.customerName === null ? {} : { customerName: input.customerName }),
            ...(input.orderAccessTokenHash === null ? {} : { orderAccessTokenHash: input.orderAccessTokenHash }),
        });
        for (const line of input.lines) {
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
}
