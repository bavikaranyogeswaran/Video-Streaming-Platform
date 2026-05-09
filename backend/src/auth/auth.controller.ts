// =================================================================================
// AUTH CONTROLLER (The Security Gateway)
// =================================================================================
// This controller exposes public identity management routes.
// It handles user onboarding through registration and session
// establishment via secure login.
// =================================================================================

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Authentication')
@Public() // Whitelisted from global JWT requirement
@Controller('auth')
export class AuthController {
  // [NESTJS] Dependency Injection for auth business logic
  constructor(private readonly authService: AuthService) {}

  // REGISTER: Public endpoint to onboard new system users
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  async register(@Body() registerDto: RegisterDto) {
    // 1. [SIDE EFFECT] Delegate registration and profile creation to AuthService
    return this.authService.register(registerDto);
  }

  // LOGIN: Verifies identity and exchanges credentials for an access token
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    // 1. [SECURITY] Validate credentials and generate JWT session
    return this.authService.login(loginDto);
  }
}
