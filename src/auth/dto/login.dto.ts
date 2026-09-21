import { IsEmail, IsString, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transforms/normalize-email.transform.js';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}