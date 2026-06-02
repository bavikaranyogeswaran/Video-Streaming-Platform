// =================================================================================
// USERS SERVICE (Postgres-backed account store)
// =================================================================================
// Single-responsibility: persistence + lookup of User rows. No password
// verification, no token issuance — those stay in AuthService.
// =================================================================================

import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /**
   * Lookup including the password column. Use only inside AuthService for
   * credential verification — never return this object to a controller.
   */
  async findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.username = :username', { username })
      .getOne();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.users.findOne({ where: { username } });
  }

  /**
   * Insert a new user. If Postgres rejects the row because of the UNIQUE
   * index on username, surface that as a 409 ConflictException — the only
   * race-condition-safe way to do this check.
   */
  async create(username: string, email: string, hashedPassword: string): Promise<User> {
    try {
      const user = this.users.create({ username, email, password: hashedPassword });
      return await this.users.save(user);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        // Postgres unique_violation
        (err as any).code === '23505'
      ) {
        throw new ConflictException('Username or email already exists');
      }
      this.logger.error(`Unexpected error creating user: ${(err as Error).message}`);
      throw err;
    }
  }

  async markAsVerified(userId: string): Promise<void> {
    await this.users.update(userId, { isVerified: true });
  }
}
