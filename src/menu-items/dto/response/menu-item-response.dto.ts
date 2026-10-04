import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class MenuItemResponseDto {
    @ApiProperty({ example: EXAMPLES.menuItemId })
    id!: number

    @ApiProperty({ example: EXAMPLES.menuItemName, maxLength: 100 })
    name!: string

    @ApiProperty({ example: EXAMPLES.menuItemDescription, maxLength: 500, nullable: true, type: String })
    description!: string | null

    @ApiProperty({ example: EXAMPLES.menuItemPrice, type: String, description: 'Exact decimal string, always 2 decimals' })
    price!: string

    @ApiProperty({ example: EXAMPLES.menuItemImageUrl, maxLength: 2048, nullable: true, type: String })
    imageUrl!: string | null

    @ApiProperty({ example: EXAMPLES.categoryId })
    categoryId!: number

    @ApiProperty({ example: true })
    isAvailable!: boolean

    @ApiProperty({ example: EXAMPLES.menuItemSortOrder })
    sortOrder!: number

    @ApiProperty({ example: EXAMPLES.timestamp })
    createdAt!: string

    @ApiProperty({ example: EXAMPLES.timestamp })
    updatedAt!: string
}