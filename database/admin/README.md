# Database Administration Baseline

`roles-and-grants.template.sql` is an environment-specific post-migration template. It must not create login passwords. Bind OIDC-connected workloads or database credentials to the non-login group roles through the platform secret and identity process.

Required separation:

- schema owner and migration role
- API runtime role
- outbox worker role
- Zoom provider operation-ledger role
- read-only auditor role

The API, worker, Zoom provider, and auditor roles must not own business tables and must not have `BYPASSRLS`. Validate grants with `\dp`, `\df+`, `pg_roles`, and negative RLS tests before enabling application traffic.
