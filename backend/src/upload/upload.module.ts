// =================================================================================
// UPLOAD MODULE (The Ingestion Domain)
// =================================================================================
// This module encapsulates the video upload and processing logic.
// It coordinates transcoding, replication, and metadata management
// into a singular functional domain.
// =================================================================================

import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { ReplicationService } from './replication.service';
import { UploadController } from './upload.controller';
import { VideosModule } from '../videos/videos.module';

@Module({
  // [NESTJS] Shared domain logic for video metadata persistence
  imports: [VideosModule],
  // [NESTJS] Internal services for file processing and distribution
  providers: [UploadService, ReplicationService],
  // [NESTJS] Public entry points for upload requests
  controllers: [UploadController],
})
export class UploadModule {}
