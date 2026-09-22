import { ApiProperty } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user-response.dto.js';

export class TokenPairResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}