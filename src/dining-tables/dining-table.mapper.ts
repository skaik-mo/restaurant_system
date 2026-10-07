import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import type { DiningTableResponseDto } from './dto/response/dining-table-response.dto.js';
import type { DiningTableQrTokenResponseDto } from './dto/response/dining-table-qr-token-response.dto.js';

export interface DiningTableRecord {
    id: number;
    number: number;
    status: string;
    qrToken: string;
    qrTokenRotatedAt: string;
    createdAt: string;
    updatedAt: string;
}

// Allowlist: qrToken is never part of the general table response
export function toDiningTableResponseDto(table: DiningTableRecord): DiningTableResponseDto {
    return {
        id: table.id,
        number: table.number,
        status: table.status,
        createdAt: toIsoTimestamp(table.createdAt),
        updatedAt: toIsoTimestamp(table.updatedAt),
    };
}

export function toDiningTableQrTokenResponseDto(table: DiningTableRecord): DiningTableQrTokenResponseDto {
    return {
        qrToken: table.qrToken,
        qrTokenRotatedAt: toIsoTimestamp(table.qrTokenRotatedAt),
    };
}