import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { isForeignKeyViolation, isUniqueViolation } from '../common/utils/db-error.util.js';
import { generateRandomToken } from '../common/utils/random-token.util.js';
import { OPEN_ORDER_STATUSES } from '../guest/guest.constants.js';
import { DINING_TABLES_ERRORS } from './dining-tables.messages.js';
import { toDiningTableResponseDto, toDiningTableQrTokenResponseDto } from './dining-table.mapper.js';
import type { DiningTableStatusValue } from './dining-tables.constants.js';
import type { DiningTableResponseDto } from './dto/response/dining-table-response.dto.js';
import type { DiningTableQrTokenResponseDto } from './dto/response/dining-table-qr-token-response.dto.js';
import type { CreateDiningTableDto } from './dto/body/create-dining-table.dto.js';
import type { UpdateDiningTableDto } from './dto/body/update-dining-table.dto.js';

// From pg_indexes and the dry run; re-verify if the definitions change
const TABLE_NUMBER_UNIQUE = 'diningTable_number_key';
const TABLE_ORDERS_FK = 'order_tableId_fkey';

type Tx = Parameters<Parameters<DatabaseService['client']['transaction']>[0]>[0];

@Injectable()
export class DiningTablesService {
    constructor(private readonly db: DatabaseService) { }

    private get diningTables() {
        return this.db.client.orm.public.DiningTable;
    }

    private rethrowNumberTaken(err: unknown): void {
        if (isUniqueViolation(err, TABLE_NUMBER_UNIQUE)) {
            throw new ConflictException(DINING_TABLES_ERRORS.NUMBER_TAKEN);
        }
    }

    async fetchAll(): Promise<DiningTableResponseDto[]> {
        const rows = await this.diningTables.all();
        return rows
            .map(toDiningTableResponseDto)
            .sort((a, b) => a.number - b.number);
    }

    async findOne(id: number): Promise<DiningTableResponseDto> {
        const row = await this.diningTables.where({ id }).first();
        if (!row) {
            throw new NotFoundException(DINING_TABLES_ERRORS.NOT_FOUND);
        }
        return toDiningTableResponseDto(row);
    }

    async create(dto: CreateDiningTableDto): Promise<DiningTableResponseDto> {
        try {
            const row = await this.diningTables.create({
                number: dto.number,
                qrToken: generateRandomToken(),
            });
            return toDiningTableResponseDto(row);
        } catch (err: unknown) {
            this.rethrowNumberTaken(err);
            throw err;
        }
    }

    async update(id: number, dto: UpdateDiningTableDto): Promise<DiningTableResponseDto> {
        if (dto.number === undefined) {
            throw new BadRequestException({
                code: COMMON_ERRORS.VALIDATION_FAILED.code,
                message: COMMON_ERRORS.VALIDATION_FAILED.message,
                details: [{ field: 'body', message: 'At least one field must be provided' }],
            });
        }
        const data = { number: dto.number };
        try {
            const row = await this.diningTables.where({ id }).update(data);
            if (!row) {
                throw new NotFoundException(DINING_TABLES_ERRORS.NOT_FOUND);
            }
            return toDiningTableResponseDto(row);
        } catch (err: unknown) {
            this.rethrowNumberTaken(err);
            throw err;
        }
    }

    async remove(id: number): Promise<void> {
        try {
            const deleted = await this.diningTables.where({ id }).deleteAndCount();
            if (deleted !== 1) {
                throw new NotFoundException(DINING_TABLES_ERRORS.NOT_FOUND);
            }
        } catch (err: unknown) {
            if (isForeignKeyViolation(err, TABLE_ORDERS_FK)) {
                throw new ConflictException(DINING_TABLES_ERRORS.HAS_ORDERS);
            }
            throw err;
        }
    }

    async getQrToken(id: number): Promise<DiningTableQrTokenResponseDto> {
        const row = await this.diningTables.where({ id }).first();
        if (!row) {
            throw new NotFoundException(DINING_TABLES_ERRORS.NOT_FOUND);
        }
        return toDiningTableQrTokenResponseDto(row);
    }

    async rotateQrToken(id: number): Promise<DiningTableQrTokenResponseDto> {
        const row = await this.diningTables.where({ id }).update({
            qrToken: generateRandomToken(),
            qrTokenRotatedAt: new Date().toISOString(),
        });
        if (!row) {
            throw new NotFoundException(DINING_TABLES_ERRORS.NOT_FOUND);
        }
        return toDiningTableQrTokenResponseDto(row);
    }

    async setStatus(id: number, status: DiningTableStatusValue): Promise<DiningTableResponseDto> {
        if (status === 'BUSY') {
            await this.markBusy(id);
        } else {
            await this.markAvailable(id);
        }
        return this.findOne(id);
    }

    // Setting the value it already has still matches the row (idempotent)
    private async markBusy(id: number): Promise<void> {
        const updated = await this.diningTables.where({ id }).updateAndCount({ status: 'BUSY' });
        if (updated !== 1) {
            throw new NotFoundException(DINING_TABLES_ERRORS.NOT_FOUND);
        }
    }

    // The UPDATE takes the row lock, so a concurrent guest order queues behind it.
    // Throwing inside the transaction rolls the UPDATE back.
    private async markAvailable(id: number): Promise<void> {
        await this.db.client.transaction(async (tx) => {
            const updated = await tx.orm.public.DiningTable.where({ id }).updateAndCount({ status: 'AVAILABLE' });
            if (updated !== 1) {
                throw new NotFoundException(DINING_TABLES_ERRORS.NOT_FOUND);
            }
            await this.assertNoOpenOrders(tx, id);
        });
    }

    private async assertNoOpenOrders(tx: Tx, tableId: number): Promise<void> {
        for (const status of OPEN_ORDER_STATUSES) {
            const open = await tx.orm.public.Order.where({ tableId, status }).first();
            if (open) {
                throw new ConflictException(DINING_TABLES_ERRORS.HAS_OPEN_ORDERS);
            }
        }
    }
}
