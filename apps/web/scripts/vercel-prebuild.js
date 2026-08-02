const { execFileSync } = require('child_process');

function run(cmd, args = []) {
  const command = [cmd, ...args].join(' ');
  console.log('> ' + command);
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function isRetryablePrismaError(error) {
  const message = [error?.stderr?.toString?.() ?? '', error?.message ?? '']
    .join('\n')
    .toLowerCase();

  return /advisory lock|timed out|p1002|lock/i.test(message);
}

function wait(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runWithRetry(cmd, args = [], { retries = 3, retryDelayMs = 10000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      run(cmd, args);
      return;
    } catch (error) {
      if (attempt === retries || !isRetryablePrismaError(error)) {
        throw error;
      }

      console.warn(`Prisma migrate deploy hit a transient lock error. Retrying in ${retryDelayMs}ms...`);
      wait(retryDelayMs);
    }
  }
}

function main() {
  const isVercel = process.env.VERCEL === '1';
  const hasDatabase = !!process.env.DATABASE_URL;
  const inProd = process.env.NODE_ENV === 'production' || isVercel;

  if (inProd && hasDatabase) {
    try {
      const retries = Number(process.env.PRISMA_MIGRATE_RETRIES ?? '3');
      const retryDelayMs = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS ?? '10000');

      console.log('Running Prisma migrations (vercel-prebuild)...');
      runWithRetry('npx', ['prisma', 'migrate', 'deploy'], { retries, retryDelayMs });
    } catch (err) {
      console.error('Prisma migrate deploy failed:', err && err.message ? err.message : err);
      // Fail the build on production to avoid schema mismatch
      process.exit(1);
    }
  } else {
    console.log('Skipping prisma migrate deploy (not production or no DATABASE_URL)');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  isRetryablePrismaError,
  runWithRetry,
};
