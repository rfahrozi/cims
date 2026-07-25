# Append-only Audit Events

Status: Proposed for Sprint 0 approval

## Decision

Audit records are never updated or deleted through application flows. Corrections use compensating events.

## Consequences

- Must be reflected in API, database, tests, and UI states.
- Changes require Product Council review and a superseding ADR.
