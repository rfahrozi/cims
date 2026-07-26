import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PersistenceModeService {
  readonly mode: 'MEMORY' | 'POSTGRES';

  constructor(config: ConfigService) {
    this.mode =
      ((config && config.get<string>('PERSISTENCE_MODE')) ?? 'MEMORY').toUpperCase() === 'POSTGRES'
        ? 'POSTGRES'
        : 'MEMORY';
  }

  get postgres(): boolean {
    return this.mode === 'POSTGRES';
  }
}
