# Evidence Export v0.19

## Workflow

1. An authorized Court Clerk or Auditor requests an export for a hearing.
2. The request is stored with status `REQUESTED`.
3. A transactional outbox event is created in the same database transaction.
4. The dedicated worker claims the outbox event.
5. The worker creates evidence sections for hearing data, determination, schedule, notices, readiness, audit events, legal holds, and intake revisions.
6. Every section receives a SHA-256 content hash.
7. A deterministic manifest is created and hashed.
8. The JSON package is written through the evidence-storage adapter.
9. CIMS records the object URI, object hash, manifest hash, and item metadata.

## Security properties

- Export creation requires `evidence.export`.
- PostgreSQL Row Level Security limits the export to an accessible hearing.
- The API does not include provider secrets or private join URLs.
- Export items are immutable.
- Production storage must use the HTTP adapter and an external object store with encryption, retention, and access logging.

## Verification

A verifier can recompute each section hash and the manifest hash. A mismatch indicates that the package has changed after generation.
