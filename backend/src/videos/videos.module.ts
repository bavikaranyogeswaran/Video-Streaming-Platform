// =================================================================================
// VIDEOS MODULE (The Catalog Domain)
// =================================================================================
// This module manages the video discovery and metadata domain.
// It exposes retrieval services and controllers used by the 
// frontend and the ingestion pipeline.
// =================================================================================

import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';

@Module({
  // [NESTJS] Provider for video metadata persistence logic
  providers: [VideosService],
  // [NESTJS] Public REST endpoints for video discovery
  controllers: [VideosController],
  // [NESTJS] Export service to allow cross-module metadata updates
  exports: [VideosService],
})
export class VideosModule {}
