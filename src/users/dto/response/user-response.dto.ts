import { ApiProperty } from '@nestjs/swagger';
import { USER_ROLES, type UserRole } from '../../../common/types/user-role.type.js';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class UserResponseDto {
  @ApiProperty({ example: EXAMPLES.userId })
  id!: number;

  @ApiProperty({ example: EXAMPLES.name })
  name!: string;

  @ApiProperty({ example: EXAMPLES.email })
  email!: string;

  @ApiProperty({ enum: USER_ROLES, example: EXAMPLES.role })
  role!: UserRole;

  @ApiProperty({ example: false })
  emailVerified!: boolean;

  @ApiProperty({ example: true, description: 'False when an admin has deactivated the user; the user cannot log in or use any token' })
  isActive!: boolean;

  @ApiProperty({ example: true, description: 'True until the user sets their own password' })
  mustChangePassword!: boolean;

  @ApiProperty({ example: EXAMPLES.timestamp, description: 'ISO 8601' })
  createdAt!: string;

  @ApiProperty({ example: EXAMPLES.timestamp, description: 'ISO 8601' })
  updatedAt!: string;
}
