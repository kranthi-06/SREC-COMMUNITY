---
description: How to deploy the College Event Review Sentiment Analyzer to the cloud.
---

# Deployment Guide

To share this website with others globally, follow these steps:

### 1. Database Setup (MongoDB Atlas)
Since your current database is local, you need a cloud-hosted one:
1. Create a free account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Cluster and get your **Connection String**.
3. Update your `.env` file in the backend with the new connection string.

### 2. Deploy Backend (Render.com)
1. Push your code to a GitHub repository.
2. Go to [Render.com](https://render.com) and create a new **Web Service**.
3. Connect your GitHub repo.
4. Set the **Root Directory** to `backend`.
5. Set the **Build Command** to `npm install`.
6. Set the **Start Command** to `node server.js`.
7. Add your Environment Variables (`MONGO_URI`, `JWT_SECRET`, etc.) in the Render dashboard.

### 3. Deploy Frontend (Vercel/Netlify)
1. Go to [Vercel](https://vercel.com).
2. Create a new project and connect the same GitHub repo.
3. Set the **Root Directory** to `frontend`.
4. Vercel will auto-detect Vite. Use the default build settings.
5. **IMPORTANT**: In `frontend`, you must update all `axios` calls to point to your **Render URL** instead of `localhost:5000`.

### 4. Local Network Sharing (Short-term)
If you just want to show someone in the same room:
1. Open terminal and type `ipconfig` (Windows).
2. Find your **IPv4 Address** (e.g., `192.168.1.10`).
3. Have the other person visit `http://192.168.1.10:5173` on their phone/laptop (connected to the same Wi-Fi).
