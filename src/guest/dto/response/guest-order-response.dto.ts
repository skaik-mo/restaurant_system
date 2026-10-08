import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class GuestOrderCreatedResponseDto {
    @ApiProperty({ example: EXAMPLES.orderId })
    id!: number;

    @ApiProperty({ example: EXAMPLES.orderStatus })
    status!: string;

    @ApiProperty({ example: EXAMPLES.orderTotalPrice })
    totalPrice!: string;

    @ApiProperty({ example: EXAMPLES.orderAccessToken, description: 'Shown once; send it as X-Order-Token when polling' })
    orderAccessToken!: string;
}

export class GuestOrderStatusResponseDto {
    @ApiProperty({ example: EXAMPLES.orderId })
    id!: number;

    @ApiProperty({ example: EXAMPLES.orderStatus })
    status!: string;

    @ApiProperty({ example: EXAMPLES.timestamp })
    updatedAt!: string;
}