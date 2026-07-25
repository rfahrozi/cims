# Manual Hearing Intake v0.18

## Purpose

Initial hearing data is entered manually by the Substitute Clerk before determination, scheduling, notice, readiness, and virtual-session workflows can begin. Manual entry is the authoritative CIMS intake mechanism for this phase. CIMS remains an orchestration system and does not replace the official case register.

## Authorized roles

- `SUBSTITUTE_CLERK` creates, edits, submits, and reopens a record.
- `COURT_CLERK` reviews, returns, and activates a submitted record.
- `SYSTEM_ADMIN` is reserved for controlled support and must not be used for routine maker-checker approval.

## Lifecycle

`DRAFT -> SUBMITTED -> ACTIVE`

Correction path:

`SUBMITTED -> RETURNED -> DRAFT -> SUBMITTED`

An intake record with status other than `ACTIVE` does not pass the `HEARING_DATA` workflow gate. Determination and scheduling services reject processing until the gate passes.

## Minimum data

- Case number and optional official reference
- General or special criminal classification
- Case type code and case title
- Hearing type and hearing sequence
- Court and prosecution organizations
- Corrections organization where applicable
- Defendant custody status
- At least one defendant
- Protected-identity indicator and optional alias
- Notes where operationally necessary

## Controls

- Case numbers are normalized before duplicate checking.
- Active duplicate key is case plus hearing sequence.
- Updates require `expected_row_version`.
- Creator and activator must be different users.
- Substitute Clerk may only create or edit within the court organization scope in the authenticated identity.
- Defendant names are encrypted in PostgreSQL mode.
- Every create, update, submit, activate, return, and reopen action creates an immutable revision and audit event.
- Organization and user assignments are synchronized when draft data changes.

## API

- `GET /api/v1/hearing-intake/reference-data`
- `GET /api/v1/hearing-intake/manual`
- `POST /api/v1/hearing-intake/manual`
- `GET /api/v1/hearing-intake/manual/{hearingId}`
- `PATCH /api/v1/hearing-intake/manual/{hearingId}`
- `POST /api/v1/hearing-intake/manual/{hearingId}/submit`
- `POST /api/v1/hearing-intake/manual/{hearingId}/activate`
- `POST /api/v1/hearing-intake/manual/{hearingId}/return`
- `POST /api/v1/hearing-intake/manual/{hearingId}/reopen`

## User interface

The `Data Persidangan` page provides manual entry, defendant management, lifecycle actions, search, and intake status. A global hearing selector switches the active hearing context used by all downstream workflow pages.
