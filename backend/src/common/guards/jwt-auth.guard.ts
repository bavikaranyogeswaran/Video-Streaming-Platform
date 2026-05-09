// =================================================================================
// JWT AUTH GUARD (The Security Interceptor)
// =================================================================================
// This guard enforces the global security policy.
// It conditionally challenges requests for JWT credentials unless
// the target is explicitly whitelisted with the @Public decorator.
// =================================================================================

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // [NESTJS] Reflector allows introspection of route-level metadata
  constructor(private reflector: Reflector) {
    super();
  }

  // CAN ACTIVATE: Evaluates if a request should be allowed or challenged
  canActivate(context: ExecutionContext) {
    // 1. [SECURITY] Check if the route is marked with the @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. [SECURITY] Bypass Passport strategy if explicitly whitelisted
    if (isPublic) {
      return true;
    }

    // 3. [SECURITY] Delegate to the default JWT Passport strategy
    return super.canActivate(context);
  }
}
