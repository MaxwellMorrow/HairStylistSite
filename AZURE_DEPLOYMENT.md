# Azure Deployment Guide for HairStylistSite

This guide will help you deploy your hairstylist booking system to Azure App Service.

## ⚠️ Security First: Git and Environment Variables

**IMPORTANT**: Before pushing to git, ensure your sensitive data is protected:

### ✅ Safe to Commit to Git:
- ✅ All source code files
- ✅ `azure-settings.template.json` (template with placeholder values)
- ✅ `web.config`
- ✅ `build-deploy.ps1`
- ✅ `deploy-azure.ps1`
- ✅ All documentation files

### ❌ NEVER Commit to Git:
- ❌ `azure-settings.json` (contains real credentials)
- ❌ `.env` files (contains local environment variables)
- ❌ `deploy-package.zip` (build artifacts)
- ❌ `server/uploads/` (user uploaded files)
- ❌ Any files with real passwords, API keys, or connection strings

### 🔒 Environment Variables Security:
1. **Local Development**: Use `.env` files (already in `.gitignore`)
2. **Production**: Set environment variables in Azure App Service
3. **Templates**: Use `azure-settings.template.json` as a reference
4. **Secrets**: Store sensitive data in Azure Key Vault for enterprise deployments

## Prerequisites

1. **Azure Account**: You need an active Azure subscription
2. **Azure CLI**: Install from [Microsoft Docs](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Node.js**: Version 18.x or later
4. **MongoDB Database**: Either MongoDB Atlas (cloud) or Azure Cosmos DB

## Quick Deployment (Automated)

### 1. Prepare Your Environment

First, update the configuration files with your actual values:

```bash
# Edit azure-settings.json and replace placeholder values:
# - MONGODB_URI: Your MongoDB connection string
# - JWT_SECRET: A secure random string
# - EMAIL_USER: Your Gmail address
# - EMAIL_PASS: Your Gmail app password
# - ADMIN_EMAIL: Your admin email address
```

### 2. Build and Deploy

```powershell
# Build the application
.\build-deploy.ps1

# Deploy to Azure
.\deploy-azure.ps1
```

## Manual Deployment Steps

### 1. Install and Login to Azure CLI

```bash
# Install Azure CLI (if not already installed)
# Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login to Azure
az login
```

### 2. Create Azure Resources

```bash
# Set variables
RESOURCE_GROUP="HairStylistSite-RG"
APP_NAME="hairstylist-site"
LOCATION="East US"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (B1 Basic tier)
az appservice plan create \
  --name "$APP_NAME-plan" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan "$APP_NAME-plan" \
  --runtime "NODE|18-lts"
```

### 3. Configure Environment Variables

```bash
# Set environment variables
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    MONGODB_URI="your_mongodb_connection_string" \
    JWT_SECRET="your_jwt_secret_key" \
    EMAIL_SERVICE=gmail \
    EMAIL_USER="your_email@gmail.com" \
    EMAIL_PASS="your_email_app_password" \
    ADMIN_EMAIL="admin@yourdomain.com" \
    WEBSITE_NODE_DEFAULT_VERSION=18.17.0 \
    WEBSITES_PORT=8080
```

### 4. Build and Deploy

```bash
# Build React app
cd client
npm run build
cd ..

# Create deployment package
# (Use the build-deploy.ps1 script or manually package)

# Deploy to Azure
az webapp deployment source config-zip \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src deploy-package.zip
```

## Database Setup

### Option 1: MongoDB Atlas (Recommended)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Add it to Azure App Settings as `MONGODB_URI`

### Option 2: Azure Cosmos DB

```bash
# Create Cosmos DB account
az cosmosdb create \
  --name "hairstylist-cosmos" \
  --resource-group $RESOURCE_GROUP \
  --locations regionName=$LOCATION

# Get connection string
az cosmosdb keys list \
  --name "hairstylist-cosmos" \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings
```

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the app password in `EMAIL_PASS`

### Other Email Services

- **Outlook**: Use `EMAIL_SERVICE=outlook`
- **Yahoo**: Use `EMAIL_SERVICE=yahoo`
- **Custom SMTP**: Configure manually

## Post-Deployment Configuration

### 1. Set Up Custom Domain (Optional)

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname "yourdomain.com"

# Configure SSL certificate
az webapp config ssl bind \
  --certificate-thumbprint "your_certificate_thumbprint" \
  --ssl-type SNI \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

### 2. Enable Application Insights (Optional)

```bash
# Create Application Insights
az monitor app-insights component create \
  --app "hairstylist-insights" \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Get instrumentation key and add to app settings
az monitor app-insights component show \
  --app "hairstylist-insights" \
  --resource-group $RESOURCE_GROUP \
  --query "instrumentationKey"
```

### 3. Configure Backup (Optional)

```bash
# Create storage account for backups
az storage account create \
  --name "hairstylistbackup" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# Configure backup
az webapp config backup create \
  --webapp-name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --backup-name "daily-backup" \
  --storage-account-url "https://hairstylistbackup.blob.core.windows.net"
```

## Monitoring and Troubleshooting

### View Application Logs

```bash
# Stream logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Download logs
az webapp log download --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Common Issues

1. **Build Failures**: Check Node.js version compatibility
2. **Database Connection**: Verify MongoDB connection string
3. **Email Issues**: Check Gmail app password and 2FA settings
4. **File Uploads**: Ensure uploads directory has proper permissions

### Performance Optimization

1. **Enable CDN**: For static assets
2. **Database Indexing**: Optimize MongoDB queries
3. **Caching**: Implement Redis for session storage
4. **Image Optimization**: Compress uploaded images

## Cost Optimization

### Free Tier Options

- **Azure App Service**: F1 (Free) tier available
- **MongoDB Atlas**: Free cluster (512MB)
- **Custom Domain**: Free with SSL certificate

### Scaling Options

- **Vertical Scaling**: Upgrade App Service Plan
- **Horizontal Scaling**: Add multiple instances
- **Database Scaling**: MongoDB Atlas M10+ or Cosmos DB

## Security Best Practices

1. **Environment Variables**: Never commit secrets to code
2. **HTTPS**: Always use SSL in production
3. **Input Validation**: Validate all user inputs
4. **Rate Limiting**: Implement API rate limiting
5. **Regular Updates**: Keep dependencies updated

## Support and Resources

- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Node.js on Azure](https://docs.microsoft.com/en-us/azure/developer/javascript/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Azure CLI Reference](https://docs.microsoft.com/en-us/cli/azure/)

## Troubleshooting Commands

```bash
# Check app status
az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP

# Restart app
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

# Check app settings
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP

# Update app settings
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings @azure-settings.json
``` 