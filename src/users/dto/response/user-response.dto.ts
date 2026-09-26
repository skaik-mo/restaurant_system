import { ApiProperty } from '@nestjs/swagger';
import { USER_ROLES, type UserRole } from '../../../common/types/user-role.type.js';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Sara Ahmad' })
  name!: string;

  @ApiProperty({ example: 'sara@restaurant.com' })
  email!: string;

  @ApiProperty({ enum: USER_ROLES })
  role!: UserRole;

  @ApiProperty({ example: false })
  emailVerified!: boolean;

  @ApiProperty({ example: true })
  mustChangePassword!: boolean;

  @ApiProperty({ example: '2026-09-21T15:00:00.000Z', description: 'ISO 8601' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-21T15:00:00.000Z', description: 'ISO 8601' })
  updatedAt!: string;
}