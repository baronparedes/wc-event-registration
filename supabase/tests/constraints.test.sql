-- Database Constraint Tests for Chunk 6 QA
-- Run in Supabase Studio SQL Editor
--
-- These tests verify database-level constraints and data integrity:
-- 1. Unique constraint on (registration_id, event_field_id) in registration_answers
-- 2. Foreign key cascade when deleting registration
-- 3. Idempotency key prevents duplicate inserts
-- 4. Status enum only accepts valid values
-- 5. Timestamps are set correctly on create and update

-- ============================================================================
-- Setup: Create test data
-- ============================================================================

-- Get sample event and user IDs for testing
WITH
    test_setup
    AS
    (
        SELECT
            events.id AS event_id,
            users.id AS user_id,
            users.member_id,
            events.slug
        FROM events
  CROSS JOIN users
        WHERE events.slug = 'sample-event'
            AND users.member_id = '3865598676'
    
  LIMIT 1
)
INSERT INTO registrations
    (event_id, user_id, idempotency_key, status, submitted_at)
SELECT
    test_setup.event_id,
    test_setup.user_id,
    'test-constraint-' || NOW()
::text,
  'submitted'::registration_status,
  NOW
()
FROM test_setup
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Test 1: Unique Constraint on (registration_id, event_field_id)
-- ============================================================================

-- This test verifies that the unique constraint prevents duplicate answers
-- for the same field on the same registration.

DO $$
DECLARE
  v_reg_id uuid;
  v_field_id uuid;
  v_error_msg text;
BEGIN
    -- Get a test registration
    SELECT registrations.id
    INTO v_reg_id
    FROM registrations
    WHERE registrations.idempotency_key LIKE 'test-constraint-%'
    LIMIT 1;

    -- Get a field from that event
    SELECT event_fields.id
    INTO v_field_id
    FROM event_fields
    WHERE event_fields.event_id = (SELECT event_id
    FROM registrations
    WHERE id = v_reg_id)
    LIMIT 1;

IF v_reg_id IS NOT NULL AND v_field_id IS NOT NULL THEN
-- Insert first answer
INSERT INTO registration_answers
    (registration_id, event_field_id, answer_text)
VALUES
    (v_reg_id, v_field_id, 'First Answer');

-- Attempt to insert duplicate (should fail)
BEGIN
    INSERT INTO registration_answers
        (registration_id, event_field_id, answer_text)
    VALUES
        (v_reg_id, v_field_id, 'Second Answer');

    -- If we get here, constraint failed
    RAISE NOTICE 'TEST FAILED: Unique constraint not enforced on registration_answers';
EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'TEST PASSED: Unique constraint on (registration_id, event_field_id) enforced';
END;
  ELSE
    RAISE NOTICE 'TEST SKIPPED: Could not find test data';
END
IF;
END $$;

-- ============================================================================
-- Test 2: Foreign Key Cascade on Registration Delete
-- ============================================================================

DO $$
DECLARE
  v_reg_id uuid;
  v_answer_count integer;
BEGIN
    -- Create a test registration with answers
    INSERT INTO registrations
        (event_id, user_id, idempotency_key, status, submitted_at)
    SELECT events.id, users.id, 'test-cascade-' || NOW()
    ::text, 'submitted'::registration_status, NOW
    ()
  FROM events, users
  WHERE events.slug = 'future-event'
  AND users.member_id = '1628023334'
  RETURNING id INTO v_reg_id;

-- Add some answers
INSERT INTO registration_answers
    (registration_id, event_field_id, answer_text)
SELECT v_reg_id, event_fields.id, 'Test Answer'
FROM event_fields
WHERE event_fields.event_id = (SELECT event_id
FROM registrations
WHERE id = v_reg_id)
LIMIT 3;

-- Count answers before delete
SELECT COUNT(*)
INTO v_answer_count
FROM registration_answers
WHERE registration_id = v_reg_id;
RAISE NOTICE 'Answers before delete: %', v_answer_count;

-- Delete registration
DELETE FROM registrations WHERE id = v_reg_id;

-- Count answers after delete (should be 0 due to cascade)
SELECT COUNT(*)
INTO v_answer_count
FROM registration_answers
WHERE registration_id = v_reg_id;

IF v_answer_count = 0 THEN
    RAISE NOTICE 'TEST PASSED: Foreign key cascade deletes registration_answers when registration deleted';
  ELSE
    RAISE NOTICE 'TEST FAILED: % answers remain after registration delete (expected 0)', v_answer_count;
END
IF;
END $$;

-- ============================================================================
-- Test 3: Idempotency Key Uniqueness Per Event
-- ============================================================================

DO $$
DECLARE
  v_event_id uuid;
  v_user_id uuid;
  v_reg_id_1 uuid;
  v_idempotency_key text := 'test-idempotency-' || NOW
()::text;
BEGIN
    -- Get test event and user
    SELECT events.id
    INTO v_event_id
    FROM events
    WHERE slug = 'sample-event'
    LIMIT 1;
    SELECT users.id
    INTO v_user_id
    FROM users
    WHERE member_id = '1627890198'
    LIMIT 1;

-- First insert
INSERT INTO registrations
    (event_id, user_id, idempotency_key, status, submitted_at)
VALUES
    (v_event_id, v_user_id, v_idempotency_key, 'submitted'
::registration_status, NOW
())
  RETURNING id INTO v_reg_id_1;

-- Attempt duplicate insert with same idempotency key
BEGIN
    INSERT INTO registrations
        (event_id, user_id, idempotency_key, status, submitted_at)
    VALUES
        (v_event_id, v_user_id, v_idempotency_key, 'submitted'
    ::registration_status, NOW
    ());

RAISE NOTICE 'TEST FAILED: Idempotency key uniqueness not enforced';
DELETE FROM registrations WHERE id = v_reg_id_1;
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST PASSED: Idempotency key uniqueness prevents duplicate insert';
DELETE FROM registrations WHERE id = v_reg_id_1;
END;
END $$;

-- ============================================================================
-- Test 4: Status Enum Validation
-- ============================================================================

DO $$
DECLARE
  v_event_id uuid;
  v_user_id uuid;
BEGIN
    SELECT events.id
    INTO v_event_id
    FROM events
    WHERE slug = 'closed-event'
    LIMIT 1;
    SELECT users.id
    INTO v_user_id
    FROM users
    WHERE member_id = '3865598676'
    LIMIT 1;

-- Attempt to insert invalid status
BEGIN
    INSERT INTO registrations
        (event_id, user_id, idempotency_key, status, submitted_at)
    VALUES
        (v_event_id, v_user_id, 'test-enum-' || NOW()
    ::text, 'invalid_status'::registration_status, NOW
    ());

RAISE NOTICE 'TEST FAILED: Status enum validation not enforced';
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE NOTICE 'TEST PASSED: Status enum only accepts valid values (submitted, updated, cancelled)';
END;
END $$;

-- ============================================================================
-- Test 5: Timestamps Set Correctly
-- ============================================================================

DO $$
DECLARE
  v_event_id uuid;
  v_user_id uuid;
  v_reg_id uuid;
  v_submitted_at timestamptz;
  v_updated_at timestamptz;
  v_time_diff_seconds numeric;
BEGIN
    SELECT events.id
    INTO v_event_id
    FROM events
    WHERE slug = 'sample-event'
    LIMIT 1;
    SELECT users.id
    INTO v_user_id
    FROM users
    WHERE member_id = '1324250891'
    LIMIT 1;

-- Insert registration and capture creation time
INSERT INTO registrations
    (event_id, user_id, idempotency_key, status, submitted_at)
VALUES
    (v_event_id, v_user_id, 'test-timestamps-' || NOW()
::text, 'submitted'::registration_status, NOW
())
  RETURNING id, submitted_at, updated_at INTO v_reg_id, v_submitted_at, v_updated_at;

-- Check that submitted_at is set
IF v_submitted_at IS NOT NULL THEN
    RAISE NOTICE 'TEST PASSED: submitted_at timestamp set on insert';
  ELSE
    RAISE NOTICE 'TEST FAILED: submitted_at timestamp not set';
END
IF;

  -- Check that updated_at is set
  IF v_updated_at IS NOT NULL THEN
    RAISE NOTICE 'TEST PASSED: updated_at timestamp set on insert';
  ELSE
    RAISE NOTICE 'TEST FAILED: updated_at timestamp not set';
END
IF;

  -- Check that submitted_at and updated_at are close (within 1 second)
  v_time_diff_seconds := EXTRACT
(EPOCH FROM
(v_updated_at - v_submitted_at));
IF v_time_diff_seconds <= 1 THEN
    RAISE NOTICE 'TEST PASSED: submitted_at and updated_at are synchronized on insert (diff: % seconds)', v_time_diff_seconds;
  ELSE
    RAISE NOTICE 'TEST FAILED: submitted_at and updated_at differ by % seconds', v_time_diff_seconds;
END
IF;

  -- Update registration and check updated_at changes
  UPDATE registrations SET status = 'updated'
::registration_status WHERE id = v_reg_id;

SELECT updated_at
INTO v_updated_at
FROM registrations
WHERE id = v_reg_id;

IF v_updated_at > v_submitted_at THEN
    RAISE NOTICE 'TEST PASSED: updated_at changes on registration update';
  ELSE
    RAISE NOTICE 'TEST FAILED: updated_at did not change on update';
END
IF;

  -- Cleanup
  DELETE FROM registrations WHERE id = v_reg_id;
END $$;

-- ============================================================================
-- Cleanup Test Data
-- ============================================================================

-- Delete test registrations
DELETE FROM registrations
WHERE idempotency_key LIKE 'test-%';

RAISE NOTICE 'All constraint tests completed. Check notices above for results.';
