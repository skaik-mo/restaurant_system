import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class GuestOrderIdParamDto {
    @ApiProperty({ example: EXAMPLES.orderId })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    id!: number;
}