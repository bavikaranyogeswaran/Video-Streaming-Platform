// =================================================================================
// AUTH SERVICE (The Identity Provider)
// =================================================================================
// User credentials live in Postgres (UsersService) — a relational store gives
// us a real UNIQUE constraint on username, eliminating the race the previous
// Redis-backed EXISTS-then-HSET pattern had. JWT issuance stays here.
// =================================================================================

import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Hash the password, insert a new users row. UsersService.create translates
   * a Postgres unique-violation into 409 ConflictException — we don't need
   * to pre-check existence.
   */
  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;
    const hashedPassword = await bcrypt.hash(password, this.BCRYPT_ROUNDS);
    const user = await this.usersService.create(username, email, hashedPassword);
    
    const token = uuidv4();
    await this.redisService.set(`verify_token:${token}`, user.id, 86400);
    await this.mailService.sendVerificationEmail(email, token);

    return { message: 'User registered successfully. Please check your email to verify your account.' };
  }

  /**
   * Verify credentials and mint a JWT. Generic 401 on any failure so we
   * don't leak whether the username exists.
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.usersService.findByUsernameWithPassword(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    const payload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
      username: user.username,
    };
  }

  async verifyEmail(token: string) {
    const userId = await this.redisService.get(`verify_token:${token}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
    
    await this.usersService.markAsVerified(userId);
    await this.redisService.del(`verify_token:${token}`);
    
    return { message: 'Email verified successfully. You can now log in.' };
  }
}
