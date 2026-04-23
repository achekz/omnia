# OmniAI SaaS Architecture

## Overview
Production-ready MERN stack SaaS platform with AI/ML integration.

```
┌─────────────────┐     ┌──────────────────┐
│   Frontend      │◄──► │   Backend API    │
│  React + Vite   │     │  Node.js/Express │
└─────────────────┘     └──────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │   MongoDB        │
                        │ Multi-Tenant     │
                        └──────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │   ML Service     │
                        │  Python/FastAPI  │
                        └──────────────────┘
```

## Key Features

### 1. RBAC (Role-Based Access Control)
```
Roles: ADMIN > MANAGER > ACCOUNTANT > EMPLOYEE > STUDENT > USER
```

### 2. Multi-Tenant Architecture
```
User → tenantId → Data Isolation
All queries automatically filtered by tenantId
```

### 3. Real-time Notifications
```
Socket.io for instant updates
Notification model + events
```

### 4. AI/ML Integration
```
RAG + Semantic Search
3 ML models: Predict, Recommend, Anomaly Detection
```

## Security
- JWT authentication
- Helmet security headers
- Rate limiting (login brute-force protection)
- CORS production config
- Input validation (Joi)
- Tenant isolation middleware

## Tech Stack
**Frontend:** React 18, Vite, TailwindCSS, Lucide React
**Backend:** Node.js 22, Express 4, Mongoose 8
**Database:** MongoDB Atlas
**ML:** Python FastAPI + Scikit-learn
**Real-time:** Socket.io + Redis
**Security:** helmet, express-rate-limit

## API Endpoints
```
Authentication: /api/auth/*
Admin: /api/admin/*
Employee: /api/employee/*
AI: /api/ai/*
Tasks: /api/tasks/*
Notifications: /api/notifications/*
Upload: /api/upload/*
```

## Deployment
```
Frontend: Vercel/Netlify
Backend: Railway/Render
Database: MongoDB Atlas
ML Service: Railway
Redis: Upstash
```

