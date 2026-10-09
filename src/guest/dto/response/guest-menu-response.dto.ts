import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class GuestMenuItemResponseDto {
    @ApiProperty({ example: EXAMPLES.menuItemId })
    id!: number;

    @ApiProperty({ example: EXAMPLES.menuItemName })
    name!: string;

    @ApiProperty({ example: EXAMPLES.menuItemDescription, nullable: true, type: String })
    description!: string | null;

    @ApiProperty({ example: EXAMPLES.menuItemPrice })
    price!: string;

    @ApiPropertyOptional({ example: EXAMPLES.menuItemImageUrl, nullable: true, type: String })
    imageUrl!: string | null;
}

export class GuestMenuCategoryResponseDto {
    @ApiProperty({ example: EXAMPLES.categoryId })
    id!: number;

    @ApiProperty({ example: EXAMPLES.categoryName })
    name!: string;

    @ApiProperty({ type: [GuestMenuItemResponseDto] })
    items!: GuestMenuItemResponseDto[];
}