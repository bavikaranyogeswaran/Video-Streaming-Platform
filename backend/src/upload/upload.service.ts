// =================================================================================
// UPLOAD SERVICE (The Processing Engine)
// =================================================================================
// This service orchestrates the video processing pipeline.
// It manages HLS transcoding jobs, triggers multi-node replication,
// and updates the final availability status in Redis.
// =================================================================================

import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { VideosService } from '../videos/videos.service';
import { ReplicationService } from './replication.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = '/tmp/uploads';

  // [NESTJS] Injecting core dependencies for metadata and replication
  constructor(
    private readonly videosService: VideosService,
    private readonly replicationService: ReplicationService,
  ) {
    // [SIDE EFFECT] Initialize local upload directory if not exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // PROCESS VIDEO: Initiates the ingestion pipeline for a new upload
  async processVideo(file: Express.Multer.File, title: string, username: string) {
    // 1. [DB] Create initial video metadata record in Redis
    // Status is set to 'processing' to track active jobs
    const video = await this.videosService.create({ title }, username);
    const videoId = video.id;
    
    // 2. [VALIDATION] Prepare staging directory for HLS segments
    const outputDir = path.join(this.uploadDir, videoId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 3. [VALIDATION] Resolve input and output paths for FFmpeg processing
    const inputPath = path.join(this.uploadDir, `${videoId}${path.extname(file.originalname)}`);
    const outputPath = path.join(outputDir, 'playlist.m3u8');

    // 4. [SIDE EFFECT] Persist raw buffer to temporary disk storage
    // ⚠️ NOTE: Blocking IO; consider streams for very large files
    fs.writeFileSync(inputPath, file.buffer);

    // 5. [PERFORMANCE] Trigger HLS Transcoding (Async Background Task)
    // Non-blocking execution to return early to the user
    this.transcodeToHls(inputPath, outputDir, outputPath, videoId);

    return {
      message: 'Video upload successful. Processing started.',
      videoId,
    };
  }

  // TRANSCODE TO HLS: Background worker for video segmentation
  private transcodeToHls(inputPath: string, outputDir: string, outputPath: string, videoId: string) {
    this.logger.log(`Starting transcoding for video: ${videoId}`);

    // 1. [PERFORMANCE] Execute FFmpeg transformation
    // Converts single file to streamable HLS chunks
    ffmpeg(inputPath)
      .outputOptions([
        '-codec: copy',       // Copy streams directly if possible (fastest)
        '-start_number 0',
        '-hls_time 10',       // 10s chunks optimized for CDNs
        '-hls_list_size 0',   // Retain all segments in manifest
        '-f hls'
      ])
      .output(outputPath)
      .on('end', async () => {
        this.logger.log(`Transcoding finished for video: ${videoId}`);
        
        // 2. [SIDE EFFECT] Replicate HLS segments to distributed storage nodes
        // Propagates data to ensure high availability
        const nodes = await this.replicationService.replicate(videoId, outputDir);
        
        // 3. [DB] Update video metadata and storage mapping in Redis
        // [DB] HSET video:{id} -> records successful replica nodes
        // [DB] HSET video:{id} -> updates status to 'ready' for public access
        await this.videosService.setStorageNodes(videoId, nodes);
        await this.videosService.updateStatus(videoId, 'ready', `/stream/${videoId}/playlist.m3u8`);
        
        // 4. [SIDE EFFECT] Cleanup local temporary files
        // ⚠️ NOTE: Critical to prevent transcode node disk overflow
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true, force: true });
        }
      })
      .on('error', async (err: Error) => {
        this.logger.error(`Transcoding failed for video: ${videoId}: ${err.message}`);
        
        // 1. [DB] Update status to 'error' to notify user/UI
        await this.videosService.updateStatus(videoId, 'error');
        
        // 2. [SIDE EFFECT] Cleanup raw input file
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      })
      .run();
  }
}
