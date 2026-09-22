import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
    @ApiProperty({ example: 'Verification email sent' })
    message!: string;
}