import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { generateRandomToken } from '../common/utils/random-token.util.js';
import { sha256Hex } from '../common/utils/hashing.util.js';
import { centsToMoneyString } from '../common/utils/numeric.util.js';
import { OrderPlacementService } from '../orders/order-placement.service.js';
import { GUEST_ERRORS } from './guest.messages.js';
import { MAX_HEADER_TOKEN_LENGTH } from './guest.constants.js';
import { toGuestMenu, toGuestOrderStatus } from './guest.mapper.js';
import type { CreateGuestOrderDto } from './dto/body/create-guest-order.dto.js';
import type { GuestMenuCategoryResponseDto } from './dto/response/guest-menu-response.dto.js';
import type { GuestOrderCreatedResponseDto, GuestOrderStatusResponseDto } from './dto/response/guest-order-response.dto.js';

@Injectable()
export class GuestService {
    constructor(
        private readonly db: DatabaseService,
        private readonly placement: OrderPlacementService,
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
        this.placement.assertNoDuplicateLines(dto.items);
        const lines = await this.placement.buildLines(dto.items);
        const totalCents = this.placement.sumCents(lines);
        const orderToken = generateRandomToken();

        const order = await this.placement.place({
            tableId: table.id,
            qrToken: table.qrToken,
            lockFailure: () => new UnauthorizedException(GUEST_ERRORS.TABLE_TOKEN_INVALID),
            lines,
            totalCents,
            source: 'QR_TABLE',
            userId: null,
            customerName: null,
            orderAccessTokenHash: sha256Hex(orderToken),
        });
        await this.placement.publishPlaced(order, table.id);

        return {
            id: order.id,
            status: order.status,
            totalPrice: centsToMoneyString(totalCents),
            orderAccessToken: orderToken,
        };
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
