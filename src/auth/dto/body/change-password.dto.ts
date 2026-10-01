import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class ChangePasswordDto {
  @ApiProperty({ example: EXAMPLES.password, maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: EXAMPLES.newPassword, minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}