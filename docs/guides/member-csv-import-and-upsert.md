# Member CSV Import & Atomic Upsert Guide

This document describes the architecture, CSV format specifications, two-tier matching logic, data preservation rules, and admin inspection workflows for importing and upserting members in WelcomeHub.

---

## 1. Overview & Problem Solved

### The Problem

Importing volunteer and member lists into an active database poses several risks:

1. **Accidental Duplication**: Re-uploading a list can create duplicate accounts if members are matched naively.
2. **Data Destruction (Wiping Fields)**: Incomplete CSV files (e.g. omitting phone or birthdate) can inadvertently overwrite existing contact info with `NULL`.
3. **RFID Reassignments**: When members lose or receive new RFID cards, updating their `member_id` without creating a duplicate record or losing their attendance history is difficult.
4. **Blind Imports**: Committing large CSV batches without seeing exactly which fields will be updated or which users will be created can cause unintended changes.

### The Solution

WelcomeHub provides a safe, atomic, two-tier CSV import pipeline at `/admin/members/import`:

- **Pre-flight Comparison Snapshot**: Compares the parsed CSV against a full member snapshot before executing any database changes.
- **Two-Tier Matching**: Identifies existing records via **RFID** (`member_id`) or **Name Triplet** (`first_name` + `last_name` + `nickname`).
- **Detailed Row-by-Row Diffing**: Visualizes exact field-level changes (`Old Value` → `New Value`) and displays all new attributes before import.
- **Field Preservation**: Empty contact values in update rows never overwrite existing emails, phone numbers, or birthdates.
- **Atomic Batch Upsert**: Commits the entire batch through the `bulk-upsert-members` Edge Function and `apply_bulk_member_upsert` database transaction. If any row violates database constraints, the entire batch is rejected.

---

## 2. CSV Templates

### Minimum Template (Required Fields Only)

Every row in the CSV **must** provide the following 6 fields:

```csv
member_id,first_name,last_name,nickname,role,category
RFID-001,John,Doe,JD,Member,Adults
RFID-002,Jane,Smith,Janey,Prayer Coach,Adults
```

### Recommended Template (With Common Optional Fields & Sunday Schedules)

Includes contact information, birthdate, start date, and Sunday service commitments:

```csv
member_id,first_name,last_name,nickname,role,category,email,phone,date_of_birth,first_sunday,second_sunday,third_sunday,fourth_sunday,fifth_sunday
RFID-001,John,Doe,JD,Member,Adults,john.doe@example.com,09171234567,1990-05-15,,,,,
RFID-002,Jane,Smith,Janey,Prayer Coach,Adults,jane.smith@example.com,09181234567,1995-10-20,9AM,9AM,9AM,9AM,
```

---

## 3. Accepted Header Column Aliases

Headers are normalized automatically (case-insensitive, trims whitespace and punctuation). You can use any of the supported aliases below:

| Field                 | Required? | Accepted Header Aliases                                              | Description / Format                                                       |
| :-------------------- | :-------: | :------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **Member ID**         |  **Yes**  | `member_id`, `memberid`, `rfid`                                      | RFID or barcode identifier (e.g. `RFID-001`). Must be unique in the batch. |
| **First Name**        |  **Yes**  | `first_name`, `firstname`, `first`                                   | Given name (e.g. `John`).                                                  |
| **Last Name**         |  **Yes**  | `last_name`, `lastname`, `surname`, `last`                           | Family name / surname (e.g. `Doe`).                                        |
| **Nickname**          |  **Yes**  | `nickname`, `nick_name`, `nick`                                      | Preferred name or call sign (e.g. `JD`).                                   |
| **Role**              |  **Yes**  | `role`                                                               | Role title (e.g. `Member`, `Prayer Coach`, `Usher`, `OIC`).                |
| **Category**          |  **Yes**  | `category`                                                           | Demographic grouping (e.g. `Adults`, `Youth`, `Kids`).                     |
| **Email**             |    No     | `email`, `email_address`                                             | Valid email address. Must not collide with another member.                 |
| **Phone**             |    No     | `phone`, `phone_number`, `mobile`, `contact_number`                  | Contact or mobile number.                                                  |
| **Date of Birth**     |    No     | `date_of_birth`, `dateofbirth`, `dob`, `birthdate`                   | Accepts `YYYY-MM-DD`, `M/D/YY`, or `M/D/YYYY`. Normalized to `YYYY-MM-DD`. |
| **Sunday Commitment** |    No     | `1st_sunday`, `2nd_sunday`, `3rd_sunday`, `4th_sunday`, `5th_sunday` | Service commitment times (e.g. `9AM`, `12NN`, `9AM, 12NN`).                |
| **Start Date**        |    No     | `start_date`, `startdate`, `date_joined`, `joined_date`              | Date started serving (normalized to `YYYY-MM-DD`).                         |
| **OIC Flag**          |    No     | `is_oic`, `isoic`                                                    | Officer in charge boolean (`true`/`false`, `1`/`0`, `yes`/`no`).           |

> [!NOTE]
> Any column header not matching a core field is stored in `users.metadata[column_key]`. `Last Activity` / `lastactivity` exported from earlier list views is automatically ignored.

---

## 4. Two-Tier Matching & Operation Classification

During pre-flight validation, each row is matched against existing records in `public.users`:

```
               ┌────────────────────────┐
               │     CSV Input Row      │
               └───────────┬────────────┘
                           │
             Does member_id (RFID) exist?
                    /              \
                 YES                NO
                 /                    \
     ┌──────────────────────┐    Does Name Triplet
     │  Operation: UPDATE   │    (first+last+nickname)
     │ (Existing RFID match)│    match 1 existing user?
     └──────────────────────┘           /          \
                                     YES            NO
                                     /                \
                       ┌────────────────────────┐   ┌──────────────────────┐
                       │ Operation: UPDATE RFID │   │  Operation: INSERT   │
                       │ (Reassign RFID to user)│   │  (New member record) │
                       └────────────────────────┘   └──────────────────────┘
```

### 1. `insert` (New Member)

Triggered when neither `member_id` nor the Name Triplet exists in the system. Creates a new record in `public.users`.

### 2. `update` (Existing Member)

Triggered when `member_id` matches an existing member. Updates the member's name, role, category, and metadata.

### 3. `update_member_id` (RFID Reassignment)

Triggered when `member_id` is new, but the Name Triplet matches **exactly one** existing user in the database. Safely updates the user's RFID to the new `member_id` without creating a duplicate record or losing past service records.

### 4. `error` (Conflict Prevention)

Triggered when safety constraints are violated:

- **RFID vs Triplet Cross-Collision**: If RFID matches User A, but the Name Triplet matches User B, the import halts to prevent corrupting accounts.
- **Batch Duplicates**: The same `member_id` or Name Triplet appears multiple times in the uploaded CSV.
- **Ambiguous Triplet**: Multiple existing database members share the same Name Triplet.
- **Email Conflict**: The provided email already belongs to a different member in the system.

---

## 5. Safe Partial Updates & Field Preservation

To protect existing records from being wiped when importing partial CSVs, the database RPC `apply_bulk_member_upsert` uses SQL `coalesce` rules:

```sql
email = coalesce(v_email, public.users.email),
phone = coalesce(v_phone, public.users.phone),
date_of_birth = coalesce(case when v_date_of_birth is null then null else v_date_of_birth::date end, public.users.date_of_birth),
```

- If `email`, `phone`, or `date_of_birth` is omitted or empty in the CSV for an existing member, their **current value is preserved**.
- Only explicitly provided, non-empty values update existing contact details.
- Role, category, and metadata are updated according to the CSV input.

---

## 6. Admin UI Features (`/admin/members/import`)

### 1. Collapsible Format Guide

At the top of the import screen, the **CSV Format Guide & Guidelines** card provides:

- Complete breakdown of mandatory vs optional columns and accepted aliases.
- Concise overview of matching rules and conflict protection.
- A **Copy Template** button to copy sample CSV data directly to the clipboard.

### 2. Expandable Field-Level Diff Inspection

After selecting a CSV file, the preview table provides full transparency into pending modifications:

- **Main Table Row**: Displays Row #, RFID, Full Name, Action badge (`Insert`, `Update`, `Update Member ID`, `Error`), and a concise summary of changes (e.g., `Updating 3 field(s): Role, Category, Phone`).
- **Expandable Details**: Clicking the chevron or using the **Expand All Details** button expands an inline inspector:
  - For **Updates**: Renders a card grid comparing existing values to new CSV values (`Old Value` → `New Value`). If no fields changed, it explicitly indicates the record is already up-to-date.
  - For **Inserts**: Displays all attributes that will be populated on the new user profile.
  - For **Errors**: Shows the exact validation reason(s) blocking the import.

### 3. Pre-Commit Confirmation Gate

Clicking **Commit Import** opens an atomic confirmation modal summarizing the final counts:

- Number of new members to be inserted.
- Number of existing members to be updated.
- Number of member IDs being reassigned.
- Explicit warning that the batch is committed in an all-or-nothing transaction.
