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
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MediFlow AI 2.0 is an enterprise-grade hospital outpatient department (OPD) intelligence, appointment scheduling, and patient queue triage platform. It combines high-throughput transactional scheduling with an independent Python FastAPI machine learning microservice, cryptographic clinician presence tracking, event-driven WebSocket queue feeds, and academic data governance.

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
17. [Future Scope & Roadmap](#-future-scope--roadmap)

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

MediFlow AI transforms scheduling from a passive ledger into an **active, self-healing healthcare workflow**:
1. Synchronizes clinician working schedules with **live physical presence** verified via cryptographically signed QR codes and geofencing.
2. Automates dynamic slot triage using an **explainable priority formula** (clinical urgency + wait duration).
3. Provides **advisory ML predictions** without ever allowing AI to override clinician schedules or bypass hospital safety constraints.

---

## 🌟 Key Features

### 1. Multi-Role Authentication & Access Control (RBAC)
- Strict segregation of privileges across **ADMIN**, **DOCTOR**, and **PATIENT** roles.
- Passwords salted and hashed with **bcrypt** (salt rounds: 10).
- Stateless **JWT** authentication transmitted via secure, **HTTP-only cookies** to prevent XSS.
- Defense-in-depth authorization guards across backend REST endpoints and frontend React routers.

### 2. Cryptographic Doctor Presence & Attendance
- Clinicians verify daily hospital presence using signed dynamic QR passes and PIN check-ins.
- Geofence validation rejects check-in attempts located > 150m from hospital campus coordinates.
- Authoritative live presence state machine: `PRESENT`, `IN_CONSULTATION`, `AVAILABLE`, `AWAY`, and `OFFLINE`.
- Real-time Socket.IO broadcasts ensure doctor directory and patient booking forms reflect live status instantly.

### 3. Dynamic Slot Generation & Double-Booking Prevention
- Generates discrete, non-overlapping consultation slots based on clinician schedules and consultation duration.
- Enforces database-level uniqueness (`@@unique([doctorId, slotDate, startTime])`) inside PostgreSQL transactions (`prisma.$transaction`).
- Guarantees zero double-booking even under concurrent patient booking surges.

### 4. Smart Waitlist & Priority-Based Auto-Allocation
- Patients unable to book their preferred slot can join a smart waitlist queue.
- Explainable priority scoring formula:
  $$\text{Priority Score} = (\text{Medical Urgency Weight} \times 40) + (\text{Wait Time Days} \times 10) + \text{Triage Factor}$$
- When a confirmed appointment is cancelled or rescheduled, the engine atomically triages and promotes the highest-priority waitlisted patient.

### 5. Live OPD Queue Board & Digital Check-In Pass
- Patients receive a cryptographically signed 48-hour JWT QR pass upon booking confirmation.
- Reception desk camera scanner (`/check-in`) validates check-in, stamps `checkedInAt`, and issues live queue tokens.
- Live OPD queue screen (`/queue/:doctorId`) displays anonymized patient queues (`Rahul V.***`), current patient in cabin, and dynamic wait times.

### 6. Decoupled Machine Learning Microservice (MediFlow AI 2.0)
- Python FastAPI microservice (port 5002) communicating with Express via pre-shared token authentication (`X-Internal-Token`).
- Houses 4 scikit-learn models:
  1. **Patient Waiting-Time Regressor** (`RandomForestRegressor`)
  2. **Doctor Availability & Delay Classifier** (`RandomForestClassifier`)
  3. **Consultation Duration Regressor** (`GradientBoostingRegressor`)
  4. **Department Demand Forecaster** (Time-Series Lag Regressor)
- Graceful degradation: Express wraps ML requests in strict 3-second timeouts. If FastAPI is offline, core booking continues seamlessly.

### 7. AI Intelligence & Model Governance Center
- Administrative executive dashboard (`/admin/ai-intelligence`).
- Displays live model health, benchmark metrics, baseline comparisons (Dummy/Mean baselines), prospective data collection progress, and an interactive clinical feature sandbox.

### 8. Transactional Rescheduling & Automated Notification Pipeline
- Patients can atomically reschedule appointments with automatic release and waitlist reallocation.
- Automated email confirmations, check-in passes, and reschedule alerts dispatched via Nodemailer (integrated with Ethereal dev inbox).

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
|:---|:---|:---|
| **Frontend Client** | React 18, Vite, Tailwind CSS, Lucide Icons, Axios, Socket.IO Client | Responsive Apollo-grade UI, real-time live queues, and doctor portal |
| **Backend API** | Node.js, Express.js, Prisma ORM, Socket.IO, Nodemailer, Bcrypt.js, JWT | RESTful API, authentication, business logic, WebSocket orchestration |
| **ML Microservice** | Python 3.11+, FastAPI, Uvicorn, scikit-learn, pandas, numpy, joblib | Independent inference engine, model evaluation registry, training scripts |
| **Database** | PostgreSQL 14+, Prisma Client | Relational schema, transactional integrity, foreign keys, compound indexes |
| **Security & Auth** | HTTP-Only JWT Cookies, HMAC-SHA256, Geofence Math, Internal Service Tokens | End-to-end transport and role-based security |

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
│   ├── prisma/
│   │   └── seed.js                 # Database seeder (Doctors, Patients, Schedules)
│   ├── src/
│   │   ├── controllers/            # Route controllers (Auth, Appointment, Doctor, AI, etc.)
│   │   ├── middlewares/            # JWT authentication & RBAC guards
│   │   ├── routes/                 # Express REST endpoint routers
│   │   ├── services/               # Core business services
│   │   │   ├── ai/
│   │   │   │   ├── mlServiceClient.js   # Resilient HTTP client for FastAPI
│   │   │   │   ├── aiService.js         # AI controller orchestration & fallbacks
│   │   │   │   ├── waitingTimeEstimator.js
│   │   │   │   └── availabilityPredictor.js
│   │   │   ├── appointment.service.js   # Transactional slot booking & reschedule
│   │   │   ├── waitlist.service.js      # Priority triage & auto-allocation
│   │   │   ├── checkInService.js        # QR pass & consultation timestamping
│   │   │   ├── emailService.js          # Nodemailer transaction notifications
│   │   │   └── doctorPresence.service.js
│   │   └── server.js               # Express application & Socket.IO server
│   ├── tests/                      # Integration test suites
│   ├── .env.example
│   └── package.json
├── database/                       # Database Definition & Migrations
│   ├── migrations/                 # 5 Versioned PostgreSQL Migrations
│   │   ├── 20261031180337_init/
│   │   ├── 20261031185602_add_doctor_presence_and_duration/
│   │   ├── 20261101071958_add_waitlist_urgency/
│   │   ├── 20261103035351_add_prediction_logs/
│   │   └── 20261103210000_add_prospective_consultation_timestamps/
│   └── schema.prisma               # Authoritative Prisma Schema
├── frontend/                       # React 18 / Vite Client Application
│   ├── src/
│   │   ├── components/             # Reusable UI components & AI Intelligence Center
│   │   ├── context/                # Authentication & Socket context providers
│   │   ├── pages/                  # Route views (Home, Directory, Dashboards, Queue)
│   │   └── services/               # Axios API client & WebSocket listeners
│   ├── .env.example
│   └── package.json
├── ml-service/                     # Python FastAPI Machine Learning Microservice
│   ├── app/
│   │   ├── api/routes/             # Inference routes (/predict/*, /models/*)
│   │   ├── core/                   # Security (token auth) & Pydantic settings
│   │   ├── schemas/                # Request & response validation schemas
│   │   └── services/               # Predictor services & model loaders
│   ├── artifacts/                  # Trained scikit-learn models & registry.json
│   │   ├── waiting_time_model.joblib
│   │   ├── doctor_availability_model.joblib
│   │   ├── appointment_duration_model.joblib
│   │   ├── department_demand_model.joblib
│   │   └── model_registry.json
│   ├── datasets/                   # Synthetic benchmark datasets
│   ├── tests/                      # Pytest test suite (10/10 tests)
│   ├── training/                   # Model training & prospective evaluation scripts
│   ├── .env.example
│   └── requirements.txt
├── docs/                           # Comprehensive Engineering Documentation
│   ├── screenshots/                # Application UI screenshots
│   ├── FINAL_SYSTEM_INTEGRATION_AUDIT.md
│   ├── MEDIFLOW_AI_2_ARCHITECTURE.md
│   ├── ML_DATA_AUDIT.md
│   ├── ML_MODEL_EVALUATION.md
│   ├── AI_VIVA_PREPARATION.md
│   └── RESEARCH_EVALUATION_REPORT.md
├── scratch/                        # Automated verification & audit test runners
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

2. **Execute versioned migrations:**
   ```bash
   npx --prefix backend prisma migrate deploy --schema=database/schema.prisma
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
| `GET` | `/api/appointments/slots/:doctorId` | Public | Fetch available, non-overlapping consultation slots (presence-gated) |
| `POST` | `/api/appointments` | Patient | Book an appointment slot inside a Prisma transaction |
| `POST` | `/api/appointments/:id/reschedule`| Patient | Atomically reschedule appointment with waitlist reallocation |
| `PATCH` | `/api/appointments/:id/cancel` | Patient / Admin | Cancel appointment and auto-allocate freed slot to waitlist |
| `GET` | `/api/appointments/my` | Patient | View patient's booked appointments and digital QR tokens |

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
| `POST` | `/api/triage/analyze` | Patient | Emergency detection circuit, department routing & doctor matching |
| `GET` | `/api/triage/history` | Patient | View patient's historical symptom evaluations and recommendations |

### Check-In & OPD Queue
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/checkin/process` | Doctor / Admin | Scan patient QR token, stamp `checkedInAt`, and enter queue |
| `GET` | `/api/checkin/queue/:doctorId` | Public | Live anonymized OPD queue board for clinic waiting rooms |
| `PATCH` | `/api/checkin/status/:id` | Doctor / Admin | Update consultation lifecycle (`START` -> `COMPLETE`) |

### Machine Learning & AI Intelligence
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/ai/model-status` | Authenticated | Health and readiness status of all 4 ML models |
| `GET` | `/api/ai/waiting-time` | Authenticated | Advisory patient waiting-time inference |
| `GET` | `/api/ai/doctor-availability` | Authenticated | Advisory doctor availability and delay probability |
| `GET` | `/api/ai/appointment-duration`| Authenticated | Advisory consultation duration inference |
| `GET` | `/api/ai/department-demand` | Authenticated | 7-day rolling department patient visit forecast |
| `GET` | `/api/ai/admin/evaluation` | Admin Only | Full model evaluation registry with baseline comparisons |
| `GET` | `/api/ai/admin/analytics` | Admin Only | Institutional capacity utilization and forecast reliability |

---

## 🧠 Machine Learning Models & Data Governance

### Rigorous Scientific Governance
MediFlow AI 2.0 adheres strictly to **academic honesty and healthcare software governance**:
- An exhaustive audit of the historical clinic database revealed that prior to MediFlow AI 2.0, completed consultations lacked `checkedInAt` and `consultationStartedAt` timestamps.
- **Never claim unverified production accuracy:** MediFlow AI explicitly labels all models in production as `IMPLEMENTED_BUT_INSUFFICIENT_DATA`.
- **Benchmark Evaluation:** The 4 machine learning pipelines were trained and statistically benchmarked against naive baselines using a clearly designated `SYNTHETIC_DEVELOPMENT_PIPELINE` dataset.
- **Prospective Data Capture:** Versioned migration `20261103210000_add_prospective_consultation_timestamps` added timestamp columns to the PostgreSQL database. As clinicians operate the system, ground-truth labels are stamped automatically. Once $\ge 500$ clinical events accumulate, automated retraining activates.

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

MediFlow AI includes exhaustive automated test batteries across all layers:

### 1. Python ML Service Pytest Suite
```bash
PYTHONPATH=ml-service pytest ml-service/tests
```
**Results:** `15 passed in 1.90s` (100% pass rate covering API contracts, model serialization, preprocessing pipelines, data quality metrics, and health probes).

### 2. Complete End-to-End System Integration Audit
```bash
node scratch/test_complete_integration_audit.mjs
```
**Results:** `62 passed, 0 failed (100%)` across all 8 major architectural layers:
- Section 1: Service Health Verification (Express 5001 + FastAPI 5002)
- Section 2: Authentication & Role-Based Access Control (Admin, Doctor, Patient, RBAC rejection)
- Section 3: Smart Doctor Presence & Shift Terminal Integration (QR Check-In, Status, Duplicate Prevention, Admin Directory sync, Check-Out)
- Section 4: Appointment System & Presence Gating (Offline slot blocking, present slot unlocking, slot reservations)
- Section 5: Dynamic Waitlist & Smart Priority Allocation (Urgency triage, queue rankings)
- Section 6: ML Prediction Microservice Integration & Explainability (Waiting Time, Availability, Duration, Demand)
- Section 7: Admin AI Intelligence Center & Data Governance (Model registry, data quality audit, dev benchmark verification)
- Section 8: AI Health Assistant & Smart Symptom Triage (Emergency keyword circuit, department navigation, patient history)

### 3. Smart Doctor Presence & QR Attendance Workflow Test
```bash
node scratch/test_doctor_presence.mjs
```
**Results:** `11 passed, 0 failed (100%)` (Validates QR check-in, presence transition to `PRESENT`, duplicate check-in 409 rejection, admin directory reflection, check-out transition to `OFFLINE`, session tracking, and slot gating).

### 4. Express Backend Master Test Battery
```bash
npm --prefix backend test
```
**Results:** `186 passed, 0 failed` across 6 test suites (E2E verification, AI prediction engine, notifications, QR attendance, data integrity, and RBAC).

### 5. Frontend Production Build Check
```bash
npm --prefix frontend run build
```
**Results:** `✓ built in 1.36s` (Clean Vite production bundle without syntax, linting, or module import errors).

---

## 👥 Role-Based Access Demo Credentials

The database seeder provisions initial test users across all three roles:

| Role | Email Address | Password | Clinical Function / Context |
|:---|:---|:---|:---|
| **ADMIN** | `admin@mediflow.com` | `password123` | System Administrator with access to AI Intelligence Center, QR Gates & Audit Logs |
| **DOCTOR** | `dr.jawale@mediflow.com` | `password123` | Dr. Sunil Jawale (Cardiology Consultant — used in live presence demo) |
| **DOCTOR** | `dr.sharma@mediflow.com` | `password123` | Dr. Rajesh Sharma (Cardiology Consultant, Room 101) |
| **DOCTOR** | `dr.patel@mediflow.com` | `password123` | Dr. Ananya Patel (Neurology Consultant, Room 204) |
| **PATIENT**| `rahul.verma@example.com` | `password123` | Test Patient with booked appointment and signed QR check-in pass |
| **PATIENT**| `priya.singh@example.com` | `password123` | Test Patient with active waitlist entry |

---

## 🔮 Future Scope & Roadmap

1. **Automated Production Retraining Pipeline:**  
   Once $\ge 500$ ground-truth consultation records accumulate in PostgreSQL, trigger automated retraining via cron to replace synthetic benchmark weights with genuine hospital distribution weights.
2. **HL7 / FHIR Integration:**  
   Export appointment encounters and waitlist records using standard Fast Healthcare Interoperability Resources (FHIR R4) specifications.
3. **Hardware IoT RFID / BLE Gateway:**  
   Integrate physical hospital door RFID card readers directly with `/api/doctors/presence` using Webhook listeners for automated touchless attendance.
4. **Federated Learning for Multi-Hospital Networks:**  
   Train cross-hospital demand forecasting models collaboratively without sharing sensitive patient health information (PHI) across facilities.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
