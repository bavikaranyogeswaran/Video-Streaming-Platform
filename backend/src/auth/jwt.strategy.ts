// =================================================================================
// JWT STRATEGY (The Security Provider)
// =================================================================================
// This strategy implements Passport-JWT verification.
// It extracts and validates user identity from Bearer tokens
// to hydrate the request context for protected routes.
// =================================================================================

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // [NESTJS] Configuration for the Passport-JWT engine
  constructor() {
    super({
      // 1. [SECURITY] Resolve JWT from the Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 2. [SECURITY] Reject expired tokens automatically
      ignoreExpiration: false,
      // 3. [SECURITY] Key used for HMAC signature verification
      secretOrKey:
        process.env.JWT_SECRET ||
        'vsp_super_secret_jwt_key_change_in_prod_2024',
    });
  }

  // VALIDATE: Hook called after signature verification
  async validate(payload: any) {
    // 1. [SECURITY] Return the hydrated user object to be attached to req.user
    return { userId: payload.sub, username: payload.username };
  }
}
