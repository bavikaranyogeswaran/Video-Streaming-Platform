import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty({ example: 'My First Video' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A video about distributed systems', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
