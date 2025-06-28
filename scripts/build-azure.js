const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Azure build process...');

try {
  // Ensure we're in the right directory
  const rootDir = path.resolve(__dirname, '..');
  process.chdir(rootDir);
  
  console.log('📦 Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('📦 Installing server dependencies...');
  process.chdir(path.join(rootDir, 'server'));
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('📦 Installing client dependencies...');
  process.chdir(path.join(rootDir, 'client'));
  execSync('npm install --production=false', { stdio: 'inherit' });
  
  console.log('⚛️ Building React app...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('📁 Copying build files...');
  process.chdir(rootDir);
  execSync('node scripts/copy-build.js', { stdio: 'inherit' });
  
  console.log('✅ Azure build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 