// Frontend-only build script for Vercel deployment
const { execSync } = require('child_process');

console.log('Building frontend for Vercel deployment...');

try {
  // Build the frontend only
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('Frontend build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}