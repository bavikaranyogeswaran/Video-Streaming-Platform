import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Initial schema — `users` table for auth.
 *
 * Created on the day we cut over from Redis-backed accounts to a proper
 * Postgres system of record. Mirrors what `synchronize: true` was producing
 * at the time we flipped it off:
 *
 *   - uuid PK with uuid_generate_v4() default (uuid-ossp extension)
 *   - unique index on username — race-free duplicate detection
 *   - timestamptz createdAt / updatedAt with now() defaults
 */
export class CreateUsersTable1748000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The default for PrimaryGeneratedColumn('uuid') is uuid_generate_v4(),
    // which lives in the uuid-ossp extension. Enable it idempotently.
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true, // ifNotExists
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_username_unique',
        columnNames: ['username'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_users_username_unique');
    await queryRunner.dropTable('users');
    // Intentionally do NOT drop the uuid-ossp extension on down() — other
    // schemas might depend on it.
  }
}
