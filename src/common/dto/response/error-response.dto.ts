import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidationDetailDto {
  @ApiProperty({ example: 'email' })
  field!: string;

  @ApiProperty({ example: 'email must be an email' })
  message!: string;
}

export class ErrorBodyDto {
  @ApiProperty({ example: 'AUTH_INVALID_CREDENTIALS', description: 'Stable machine-readable code. Frontends switch on this.' })
  code!: string;

  @ApiProperty({ example: 'Invalid email or password', description: 'English message for developers and logs.' })
  message!: string;

  @ApiPropertyOptional({ type: [ValidationDetailDto], description: 'Per-field messages, only for COMMON_VALIDATION_FAILED.' })
  details?: ValidationDetailDto[];
}

// Shape of every error response
export class ErrorResponseDto {
  @ApiProperty({ type: Boolean, example: false })
  success!: false;

  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;
}