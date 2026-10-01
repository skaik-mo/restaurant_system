import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/transforms/normalize-email.transform.js';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: EXAMPLES.email })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: EXAMPLES.password, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}