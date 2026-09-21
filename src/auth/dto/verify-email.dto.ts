import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Raw token from the verification email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;
}