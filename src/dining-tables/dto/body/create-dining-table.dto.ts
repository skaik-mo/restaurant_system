import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { DINING_TABLE_NUMBER_MAX, DINING_TABLE_NUMBER_MIN } from '../../dining-tables.constants.js';

export class CreateDiningTableDto {
    @ApiProperty({ example: EXAMPLES.tableNumber, minimum: DINING_TABLE_NUMBER_MIN, maximum: DINING_TABLE_NUMBER_MAX })
    @IsInt()
    @Min(DINING_TABLE_NUMBER_MIN)
    @Max(DINING_TABLE_NUMBER_MAX)
    number!: number;
}