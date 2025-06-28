const fs = require('fs');
const path = require('path');

// Create server/public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'server', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy build files from client/build to server/public
const buildDir = path.join(__dirname, '..', 'client', 'build');
const copyRecursive = (src, dest) => {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

if (fs.existsSync(buildDir)) {
  copyRecursive(buildDir, publicDir);
  console.log('✅ React build copied to server/public successfully!');
} else {
  console.error('❌ React build directory not found. Make sure to run npm run build in the client directory first.');
  process.exit(1);
} 