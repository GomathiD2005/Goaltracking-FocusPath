# FocusPath AI — Deployment Guide

This guide describes how to deploy the FocusPath AI application to production cloud environments like Railway and MongoDB Atlas.

---

## 1. Setup MongoDB Atlas
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register a free tier account.
2.  Create a new Cluster (M0 Free Tier).
3.  Go to **Database Access** and add a new Database User with a secure password.
4.  Go to **Network Access** and select **Add IP Address** -> Select **Allow Access from Anywhere** (`0.0.0.0/0`) to allow cloud ingress.
5.  In Clusters, select **Connect** -> **Connect your application** -> Copy the connection string.
    *   Example: `mongodb+srv://<username>:<password>@cluster.mongodb.net/focuspath`

---

## 2. Deploy to Railway
Railway is the recommended hosting platform for Express + Vite full-stack apps.

1.  Sign up at [Railway.app](https://railway.app/).
2.  Select **New Project** -> **Deploy from GitHub repository** -> Select your repo.
3.  Railway automatically reads `package.json` scripts and fires the build sequence:
    *   `npm run build` (generates the Vite build and compiles the backend into `dist/server.cjs` via esbuild)
    *   `npm run start` (boots the server)
4.  Go to **Variables** tab on Railway and configure:
    *   `PORT`: `3000` (Injected automatically, but good to double-check)
    *   `NODE_ENV`: `production`
    *   `GEMINI_API_KEY`: Your Google Gemini secret key (from AI Studio or Google Cloud console)
    *   `JWT_SECRET`: A custom secure string used for token signatures
    *   `MONGO_URI`: (Optional) If migrating to external database. By default, the application runs a zero-configuration local database storing state safely in `/data/db.json` inside the container persistent disk!
5.  Under **Settings** on Railway, choose **Generate Domain** to get a public URL for your platform.
