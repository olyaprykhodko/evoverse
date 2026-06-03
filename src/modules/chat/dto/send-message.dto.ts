import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @ApiProperty({
    example: 'Hello everyone',
    description: 'Chat message body (1–500 chars, trimmed)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}
