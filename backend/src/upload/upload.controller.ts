import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Upload')
@Controller('upload')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
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
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    
    // Simple validation for MP4/MKV/AVI
    const allowedExtensions = ['.mp4', '.mkv', '.avi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
       throw new BadRequestException('Invalid file type. Only MP4, MKV, and AVI are allowed.');
    }

    return this.uploadService.processVideo(file, title, user.username);
  }
}

import * as path from 'path';
