import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class DiningTableQrTokenResponseDto {
    @ApiProperty({ example: EXAMPLES.diningTableQrToken })
    qrToken!: string;

    @ApiProperty({ example: EXAMPLES.timestamp })
    qrTokenRotatedAt!: string;
}