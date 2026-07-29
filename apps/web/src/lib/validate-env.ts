export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missing = required.filter((k) => !process.env[k]);
  const isVercel = process.env.VERCEL === '1';
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const enforce = isVercel || isCI; // only enforce in Vercel or CI environments
  if (enforce && missing.length) {
    throw new Error(`Missing required environment variables for production: ${missing.join(', ')}`);
  }
}
