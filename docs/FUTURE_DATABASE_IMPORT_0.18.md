# Future Database Import Foundation v0.18

## Current decision

Database import is not enabled in v0.18. Initial hearing data is entered manually by the Substitute Clerk. The import feature is present only as a controlled architectural foundation and disabled API contract.

## Required operating model

The future connector must be read-only against the source database. It must never update, delete, lock, or execute stored business procedures in the source system. Connection credentials must be stored in an approved secret manager and referenced by secret identifier, not persisted in CIMS tables.

## Planned stages

1. Source registration and approved secret reference
2. Connectivity and schema health check
3. Read-only fetch by stable source record identifier
4. Raw payload storage in staging
5. Field mapping and normalization
6. Validation and duplicate detection
7. Preview for an authorized reviewer
8. Maker-checker approval
9. Idempotent transaction commit
10. Reconciliation with the source snapshot
11. Audit evidence and import report

## Data provenance

Imported records will use `data_source=EXTERNAL_DATABASE` and retain:

- source system code
- source record ID
- source update time
- source snapshot hash
- mapping version
- import job ID
- reviewer and approval time

## Tables prepared

- `hearing_import_sources`
- `hearing_import_jobs`
- `hearing_import_staging`

## Disabled endpoints

- `GET /api/v1/hearing-import/sources` returns capability and source status.
- `POST /api/v1/hearing-import/jobs` returns `HEARING_IMPORT_NOT_ENABLED` while the feature flag is false.
- When the flag is enabled without a reviewed adapter, the endpoint returns `HEARING_IMPORT_ADAPTER_NOT_CONFIGURED`.

## Production prerequisites

- Data-sharing authority and approved data dictionary
- Source owner approval
- Dedicated read-only database account
- Network allowlist and mTLS or equivalent secure channel
- Field-level mapping approval
- Test dataset and reconciliation criteria
- Capacity and timeout limits
- Audit, privacy, retention, and incident procedures
- SIT and cross-institution UAT sign-off
