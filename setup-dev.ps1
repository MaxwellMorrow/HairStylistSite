# Development Setup Script for HairStylistSite
# This script helps new developers set up the project locally

Write-Host "🚀 Setting up HairStylistSite for development..." -ForegroundColor Green

# Check if we're in the right directory
if (!(Test-Path "client") -or !(Test-Path "server")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

# Install server dependencies
Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
Set-Location "server"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install server dependencies" -ForegroundColor Red
    exit 1
}

# Install client dependencies
Write-Host "📦 Installing client dependencies..." -ForegroundColor Yellow
Set-Location "../client"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install client dependencies" -ForegroundColor Red
    exit 1
}

# Go back to root
Set-Location ".."

# Create environment files if they don't exist
Write-Host "🔧 Setting up environment files..." -ForegroundColor Yellow

# Server .env template
if (!(Test-Path "server/.env")) {
    @"
# Server Environment Variables
# Copy this file and fill in your actual values

# Database
MONGODB_URI=mongodb://localhost:27017/hairstylist

# JWT Secret (generate a strong random string)
JWT_SECRET=your_jwt_secret_here

# Email Configuration (Optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
ADMIN_EMAIL=admin@yourdomain.com

# Server Configuration
PORT=5000
NODE_ENV=development
"@ | Out-File "server/.env" -Encoding UTF8
    Write-Host "✅ Created server/.env template" -ForegroundColor Green
}

# Copy Azure settings template if needed
if (!(Test-Path "azure-settings.json") -and (Test-Path "azure-settings.template.json")) {
    Copy-Item "azure-settings.template.json" "azure-settings.json"
    Write-Host "✅ Created azure-settings.json from template" -ForegroundColor Green
}

# Create uploads directory
if (!(Test-Path "server/uploads")) {
    New-Item -ItemType Directory -Name "uploads" -Path "server" -Force | Out-Null
    New-Item -ItemType Directory -Name "inspo-photos" -Path "server/uploads" -Force | Out-Null
    Write-Host "✅ Created uploads directories" -ForegroundColor Green
}

Write-Host "`n✅ Development setup completed successfully!" -ForegroundColor Green

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit server/.env with your actual values" -ForegroundColor White
Write-Host "2. Set up MongoDB (local or Atlas)" -ForegroundColor White
Write-Host "3. Configure email settings (optional)" -ForegroundColor White
Write-Host "4. Start the development servers:" -ForegroundColor White
Write-Host "   - Server: cd server && npm run dev" -ForegroundColor White
Write-Host "   - Client: cd client && npm start" -ForegroundColor White

Write-Host "`n🔒 Security Notes:" -ForegroundColor Cyan
Write-Host "- .env files are already in .gitignore" -ForegroundColor White
Write-Host "- Never commit real credentials to git" -ForegroundColor White
Write-Host "- Use azure-settings.template.json for deployment reference" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "- AZURE_DEPLOYMENT.md - For production deployment" -ForegroundColor White
Write-Host "- DEPLOYMENT_CHECKLIST.md - For deployment verification" -ForegroundColor White
Write-Host "- NOTIFICATION_SETUP.md - For email/SMS configuration" -ForegroundColor White 