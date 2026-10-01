import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class VerifyEmailDto {
  @ApiProperty({ example: EXAMPLES.oneTimeToken, description: 'Raw token from the verification email link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;
}