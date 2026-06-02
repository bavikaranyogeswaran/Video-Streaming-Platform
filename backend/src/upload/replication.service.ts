// =================================================================================
// REPLICATION SERVICE (The Distribution Coordinator)
// =================================================================================
// Parallel replication to all 3 regional storage nodes (A=Asia, B=EU, C=US)
// with quorum semantics: at least REPLICATION_MIN_REPLICAS (default 2) must
// succeed or the whole replication fails — caller marks the video as 'error'.
// =================================================================================

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { LockService } from '../redis/lock.service';

// [RESILIENCE] Global retry configuration for backend storage operations
axiosRetry(axios, {
  retries: 5,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      !!(error.response && error.response.status >= 500)
    );
  },
});

export class QuorumNotMetError extends Error {
  constructor(
    public readonly successful: string[],
    public readonly required: number,
  ) {
    super(
      `Quorum not met: only ${successful.length} replica(s) succeeded (${successful.join(',') || 'none'}), need ${required}`,
    );
    this.name = 'QuorumNotMetError';
  }
}

// Node label → URL pair, kept together so failures can be reported by label
interface StorageTarget {
  label: 'A' | 'B' | 'C';
  url: string;
}

@Injectable()
export class ReplicationService {
  private readonly logger = new Logger(ReplicationService.name);
  private readonly CLUSTER_SECRET =
    process.env.CLUSTER_SECRET || 'vsp_internal_cluster_secret_2024';

  private readonly MIN_REPLICAS = Math.max(
    1,
    parseInt(process.env.REPLICATION_MIN_REPLICAS || '2', 10),
  );

  private readonly NODE_TIMEOUT_MS = parseInt(
    process.env.REPLICATION_NODE_TIMEOUT_MS || '60000',
    10,
  );

  constructor(private readonly lockService: LockService) {}

  // [NESTJS] Configuration-driven storage node topology
  private readonly storageTargets: StorageTarget[] = [
    {
      label: 'A',
      url: process.env.STORAGE_NODE_A || 'http://storage-node-a:4001',
    },
    {
      label: 'B',
      url: process.env.STORAGE_NODE_B || 'http://storage-node-b:4001',
    },
    {
      label: 'C',
      url: process.env.STORAGE_NODE_C || 'http://storage-node-c:4001',
    },
  ];

  /**
   * Replicate the HLS segments under `hlsDir` to ALL storage nodes in parallel
   * and require ≥MIN_REPLICAS successes. Throws QuorumNotMetError otherwise.
   *
   * @returns the labels of nodes that successfully accepted every segment
   */
  async replicate(videoId: string, hlsDir: string): Promise<string[]> {
    // 0. [CONCURRENCY] Distributed lock — prevents two replications racing on the same video
    const lockKey = `lock:replicate:${videoId}`;
    const lock = await this.lockService.acquire(lockKey, 300_000); // 5 minute TTL

    try {
      // 1. [VALIDATION] Enumerate segments produced by the transcoder
      const files = fs.readdirSync(hlsDir);
      if (files.length === 0) {
        throw new Error(`No HLS segments found in ${hlsDir} for ${videoId}`);
      }

      // 2. [PERFORMANCE] Replicate to every node in parallel — no more
      //    fire-and-forget for C; every result is awaited and reported.
      const settled = await Promise.allSettled(
        this.storageTargets.map((target) =>
          this.replicateToNode(target.url, videoId, hlsDir, files),
        ),
      );

      const successful: string[] = [];
      settled.forEach((result, idx) => {
        const target = this.storageTargets[idx];
        if (result.status === 'fulfilled') {
          successful.push(target.label);
        } else {
          this.logger.error(
            `Replica ${target.label} (${target.url}) failed for ${videoId}: ${(result.reason as Error)?.message}`,
          );
        }
      });

      // 3. [CONSISTENCY] Enforce quorum — anything less means we can't safely
      //    serve this video (a single replica is a single point of failure).
      if (successful.length < this.MIN_REPLICAS) {
        throw new QuorumNotMetError(successful, this.MIN_REPLICAS);
      }

      this.logger.log(
        `Replicated ${videoId} to ${successful.length}/${this.storageTargets.length} nodes: ${successful.join(',')}`,
      );

      return successful;
    } finally {
      await lock.release();
    }
  }

  // REPLICATE TO NODE: Performs multi-part upload of HLS assets to a single node
  private async replicateToNode(
    nodeUrl: string,
    videoId: string,
    hlsDir: string,
    files: string[],
  ) {
    this.logger.log(`Replicating video ${videoId} to ${nodeUrl}`);

    // [PERFORMANCE] Batch upload segments to the target storage node
    // Why: Parallel transfers reduce latency for videos with many HLS chunks
    const BATCH_SIZE = 5;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (file) => {
          const filePath = path.join(hlsDir, file);
          const formData = new FormData();
          formData.append('videoId', videoId);
          formData.append('file', fs.createReadStream(filePath));

          await axios.post(`${nodeUrl}/store`, formData, {
            headers: {
              ...formData.getHeaders(),
              'x-internal-secret': this.CLUSTER_SECRET,
            },
            timeout: this.NODE_TIMEOUT_MS,
          });
        }),
      );
    }

    this.logger.log(`Successfully replicated ${videoId} to ${nodeUrl}`);
  }

  // REPAIR: Scans a node for missing segments and synchronizes them
  async repair(
    videoId: string,
    hlsDir: string,
    nodeUrl: string,
  ): Promise<boolean> {
    const lockKey = `lock:replicate:${videoId}`;
    const lock = await this.lockService.acquire(lockKey, 300_000);

    try {
      this.logger.log(
        `🔍 Repairing consistency for video ${videoId} on ${nodeUrl}...`,
      );

      const files = fs.readdirSync(hlsDir);
      await this.replicateToNode(nodeUrl, videoId, hlsDir, files);

      this.logger.log(`✅ Consistency restored for ${videoId} on ${nodeUrl}`);
      return true;
    } catch (err) {
      this.logger.error(`❌ Repair failed for ${nodeUrl}: ${(err as Error).message}`);
      return false;
    } finally {
      await lock.release();
    }
  }
}
