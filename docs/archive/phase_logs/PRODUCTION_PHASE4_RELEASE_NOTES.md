# CIMS v0.17.0 Production Persistence and Integration Phase 4

## Added

- PostgreSQL repositories for all core hearing workflow modules
- transaction-scoped RLS context
- optimistic concurrency with row versions
- checksum-verified migration runner
- PostgreSQL schema smoke test
- transactional outbox with retry and dead-letter handling
- dedicated NestJS worker application
- official notification HTTP gateway
- asynchronous virtual-session provisioning
- official-system reconciliation workflow
- signed provider webhook ingestion and replay prevention
- HMAC tamper-evident audit chain
- file-mounted secret support
- reconciliation and operations pages in React shadcn/ui
- Kubernetes migration Job and worker Deployment

## Compatibility

`PERSISTENCE_MODE=MEMORY` remains available for local demonstrations. SIT and production must use `POSTGRES`. API contracts from v0.16 remain available for reference. The v0.17 contract is `packages/contracts/openapi-cims-production-v0.17.yaml`.

## Release decision

Source and static validation: GO.
PostgreSQL SIT: CONDITIONAL GO pending execution on an environment with npm dependencies and PostgreSQL.
Production and real case data: NO-GO pending all operational gates.

## Production detail added during finalization

- durable Zoom create-session idempotency through `video_provider_operations`
- exact provider-neutral HTTP contract between the worker and TypeScript Zoom adapter
- file-mounted Zoom credentials and database URL support
- Zoom API timeout and OAuth health verification
- logical room capability reporting without representing manual Zoom controls as automated success
- RLS coverage for participant tokens, participant sessions, attendance, consultations, and incident actions
- token-exchange transaction context for public single-use access
- non-root Nginx runtime on port 8080
- Kubernetes web and Zoom-provider deployments, services, PDBs, and network policies
- explicit dependency lockfile release gate
