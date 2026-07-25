# Target Architecture

```text
React + Vite + shadcn/ui
        |
        v
NestJS API Gateway / Modular Monolith
        |
        +-- IAM
        +-- Determination
        +-- Scheduling
        +-- Notice / Readiness / Hearing Operations
        +-- Compliance / Audit
        |
        +--> PostgreSQL repositories
        +--> Zoom Provider Adapter
        +--> Legacy compatibility proxy during migration
```

Domain rules live outside NestJS decorators so they can be unit-tested and reused by workers or integration services.
