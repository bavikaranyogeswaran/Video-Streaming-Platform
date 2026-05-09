// =================================================================================
// VIDEO RESPONSE DTO (The Data Transfer Contract)
// =================================================================================
// This DTO defines the structured response for video metadata.
// It ensures consistent schema delivery for the frontend player
// and Swagger API documentation.
// =================================================================================

import { ApiProperty } from '@nestjs/swagger';

export class VideoResponseDto {
  @ApiProperty({ description: 'Unique identifier for the video' })
  id: string;

  @ApiProperty({ description: 'Title of the video' })
  title: string;

  @ApiProperty({ description: 'Optional detailed description' })
  description?: string;

  @ApiProperty({ description: 'Username of the uploader' })
  uploadedBy: string;

  @ApiProperty({ description: 'Public path to the HLS playlist (.m3u8)' })
  hlsPath?: string;

  @ApiProperty({ description: 'List of storage nodes hosting this video' })
  storageNodes: string[];

  @ApiProperty({ description: 'ISO timestamp of record creation' })
  createdAt: string;

  @ApiProperty({ description: 'Current processing lifecycle state' })
  status: 'processing' | 'ready' | 'error';
}
