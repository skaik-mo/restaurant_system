import { ApiProperty } from '@nestjs/swagger';
import { USER_ROLES, type UserRole } from '../../common/types/user-role.type.js';

export class CreateUserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ enum: USER_ROLES })
  role!: UserRole;

  @ApiProperty({ example: true })
  mustChangePassword!: boolean;

  @ApiProperty({ example: false })
  emailVerified!: boolean;

  @ApiProperty({ example: '2026-09-21T15:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({
    example: true,
    description:
      'False if the user was created but the verification email could not be sent.',
  })
  verificationEmailSent!: boolean;
}