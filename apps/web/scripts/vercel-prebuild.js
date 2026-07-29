const { execSync } = require('child_process');

function run(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

const isVercel = process.env.VERCEL === '1';
const hasDatabase = !!process.env.DATABASE_URL;
const inProd = process.env.NODE_ENV === 'production' || isVercel;

if (inProd && hasDatabase) {
  try {
    console.log('Running Prisma migrations (vercel-prebuild)...');
    run('npx prisma migrate deploy');
  } catch (err) {
    console.error('Prisma migrate deploy failed:', err && err.message ? err.message : err);
    // Fail the build on production to avoid schema mismatch
    process.exit(1);
  }
} else {
  console.log('Skipping prisma migrate deploy (not production or no DATABASE_URL)');
}
