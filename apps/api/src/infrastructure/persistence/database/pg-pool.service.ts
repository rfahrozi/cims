import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import { secretValue } from '../../config/secret-value.js';

@Injectable()
export class PgPoolService implements OnApplicationShutdown {
  readonly pool: Pool;

  constructor(config: ConfigService) {
    const url = secretValue(config, 'DATABASE_URL');
    this.pool = new Pool({
      connectionString: url,
      max: Number(config && config.get ? (config.get<string>('DB_POOL_MAX') ?? 20) : 20),
      min: Number(config && config.get ? (config.get<string>('DB_POOL_MIN') ?? 0) : 0),
      idleTimeoutMillis: Number(
        config && config.get ? (config.get<string>('DB_IDLE_TIMEOUT_MS') ?? 30_000) : 30_000
      ),
      connectionTimeoutMillis: Number(
        config && config.get ? (config.get<string>('DB_CONNECTION_TIMEOUT_MS') ?? 5_000) : 5_000
      ),
      statement_timeout: Number(
        config && config.get ? (config.get<string>('DB_STATEMENT_TIMEOUT_MS') ?? 15_000) : 15_000
      ),
      query_timeout: Number(
        config && config.get ? (config.get<string>('DB_QUERY_TIMEOUT_MS') ?? 20_000) : 20_000
      ),
      application_name:
        (config && config.get ? config.get<string>('DB_APPLICATION_NAME') : undefined) ??
        'cims-api',
      ssl:
        (config && config.get ? config.get<string>('DB_SSL') : undefined) === 'true'
          ? { rejectUnauthorized: config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false' }
          : undefined
    });
  }

  async query<T extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = []
  ): Promise<T[]> {
    return (await this.pool.query<T>(text, [...values])).rows;
  }

  async transactionAs<T>(user: CurrentUser, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.transaction(async (client) => {
      await client.query(
        `select
           set_config('cims.organization_ids',$1,true),
           set_config('cims.hearing_assignments',$2,true),
           set_config('cims.is_system_admin',$3,true),
           set_config('cims.user_id',$4,true),
           set_config('application_name',$5,true)`,
        [
          user.organizationIds.join(','),
          user.hearingAssignments.join(','),
          String(user.roles.includes('SYSTEM_ADMIN')),
          user.id,
          `cims-api:${user.id}`.slice(0, 63)
        ]
      );
      return work(client);
    });
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
