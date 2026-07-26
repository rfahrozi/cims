
# Migration Matrix v0.16.0

| Domain | Legacy status | TypeScript status | Persistence status | Production decision |
|---|---|---|---|---|
| IAM and identity | Development login | Generic OIDC guard and policy model | Identity provider claims | Conditional, provider SIT pending |
| Determination | Native NestJS | Migrated | InMemoryStore | No production |
| Scheduling | Native NestJS | Migrated | InMemoryStore | No production |
| Official notice | Native NestJS | Migrated | InMemoryStore | No production |
| Readiness and verification | Native NestJS | Migrated | InMemoryStore | No production |
| Virtual session | Native NestJS | Migrated | InMemoryStore and provider adapter | No production |
| Hearing control | Native NestJS | Migrated | InMemoryStore | No production |
| Participant and access | Legacy available | Native TypeScript module | PostgreSQL target schema plus DEV adapter | SIT baseline |
| Attendance | Legacy available | Native TypeScript module | PostgreSQL append-only target plus DEV adapter | SIT baseline |
| Private consultation | Legacy available | Native TypeScript module | PostgreSQL target plus DEV adapter | SIT baseline |
| Incident management | Legacy available | Native TypeScript module | PostgreSQL append-only target plus DEV adapter | SIT baseline |
| Audit and reconciliation | Legacy available | Partial TypeScript | Repository migration pending | No production |
