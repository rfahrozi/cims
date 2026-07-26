import { Injectable } from '@nestjs/common';
import { PersistenceModeService } from './persistence-mode.service.js';
import { PgPoolService } from './pg-pool.service.js';

@Injectable()
export class DatabaseHealthService {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly pg: PgPoolService
  ) {}

  async check(): Promise<{ status: 'UP' | 'SKIPPED'; mode: string; databaseTime?: string }> {
    if (!this.mode.postgres) return { status: 'SKIPPED', mode: this.mode.mode };
    const rows = await this.pg.query<{ database_time: string }>(
      'select now()::text as database_time'
    );
    return {
      status: 'UP',
      mode: this.mode.mode,
      databaseTime: rows[0]?.database_time ?? new Date().toISOString()
    };
  }
}
