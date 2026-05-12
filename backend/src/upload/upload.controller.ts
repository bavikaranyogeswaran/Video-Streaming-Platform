// =================================================================================
// UPLOAD CONTROLLER (The Ingestion Entry Point)
// =================================================================================
// This controller handles multi-part video uploads.
// It performs initial payload validation and delegates processing
// to the HLS transcoding and replication services.
// =================================================================================

import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UploadService } from './upload.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as path from 'path';

@ApiTags('Upload')
@Controller('upload')
@ApiBearerAuth()
export class UploadController {
  // [NESTJS] Dependency Injection for core upload logic
  constructor(private readonly uploadService: UploadService) {}

  // UPLOAD VIDEO: Endpoint to receive and process new video files
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Upload an MP4 video for HLS transcoding' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        video: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['title', 'video'],
    },
  })
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @CurrentUser() user: any,
  ) {
    // 1. [VALIDATION] Check if file exists in the multipart request
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    
    // 2. [VALIDATION] File extension whitelist check
    // Restricts uploads to supported container formats for FFmpeg
    const allowedExtensions = ['.mp4', '.mkv', '.avi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
       throw new BadRequestException('Invalid file type. Only MP4, MKV, and AVI are allowed.');
    }

    // 3. [SIDE EFFECT] Delegate business logic to UploadService
    // Passes authenticated username to track ownership in Redis
    return this.uploadService.processVideo(file, title, user.username);
  }
}
