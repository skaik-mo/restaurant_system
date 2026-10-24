import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { USER_ROLES, type UserRole } from '../../../common/types/user-role.type.js';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: USER_ROLES, example: EXAMPLES.role })
  @IsIn(USER_ROLES)
  role!: UserRole;
}
