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
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Hash the password, insert a new users row. UsersService.create translates
   * a Postgres unique-violation into 409 ConflictException — we don't need
   * to pre-check existence.
   */
  async register(registerDto: RegisterDto) {
    const { username, password } = registerDto;
    const hashedPassword = await bcrypt.hash(password, this.BCRYPT_ROUNDS);
    await this.usersService.create(username, hashedPassword);
    return { message: 'User registered successfully' };
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

    const payload = { sub: user.username, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
      username: user.username,
    };
  }
}
