import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. [OBSERVABILITY] Generate or capture Correlation ID
    // Why: Allows tracking a single request lifecycle across the entire distributed system
    const requestId = req.headers['x-request-id'] || uuidv4();

    // 2. [SIDE EFFECT] Attach to request for logging context
    req.requestId = requestId as string;

    // 3. [SIDE EFFECT] Attach to response for client-side tracking
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
