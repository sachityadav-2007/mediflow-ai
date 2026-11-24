# MediFlow AI
Smart Doctor Appointment Booking and Patient Management System.

[![Live Application](https://img.shields.io/badge/Live%20Demo-mediflow--ai--app.vercel.app-2ea44f?style=for-the-badge&logo=vercel&logoColor=white)](https://mediflow-ai-app.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.18-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v18.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Prisma](https://img.shields.io/badge/Prisma-v5.8-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.7-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Python](https://img.shields.io/badge/Python-v3.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.110-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-v1.4-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## 🚀 Live Demo

**Production Web App:**  
👉 **[https://mediflow-ai-app.vercel.app](https://mediflow-ai-app.vercel.app)**

Verified production routes:
* [`/doctors`](https://mediflow-ai-app.vercel.app/doctors) — Specialist catalog with search, specialty filters, and real-time presence badges.
* [`/book`](https://mediflow-ai-app.vercel.app/book) — 30-minute discrete slot selection and booking engine.
* [`/my-appointments`](https://mediflow-ai-app.vercel.app/my-appointments) — Patient appointment management, history, and digital QR check-in pass.
* [`/patient/dashboard`](https://mediflow-ai-app.vercel.app/patient/dashboard) — Patient medical portal with upcoming visits.
* [`/waitlist`](https://mediflow-ai-app.vercel.app/waitlist) — Dynamic waitlist priority tracker with transparent score breakdown.
* [`/health-assistant`](https://mediflow-ai-app.vercel.app/health-assistant) — AI Health Assistant & smart symptom triage.

---

## 📂 Explore the Repository

| Directory | Description | Primary Reference |
|---|---|:---:|
| [`frontend/`](./frontend/) | Modern React 18 + Vite Single Page Application for patients, doctors, and admins | [Frontend README](./frontend/README.md) |
| [`backend/`](./backend/) | Node.js Express REST API gateway, business logic, and Socket.IO WebSocket hub | [Backend README](./backend/README.md) |
| [`database/`](./database/) | PostgreSQL schema, Prisma ORM migrations, seeder scripts, and database documentation | [DATABASE.md](./database/DATABASE.md) |
| [`ml-service/`](./ml-service/) | Python FastAPI microservice with 4 Scikit-Learn analytical inference models | [ML README](./ml-service/README.md) |
| [`docs/`](./docs/) | Technical architecture specifications, security reviews, and research reports | [Architecture Spec](./docs/architecture.md) |
| [`scripts/`](./scripts/) | Unified development runners, API benchmarks, and experiment reproduction scripts | [Scripts Directory](./scripts/) |

> 📖 **Deep Database Documentation:** For the full entity-relationship (ER) diagram, 14 model field specifications, indexes, and transactional workflows, see **[`database/DATABASE.md`](./database/DATABASE.md)**.

---

## 🏥 Project Overview

**MediFlow AI** is an enterprise outpatient department (OPD) queue optimization, doctor presence tracking, and intelligent appointment orchestration system. Traditional hospital outpatient environments suffer from severe physical waiting hall congestion, unpredictable clinician delays, high slot wastage due to no-shows, and rigid first-come, first-served waitlists that fail to prioritize clinical urgency.

MediFlow AI transforms this workflow through:
1. **Dynamic 30-Minute Discrete Slots:** Generated automatically from doctor availability matrices, with concurrency locks to guarantee zero double-booking.
2. **Authoritative Doctor Presence:** Live status badges (`● PRESENT`, `● BUSY`, `● AWAY`, `● OFFLINE`) coupled with cryptographic QR shift attendance.
3. **Contactless QR Reception Check-In:** Digital QR pass generation for instant kiosk or reception check-in.
4. **Explainable Triage Scoring Engine:** Deterministic priority formula ($Score = Medical + Urgency + WaitTime$) inspired by the Emergency Severity Index (ESI) that automatically reallocates cancelled slots.
5. **Decoupled Machine Learning Microservice:** Standalone Python FastAPI microservice hosting 4 Scikit-Learn pipelines for predictive wait-time estimation, clinician delay forecasting, and department workload planning.

---

## ✨ Main Features

* **Interactive Specialists Directory:** 13 verified medical specialists across Cardiology, Neurology, Dermatology, Orthopedics, Pediatrics, Oncology, Nephrology, etc., with real-time presence indicators.
* **Concurrency-Safe Slot Engine:** Discrete non-overlapping 30-minute booking intervals backed by atomic database transactions.
* **Cryptographic QR Pass & Kiosk Check-In:** Automatic QR pass generation for every booking; `/check-in` scanner portal activates patient into the live OPD queue.
* **Live OPD Queue Board (`/queue/:doctorId`):** Public screen-compatible real-time display showing currently serving token, queue position, and doctor consultation progress.
* **Explainable Smart Waitlist Triage:** Transparent scoring algorithm that ranks waitlisted patients and automatically backfills cancelled slots.
* **Doctor Shift Attendance (`/doctor/attendance`):** Location-verified check-in and check-out via dynamic QR codes with immutable presence audit logs.
* **Hospital Control Center (`/admin/dashboard`):** Real-time operational dashboard with KPI counters, doctor workload monitoring, patient registry, and manual allocation triggers.
* **AI Symptom Triage Assistant (`/health-assistant`):** Interactive symptom checker with red-flag emergency screening and clinical department guidance.
* **Real-Time WebSocket Notifications:** In-app notification center powered by Socket.IO for immediate booking, waitlist, and schedule alerts.

---

## 🛠️ Technology Stack

| Domain | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, React Router v6, Axios, Lucide React, Socket.IO Client, HTML5-QRCode |
| **Backend API Gateway** | Node.js 20 LTS, Express.js 4, Prisma ORM 5, Socket.IO 4, JWT, bcryptjs, Helmet, Express-Rate-Limit |
| **Database** | Serverless PostgreSQL 16 on Neon (AWS `us-east-2`), PgBouncer connection pooling |
| **ML Microservice** | Python 3.13, FastAPI 0.110, Uvicorn, Scikit-Learn 1.4, Pandas 2.2, NumPy 1.26, Joblib 1.3 |
| **Hosting & DevOps** | Vercel (Frontend SPA), Render (Express API & FastAPI ML Service), Docker Compose |

---

## 🏛️ System Architecture

MediFlow AI enforces strict separation of concerns across a decoupled 3-tier architecture:

```
[Client Web Browsers] ──(HTTPS/WSS)──> [Vercel Edge CDN: React 18 SPA]
                                                    │
                                         REST Calls │ WebSocket Upgrades
                                                    ▼
                       [Render Cloud Gateway: Node.js / Express Server]
                                    │                           │
                    Prisma ORM / SQL│                JSON / HTTP│
                     (Port 6543)    │                (Port 5002)│
                                    ▼                           ▼
            [Neon PostgreSQL 16 Database]        [FastAPI ML Advisory Microservice]
            • 14 Normalized Relational Models    • Waiting Time Regressor (RF)
            • ACID Transaction Concurrency       • Doctor Delay Classifier (RF)
            • Row-Level Locks & Constraints      • Consultation Duration (GBR)
            • Immutable Audit Logs               • Department Demand Forecast (Lag)
```

For full architectural details, data flow diagrams, and concurrency guarantees, see **[`docs/architecture.md`](./docs/architecture.md)**.

---

## 💻 Local Installation & Setup

### Prerequisites
* **Node.js:** `v20.x` or higher
* **npm:** `v10.x` or higher
* **PostgreSQL:** `v16` (or a free [Neon](https://neon.tech) serverless database)
* **Python:** `v3.11+` (optional, for ML microservice)

### 1. Clone the Repository
```bash
git clone https://github.com/sachityadav-2007/mediflow-ai.git
cd mediflow-ai
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend dependencies in one command:
npm run install:all
```

### 3. Environment Configuration
Copy the template files:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Ensure `backend/.env` contains your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/mediflow_ai?sslmode=require&pgbouncer=true"
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/mediflow_ai?sslmode=require"
JWT_SECRET="your_secure_jwt_secret_min_32_characters"
CLIENT_URL="http://localhost:5173"
PORT=5001
```

### 4. Database Setup & Seeding
```bash
# Validate Prisma schema
npm run db:validate

# Apply migrations
npm run db:migrate

# Seed database with sample doctors, patients, and appointment slots
npm run db:seed
```

### 5. Running the Application
```bash
# Run both Backend & Frontend concurrently:
npm run dev

# Or run components individually:
npm run dev:frontend   # React on http://localhost:5173
npm run dev:backend    # Express on http://localhost:5001
```

---

## 📡 API Overview

The Express API exposes RESTful endpoints at `http://localhost:5001/api`:

| Route Prefix | Primary Purpose | Auth Required |
|---|---|:---:|
| `/api/auth` | User registration, login, logout, current session (`/me`) | No (Public) |
| `/api/doctors` | Public specialist catalog, schedule queries, doctor profiles | No (Public) |
| `/api/appointments` | Discrete slot availability, booking, cancellation, rescheduling | Yes (JWT) |
| `/api/check-in` | QR pass verification, reception scanning, live queue board | Yes (Role-based) |
| `/api/waitlist` | Waitlist registration, priority status, manual allocation trigger | Yes (JWT) |
| `/api/presence` | Doctor live presence status, shift attendance QR check-in/out | Yes (`DOCTOR`/`ADMIN`) |
| `/api/notifications` | User in-app notifications feed and read receipts | Yes (JWT) |
| `/api/triage` | AI Health Assistant symptom triage evaluation and history | Yes (`PATIENT`) |
| `/api/admin` | Hospital executive KPIs, doctor workload, patient directory | Yes (`ADMIN`) |
| `/api/ai` | ML advisory proxy (predicted waiting times, demand forecasts) | Yes (JWT) |
| `/api/health` | Backend server health check and uptime probe | No (Public) |

---

## 👥 Demo Credentials for Testing & Evaluation

Pre-seeded credentials for all three application roles:

| Role | Email Address | Password | Capabilities |
|---|---|---|---|
| **Hospital Admin** | `admin@mediflow.com` | `password123` | Hospital control center, staff workload, patient directory, waitlist allocation, reception QR scanner |
| **Doctor / Consultant** | `dr.sharma@mediflow.com` | `password123` | Daily outpatient queue, presence toggle, consultation status controls, QR shift attendance |
| **Patient** | `rahul.verma@example.com` | `password123` | Specialist search, slot booking, QR pass access, smart waitlist, AI symptom triage |

> 💡 **Quick Fill:** The login portal at `/login` provides 1-click demo buttons to automatically populate credentials for each role.

---

## 🚢 Production Deployment

* **Frontend (Vercel):** Connected to GitHub `main` branch. Configured via [`vercel.json`](./vercel.json) with SPA URL rewrites to `/index.html`.
* **Backend API (Render):** Managed Node.js service defined in [`render.yaml`](./render.yaml). Builds via `cd backend && npm install && npx prisma generate && npx prisma migrate deploy` and runs `node src/server.js`.
* **Database (Neon):** Managed serverless PostgreSQL cluster with connection pooling on AWS `us-east-2`.
* **Docker Support:** Ready-to-run container orchestration via [`docker-compose.prod.yml`](./docker-compose.prod.yml).

---

## 🤝 Contributing

We welcome community contributions! Please review our **[`CONTRIBUTING.md`](./CONTRIBUTING.md)** for branch naming rules, coding standards, and pull request procedures.

---

## 📄 License

This project is open-source and licensed under the [ISC License](./package.json).

## 🙋 My Contributions (Ishita, @ishitahas)

My individual contributions to MediFlow AI, in addition to the shared platform built by my teammate:

- **Doctor Availability Calendar and Slot Management** (`b0b8497`): doctors add, block, unblock and remove date-specific slots; the booking engine honours them. Files: `DoctorAvailabilityCalendar.jsx`, `doctor.routes.js`, `doctor.controller.js`, `doctor.service.js`, `appointment.service.js`, `api.js`.
- **Doctor Directory Sorting and "Accepting Patients" Filter** (`5f864ca`): `DoctorDirectoryPage.jsx`.
- **Local frontend setup guide** (PR #2).

A full mapping of ISD course concepts to this code, with a manual test checklist, is in [`docs/ISD_CONCEPTS.md`](docs/ISD_CONCEPTS.md).
