import { ApiProperty } from '@nestjs/swagger';
import { USER_ROLES, type UserRole } from '../../../common/types/user-role.type.js';

export class AuthUserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Sara' })
  name!: string;

  @ApiProperty({ example: 'sara@test.com' })
  email!: string;

  @ApiProperty({ enum: USER_ROLES })
  role!: UserRole;

  @ApiProperty({ example: false })
  emailVerified!: boolean;

  @ApiProperty({ example: true })
  mustChangePassword!: boolean;
}