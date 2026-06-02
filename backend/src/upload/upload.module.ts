// =================================================================================
// UPLOAD MODULE (The Ingestion Domain)
// =================================================================================
// This module encapsulates the video upload and processing logic.
// It coordinates transcoding, replication, durable archive, and metadata
// management into a singular functional domain.
// =================================================================================

import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { ReplicationModule } from './replication.module';
import { UploadController } from './upload.controller';
import { VideosModule } from '../videos/videos.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [VideosModule, ReplicationModule, StorageModule],
  providers: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
