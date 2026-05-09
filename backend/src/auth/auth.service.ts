// =================================================================================
// AUTH SERVICE (The Identity Provider)
// =================================================================================
// This service handles user registration and credential verification.
// It manages password security via hashing and generates JWT 
// tokens for authenticated sessions.
// =================================================================================

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  // [NESTJS] Injecting Redis for user persistence and JWT for token generation
  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  // REGISTER: Creates a new user identity in the distributed store
  async register(registerDto: RegisterDto) {
    const { username, password } = registerDto;
    const userKey = `user:${username}`;

    // 1. [DB] Check for username collision in Redis
    // [DB] EXISTS user:{username}
    const existingUser = await this.redisService.exists(userKey);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // 2. [SECURITY] Hash password using bcrypt for secure storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. [DB] Persist user profile as a Redis Hash
    // [DB] HSET user:{username} -> {username, password, createdAt}
    await this.redisService.hset(userKey, 'username', username);
    await this.redisService.hset(userKey, 'password', hashedPassword);
    await this.redisService.hset(userKey, 'createdAt', new Date().toISOString());

    return { message: 'User registered successfully' };
  }

  // LOGIN: Verifies credentials and issues an access token
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;
    const userKey = `user:${username}`;

    // 1. [DB] Fetch user profile from Redis
    // [DB] HGETALL user:{username}
    const user = await this.redisService.hgetall(userKey);
    if (!user || !user.username) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. [SECURITY] Compare provided password with hashed version
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. [SECURITY] Generate signed JWT payload for the user session
    const payload = { sub: user.username, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
      username: user.username,
    };
  }
}
