// =================================================================================
// AUTH MODULE (The Security Domain)
// =================================================================================
// This module implements the identity management pipeline.
// It configures JWT issuance, Passport integration, and defines
// the boundary for protected system access.
// =================================================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    // [NESTJS] Integration with Passport security middleware
    PassportModule,
    // 1. [SECURITY] Configure the JSON Web Token engine
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'vsp_super_secret_jwt_key_change_in_prod_2024',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any },
    }),
  ],
  // [NESTJS] Identity services and token verification strategy
  providers: [AuthService, JwtStrategy],
  // [NESTJS] Public endpoints for auth operations
  controllers: [AuthController],
  // [NESTJS] Allow other modules to use the AuthService if needed
  exports: [AuthService],
})
export class AuthModule {}
