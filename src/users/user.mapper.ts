import type { UserRole } from '../common/types/user-role.type.js';
import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import type { UserResponseDto } from './dto/response/user-response.dto.js';

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}


export function toUserResponseDto(user: UserRecord): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    emailVerified: user.emailVerified,
    mustChangePassword: user.mustChangePassword,
    createdAt: toIsoTimestamp(user.createdAt),
    updatedAt: toIsoTimestamp(user.updatedAt),
  };
}