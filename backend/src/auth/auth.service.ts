import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, password } = registerDto;
    const userKey = `user:${username}`;

    const existingUser = await this.redisService.exists(userKey);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.redisService.hset(userKey, 'username', username);
    await this.redisService.hset(userKey, 'password', hashedPassword);
    await this.redisService.hset(userKey, 'createdAt', new Date().toISOString());

    return { message: 'User registered successfully' };
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;
    const userKey = `user:${username}`;

    const user = await this.redisService.hgetall(userKey);
    if (!user || !user.username) {
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
