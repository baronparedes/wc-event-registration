import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://127.0.0.1:54321', 'test-anon-key');

async function test() {
  const searchTerm = "test)"; // Malicious search term
  const escapedSearchTerm = searchTerm.replace(/[,%_]/g, (char) => `\\${char}`);

  let eventsQuery = supabase
    .from('events')
    .select('*');

  eventsQuery = eventsQuery.or(
    `title.ilike.%${escapedSearchTerm}%,slug.ilike.%${escapedSearchTerm}%`
  );

  const { data, error } = await eventsQuery;
  console.log("Error:", error);
}

test();
