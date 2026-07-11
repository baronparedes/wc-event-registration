Feature: Import Members via CSV
  As an admin
  I want to upload a CSV of members
  So that I can add or update many member profiles in one operation

  Context: Business Rules
    - Import is based on CSV column headers, not column order
    - Required member identity fields are RFID (Member ID), Firstname, Surname, and Nickname
    - I see a preview before committing the import
    - Preview shows which rows will be inserted, updated, or rejected
    - If any row has an error, the whole batch is rejected (all-or-nothing)
    - Non-core columns are saved as member metadata
    - Upsert rule 1: if RFID matches an existing member, that member is updated
    - Upsert rule 2: if RFID does not match but Firstname + Surname + Nickname matches exactly one member, that member's RFID is updated and profile is updated
    - If RFID match and name-triplet match point to different members, the row is rejected as conflict

  Scenario: Upload CSV and preview changes before commit
    Given I'm on the Import Members CSV page
    When I upload a valid CSV file
    Then I see a preview list with each row marked as:
      - Insert
      - Update
      - Update Member ID
      - Error
    And I see total counts for each preview outcome
    And I can choose to cancel or commit

  Scenario: Reordered columns are accepted
    Given my CSV has all required headers
    And the header order is different from the template
    When I upload the file
    Then the system maps data by header name
    And preview results are shown correctly

  Scenario: Missing required identity field blocks import
    Given a CSV row is missing Nickname
    When I upload the file
    Then the row is marked with validation error
    And commit is blocked until errors are resolved

  Scenario: Any single row error rejects the whole batch
    Given my CSV has 200 rows
    And 1 row has an identity conflict
    When I commit the import
    Then the import fails
    And no member records are changed
    And I see row-level error details

  Scenario: Non-core columns are stored as metadata
    Given my CSV includes Role, Category, SR_PWD, and Sunday columns
    When I import successfully
    Then core member profile fields are updated normally
    And all non-core columns are saved as member metadata

  Scenario: RFID changed for an existing member by name triplet
    Given a member already exists with matching Firstname, Surname, and Nickname
    And my CSV row has a new RFID for that same person
    When I commit the import
    Then the member's RFID is updated
    And the row is counted as "Update Member ID"

  Scenario: Conflict between RFID match and name-triplet match
    Given RFID in a row matches one existing member
    And Firstname + Surname + Nickname matches a different existing member
    When I upload or commit the import
    Then the row is marked as conflict
    And the batch cannot be committed
