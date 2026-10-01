import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/transforms/normalize-email.transform.js';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class ForgotPasswordDto {
  @ApiProperty({ example: EXAMPLES.email })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}