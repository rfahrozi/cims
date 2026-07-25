# Dependency Lockfile Gate v0.17.0

The package does not contain a generated `package-lock.json` because the build environment could not reach the npm registry. This is a release blocker, not a completed control.

## Required official-repository action

```bash
npm install --package-lock-only
npm ci
npm run check:phase4
npm run typecheck
npm run build
npm audit --audit-level=high
```

The resulting lockfile must be reviewed, committed, protected from unreviewed direct edits, and used by CI through `npm ci`. The CI workflow temporarily falls back to `npm install` only so the source baseline can be bootstrapped. Production image promotion must reject a release built without the approved lockfile.
