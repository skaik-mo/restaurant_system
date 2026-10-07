import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class DiningTableResponseDto {
    @ApiProperty({ example: EXAMPLES.tableId })
    id!: number;

    @ApiProperty({ example: EXAMPLES.tableNumber })
    number!: number;

    @ApiProperty({ example: EXAMPLES.tableStatus, enum: ['AVAILABLE', 'BUSY'] })
    status!: string;

    @ApiProperty({ example: EXAMPLES.timestamp })
    createdAt!: string;

    @ApiProperty({ example: EXAMPLES.timestamp })
    updatedAt!: string;
}