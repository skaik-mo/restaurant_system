import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class TokenPairResponseDto {
  @ApiProperty({ example: EXAMPLES.accessToken, description: 'Short-lived JWT; send as "Authorization: Bearer <token>"' })
  accessToken!: string;

  @ApiProperty({ example: EXAMPLES.refreshToken, description: 'Single-use; exchange it at POST /auth/refresh' })
  refreshToken!: string;
}