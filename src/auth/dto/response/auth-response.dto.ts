import { ApiProperty } from '@nestjs/swagger';
import { TokenPairResponseDto } from './token-pair-response.dto.js';
import { UserResponseDto } from '../../../users/dto/response/user-response.dto.js';

/** Login and refresh: tokens plus the current user. */
export class AuthResponseDto extends TokenPairResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}