import { ApiProperty } from '@nestjs/swagger';
import { TokenPairResponseDto } from './token-pair-response.dto.js';

/** Deliberately has NO `user`, unlike AuthResponseDto (explicit design decision). */
export class ChangePasswordResponseDto {
  @ApiProperty({ type: TokenPairResponseDto })
  tokens!: TokenPairResponseDto;
}