# MediFlow AI 2.0 — Smart Hospital Appointment, Doctor Availability & Patient Queue Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Python](https://img.shields.io/badge/Python-v3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v6.19-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-v1.6-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

MediFlow AI 2.0 is a full-stack hospital outpatient department (OPD) intelligence, appointment scheduling, real-time notification, and patient queue triage platform. It combines transactional scheduling with an independent Python FastAPI machine learning microservice, signed QR clinician presence tracking, event-driven WebSocket updates, and scientific data governance.

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [Problem Statement](#-problem-statement)
3. [Key Features](#-key-features)
4. [Technology Stack](#-technology-stack)
5. [System Architecture](#-system-architecture)
6. [Detailed Technical Guides](#-detailed-technical-guides)
7. [Project Structure](#-project-structure)
8. [Installation & Setup](#-installation--setup)
9. [Environment Configuration](#-environment-configuration)
10. [Database Provisioning & Migrations](#-database-provisioning--migrations)
11. [Starting All Services](#-starting-all-services)
12. [API Documentation](#-api-documentation)
13. [Machine Learning Models & Data Governance](#-machine-learning-models--data-governance)
14. [Screenshots](#-screenshots)
15. [Testing & Verification Suites](#-testing--verification-suites)
16. [Role-Based Access Demo Credentials](#-role-based-access-demo-credentials)
17. [Known Limitations](#-known-limitations)
18. [Future Scope & Roadmap](#-future-scope--roadmap)

---

## 📚 Detailed Technical Guides

For comprehensive technical deep-dives, consult the dedicated architecture specifications in `docs/`:

* 🏛️ **[System Architecture (`docs/SYSTEM_ARCHITECTURE.md`)](docs/SYSTEM_ARCHITECTURE.md)**: Full component breakdown, decoupled microservices, and communication protocols.
* 🗄️ **[Database Design & Schema (`docs/DATABASE_DESIGN.md`)](docs/DATABASE_DESIGN.md)**: Prisma entity relationships, timestamps, and physical double-booking constraints.
* 🔌 **[API Specification Guide (`docs/API_GUIDE.md`)](docs/API_GUIDE.md)**: Complete REST endpoint documentation with request/response schemas.
* 🧠 **[ML Architecture & Governance (`docs/ML_ARCHITECTURE.md`)](docs/ML_ARCHITECTURE.md)**: Mathematical baselines, models, dev metrics, and honest governance boundaries.
* 🚀 **[Deployment & DevOps Guide (`docs/DEPLOYMENT_GUIDE.md`)](docs/DEPLOYMENT_GUIDE.md)**: Production PM2, Gunicorn/Uvicorn, Nginx reverse proxy, and database backup routines.
* 🧪 **[Testing & QA Guide (`docs/TESTING_GUIDE.md`)](docs/TESTING_GUIDE.md)**: Unit, integration, E2E test commands, and manual viva demonstration steps.

---

## 🏥 Project Overview

Modern tertiary healthcare facilities face severe operational friction in their outpatient clinics:
- Unpredictable clinician arrivals lead to overcrowded waiting rooms.
- Static booking calendars create double-bookings and unutilized vacant slots during unexpected cancellations.
- Opaque triage leads to patient frustration and emergency delays.
- Hospital administrators lack real-time predictive capacity metrics.

**MediFlow AI 2.0** solves these challenges through a resilient, decoupled full-stack architecture:
- **Transactional Core (Node.js/Express + PostgreSQL/Prisma):** Enforces strict ACID booking transactions, compound database slot locking, role-based access control, cryptographic QR check-in, and instant WebSocket broadcasts.
- **Inference Microservice (Python FastAPI + scikit-learn):** Provides non-blocking, explainable machine learning predictions for patient wait times, doctor delay risks, consultation durations, and department volume forecasts.
- **Healthcare Data Governance:** Rejects false claims of production accuracy. Models are transparently classified as `IMPLEMENTED_BUT_INSUFFICIENT_DATA` until ground-truth timestamps accumulate in production.

---

## 🎯 Problem Statement

Traditional Hospital Information Management Systems (HIMS) treat outpatient appointments as static calendar entries. When a surgeon is delayed in an emergency procedure or an inpatient code arises, outpatient queues stall without automated warnings. When booked patients fail to show up, vacant slots are lost forever.

MediFlow AI transforms scheduling from a passive ledger into an **active, adaptive healthcare workflow**:
1. Synchronizes clinician working schedules with **live physical presence** verified via signed dynamic QR codes and hospital gate sessions.
2. Automates dynamic waitlist triage using an **explainable rule-based priority formula** (medical priority + clinical urgency + waiting duration).
3. Dispatches **real-time in-app notifications** persisted in PostgreSQL and pushed over Socket.IO user/role rooms alongside transactional email alerts.
4. Provides **advisory ML predictions** with strict scientific data governance without ever allowing AI to override clinician absence or booking safety constraints.

---

## 🌟 Key Features

### 1. Multi-Role Authentication & Access Control (RBAC)
- Strict segregation of privileges across **ADMIN**, **DOCTOR**, and **PATIENT** roles (`RECEPTIONIST` enum also defined in schema).
- Passwords salted and hashed with **bcryptjs** (salt rounds: 10).
- Stateless **JWT** authentication transmitted via **HTTP-only cookies** (`sameSite: 'lax'`) with Bearer fallback.
- Role guards across Express REST routes (`authenticateUser`, `authorizeRoles`) and React Router (`ProtectedRoute`).

### 2. Smart Doctor Presence & QR Attendance Management
- Clinicians check in and out of hospital OPD gates using **signed JWT QR tokens** (`/api/presence/qr/check-in`, `/api/presence/qr/check-out`) with camera scanning (`html5-qrcode`), manual token entry, or 1-Click demo gate verification.
- Anti-replay session validation rejects duplicate check-ins (`HTTP 409 Conflict`) and invalid check-outs (`HTTP 404`), backed by rate limiting (`qrAttendanceLimiter`) and `QRScanAudit` logging.
- Supports live presence states (`PRESENT`, `AVAILABLE`, `IN_CONSULTATION`, `ON_BREAK`, `ON_LEAVE`, `AWAY`, `BUSY`, `OFFLINE`).
- Real-time Socket.IO events (`doctor_status_changed`, `doctor_attendance_updated`) keep doctor and admin dashboards synchronized and dynamically gate patient booking slots.

### 3. Dynamic Slot Generation & Double-Booking Prevention
- Generates discrete, non-overlapping consultation slots from doctor schedules and consultation durations (`slotGenerator.js`).
- Executes bookings inside **PostgreSQL atomic transactions (`prisma.$transaction`)** with doctor-slot conflict checks, patient-time conflict checks, and `@unique` `Appointment.slotId` enforcement.

### 4. Smart Waitlist & Rule-Based Priority Auto-Allocation
- Patients unable to book a preferred slot can join a ranked waitlist queue (`/api/waitlist`).
- **Deterministic, explainable rule-based priority formula** (`priorityService.js`, bounded **15–90 points**):
  $$\text{Priority Score} = \text{Medical Priority Points (10–40)} + \text{Clinical Urgency Points (5–20)} + \min\!\left(\left\lfloor\frac{\text{Wait Minutes}}{30}\right\rfloor, 30\right)$$
- When a confirmed appointment is cancelled or rescheduled, `allocationService.js` automatically allocates the freed slot to the highest-priority waitlisted candidate.

### 5. Real-Time In-App Notification System
- Persistent `Notification` model in PostgreSQL linked to `User` (`isRead`, `readAt`, `metadata`, `NotificationType` enum).
- Delivers user-scoped notifications (`user_${userId}`) and admin alerts (`role_admin`) over Socket.IO (`notification:new`, `notification:count`) to the navbar **`NotificationBell`** center with live unread badges, skeleton/empty/error states, and mark-as-read controls.
- Triggered on appointment booking, appointment cancellation, and doctor QR check-in/check-out without interrupting core transactions if dispatch fails.

### 6. AI Health Assistant & Smart Symptom Triage (Rule-Based)
- Non-diagnostic health navigation assistant (`/health-assistant`, `/api/triage/analyze`) featuring a regex **Emergency Keyword Safety Circuit** for acute cardiac/respiratory/stroke symptoms.
- Multi-specialty weighted keyword scoring maps symptoms to hospital departments, matches verified PostgreSQL doctors, attaches a medical disclaimer, and stores per-patient `TriageHistory`.

### 7. Live OPD Queue Board & Patient Check-In Pass
- Patients receive a signed 48-hour JWT QR pass (`GET /api/check-in/appointment/:id/qr`, scanned via `POST /api/check-in/scan`).
- Clinic reception/doctor check-in (`/check-in`) stamps `checkedInAt`, `consultationStartedAt`, `consultationCompletedAt`, and `actualDurationMinutes`.
- Public waiting room queue screen (`/queue/:doctorId`) displays anonymized queues (`Rahul V.***`) with live updates.

### 8. Decoupled Machine Learning Microservice & Governance Center (MediFlow AI 2.0)
- Python FastAPI microservice (port `5002`) communicating with Express via `X-Internal-Token` authentication and a 3,000ms timeout with statistical fallback (`mlServiceClient.js`).
- Houses **4 scikit-learn models** trained and benchmarked on an **isolated synthetic development pipeline (4,080 CSV records)**:
  1. **Patient Waiting-Time Regressor** (`RandomForestRegressor`)
  2. **Doctor Availability & Delay Classifier** (`RandomForestClassifier`)
  3. **Consultation Duration Regressor** (`GradientBoostingRegressor`)
  4. **Department Demand Forecaster** (`RandomForestRegressor` with Time-Series Lag Features)
- **Admin Intelligence Center (`/admin/intelligence`):** Separates development benchmark performance from real hospital readiness, audits prospective timestamp completeness (`INSUFFICIENT_DATA`), and gates `/api/ai/admin/retrain` until clinical data thresholds are met.

### 9. Transactional Rescheduling & Email Notification Pipeline
- Atomic rescheduling releases the old slot for waitlist reallocation while booking the new slot.
- Asynchronous email confirmations, check-in passes, cancellations, and reminders dispatched via **Nodemailer** (auto-provisions Ethereal test inbox when SMTP credentials are omitted).

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
|:---|:---|:---|
| **Frontend Client** | React 18, Vite 5, Tailwind CSS 3.4, React Router 6, Axios, Socket.IO Client 4.8, `html5-qrcode` | Role-based portals, QR camera scanner, Notification Bell, Admin Intelligence Center |
| **Backend API** | Node.js 18+, Express 4.21, Prisma ORM 6.19, Socket.IO 4.8, Nodemailer, Bcrypt.js, JWT, `qrcode`, `cookie-parser` | REST API, JWT/RBAC middleware, ACID transactions, notification & email dispatch, WebSocket rooms |
| **ML Microservice** | Python 3.11+, FastAPI, Uvicorn, scikit-learn, pandas, numpy, joblib, Pydantic, Pytest | Isolated inference service, baseline evaluation registry, data quality audit, dev training scripts |
| **Database** | PostgreSQL 14+, Prisma Client | Relational schema (14 models), versioned migrations, foreign keys, query indexes |
| **Security & Auth** | HTTP-Only JWT Cookies, Signed QR JWTs, Custom Rate Limiter, `X-Internal-Token` | Session security, anti-replay QR validation, inter-service protection |

---

## 🏛️ System Architecture

```
                                  +---------------------------------------+
                                  |         React 18 / Vite Client        |
                                  |    (Patient / Doctor / Admin UI)      |
                                  +-------------------+-------------------+
                                                      |
                                          HTTP / REST | WebSocket (Socket.IO)
                                                      v
                                  +---------------------------------------+
                                  |        Express.js Backend API         |
                                  |               (Port 5001)             |
                                  |  - JWT Auth & Role-Based Middleware   |
                                  |  - Appointment Booking Engine         |
                                  |  - Smart Waitlist Auto-Allocation     |
                                  |  - QR Code Generation & Verification  |
                                  +---------+-------------------+---------+
                                            |                   |
                        Prisma Transactions |                   | HTTP + X-Internal-Token
                               (Port 5432)  |                   | (Port 5002, 3000ms timeout)
                                            v                   v
                     +-----------------------------+     +-------------------------------+
                     |     PostgreSQL Database     |     |   Python FastAPI ML Service   |
                     |                             |     |          (Port 5002)          |
                     |  - Users & Doctor Rosters   |     |  - Waiting Time Regressor     |
                     |  - Appointments & Slots     |     |  - Availability Classifier    |
                     |  - Waitlists & Triage       |     |  - Duration Regressor         |
                     |  - Attendance & Presence    |     |  - Department Demand Forecast |
                     |  - Prospective Timestamps   |     |  - Governance Model Registry  |
                     +-----------------------------+     +-------------------------------+
```

---

## 📁 Project Structure

```
mediflow-ai/
├── backend/                        # Node.js Express Backend Service
│   ├── prisma -> ../database       # Symlink to authoritative database directory
│   ├── src/
│   │   ├── config/                 # db.js (Prisma) & socket.js (Socket.IO rooms)
│   │   ├── controllers/            # Auth, Appointment, Doctor, Attendance, Notification, Triage, AI, Check-In
│   │   ├── middleware/             # JWT authentication, RBAC & rateLimiter guards
│   │   ├── routes/                 # Express REST endpoint routers (/api/*)
│   │   ├── services/               # Core business services
│   │   │   ├── ai/                 # mlServiceClient.js, aiService.js, statistical estimators
│   │   │   ├── appointment.service.js
│   │   │   ├── waitlist.service.js
│   │   │   ├── priorityService.js
│   │   │   ├── allocationService.js
│   │   │   ├── checkInService.js
│   │   │   ├── doctorAttendanceService.js
│   │   │   ├── notificationService.js
│   │   │   ├── triageService.js
│   │   │   └── emailService.js
│   │   ├── app.js                  # Express router & middleware configuration
│   │   └── server.js               # HTTP & Socket.IO server entry point
│   ├── tests/                      # Backend ML integration tests
│   ├── .env.example
│   └── package.json
├── database/                       # Database Definition & Migrations
│   ├── migrations/                 # 5 Versioned PostgreSQL Migrations
│   │   ├── 20261031180337_init/
│   │   ├── 20261031185602_add_doctor_presence_and_duration/
│   │   ├── 20261101071958_add_waitlist_urgency/
│   │   ├── 20261103035351_add_prediction_logs/
│   │   └── 20261103210000_add_prospective_consultation_timestamps/
│   ├── schema.prisma               # Authoritative Prisma Schema (14 models, includes Notification)
│   └── seed.js                     # Database seeder
├── frontend/                       # React 18 / Vite Client Application
│   ├── src/
│   │   ├── components/             # NotificationBell, Navbar, AIIntelligenceCenter, MediFlowHelperBubble, UI primitives
│   │   ├── context/                # AuthContext provider
│   │   ├── hooks/                  # useSocket real-time subscription hook
│   │   ├── pages/                  # Route views (Home, Directory, Dashboards, Attendance, Queue, HealthAssistant)
│   │   └── services/               # api.js (Axios) & socket.js (Socket.IO client)
│   ├── .env.example
│   └── package.json
├── ml-service/                     # Python FastAPI Machine Learning Microservice
│   ├── app/
│   │   ├── api/routes/             # /health, /predict/*, /models/*, /data-quality/*
│   │   ├── core/                   # Security (X-Internal-Token) & Pydantic settings
│   │   ├── schemas/                # Request & response validation schemas
│   │   └── services/               # Predictor & data quality services
│   ├── artifacts/                  # Trained scikit-learn .joblib artifacts & model_registry.json
│   ├── data/development/           # Isolated synthetic development CSV benchmarks (4,080 rows)
│   ├── tests/                      # Pytest suite (15 tests)
│   ├── training/                   # Dev training & data-loader scripts
│   ├── .env.example
│   └── requirements.txt
├── docs/                           # Engineering Documentation & UI Screenshots
├── scratch/                        # Automated E2E & subsystem audit scripts
├── .env.example                    # Master environment template
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Python:** v3.11 or higher with `pip`
- **PostgreSQL:** v14.0 or higher running on `localhost:5432`

---

## ⚙️ Environment Configuration

### 1. Root & Backend Environment
Copy the backend environment template and configure your PostgreSQL credentials:

```bash
cp backend/.env.example backend/.env
```

Key environment variables in `backend/.env`:
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:password@localhost:5432/mediflow_ai?schema=public"
JWT_SECRET=super_secure_random_jwt_key_min_32_characters
JWT_EXPIRES_IN=7d

# ML Service Microservice Integration
ML_SERVICE_URL=http://localhost:5002
ML_SERVICE_SECRET=mediflow_internal_ml_service_secret_2026
```

### 2. Frontend Environment
Copy the frontend environment template:

```bash
cp frontend/.env.example frontend/.env
```

Key variable in `frontend/.env`:
```env
VITE_API_URL=http://localhost:5001
```

### 3. Machine Learning Microservice Environment
Copy the ML service template:

```bash
cp ml-service/.env.example ml-service/.env
```

Key variables in `ml-service/.env`:
```env
ML_SERVICE_PORT=5002
ML_SERVICE_SECRET=mediflow_internal_ml_service_secret_2026
DATABASE_URL="postgresql://postgres:password@localhost:5432/mediflow_ai?schema=public"
```

---

## 🗄️ Database Provisioning & Migrations

MediFlow AI uses formal versioned Prisma migrations.

1. **Install backend dependencies:**
   ```bash
   npm --prefix backend install
   ```

2. **Apply versioned migrations and sync latest schema:**
   ```bash
   npx --prefix backend prisma migrate deploy --schema=database/schema.prisma
   npx --prefix backend prisma db push --schema=database/schema.prisma
   ```

3. **Generate Prisma Client:**
   ```bash
   npx --prefix backend prisma generate --schema=database/schema.prisma
   ```

4. **Seed database with clinicians, working schedules, and test patients:**
   ```bash
   npm --prefix backend run seed
   ```

---

## 💻 Starting All Services

For complete functionality, run all three services concurrently in separate terminal tabs:

### 1. Start Python FastAPI ML Service (Port 5002)
```bash
# Optional: create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python ML dependencies
pip install -r ml-service/requirements.txt

# Start ML service with Uvicorn
PYTHONPATH=ml-service python3 -m uvicorn app.main:app --app-dir ml-service --host 0.0.0.0 --port 5002
```
*Health Check:* `curl -s http://localhost:5002/health`

### 2. Start Express Backend API (Port 5001)
```bash
npm --prefix backend run dev
```
*Health Check:* `curl -s http://localhost:5001/api/health`

### 3. Start Frontend Client (Port 5173)
```bash
npm --prefix frontend install
npm --prefix frontend run dev
```
*Access Application:* Open `http://localhost:5173` in your web browser.

---

## 📡 API Documentation

### Authentication & Profiles
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/auth/register` | Public | Register new patient account |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue HTTP-only JWT cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clear session cookie |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated user profile |

### Doctors, Schedules & Smart Presence
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/doctors` | Public | List verified doctors with search and department filters |
| `GET` | `/api/doctors/:id` | Public | Get doctor profile, active schedules, and current presence |
| `GET` | `/api/presence/me` | Doctor | Fetch logged-in doctor attendance status, duration & active session |
| `GET` | `/api/presence/qr/active` | Doctor / Admin | List active cryptographically signed hospital QR gates with base64 data URLs |
| `POST` | `/api/presence/qr/check-in` | Doctor | Verify signed QR token & transition doctor to `PRESENT` |
| `POST` | `/api/presence/qr/check-out` | Doctor | Check out of hospital shift, record duration & transition to `OFFLINE` |
| `PUT` | `/api/presence/status` | Doctor | Fast presence state toggle (`AVAILABLE`, `IN_CONSULTATION`, `ON_BREAK`) |
| `POST` | `/api/presence/qr/generate` | Admin | Provision new cryptographic hospital gate QR code |

### Appointments & Slots
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/appointments/slots/:doctorId` | Authenticated | Fetch available, non-overlapping consultation slots (presence-gated) |
| `POST` | `/api/appointments` | Patient | Book an appointment slot inside a Prisma transaction |
| `PUT` | `/api/appointments/:id/reschedule` | Patient / Doctor / Admin | Atomically reschedule appointment with waitlist reallocation |
| `PUT` | `/api/appointments/:id/cancel` | Patient / Doctor / Admin | Cancel appointment and auto-allocate freed slot to waitlist |
| `GET` | `/api/appointments/my` | Patient | View patient's booked appointments and digital QR tokens |

### Real-Time Notifications
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/notifications` | Authenticated | Retrieve paginated in-app notifications and unread count for current user |
| `GET` | `/api/notifications/unread-count` | Authenticated | Fast unread notification count lookup for Navbar bell badge |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Mark all unread notifications as read for current user |
| `PATCH` | `/api/notifications/:id/read` | Owner Only | Mark single notification as read (ownership-enforced) |

### Smart Waitlist & Priority Allocation
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/waitlist` | Patient | Join doctor's waitlist queue with clinical urgency & priority scoring |
| `GET` | `/api/waitlist/my` | Patient | View logged-in patient's active waitlist entries |
| `GET` | `/api/waitlist/doctor/my` | Doctor | View doctor's ranked waitlist triage queue |
| `PUT` | `/api/waitlist/:id/leave` | Patient / Admin | Leave waitlist queue |
| `POST` | `/api/waitlist/allocate` | Admin / Doctor | Trigger smart allocation of freed appointment slot to waitlist |

### AI Health Assistant & Smart Symptom Triage
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/triage/analyze` | Authenticated | Emergency detection circuit, department routing & doctor matching |
| `GET` | `/api/triage/history` | Authenticated | View patient's historical symptom evaluations and recommendations |

### Check-In & OPD Queue
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/check-in/appointment/:id/qr` | Owner / Doctor / Admin | Generate or retrieve signed 48-hour appointment check-in QR pass |
| `POST` | `/api/check-in/scan` | Authenticated | Scan patient QR token, stamp `checkedInAt`, and enter queue |
| `GET` | `/api/check-in/queue/:doctorId` | Public | Live anonymized OPD queue board for clinic waiting rooms |
| `PUT` | `/api/check-in/queue/consultation/:id` | Doctor / Admin | Update consultation lifecycle (`START` -> `COMPLETE` -> `NO_SHOW`) |

### Machine Learning & AI Intelligence
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/ai/model-status` | Authenticated | Health and readiness status of all 4 ML models |
| `GET` | `/api/ai/waiting-time` | Authenticated | Advisory patient waiting-time inference |
| `GET` | `/api/ai/doctor-availability` | Authenticated | Advisory doctor availability and delay probability |
| `GET` | `/api/ai/appointment-duration` | Authenticated | Advisory consultation duration inference |
| `GET` | `/api/ai/appointment-demand` | Authenticated | Department demand analysis & 7-day rolling forecast |
| `GET` | `/api/ai/admin/evaluation` | Admin Only | Full model evaluation registry with baseline comparisons |
| `GET` | `/api/ai/admin/data-quality` | Admin Only | Prospective label completeness & production readiness audit |
| `GET` | `/api/ai/admin/dev-dataset-status` | Admin Only | Isolated development benchmark dataset manifest (4,080 records) |
| `POST` | `/api/ai/admin/retrain` | Admin Only | Production retraining trigger (gated until `>= 500` real events) |
| `GET` | `/api/ai/admin/analytics` | Admin Only | Institutional capacity utilization and forecast reliability |

---

## 🧠 Machine Learning Models & Data Governance

### Rigorous Scientific Governance
MediFlow AI 2.0 adheres strictly to **academic honesty and healthcare software governance**:
- An exhaustive audit of the historical clinic database revealed that prior to MediFlow AI 2.0, completed consultations lacked `checkedInAt` and `consultationStartedAt` timestamps.
- **Never claim unverified production accuracy:** MediFlow AI explicitly labels all models in production as `IMPLEMENTED_BUT_INSUFFICIENT_DATA`.
- **Benchmark Evaluation:** The 4 machine learning pipelines were trained and statistically benchmarked against naive baselines using a clearly designated `SYNTHETIC_DEVELOPMENT_PIPELINE` dataset (4,080 rows in `ml-service/data/development/`).
- **Prospective Data Capture:** Versioned migration `20261103210000_add_prospective_consultation_timestamps` added timestamp columns to the PostgreSQL database. As clinicians operate the system, ground-truth labels are stamped automatically. Production retraining (`/api/ai/admin/retrain`) remains strictly gated until $\ge 500$ clinical events accumulate.

### The Four Machine Learning Models
```
+-----------------------------------------------------------------------------------------------------+
| 1. PATIENT WAITING-TIME PREDICTION                                                                  |
| Champion: RandomForestRegressor (MAE: 3.86 min vs Dummy Baseline MAE: 17.16 min, R²: 0.9489)       |
| Features: Queue position, clinical priority weight, doctor load ratio, hour of day, day of week.   |
+-----------------------------------------------------------------------------------------------------+
| 2. DOCTOR AVAILABILITY & DELAY CLASSIFIER                                                           |
| Champion: Dual RandomForestClassifier with balanced class weights (F1: 0.773, ROC-AUC: 0.504)      |
| Features: Scheduled shift, historical check-in variance, day of week, rush hour index.             |
+-----------------------------------------------------------------------------------------------------+
| 3. CONSULTATION DURATION PREDICTION                                                                 |
| Champion: GradientBoostingRegressor (MAE: 4.09 min vs Dummy Baseline MAE: 6.34 min, R²: 0.5463)     |
| Features: Clinical department, priority triage level, patient age bracket, appointment time of day. |
+-----------------------------------------------------------------------------------------------------+
| 4. DEPARTMENT DEMAND FORECASTING                                                                    |
| Champion: Time-Series RandomForestRegressor with Lag Features (WAPE: 23.23% vs 7D-MA WAPE: 39.48%)  |
| Features: Lag t-1, Lag t-7, 7-day rolling average, day of week cyclical encoding.                   |
+-----------------------------------------------------------------------------------------------------+
```

---

## 🖼️ Screenshots

### Apollo-Grade Specialists Directory & Online Booking
![Doctor Directory](docs/screenshots/mediflow_home_directory.jpg)
*Filter verified medical specialists across Pune Central Hospital by department, review consultation fees, check real-time presence, and book instant appointment slots.*

### Emergency Care Desk & Architecture Overview
![Emergency Desk & Architecture](docs/screenshots/mediflow_emergency_architecture.jpg)
*24/7 Rapid response ambulance desk with direct helpline dialing and live capstone architecture monitoring.*

---

## 🧪 Testing & Verification Suites

MediFlow AI includes automated test suites verified across all layers:

### 1. Python ML Service Pytest Suite
```bash
PYTHONPATH=ml-service pytest ml-service/tests
```
**Observed Result:** `15 passed in 3.21s` (API contracts, model serialization, preprocessing pipelines, data quality metrics, and health probes).

### 2. Real-Time Notification System E2E Suite
```bash
node scratch/test_notifications.mjs
```
**Observed Result:** `50 passed, 0 failed (100%)` (Verifies HTTP 401/403 security guards, PostgreSQL `Notification` persistence, Socket.IO `notification:new` & `notification:count` room isolation, booking/cancellation/QR check-in/check-out alerts, duplicate prevention, mark-as-read, and mark-all-read).

### 3. Complete End-to-End System Integration Audit
```bash
node scratch/test_complete_integration_audit.mjs
```
**Observed Result:** `62 passed, 0 failed (100%)` across all 8 architectural layers (Express/FastAPI health, JWT & RBAC, QR attendance, presence-gated appointments, waitlist prioritization, 4 ML inference endpoints, Admin Intelligence & Data Quality audit, and AI Symptom Triage).

### 4. Smart Doctor Presence & QR Attendance Workflow Test
```bash
node scratch/test_doctor_presence.mjs
```
**Observed Result:** `11 passed, 0 failed (100%)` (Validates QR check-in, presence transition to `PRESENT`, duplicate check-in 409 rejection, admin directory reflection, check-out transition to `OFFLINE`, and slot gating).

### 5. Frontend Production Build Check
```bash
npm --prefix frontend run build
```
**Observed Result:** `183 modules transformed`, `✓ built in 1.41s` (Clean Vite production bundle without syntax or import errors).

---

## 👥 Role-Based Access Demo Credentials

The database seeder provisions initial test users across all three roles (local development/viva demonstration accounts):

| Role | Email Address | Password | Clinical Function / Context |
|:---|:---|:---|:---|
| **ADMIN** | `admin@mediflow.com` | `password123` | System Administrator with access to AI Intelligence Center, QR Gates & Audit Logs |
| **DOCTOR** | `dr.jawale@mediflow.com` | `password123` | Dr. Sunil Jawale (Nephrology Consultant — used in live presence & booking verification) |
| **DOCTOR** | `dr.sharma@mediflow.com` | `password123` | Dr. Rajesh Sharma (Cardiology Consultant, Room 101) |
| **DOCTOR** | `dr.patel@mediflow.com` | `password123` | Dr. Ananya Patel (Neurology Consultant, Room 204) |
| **PATIENT**| `rahul.verma@example.com` | `password123` | Test Patient with booked appointment and digital QR check-in pass |
| **PATIENT**| `priya.singh@example.com` | `password123` | Test Patient with active waitlist entry |

---

## ⚠️ Known Limitations

1. **Production ML Training Gate (`INSUFFICIENT_DATA`):** ML models currently serve advisory inference using development benchmark weights (`SYNTHETIC_DEVELOPMENT_PIPELINE`, 4,080 rows) until $\ge 500$ prospective real clinical events accumulate in PostgreSQL.
2. **Local QR & Geolocation Simulation:** Camera QR scanning works via `html5-qrcode` when permitted, with a 1-Click Demo / manual token workflow for local review. Client geolocation coordinates may be optionally requested on `/doctor/attendance`, while the backend validates the signed JWT QR token and session state without enforcing a physical 150m campus geofence.
3. **In-App Socket.IO vs. Background Web Push:** Real-time notification alerts arrive immediately via Socket.IO while the web app is open; background OS push notifications (Service Worker / VAPID) when the browser is closed are not yet implemented.
4. **Development Fallback Strings & Ethereal SMTP:** Development environment fallbacks exist in local config modules when `.env` variables are omitted; production deployment must supply strong `JWT_SECRET`, `ML_SERVICE_SECRET`, and real SMTP credentials.

---

## 🔮 Future Scope & Roadmap

1. **Automated Production Retraining Pipeline:**  
   Once $\ge 500$ ground-truth consultation records accumulate in PostgreSQL, trigger scheduled/automated retraining to replace synthetic benchmark weights with real hospital data distributions.
2. **Server-Side Geofencing & Physical IoT RFID / BLE Gateway:**  
   Integrate physical hospital door RFID card readers and true server-side Haversine campus geofencing directly with `/api/presence/qr/check-in`.
3. **Web Push (Service Worker / VAPID) & SMS Gateway:**  
   Extend the notification pipeline beyond Socket.IO and Nodemailer email to browser background push notifications and SMS reminders.
4. **HL7 / FHIR Integration & Multi-Hospital Federation:**  
   Export appointment encounters using HL7 FHIR R4 specifications and support federated demand forecasting across hospital networks.

---

## 📄 License
This project is licensed under the **ISC** License as specified in `package.json`.
