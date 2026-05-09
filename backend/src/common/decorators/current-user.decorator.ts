// =================================================================================
// CURRENT USER DECORATOR (The Identity Injector)
// =================================================================================
// This parameter decorator extracts the authenticated user profile.
// It simplifies controller logic by providing direct access to the
// identity payload hydrated by the JWT strategy.
// =================================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // 1. [SECURITY] Resolve the HTTP request object
    const request = ctx.switchToHttp().getRequest();
    // 2. [SECURITY] Extract the 'user' payload attached by Passport
    return request.user;
  },
);
