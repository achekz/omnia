# Omni AI - Multi-Tenant AI Platform

Omni AI is a sophisticated multi-tenant SaaS platform built with a high-performance Node.js/Express backend, a Python ML microservice, and a stunning React/TypeScript frontend following an ERP-style dual-navigation layout.

## 🚀 Features

- **Multi-Tenant Isolation**: Complete data separation at the database level.
- **Microservices Architecture**: Separate Node.js backend and Python Flask ML service.
- **Role-Based Access Control**: Four distinct user profiles (Company, Cabinet, Employee, Student).
- **ERP UI/UX**: Premium dual-navigation system (Top modules, Contextual sidebar).
- **AI Assistant**: Conversational interface for business intelligence.
- **Real-time Notifications**: Socket.io integration for instant alerts.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Framer Motion, Tailwind CSS, Lucide React, Wouter.
- **Backend**: Node.js, Express, MongoDB/Mongoose, Socket.io, JWT.
- **ML Service**: Python, Flask, Pandas, Scikit-learn.

## 🏁 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Python (3.9+)

### 2. Installations

**Backend:**
```bash
cd server
npm install
```

**Mobile/ML Service:**
```bash
cd ml_service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Frontend:**
```bash
npm install
```

### 3. Environment Variables
Ensure `.env` files are configured in `server/` and the root directory as per the templates.

### 4. Running the App
1. **Server**: `cd server && npm run dev`
2. **ML Service**: `cd ml_service && .\venv\Scripts\python.exe app.py`
3. **Frontend**: `npm run dev` (from root)

## 👥 Demo Accounts
Password for all: `demo123`
- `company@demo.com`
- `cabinet@demo.com`
- `employee@demo.com`
- `student@demo.com`
