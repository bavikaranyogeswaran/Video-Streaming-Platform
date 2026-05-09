// =================================================================================
// APP CONTROLLER (The System Diagnostic)
// =================================================================================
// This is the root controller for the application.
// It provides basic health check responses to verify system
// availability at the top-level path.
// =================================================================================

import { Controller, Get } from '@nestjs/common';
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
    // 1. [SIDE EFFECT] Return system greeting
    return this.appService.getHello();
  }
}
