# CIMS API v0.9.0

Run from repository root:

```bash
npm run mock:provider
npm run api
```

Key Sprint 8-9 domains:

- `/api/v1/hearings/{hearingId}/participants`
- `/api/v1/public/join-tokens:exchange`
- `/api/v1/hearings/{hearingId}/attendance`
- `/api/v1/hearings/{hearingId}:start`
- `/api/v1/hearings/{hearingId}:suspend`
- `/api/v1/hearings/{hearingId}:resume`
- `/api/v1/hearings/{hearingId}:end`
- `/api/v1/hearings/{hearingId}/consultations`
- `/api/v1/hearings/{hearingId}/incidents`

The local adapter uses Node.js built-in SQLite. PostgreSQL remains the production target.
