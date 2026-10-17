import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class DiningTableResponseDto {
    @ApiProperty({ example: EXAMPLES.diningTableId })
    id!: number;

    @ApiProperty({ example: EXAMPLES.diningTableNumber })
    number!: number;

    @ApiProperty({ example: EXAMPLES.diningTableStatus, enum: ['AVAILABLE', 'BUSY'] })
    status!: string;

    @ApiProperty({ example: EXAMPLES.timestamp })
    createdAt!: string;

    @ApiProperty({ example: EXAMPLES.timestamp })
    updatedAt!: string;
}