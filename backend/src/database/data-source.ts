// =================================================================================
// TYPEORM DATA SOURCE (CLI-only)
// =================================================================================
// The Nest TypeOrmModule.forRoot(...) call wires the connection at runtime.
// This file exists so the TypeORM CLI (used by `migration:generate` and
// `migration:run`) has a standalone DataSource it can point at outside of
// the Nest bootstrap. Keep the entity/migration globs in sync with app.module.
// =================================================================================

import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { CreateUsersTable1748000000000 } from './migrations/1748000000000-CreateUsersTable';

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'vsp',
  password: process.env.POSTGRES_PASSWORD || 'vsp_pg_change_in_prod_2024',
  database: process.env.POSTGRES_DB || 'vsp',
  entities: [User],
  migrations: [CreateUsersTable1748000000000],
  // Never auto-sync via CLI either — migrations are the only schema authority.
  synchronize: false,
});
