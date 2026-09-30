import { ApiProperty } from '@nestjs/swagger';
import { TokenPairResponseDto } from './token-pair-response.dto.js';
import { UserResponseDto } from '../../../users/dto/response/user-response.dto.js';

// Login and refresh: the current user plus their tokens
export class AuthResponseDto {
  @ApiProperty({ type: TokenPairResponseDto })
  tokens!: TokenPairResponseDto;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}