import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { DINING_TABLE_NUMBER_MAX, DINING_TABLE_NUMBER_MIN } from '../../dining-tables.constants.js';

export class UpdateDiningTableDto {
    @ApiPropertyOptional({ example: EXAMPLES.tableNumber, minimum: DINING_TABLE_NUMBER_MIN, maximum: DINING_TABLE_NUMBER_MAX })
    @ValidateIf((_, v) => v !== undefined)
    @IsInt()
    @Min(DINING_TABLE_NUMBER_MIN)
    @Max(DINING_TABLE_NUMBER_MAX)
    number?: number;
}