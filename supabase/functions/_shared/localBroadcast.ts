export interface LocalBroadcastLogEntry {
  type: 'push' | 'email';
  timestamp?: string;
  targetType: string;
  targetEventId?: string | null;
  targetRoles?: string[] | null;
  targetUserId?: string | null;
  recipient: string;
  title?: string;
  subject?: string;
  body: string;
  url?: string | null;
  metadata?: Record<string, unknown>;
}

export function isLocalBroadcastEnabled(): boolean {
  const envFlag = Deno.env.get('LOCAL_BROADCAST')?.trim().toLowerCase();
  if (envFlag === 'false' || envFlag === '0') return false;

  const nodeEnv = Deno.env.get('NODE_ENV')?.trim().toLowerCase();
  if (nodeEnv === 'test') {
    return false;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // Skip during unit test mocks
  if (supabaseUrl.includes('example.supabase.co')) {
    return false;
  }

  if (envFlag === 'true' || envFlag === '1') return true;

  const runtimeEnv = Deno.env.get('RUNTIME_ENV')?.trim().toLowerCase();
  if (runtimeEnv === 'local' || runtimeEnv === 'development') {
    return true;
  }
  if (runtimeEnv === 'production' || runtimeEnv === 'prod') {
    return false;
  }

  if (
    supabaseUrl.includes('localhost') ||
    supabaseUrl.includes('127.0.0.1') ||
    supabaseUrl.includes('kong')
  ) {
    return true;
  }

  const isProd =
    Deno.env.get('ENVIRONMENT') === 'production' || Deno.env.get('NODE_ENV') === 'production';
  return !isProd;
}

export async function logLocalBroadcast(entry: LocalBroadcastLogEntry): Promise<void> {
  if (!isLocalBroadcastEnabled()) {
    return;
  }

  const timestamp = entry.timestamp ?? new Date().toISOString();
  const divider = '='.repeat(80);
  const formatted = [
    divider,
    `[LOCAL BROADCAST - ${entry.type.toUpperCase()}]`,
    `Timestamp: ${timestamp}`,
    `Target Type: ${entry.targetType}`,
    entry.targetEventId ? `Event ID: ${entry.targetEventId}` : null,
    entry.targetRoles && entry.targetRoles.length > 0
      ? `Roles: ${entry.targetRoles.join(', ')}`
      : null,
    entry.targetUserId ? `User ID: ${entry.targetUserId}` : null,
    `Recipient: ${entry.recipient}`,
    entry.title || entry.subject ? `Subject/Title: ${entry.title ?? entry.subject}` : null,
    entry.url ? `URL: ${entry.url}` : null,
    `Content:`,
    entry.body,
    divider,
    '',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  console.log(formatted);

  const targetPaths = ['./local-broadcasts.log'];
  try {
    const cwd = Deno.cwd();
    if (cwd.includes('supabase/functions')) {
      targetPaths.push('../../local-broadcasts.log');
      targetPaths.push('../local-broadcasts.log');
    }
  } catch {
    // ignore
  }

  for (const logPath of targetPaths) {
    try {
      await Deno.writeTextFile(logPath, formatted, { append: true, create: true });
      break;
    } catch {
      // try next path
    }
  }
}
