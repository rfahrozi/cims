import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '@cims/domain';

export interface HearingImportPreviewRequest {
  sourceCode: string;
  caseNumber: string;
}

export interface HearingImportCapability {
  phase: 'FUTURE_DATABASE_IMPORT';
  enabled: boolean;
  adapter: string;
  readOnly: true;
  stages: string[];
}

export abstract class HearingImportGateway {
  abstract capability(): HearingImportCapability;
  abstract requestPreview(input: HearingImportPreviewRequest): Promise<never>;
}

@Injectable()
export class DisabledHearingImportGateway extends HearingImportGateway {
  constructor(private readonly config: ConfigService) {
    super();
  }

  capability(): HearingImportCapability {
    return {
      phase: 'FUTURE_DATABASE_IMPORT',
      enabled: this.config.get<string>('HEARING_IMPORT_ENABLED') === 'true',
      adapter: this.config.get<string>('HEARING_IMPORT_ADAPTER') ?? 'DISABLED',
      readOnly: true,
      stages: [
        'SOURCE_HEALTH',
        'STAGING',
        'MAPPING',
        'VALIDATION',
        'PREVIEW',
        'APPROVAL',
        'IDEMPOTENT_COMMIT',
        'RECONCILIATION'
      ]
    };
  }

  async requestPreview(input: HearingImportPreviewRequest): Promise<never> {
    const capability = this.capability();
    throw new DomainError(
      capability.enabled ? 'HEARING_IMPORT_ADAPTER_NOT_CONFIGURED' : 'HEARING_IMPORT_NOT_ENABLED',
      capability.enabled
        ? 'Adapter database sumber belum dikonfigurasi.'
        : 'Penarikan data dari database disiapkan untuk fase lanjutan dan belum diaktifkan.',
      capability.enabled ? 501 : 503,
      { source_code: input.sourceCode, case_number: input.caseNumber, ...capability }
    );
  }
}
