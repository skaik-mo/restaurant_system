import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class ResetPasswordDto {
  @ApiProperty({ example: EXAMPLES.oneTimeToken, description: 'Raw token from the reset email link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;

  @ApiProperty({ example: EXAMPLES.newPassword, minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}