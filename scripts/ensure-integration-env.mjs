const requiredVars = ['SUPABASE_SERVICE_ROLE_KEY'];

const missing = requiredVars.filter((name) => !process.env[name] || !process.env[name].trim());

if (missing.length > 0) {
  console.error('Integration test environment validation failed:');
  for (const name of missing) {
    console.error(`- ${name} is required for npm run test:integration`);
  }
  process.exit(1);
}

console.log('Integration test environment validation passed.');
