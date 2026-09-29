# Purist Journal

## 2026-09-29 - Validate Email Template Database Rows

**Deviation:** Email-template Supabase responses were cast directly to `EmailTemplate`, including JSONB `required_variables`.

**Learning:** This table returns non-null timestamps and a string-array JSONB field; a cast cannot verify those response shapes at runtime.

**Standard:** Define the row contract in `src/lib/domain/email-templates/schemas.ts`, infer `EmailTemplate` from the schema, and parse every list, detail, insert, and update response in the domain API.
