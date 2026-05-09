// =================================================================================
// PUBLIC DECORATOR (The Security Whitelist)
// =================================================================================
// This decorator marks specific routes as publicly accessible.
// It allows endpoints to opt-out of the global JWT authentication
// requirement enforced by the application guard.
// =================================================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// PUBLIC: Marks a class or method as publicly accessible
// Why: Allows fine-grained control over which endpoints require auth
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
