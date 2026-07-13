import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase configuration from environment
 * Tests run in Node.js environment where process.env is available
 */
function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
  // Service role key from environment (required for test admin client)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for tests');
  }

  return { supabaseUrl, anonKey, serviceRoleKey };
}

/**
 * Create a test Supabase client with admin credentials
 * Uses service role key for administrative access during tests
 */
export function createTestAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Create a test Supabase client with anon credentials
 * Simulates public user access with RLS policies
 */
export function createTestAnonClient() {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  return createClient(supabaseUrl, anonKey);
}

/**
 * Generate a unique test member ID
 */
export function generateTestMemberId(): string {
  return `test-member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Seed a test member for registration tests
 */
export async function seedTestMember(memberId: string, overrides?: Record<string, unknown>) {
  const client = createTestAdminClient();

  const memberData: Record<string, unknown> = {
    member_id: memberId,
    full_name: `Test Member ${memberId}`,
    nickname: `tm${memberId.slice(-4)}`,
    email: `test-${memberId}@example.com`,
    ...overrides,
  };

  const { data, error } = await client.from('users').insert([memberData]).select().single();

  if (error) throw new Error(`Failed to seed test member: ${error.message}`);
  return data;
}

/**
 * Get a test event fixture
 * Uses existing seed event or creates one for testing
 */
export async function getTestEvent(slug: string) {
  const client = createTestAdminClient();

  const { data, error } = await client.from('events').select('*').eq('slug', slug).single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch test event: ${error.message}`);
  }

  return data || null;
}

/**
 * Call submit-registration Edge Function directly
 * Used for testing the Edge Function independently of the app
 */
export async function callSubmitRegistrationFunction(
  payload: {
    event_slug: string;
    member_id: string;
    responses: Record<string, unknown>;
    idempotency_key: string;
  },
  token?: string,
) {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const requestOrigin = process.env.TEST_REQUEST_ORIGIN || 'http://127.0.0.1:54321';

  const response = await fetch(`${supabaseUrl}/functions/v1/submit-registration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || anonKey}`,
      Origin: requestOrigin,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  return { status: response.status, ...json };
}

/**
 * Clean up test registrations after test completes
 */
export async function cleanupTestRegistrations(eventSlug: string, memberId: string) {
  const client = createTestAdminClient();

  // Get event ID
  const { data: event, error: eventError } = await client
    .from('events')
    .select('id')
    .eq('slug', eventSlug)
    .single();

  if (eventError) return;
  if (!event) return;

  // Get user ID
  const { data: user, error: userError } = await client
    .from('users')
    .select('id')
    .eq('member_id', memberId)
    .single();

  if (userError) return;
  if (!user) return;

  // Delete registration (cascade will clean up answers)
  await client.from('registrations').delete().eq('event_id', event.id).eq('user_id', user.id);
}

/**
 * Get registration details for a test case
 */
export async function getRegistrationDetails(eventSlug: string, memberId: string) {
  const client = createTestAdminClient();

  // Get event and user
  const { data: event } = await client.from('events').select('id').eq('slug', eventSlug).single();

  const { data: user } = await client.from('users').select('id').eq('member_id', memberId).single();

  if (!event || !user) return null;

  // Get registration
  const { data: registration } = await client
    .from('registrations')
    .select('*')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single();

  if (!registration) return null;

  // Get answers
  const { data: answers } = await client
    .from('registration_answers')
    .select('*')
    .eq('registration_id', registration.id);

  return {
    registration,
    answers: answers || [],
  };
}

/**
 * Get event registration count
 */
export async function getEventRegistrationCount(eventSlug: string): Promise<number> {
  const client = createTestAdminClient();

  const { data: event } = await client.from('events').select('id').eq('slug', eventSlug).single();

  if (!event) return 0;

  const { count } = await client
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id);

  return count || 0;
}
