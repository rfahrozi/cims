# Hearing Intake Data Dictionary v0.18

| Field | Meaning | Required | Validation and control |
|---|---|---:|---|
| `case_number` | Official case number used as reference | Yes | Normalized for duplicate checking, maximum 150 characters |
| `official_case_reference` | Reference to the official case system or document | No | Metadata reference only |
| `case_classification` | General or special criminal classification | Yes | Controlled enum |
| `case_type_code` | Case category code | Yes | 2 to 50 characters |
| `case_title` | Short case title | Yes | 3 to 300 characters |
| `hearing_type` | Procedural hearing type | Yes | Controlled reference list in UI |
| `hearing_sequence` | Sequence of hearing within one case | Yes | Integer 1 to 999, unique for non-archived hearing in a case |
| `court_organization_id` | Court responsible for the hearing | Yes | Must be within authenticated court scope |
| `prosecution_organization_id` | Prosecution office involved | Yes | Existing organization reference |
| `corrections_organization_id` | Detention or corrections location | Conditional | Required where detained participants are involved |
| `defendant_custody_status` | Aggregate custody status | Yes | `DETAINED`, `NOT_DETAINED`, `MIXED`, or `UNKNOWN` |
| `defendants[].display_name` | Defendant name | Yes | Encrypted at rest in PostgreSQL mode |
| `defendants[].alias` | Display alias for protected identity | Conditional | Used where identity masking applies |
| `defendants[].protected_identity` | Protected-identity marker | Yes | Drives masking and restricted display |
| `defendants[].custody_status` | Individual custody status | Yes | Controlled enum |
| `defendants[].detention_organization_id` | Individual detention location | Conditional | Required for detained defendant |
| `notes` | Operational note | No | Must not contain secrets or unnecessary sensitive data |
| `intake_status` | Intake lifecycle status | System | Draft, submitted, active, returned, archived |
| `data_source` | Origin of record | System | Manual now, external database in a future phase |
| `row_version` | Optimistic concurrency version | System | Required on update |
| `created_by`, `updated_by` | Actor identifiers | System | From authenticated identity |
| `submitted_by`, `activated_by` | Maker-checker evidence | System | Creator cannot activate the same record |
