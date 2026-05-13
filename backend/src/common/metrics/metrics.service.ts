import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  onModuleInit() {
    // 1. [OBSERVABILITY] Initialize default system metrics
    // Why: Captures CPU, memory, and event loop lag for the NestJS process
    client.collectDefaultMetrics({ prefix: 'vsp_backend_' });
  }
}
