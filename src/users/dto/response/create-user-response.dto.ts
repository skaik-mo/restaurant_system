import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto.js';

export class CreateUserResponseDto extends UserResponseDto {
  @ApiProperty({
    example: true,
    description: 'False if the user was created but the verification email could not be sent.',
  })
  verificationEmailSent!: boolean;
}