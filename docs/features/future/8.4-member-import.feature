Feature: Member Import - Bulk CSV Upload
  # IMPLEMENTED: This capability has moved to Admin Members feature docs.
  # See docs/features/6-admin-members/6.5-import-members-csv.feature

  As an admin
  I want to import member data from CSV
  So that I can bulk-load members into the system instead of manually creating each one

  Context: Business Rules (Planned)
    - Admin uploads CSV with member data (ID, name, email, phone, role, category)
    - System validates all rows before importing (fail-fast)
    - Required columns: Member ID, Full Name
    - Optional columns: Email, Phone, Nickname, Role, Category, Date of Birth
    - Validation checks: ID uniqueness, email format, phone format, no duplicate IDs in upload
    - Failed validations reported with row numbers
    - Import options: skip duplicates, or update existing (if ID matches)
    - CSV preview shown before confirming import
    - Import progress displayed during execution
    - Import creates audit log entry with record count and any errors
    - Imported members available for registration immediately

  Scenario: Upload and import members from CSV
    Given I'm on the Import Members page
    When I click "Upload CSV"
    And I select a file with 100 members
    Then system validates the file
    And shows preview: "100 rows to import"
    And preview shows first few rows as sample
    And I can proceed or cancel

  Scenario: CSV with required columns
    Given a CSV with columns: Member ID, Full Name, Email, Phone
    When I upload it
    Then system accepts the file
    And recognizes each column correctly
    And proceeds to preview/import

  Scenario: CSV with missing required column
    Given a CSV missing "Member ID" column (required)
    When I upload it
    Then system rejects with error: "Missing required column: Member ID"
    And prompts to fix CSV and try again

  Scenario: Validation before import
    Given a CSV with 100 rows
    And 3 rows have invalid emails (e.g., "notanemail")
    And 2 rows have duplicate IDs
    When I attempt import
    Then system validates all rows
    And shows errors: "Row 5: Invalid email. Row 10: Invalid email. Row 15: Invalid email. Rows 25 & 67: Duplicate ID."
    And import is blocked until CSV is fixed

  Scenario: Preview import before confirming
    Given CSV has passed validation
    When system shows import preview
    Then I see:
      - Sample of first 5 rows with mapped columns
      - Total count: "100 members to import"
      - Warning if duplicates exist: "5 members already exist. They will be [skipped/updated]."
    And buttons: "Confirm Import" or "Cancel"

  Scenario: Confirm and execute import
    Given preview is shown
    When I click "Confirm Import"
    Then import begins
    And progress bar shows: "Importing... (45 of 100 members processed)"
    And user can continue browsing (async import)

  Scenario: Import with duplicate handling - skip
    Given 100 members in CSV
    And 10 IDs already exist in system
    When I select option: "Skip existing members"
    And I confirm import
    Then 90 new members are imported
    And 10 duplicates are skipped
    And report shows: "100 processed, 90 imported, 10 skipped"

  Scenario: Import with duplicate handling - update
    Given 100 members in CSV
    And 10 IDs already exist in system
    When I select option: "Update existing members"
    And I confirm import
    Then 100 members are imported/updated
    And existing 10 are updated with new data
    And report shows: "100 processed, 90 new, 10 updated"

  Scenario: Import completion notification
    Given an import is in progress
    When the import completes
    Then I see: "Import completed successfully"
    And report: "100 members imported, 0 errors"
    And option to download import log

  Scenario: Import with errors
    Given an import has some errors
    When it completes
    Then report shows: "100 members processed, 98 imported, 2 failed"
    And I can download error log with details
    And error log shows row numbers and reasons for each failure

  Scenario: Imported members visible immediately
    Given I've just imported 100 members
    When I navigate to Members list
    Then new members appear in the list
    And I can search and find them
    And they can immediately register for events

  Scenario: Audit log for imports
    Given an import completes
    When I view audit logs
    Then entry shows: "Admin [name] imported 100 members on [date/time]"
    And log includes import filename and status (success/partial/failed)

  Scenario: CSV template download
    Given I need to import members
    When I click "Download CSV Template"
    Then a template CSV is provided
    And template shows required columns with example data
    And template is ready to fill in
