// =================================================================================
// CREATE VIDEO DTO (The Registration Schema)
// =================================================================================
// This DTO defines the metadata required for registering new videos.
// It ensures that ingestion requests contain a valid title and
// optional descriptive markers.
// =================================================================================

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  // 1. [VALIDATION] Require a descriptive title for indexing
  @ApiProperty({ example: 'My First Video' })
  @IsString()
  @IsNotEmpty()
  title: string;

  // 2. [VALIDATION] Optional secondary metadata
  @ApiProperty({ example: 'A video about distributed systems', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
