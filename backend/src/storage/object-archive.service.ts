// =================================================================================
// OBJECT ARCHIVE SERVICE (Durable Cold Tier — S3-compatible)
// =================================================================================
// The three hot storage nodes (A/B/C) hold the transcoded HLS chunks that
// serve traffic. This service writes a single durable copy of each *original*
// upload into an S3-compatible object store (MinIO in dev) so that, even if
// all three hot replicas lose their volumes, the raw file is recoverable
// and can be re-transcoded.
//
// Toggle with S3_ARCHIVE_ENABLED. When disabled, all methods are no-ops so
// local-only/dev workflows still pass.
// =================================================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class ObjectArchiveService implements OnModuleInit {
  private readonly logger = new Logger(ObjectArchiveService.name);
  private client?: S3Client;

  readonly enabled: boolean = process.env.S3_ARCHIVE_ENABLED === 'true';
  readonly bucket: string = process.env.S3_BUCKET || 'vsp-originals';
  private readonly endpoint: string =
    process.env.S3_ENDPOINT || 'http://minio:9000';

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn(
        'S3 archive disabled (S3_ARCHIVE_ENABLED!=true). Originals will not be backed up.',
      );
      return;
    }

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || 'vsp_minio_admin',
        secretAccessKey:
          process.env.S3_SECRET_ACCESS_KEY ||
          'vsp_minio_change_in_prod_2024',
      },
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true',
    });

    await this.ensureBucket();
  }

  /**
   * Idempotently make sure the bucket exists. The minio-init container does
   * this too, but we double-check here so a missing bucket never silently
   * loses an upload.
   */
  private async ensureBucket() {
    if (!this.client) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`S3 archive bucket '${this.bucket}' is reachable`);
    } catch (err: any) {
      const status = err?.$metadata?.httpStatusCode;
      if (status === 404 || err?.name === 'NotFound') {
        this.logger.log(`Creating S3 archive bucket '${this.bucket}'`);
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } else {
        this.logger.error(
          `Could not verify S3 bucket '${this.bucket}': ${err?.message ?? err}`,
        );
      }
    }
  }

  /**
   * Upload the original file (pre-transcode) to the archive bucket.
   * Returns the S3 key on success, null when disabled or on a non-fatal
   * error so the caller can decide whether to fail the whole upload.
   */
  async archiveOriginal(
    videoId: string,
    filePath: string,
    contentType?: string,
  ): Promise<string | null> {
    if (!this.enabled || !this.client) return null;
    if (!fs.existsSync(filePath)) {
      this.logger.warn(
        `archiveOriginal: file ${filePath} does not exist — skipping`,
      );
      return null;
    }

    const ext = filePath.includes('.') ? filePath.split('.').pop() : 'bin';
    const key = `originals/${videoId}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fs.createReadStream(filePath),
          ContentType: contentType || 'application/octet-stream',
          ContentLength: fs.statSync(filePath).size,
        }),
      );
      this.logger.log(`Archived original to s3://${this.bucket}/${key}`);
      return key;
    } catch (err: any) {
      this.logger.error(
        `Failed to archive original for ${videoId}: ${err?.message ?? err}`,
      );
      return null;
    }
  }

  /**
   * Whether a given original is present in the archive.
   * Useful for disaster recovery — if local files are gone but the object
   * exists in S3, we can re-fetch and re-transcode.
   */
  async hasOriginal(key: string): Promise<boolean> {
    if (!this.enabled || !this.client) return false;
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Public-style presigned-ish URL — for MinIO with anonymous download
   * on the bucket, the path-style URL works directly. Used by ops/debugging.
   */
  publicUrlFor(key: string): string {
    return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
  }

  getClient(): S3Client | undefined {
    return this.client;
  }
}
