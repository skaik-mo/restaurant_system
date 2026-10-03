import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class CategoryResponseDto {
  @ApiProperty({ example: EXAMPLES.categoryId })
  id!: number

  @ApiProperty({ example: EXAMPLES.categoryName, maxLength: 60 })
  name!: string

  @ApiProperty({ example: EXAMPLES.categorySortOrder })
  sortOrder!: number

  @ApiProperty({ example: EXAMPLES.timestamp })
  createdAt!: string

  @ApiProperty({ example: EXAMPLES.timestamp })
  updatedAt!: string
}