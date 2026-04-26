import { ApiProperty } from '@nestjs/swagger';

export class VideoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  uploadedBy: string;

  @ApiProperty()
  hlsPath?: string;

  @ApiProperty()
  storageNodes: string[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  status: 'processing' | 'ready' | 'error';
}
