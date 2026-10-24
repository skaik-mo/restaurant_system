import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'false deactivates the user (sessions revoked, streams closed); true reactivates' })
  @IsBoolean()
  isActive!: boolean;
}
