# SubGuard AI - 3D Structural Subscription Governance Platform

> *"Never Lose Money on Forgotten Subscriptions."*

SubGuard AI is a multi-tier, AI-powered financial subscription management platform featuring an interactive 3D WebGL security lattice, rule-based recurring engine, anomaly hike detection, Google Gemini grounding, and PayPal Sandbox reconciliation.

---

## 🏛️ 3D Architecture & The 10 Core Modules

| Page / Module | Route | Functionality |
| :--- | :--- | :--- |
| **1. Landing Page** | `/` | 3D Interactive WebGL Security Lattice (Three.js), hero statistics, feature grid |
| **2. Login & Register** | `/login` | Modern authentication interface with session management |
| **3. Overview Dashboard**| `/dashboard` | KPI summary cards, live Recharts trend graphs, 3D structure monitor, upcoming alerts |
| **4. My Subscriptions** | `/subscriptions`| Full CRUD interface, category filtering, search, PayPal sandbox checkout trigger |
| **5. Upcoming Payments** | `/upcoming` | Renewal timeline, countdown badges, 72-hour pre-warning alert status |
| **6. Transaction History**| `/transactions`| Audited ledger, CSV statement uploader, recurring pattern detection, anomaly flags |
| **7. AI Insights** | `/ai-insights` | Algorithmic Subscription Waste Score, Gemini recommendations, opportunity savings |
| **8. AI Financial Assistant**| `/assistant` | Grounded conversational chatbot strictly answering questions against user ledger |
| **9. Reports & Analytics** | `/reports` | Exportable CSV audit reports, annual run-rate exposure, commitment ledger |
| **10. Settings & Profile**| `/settings` | Monthly spending threshold, primary currency, notification pre-warning windows |

---

## 🚀 Quick Start Guide

### 1. Backend Server Setup
```bash
cd subguard-ai/backend
npm install
npm run dev # or npm start
```
The backend starts on `http://localhost:5000` with the daily 8:00 AM UTC inspection cron active.

### 2. Frontend 3D Application Setup
```bash
cd subguard-ai/frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🌐 Public Production Deployment Guide

SubGuard AI is a full-stack application featuring a React 3D SPA frontend and a secure Node.js backend. 

> **Important Note on GitHub "Visit Site":**  
> GitHub Pages by default only serves static files or repository `README.md` files from the root. It cannot execute Node.js backends or securely store secret keys like `GEMINI_API_KEY`.  
> For production, the industry standard is to deploy the **Backend on Render** and the **Frontend on Vercel**.

```
                ┌───────────────────────────────────┐
                │        Client Browser             │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │    Vercel (React 18 / Vite SPA)   │
                │     https://your-app.vercel.app   │
                └─────────────────┬─────────────────┘
                                  │ HTTPS API calls
                                  ▼
                ┌───────────────────────────────────┐
                │    Render (Node.js / Express API) │
                │   https://your-api.onrender.com   │
                └─────────────────┬─────────────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
        ┌─────────────────────┐       ┌──────────────────────┐
        │  Google Gemini API  │       │  PayPal Sandbox API  │
        └─────────────────────┘       └──────────────────────┘
```

---

### Step 1: Deploy Backend on Render (Free Web Service)

1. Sign in to [Render.com](https://render.com) with your GitHub account.
2. Click **New +** > **Web Service**.
3. Select your **SubGuard AI** GitHub repository.
4. Configure the settings:
   - **Name:** `subguard-backend` (or your choice)
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
5. Click **Advanced** > **Add Environment Variable** and add:
   - `NODE_ENV` = `production`
   - `OPENAI_API_KEY` = `<your-openai-api-key>`
   - `OPENAI_MODEL` = `gpt-4o-mini`
   - `OPENAI_TIMEOUT_MS` = `30000`
   - `FRONTEND_URL` = `https://your-app.vercel.app` *(update once Vercel is deployed, or use `*` initially)*
   - `PAYPAL_API_BASE` = `https://api-m.sandbox.paypal.com`
6. Click **Deploy Web Service**.
7. Once deployed, copy your Render backend URL:  
   `https://subguard-backend.onrender.com`

---

### Step 2: Deploy Frontend on Vercel (Free Global CDN)

1. Sign in to [Vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New...** > **Project**.
3. Import your **SubGuard AI** repository.
4. In the configuration screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and choose `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://subguard-backend.onrender.com/api` *(your Render backend URL + `/api`)*
6. Click **Deploy**.
7. In ~45 seconds, your site will be live at:  
   `https://subguard-ai.vercel.app`

---

### Step 3: Link Vercel URL in GitHub Repository

1. On your GitHub repository homepage, click the **⚙️ Settings** icon in the right sidebar (under "About").
2. Check the box for **Use your deployment**.
3. In the **Website** field, paste your Vercel public URL:  
   `https://subguard-ai.vercel.app`
4. Now when anyone clicks **"Visit site"** on GitHub, it opens your public application!

---

## 🧪 Verification Against Test Scenarios

1. **Scenario 1 (Add ₹649 Netflix Subscription):** Click **"Add Subscription"** on Dashboard or My Subscriptions. Monthly run-rate adjusts dynamically.
2. **Scenario 2 (CSV Upload & Recurring Engine):** Go to **Transaction History**, click **"Import Statement CSV"**, upload `sample_transactions.csv`. The engine detects ~30-day periodicity and reports high-confidence recurring patterns.
3. **Scenario 3 (₹150 Price Hike Anomaly):** When a ₹799 charge occurs against a registered ₹649 plan, the system flags the `+₹150` delta with a red alert badge.
4. **Scenario 4 (Renewal Pre-warning):** Imminent renewals appear on Dashboard and Upcoming Payments with 72-hour notification badges.
5. **Scenario 5 (Conversational AI Assistant):** Ask the AI: *"How much am I spending monthly?"* or *"Which subscription costs the most?"* for grounded analysis.
6. **Scenario 6 (PayPal Sandbox Renewal):** Click **"Renew via PayPal"** on any subscription card to simulate sandbox checkout and capture.

