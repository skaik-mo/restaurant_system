import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/transforms/normalize-email.transform.js';
import { USER_ROLES, type UserRole } from '../../../common/types/user-role.type.js';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class CreateUserDto {
  @ApiProperty({ example: EXAMPLES.name })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: EXAMPLES.email })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Temporary password. User must change it on first login.',
    example: EXAMPLES.password,
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: USER_ROLES, example: EXAMPLES.role })
  @IsIn(USER_ROLES)
  role!: UserRole;
}