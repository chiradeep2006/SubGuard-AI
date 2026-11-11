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

## 🧪 Verification Against Test Scenarios

1. **Scenario 1 (Add ₹649 Netflix Subscription):** Click **"Add Subscription"** on Dashboard or My Subscriptions. Monthly run-rate adjusts dynamically.
2. **Scenario 2 (CSV Upload & Recurring Engine):** Go to **Transaction History**, click **"Import Statement CSV"**, upload `sample_transactions.csv`. The engine detects ~30-day periodicity and reports high-confidence recurring patterns.
3. **Scenario 3 (₹150 Price Hike Anomaly):** When a ₹799 charge occurs against a registered ₹649 plan, the system flags the `+₹150` delta with a red alert badge.
4. **Scenario 4 (Renewal Pre-warning):** Imminent renewals appear on Dashboard and Upcoming Payments with 72-hour notification badges.
5. **Scenario 5 (Conversational AI Assistant):** Ask the AI: *"How much am I spending monthly?"* or *"Which subscription costs the most?"* for grounded analysis.
6. **Scenario 6 (PayPal Sandbox Renewal):** Click **"Renew via PayPal"** on any subscription card to simulate sandbox checkout and capture.

