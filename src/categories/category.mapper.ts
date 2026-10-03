import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import type { CategoryResponseDto } from './dto/response/category-response.dto.js';

export interface CategoryRecord {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function toCategoryResponseDto(category: CategoryRecord): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    createdAt: toIsoTimestamp(category.createdAt),
    updatedAt: toIsoTimestamp(category.updatedAt),
  };
}