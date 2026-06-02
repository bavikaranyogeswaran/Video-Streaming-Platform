// =================================================================================
// STORAGE MODULE (Durable Object Archive)
// =================================================================================
// Wraps the S3-compatible (MinIO) cold archive used to back up raw originals
// independently of the three hot HLS storage nodes.
// =================================================================================

import { Module } from '@nestjs/common';
import { ObjectArchiveService } from './object-archive.service';

@Module({
  providers: [ObjectArchiveService],
  exports: [ObjectArchiveService],
})
export class StorageModule {}
