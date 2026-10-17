import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { DINING_TABLE_STATUSES, type DiningTableStatusValue } from '../../dining-tables.constants.js';

export class UpdateDiningTableStatusDto {
    @ApiProperty({ example: EXAMPLES.diningTableStatus, enum: DINING_TABLE_STATUSES })
    @IsIn(DINING_TABLE_STATUSES)
    status!: DiningTableStatusValue;
}
