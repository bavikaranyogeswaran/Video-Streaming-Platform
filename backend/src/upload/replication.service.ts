import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReplicationService {
  private readonly logger = new Logger(ReplicationService.name);
  private readonly storageNodes = [
    process.env.STORAGE_NODE_A || 'http://storage-node-a:4001',
    process.env.STORAGE_NODE_B || 'http://storage-node-b:4001',
    process.env.STORAGE_NODE_C || 'http://storage-node-c:4001',
  ];

  async replicate(videoId: string, hlsDir: string): Promise<string[]> {
    const files = fs.readdirSync(hlsDir);
    const successfulNodes: string[] = [];

    // Parallel replication to Node A and B
    const primaryReplication = [
        this.replicateToNode(this.storageNodes[0], videoId, hlsDir, files),
        this.replicateToNode(this.storageNodes[1], videoId, hlsDir, files),
    ];

    const results = await Promise.allSettled(primaryReplication);
    
    if (results[0].status === 'fulfilled') successfulNodes.push('A');
    if (results[1].status === 'fulfilled') successfulNodes.push('B');

    // Fire-and-forget backup to Node C
    this.replicateToNode(this.storageNodes[2], videoId, hlsDir, files)
        .then(() => successfulNodes.push('C'))
        .catch(err => this.logger.error(`Backup replication to Node C failed: ${err.message}`));

    return successfulNodes;
  }

  private async replicateToNode(nodeUrl: string, videoId: string, hlsDir: string, files: string[]) {
    this.logger.log(`Replicating video ${videoId} to ${nodeUrl}`);
    
    for (const file of files) {
      const filePath = path.join(hlsDir, file);
      const formData = new FormData();
      formData.append('videoId', videoId);
      formData.append('file', fs.createReadStream(filePath));

      await axios.post(`${nodeUrl}/store`, formData, {
        headers: formData.getHeaders(),
      });
    }
    
    this.logger.log(`Successfully replicated ${videoId} to ${nodeUrl}`);
  }
}
