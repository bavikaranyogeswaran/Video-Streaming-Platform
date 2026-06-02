// =================================================================================
// USER ENTITY (Auth System of Record)
// =================================================================================
// Persisted in Postgres. The UNIQUE constraint on username is the authoritative
// guard against duplicate accounts — replaces the racy EXISTS-then-HSET pattern
// that the old Redis-backed AuthService used.
// =================================================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // UNIQUE — Postgres rejects duplicates at insert time. Race-free.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  username!: string;

  // bcrypt hash — never expose this in API responses.
  @Column({ type: 'varchar', length: 100, select: false })
  password!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
