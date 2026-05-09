// =================================================================================
// APP SERVICE (The System Core)
// =================================================================================
// This service provides high-level system logic.
// It handles core diagnostics and root-level application responses.
// =================================================================================

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
