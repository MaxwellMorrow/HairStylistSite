# Build and Package Script for Azure Deployment
# This script builds the React app and packages everything for deployment

Write-Host "🔨 Building HairStylistSite for Azure deployment..." -ForegroundColor Green

# Check if we're in the right directory
if (!(Test-Path "client") -or !(Test-Path "server")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "deploy-package.zip") {
    Remove-Item "deploy-package.zip" -Force
}
if (Test-Path "deploy-temp") {
    Remove-Item "deploy-temp" -Recurse -Force
}

# Create temporary directory
New-Item -ItemType Directory -Name "deploy-temp" -Force | Out-Null

# Build React app
Write-Host "⚛️ Building React app..." -ForegroundColor Yellow
Set-Location "client"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ React build failed" -ForegroundColor Red
    exit 1
}

# Copy built React app to server public directory
Write-Host "📁 Copying React build to server..." -ForegroundColor Yellow
if (!(Test-Path "../server/public")) {
    New-Item -ItemType Directory -Name "public" -Path "../server" -Force | Out-Null
}
Copy-Item "build/*" -Destination "../server/public" -Recurse -Force

# Go back to root
Set-Location ".."

# Copy server files to temp directory
Write-Host "📦 Packaging server files..." -ForegroundColor Yellow
Copy-Item "server/*" -Destination "deploy-temp" -Recurse -Force

# Copy deployment files
Copy-Item "web.config" -Destination "deploy-temp/" -Force
Copy-Item "azure-settings.json" -Destination "deploy-temp/" -Force

# Create package.json for deployment
$packageJson = @{
    name = "hairstylist-site"
    version = "1.0.0"
    description = "HairStylistSite - Appointment Booking System"
    main = "index.js"
    scripts = @{
        start = "node index.js"
        build = "npm install"
    }
    dependencies = (Get-Content "server/package.json" | ConvertFrom-Json).dependencies
    engines = @{
        node = "18.x"
    }
} | ConvertTo-Json -Depth 10

$packageJson | Out-File "deploy-temp/package.json" -Encoding UTF8

# Create .deployment file for Azure
@"
[config]
command = npm install
"@ | Out-File "deploy-temp/.deployment" -Encoding UTF8

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
Compress-Archive -Path "deploy-temp/*" -DestinationPath "deploy-package.zip" -Force

# Clean up
Remove-Item "deploy-temp" -Recurse -Force

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host "📦 Deployment package created: deploy-package.zip" -ForegroundColor Cyan
Write-Host "🚀 Ready for Azure deployment!" -ForegroundColor Green

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Update azure-settings.json with your actual values" -ForegroundColor White
Write-Host "2. Run: .\deploy-azure.ps1" -ForegroundColor White
Write-Host "3. Or deploy manually using Azure CLI or Azure Portal" -ForegroundColor White 