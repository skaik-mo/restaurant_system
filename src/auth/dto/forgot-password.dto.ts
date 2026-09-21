import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transforms/normalize-email.transform.js';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'sara@restaurant.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}