import { IsString, MaxLength, MinLength } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: EXAMPLES.refreshToken, description: 'The refresh token from login or the last refresh' })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  refreshToken!: string;
}