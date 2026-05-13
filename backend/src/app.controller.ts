// =================================================================================
// APP CONTROLLER (The System Diagnostic)
// =================================================================================
// This is the root controller for the application.
// It provides basic health check responses to verify system
// availability at the top-level path.
// =================================================================================

import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { register } from 'prom-client';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  // [NESTJS] Dependency Injection for system-level logic
  constructor(private readonly appService: AppService) {}

  // GET HELLO: Simple health check / landing route
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // HEALTH: Returns system availability status
  @Public()
  @Get('health')
  getHealth() {
    return { status: 'up', timestamp: new Date().toISOString() };
  }

  // METRICS: Exposes Prometheus metrics for scraping
  @Public()
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
