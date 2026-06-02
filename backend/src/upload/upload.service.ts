// =================================================================================
// UPLOAD SERVICE (The Processing Engine)
// =================================================================================
// Orchestrates the video ingestion pipeline:
//   1. Dedupe (SHA-256 of the original buffer → existing videoId if known)
//   2. Archive original to durable S3-compatible cold store (MinIO)
//   3. Stage on disk → ffmpeg HLS transcode
//   4. Quorum replication to the 3 regional hot storage nodes
//   5. Crash recovery on startup — re-scans the persisted staging dir and
//      either resumes work, errors out the record, or cleans up orphans.
// =================================================================================

import {
  Injectable,
  Logger,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { VideosService } from '../videos/videos.service';
import {
  ReplicationService,
  QuorumNotMetError,
} from './replication.service';
import { RedisService } from '../redis/redis.service';
import { ObjectArchiveService } from '../storage/object-archive.service';

/**
 * The shape returned to the upload controller.
 * `deduped: true` means we matched an existing video by hash and skipped work.
 */
export interface ProcessVideoResult {
  message: string;
  videoId: string;
  deduped?: boolean;
}

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = '/tmp/uploads';
  private readonly DEDUPE_KEY_PREFIX = 'vsp:dedupe:';

  constructor(
    private readonly videosService: VideosService,
    private readonly replicationService: ReplicationService,
    private readonly redisService: RedisService,
    private readonly objectArchive: ObjectArchiveService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /**
   * On boot, reconcile the persisted staging directory with Redis state.
   * Disabled by SKIP_RECOVERY=1 for tests.
   */
  async onModuleInit() {
    if (process.env.SKIP_RECOVERY === '1') {
      this.logger.warn('SKIP_RECOVERY=1 → skipping startup reconciliation');
      return;
    }
    try {
      await this.recoverStagedJobs();
    } catch (err) {
      this.logger.error(
        `Startup recovery failed: ${(err as Error).message}`,
      );
    }
  }

  // ── Main ingestion entry ───────────────────────────────────────────────

  async processVideo(
    file: Express.Multer.File,
    title: string,
    username: string,
  ): Promise<ProcessVideoResult> {
    // 1. [DEDUPE] Hash the buffer and short-circuit if we've seen this exact
    //    bytes before. Cheap (single Redis GET) and saves the entire pipeline.
    const sha256 = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const dedupeKey = `${this.DEDUPE_KEY_PREFIX}${sha256}`;
    const existingId = await this.redisService.get(dedupeKey);
    if (existingId) {
      // Make sure the existing record is actually still around — Redis dedupe
      // entries can outlive a deleted video. If gone, fall through.
      try {
        const existing = await this.videosService.findOne(existingId);
        this.logger.log(
          `Dedupe hit: sha=${sha256.slice(0, 12)}… → existing video ${existingId} (status=${existing.status})`,
        );
        return {
          message: 'Duplicate upload — returning existing video.',
          videoId: existingId,
          deduped: true,
        };
      } catch {
        this.logger.warn(
          `Stale dedupe entry for ${existingId} (video gone), reprocessing`,
        );
        await this.redisService.del(dedupeKey);
      }
    }

    // 2. [DB] Create the video record in Redis (status=processing)
    const video = await this.videosService.create({ title }, username);
    const videoId = video.id;

    // 3. [DB] Reserve the dedupe slot immediately so a concurrent identical
    //    upload joins the same videoId instead of racing into a second job.
    await this.redisService.set(dedupeKey, videoId);

    // 4. [VALIDATION] Resolve paths for staging
    const outputDir = path.join(this.uploadDir, videoId);
    fs.mkdirSync(outputDir, { recursive: true });
    const inputPath = path.join(
      this.uploadDir,
      `${videoId}${path.extname(file.originalname)}`,
    );
    const outputPath = path.join(outputDir, 'playlist.m3u8');

    // 5. [PERFORMANCE] Stream the buffer to disk (avoids blocking the loop)
    await this.writeBufferToDisk(inputPath, file.buffer);

    // 6. [DURABILITY] Push original to MinIO cold tier BEFORE we start
    //    transcoding. If anything else dies after this point, the original
    //    is recoverable. Non-fatal on failure — we still try replicas.
    let s3Key: string | null = null;
    if (this.objectArchive.enabled) {
      s3Key = await this.objectArchive.archiveOriginal(
        videoId,
        inputPath,
        file.mimetype || 'application/octet-stream',
      );
      if (s3Key) {
        await this.videosService.setS3Key(videoId, s3Key);
      }
    }

    // 7. [ASYNC] Fire transcoder; client gets ACK now, work continues in bg
    this.transcodeToHls(inputPath, outputDir, outputPath, videoId);

    return {
      message: 'Video upload successful. Processing started.',
      videoId,
    };
  }

  // ── Recovery ───────────────────────────────────────────────────────────

  /**
   * Scan /tmp/uploads and reconcile each leftover entry with Redis.
   * Three kinds of leftover can exist:
   *   - `{videoId}.{ext}`  : raw input, transcode never completed
   *   - `{videoId}/`       : staged HLS dir, transcode done but replication
   *                          didn't finish OR finished but cleanup didn't run
   *   - everything else    : ignored (unknown shape)
   */
  private async recoverStagedJobs() {
    if (!fs.existsSync(this.uploadDir)) return;
    const entries = await fs.promises.readdir(this.uploadDir, {
      withFileTypes: true,
    });
    if (entries.length === 0) return;

    this.logger.log(
      `Recovery: scanning ${entries.length} leftover entries in ${this.uploadDir}`,
    );

    for (const entry of entries) {
      const name = entry.name;
      try {
        if (entry.isDirectory()) {
          await this.recoverHlsDir(name);
        } else if (entry.isFile()) {
          await this.recoverRawInput(name);
        }
      } catch (err) {
        this.logger.error(
          `Recovery failed for "${name}": ${(err as Error).message}`,
        );
      }
    }
  }

  private async recoverHlsDir(videoId: string) {
    const dir = path.join(this.uploadDir, videoId);
    const video = await this.tryFindVideo(videoId);

    if (!video) {
      this.logger.warn(
        `Orphan staging dir ${videoId} (no Redis record) — cleaning`,
      );
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    }

    const playlist = path.join(dir, 'playlist.m3u8');
    const hasPlaylist = fs.existsSync(playlist);

    if (video.status === 'ready') {
      // Replication+cleanup must have died right at the end. Safe to drop.
      this.logger.log(
        `Stale staging for ready video ${videoId} — cleaning`,
      );
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    }

    if (video.status === 'processing' && hasPlaylist) {
      this.logger.log(`Resuming replication for ${videoId}`);
      await this.replicateAndFinalize(videoId, dir);
      return;
    }

    // status=processing without playlist (transcode died) OR status=error
    this.logger.warn(
      `Cannot recover ${videoId} (status=${video.status}, hasPlaylist=${hasPlaylist}) — marking error`,
    );
    if (video.status !== 'error') {
      await this.videosService.updateStatus(videoId, 'error');
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }

  private async recoverRawInput(filename: string) {
    const filePath = path.join(this.uploadDir, filename);
    const videoId = path.basename(filename, path.extname(filename));
    const video = await this.tryFindVideo(videoId);

    if (!video) {
      this.logger.warn(`Orphan raw input ${filename} — deleting`);
      fs.unlinkSync(filePath);
      return;
    }

    if (video.status === 'processing') {
      this.logger.log(`Resuming transcode for ${videoId}`);
      const outputDir = path.join(this.uploadDir, videoId);
      fs.mkdirSync(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, 'playlist.m3u8');
      this.transcodeToHls(filePath, outputDir, outputPath, videoId);
    } else {
      this.logger.log(
        `Cleaning stale raw input ${filename} (status=${video.status})`,
      );
      fs.unlinkSync(filePath);
    }
  }

  private async tryFindVideo(videoId: string) {
    try {
      return await this.videosService.findOne(videoId);
    } catch {
      return null;
    }
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private writeBufferToDisk(inputPath: string, buffer: Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const ws = fs.createWriteStream(inputPath);
      ws.write(buffer);
      ws.end();
      ws.on('finish', () => resolve());
      ws.on('error', reject);
    });
  }

  private transcodeToHls(
    inputPath: string,
    outputDir: string,
    outputPath: string,
    videoId: string,
  ) {
    this.logger.log(`Starting transcoding for video: ${videoId}`);

    ffmpeg(inputPath)
      .outputOptions([
        '-codec: copy', // copy streams directly when possible (fastest)
        '-start_number 0',
        '-hls_time 10', // 10s chunks — good for CDN edge caching
        '-hls_list_size 0', // keep all segments in the manifest
        '-f hls',
      ])
      .output(outputPath)
      .on('end', async () => {
        this.logger.log(`Transcoding finished for video: ${videoId}`);
        await this.replicateAndFinalize(videoId, outputDir);
        // Raw input is no longer needed once HLS is in flight to replicas.
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      })
      .on('error', async (err: Error) => {
        this.logger.error(
          `Transcoding failed for ${videoId}: ${err.message}`,
        );
        await this.videosService.updateStatus(videoId, 'error');
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true, force: true });
        }
      })
      .run();
  }

  /**
   * Try to replicate the HLS bundle to the 3 hot nodes.
   * - On quorum success → mark video ready, record replica labels, clean up
   * - On quorum failure → mark video error, leave the staging dir for repair
   * - On any unexpected exception → mark video error
   */
  private async replicateAndFinalize(videoId: string, outputDir: string) {
    try {
      const nodes = await this.replicationService.replicate(
        videoId,
        outputDir,
      );
      await this.videosService.setStorageNodes(videoId, nodes);
      await this.videosService.updateStatus(
        videoId,
        'ready',
        `/stream/${videoId}/playlist.m3u8`,
      );
      // Cleanup only after success — failure leaves the dir for retry.
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    } catch (err) {
      if (err instanceof QuorumNotMetError) {
        this.logger.error(
          `Quorum not met for ${videoId} — keeping staging for repair: ${err.message}`,
        );
        // Record whichever replicas DID succeed, even if below quorum, so
        // ops tooling can see partial state.
        await this.videosService.setStorageNodes(videoId, err.successful);
      } else {
        this.logger.error(
          `Replication error for ${videoId}: ${(err as Error).message}`,
        );
      }
      await this.videosService.updateStatus(videoId, 'error');
      // Keep the staging dir around so a manual /repair can use it.
    }
  }
}
