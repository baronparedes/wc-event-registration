import { config as loadEnv } from 'dotenv';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function parseArgs(argv) {
  const args = { file: '.env.production' };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--file') {
      args.file = argv[index + 1] ?? args.file;
      index += 1;
    }
  }

  return args;
}

function normalizeOrigins(raw) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidOrigin(origin) {
  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin;
  } catch {
    return false;
  }
}

function isLocalOrigin(origin) {
  try {
    return LOCAL_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`- ${message}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv({ path: args.file, override: true });

  const errors = [];

  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'ALLOWED_ORIGINS',
    'RUNTIME_ENV',
  ];

  for (const name of requiredVars) {
    if (!process.env[name] || !process.env[name].trim()) {
      errors.push(`${name} is required`);
    }
  }

  const runtimeEnv = (process.env.RUNTIME_ENV ?? '').trim().toLowerCase();
  if (runtimeEnv && runtimeEnv !== 'production') {
    errors.push(
      `RUNTIME_ENV must be production for production validation (received: ${runtimeEnv})`,
    );
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').trim();
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      if (parsed.protocol !== 'https:') {
        errors.push('VITE_SUPABASE_URL must use https in production');
      }
    } catch {
      errors.push('VITE_SUPABASE_URL must be a valid absolute URL');
    }
  }

  const rawOrigins = (process.env.ALLOWED_ORIGINS ?? '').trim();
  if (rawOrigins) {
    const origins = normalizeOrigins(rawOrigins);

    if (origins.length === 0) {
      errors.push('ALLOWED_ORIGINS must include at least one origin');
    }

    const invalidOrigins = origins.filter((origin) => !isValidOrigin(origin));
    if (invalidOrigins.length > 0) {
      errors.push(`ALLOWED_ORIGINS has invalid entries: ${invalidOrigins.join(', ')}`);
    }

    const localhostOrigins = origins.filter((origin) => isLocalOrigin(origin));
    if (localhostOrigins.length > 0) {
      errors.push(
        `ALLOWED_ORIGINS must not include localhost entries in production: ${localhostOrigins.join(', ')}`,
      );
    }
  }

  if (errors.length > 0) {
    console.error('Production environment validation failed:');
    for (const error of errors) {
      fail(error);
    }
    process.exit(1);
  }

  console.log(`Production environment validation passed using ${args.file}.`);
}

main();
