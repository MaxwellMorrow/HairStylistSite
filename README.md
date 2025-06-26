# Hairstylist Site - Azure Deployment Guide

## Prerequisites
- Azure account (free tier available)
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- Node.js 18+ and npm

## 1. MongoDB Atlas Setup
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free cluster.
2. Create a database user and get your connection string.
3. Replace `<username>`, `<password>`, and `<cluster-url>` in `.env.example` with your details.

## 2. Cloudinary Setup
1. Go to [Cloudinary](https://cloudinary.com/users/register/free) and create a free account.
2. Get your cloud name, API key, and API secret from the dashboard.
3. Add these to your `.env` file.

## 3. OAuth Setup (Google & Facebook)
- Register your app with Google and Facebook to get client IDs and secrets.
- Set callback URLs to:
  - `https://<your-app-name>.azurewebsites.net/api/auth/google/callback`
  - `https://<your-app-name>.azurewebsites.net/api/auth/facebook/callback`

## 4. Azure App Service Deployment
1. Create a new Web App in Azure Portal (Node.js runtime, free tier).
2. Deploy your code (via GitHub Actions, VS Code, or Azure CLI).
3. Set environment variables in Azure Portal (from your `.env`).
4. If using Windows App Service, ensure `server/web.config` is present.
5. For Linux App Service, ensure your `package.json` has a `start` script.

## 5. Environment Variables
- Copy `.env.example` to `.env` and fill in your secrets.
- Set the same variables in Azure App Service > Configuration.

## 6. Start the Server Locally
```bash
cd server
npm install
npm run dev
```

## 7. Deploy Frontend (React)
- Deploy your React app separately (Azure Static Web Apps or same App Service as a build folder).

---

For more details, see Azure [Node.js quickstart](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs?tabs=windows&pivots=development-environment-vscode). 