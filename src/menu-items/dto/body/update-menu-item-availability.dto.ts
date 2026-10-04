import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateMenuItemAvailabilityDto {
    @ApiProperty({ example: false })
    @IsBoolean()
    isAvailable!: boolean
}