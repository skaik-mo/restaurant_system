import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class UserIdParamDto {
  @ApiProperty({ example: EXAMPLES.userId })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id!: number;
}
