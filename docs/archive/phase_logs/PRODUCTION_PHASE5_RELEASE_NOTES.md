# CIMS v0.18.0 Production Phase 5 Release Notes

## Added

- Manual initial hearing intake by Substitute Clerk
- Maker-checker activation by Court Clerk
- First workflow gate `HEARING_DATA`
- Case and hearing separation with hearing sequence
- Defendant initial data and protected-identity metadata
- Optimistic concurrency and duplicate prevention
- Revision history, audit evidence, dynamic hearing assignment, and global hearing selector
- PostgreSQL RLS for intake entities
- Disabled-by-default future database-import foundation
- React and shadcn/ui intake page with Manual and Database Import tabs

## Production status

The source baseline and pure domain tests are ready for official CI and PostgreSQL SIT. Full framework build, live migration, OIDC mapping, database encryption verification, RLS tests, and cross-institution UAT remain required before nonproduction pilot approval.
