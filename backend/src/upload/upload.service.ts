import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { VideosService } from '../videos/videos.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = '/tmp/uploads';

  constructor(private readonly videosService: VideosService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async processVideo(file: Express.Multer.File, title: string, username: string) {
    // 1. Create video entry in Redis (status: processing)
    const video = await this.videosService.create({ title }, username);
    const videoId = video.id;
    const outputDir = path.join(this.uploadDir, videoId);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const inputPath = path.join(this.uploadDir, `${videoId}${path.extname(file.originalname)}`);
    const outputPath = path.join(outputDir, 'playlist.m3u8');

    // Write temp file
    fs.writeFileSync(inputPath, file.buffer);

    // 2. Start HLS Transcoding in background
    this.transcodeToHls(inputPath, outputDir, outputPath, videoId);

    return {
      message: 'Video upload successful. Processing started.',
      videoId,
    };
  }

  private transcodeToHls(inputPath: string, outputDir: string, outputPath: string, videoId: string) {
    this.logger.log(`Starting transcoding for video: ${videoId}`);

    ffmpeg(inputPath)
      .outputOptions([
        '-codec: copy',       // Copy streams (faster, assuming input is H264/AAC)
        '-start_number 0',
        '-hls_time 10',       // 10 second segments
        '-hls_list_size 0',   // Include all segments in playlist
        '-f hls'
      ])
      .output(outputPath)
      .on('end', async () => {
        this.logger.log(`Transcoding finished for video: ${videoId}`);
        
        // Update status in Redis
        // Note: In Day 5 we will move these files to storage nodes.
        // For now, we mark as ready and point to the temp path.
        await this.videosService.updateStatus(videoId, 'ready', `/tmp/uploads/${videoId}/playlist.m3u8`);
        
        // Cleanup input file
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      })
      .on('error', async (err: Error) => {
        this.logger.error(`Transcoding failed for video: ${videoId}: ${err.message}`);
        await this.videosService.updateStatus(videoId, 'error');
        
        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      })
      .run();
  }
}
