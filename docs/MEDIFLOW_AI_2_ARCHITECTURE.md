# MediFlow AI 2.0 — System Architecture & Machine Learning Integration

**Document Version:** 2.0.0  
**Architectural Tier:** Decoupled Microservice Architecture (Full-Stack + ML Service)  
**Main Backend Engine:** Node.js v25 + Express 4.x (Port 5001)  
**Machine Learning Microservice:** Python 3.13 + FastAPI + Scikit-Learn (Port 5002)  
**Database Architecture:** PostgreSQL 14/15 via Prisma Client 6.x  
**Real-Time Broadcast Engine:** Socket.IO 4.x WebSocket Layer  
**Frontend Presentation Layer:** React 18 + Vite 5.x + Tailwind CSS (Port 5173)  

---

## 1. System Overview & Architectural Paradigm

MediFlow AI 2.0 enhances the existing smart hospital appointment and queue management system with **four genuine, measurable, and explainable Machine Learning pipelines**. 

To maintain strict operational reliability, healthcare safety, and data governance:
- **Express.js remains the authoritative primary backend.** It handles patient authentication, RBAC authorization, appointment bookings, cancellation webhooks, doctor attendance gating, and relational PostgreSQL ACID transactions.
- **Python FastAPI serves as an independent, decoupled Machine Learning microservice.** It hosts the trained scikit-learn model pipelines, validates incoming clinical features, performs sub-millisecond inference, and exports structured evaluation registries.
- **Predictions are strictly advisory.** Machine learning outputs assist clinical decision-making and patient expectations, but **never override** doctor unannounced absences, published schedules, double-booking constraints, or medical priority triage hierarchies.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          MediFlow AI 2.0 Architecture                            │
└──────────────────────────────────────────────────────────────────────────────────┘

   [ React 18 Frontend ]  (Port 5173)
             │
             │ HTTP (JWT Auth) + WebSocket (Socket.IO)
             ▼
   ┌───────────────────────────────────────────────────┐
   │         Express.js Authority Backend              │  (Port 5001)
   │  - Auth & Role-Based Access Control (RBAC)        │
   │  - Appointment Scheduling & Rescheduling Engine   │
   │  - Smart Priority Waitlist Triage Engine          │
   │  - QR Doctor Attendance & Presence Verification   │
   │  - Socket.IO Real-Time Dispatcher                 │
   └─────────┬───────────────────────────────┬─────────┘
             │                               │
             │ Internal HTTP / JSON          │ SQL / ACID Transactions
             │ (X-Internal-Token Header)     │ (Prisma ORM 6.x)
             ▼                               ▼
   ┌─────────────────────────────┐   ┌──────────────────────────────┐
   │  Python FastAPI ML Service  │   │     PostgreSQL Database      │ (Port 5432)
   │  (Port 5002)                │   │  - users & doctors           │
   │  - Model 1: Waiting-Time    │   │  - appointments              │
   │  - Model 2: Availability    │   │    ↳ checkedInAt             │
   │  - Model 3: Duration        │   │    ↳ consultationStartedAt   │
   │  - Model 4: Dept Demand     │   │    ↳ consultationCompletedAt │
   │  - Model Evaluation Registry│   │  - doctor_attendances        │
   └─────────────────────────────┘   └──────────────────────────────┘
```

---

## 2. Decoupled Service Interaction & Security Boundaries

### 2.1 Internal Authentication Protocol
Communication between Express.js and FastAPI occurs over an isolated loopback network (`http://localhost:5002`) protected by a shared internal service secret:
- Express client (`mlServiceClient.js`) attaches an HTTP header:
  `X-Internal-Token: mediflow_internal_ml_service_secret_2026`
- FastAPI dependency (`security.py:verify_internal_token`) strictly enforces token validity.
- Unauthorized or external callers attempting to invoke `/predict/*` or `/models/*` without the internal token receive `HTTP 401 Unauthorized`.
- The public health probe (`GET /health`) is unauthenticated to enable container health checks and cluster orchestration.

### 2.2 Strict Timeout & Fallback Isolation
- All HTTP requests dispatched by Express to the ML service are bound by a strict **3,000 ms timeout window**.
- If the Python ML service is offline, upgrading, or times out, Express catches the error cleanly, logs an operational warning, and falls back to deterministic rule-based heuristics.
- **Zero Silent Hallucination:** When falling back, the response payload is explicitly tagged `source: "ml-service-fallback"` and `status: "insufficient_data"`. Express **never** silently substitutes a rule-based calculation and labels it Machine Learning.

---

## 3. The Four Decoupled Machine Learning Pipelines

### 3.1 Model 1: Patient Waiting-Time Prediction
- **Target:** Expected patient waiting time in minutes ($W_i = t_{\text{consultation\_start}} - t_{\text{patient\_check\_in}}$).
- **Features Ingested:** `department`, `day_of_week`, `hour_of_day`, `queue_length_ahead`, `priority_level`.
- **Pipeline Architecture:**
  - OneHotEncoder on categoricals (`department`, `day_of_week`, `priority_level`).
  - StandardScaler on numerics (`hour_of_day`, `queue_length_ahead`).
  - Champion Algorithm: `RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)`.
  - Baseline Benchmark: `DummyRegressor(strategy='mean')`.
- **Validation Split:** Strict chronological split (70% Train, 15% Validation, 15% Test).
- **Empirical Dev Benchmark:** Test $R^2 = 0.9489$, $\text{MAE} = 3.86$ min (vs. Baseline $\text{MAE} = 17.16$ min).

### 3.2 Model 2: Doctor Availability and Delay Prediction
- **Target:** Dual binary classification:
  1. $P(\text{Available})$: Likelihood clinician will be in clinic at requested slot.
  2. $P(\text{Delayed})$: Probability clinician arrival is delayed $>15$ minutes past scheduled time.
- **Features Ingested:** `department`, `day_of_week`, `hour_of_day`.
- **Pipeline Architecture:**
  - Dual `RandomForestClassifier` with balanced class weighting (`class_weight='balanced'`).
  - Baseline Benchmark: `DummyClassifier(strategy='most_frequent')`.
- **Metrics Tracked:** Precision, Recall, F1-Score, and ROC-AUC.
- **Empirical Dev Benchmark:** $F_1 = 0.773$, $\text{ROC-AUC} = 0.504$ (Delay $\text{ROC-AUC} = 0.590$).

### 3.3 Model 3: Consultation Duration Prediction
- **Target:** Net duration in minutes ($D_i = t_{\text{consultation\_complete}} - t_{\text{consultation\_start}}$).
- **Features Ingested:** `department`, `day_of_week`, `hour_of_day`, `priority_level`.
- **Pipeline Architecture:**
  - Champion Algorithm: `GradientBoostingRegressor(n_estimators=100, max_depth=4, learning_rate=0.08, random_state=42)`.
  - Baseline Benchmark: `DummyRegressor(strategy='median')`.
- **Validation Split:** Chronological split.
- **Empirical Dev Benchmark:** Test $R^2 = 0.5463$, $\text{MAE} = 4.09$ min (vs. Baseline $\text{MAE} = 6.34$ min).

### 3.4 Model 4: Department Demand Forecasting
- **Target:** Daily outpatient appointment demand count per department across the upcoming 7 days.
- **Features Ingested:** `department`, `day_of_week`, `day_of_month`, `month`, `is_weekend`, `lag_1`, `lag_7`, `rolling_mean_7`.
- **Pipeline Architecture:**
  - Champion Algorithm: Time-series lag `RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)`.
  - Baseline Benchmark: 7-Day Historical Moving Average (`rolling_mean_7`).
- **Metrics Tracked:** MAE, RMSE, and WAPE (Weighted Absolute Percentage Error).
- **Empirical Dev Benchmark:** Test $\text{WAPE} = 0.2323$, $\text{MAE} = 3.63$ (vs. Baseline $\text{WAPE} = 0.3948$, $\text{MAE} = 6.18$).

---

## 4. Database Schema Enhancement for Prospective Ground Truth

To transition from developmental benchmarking to authentic operational training without fabricating records, the PostgreSQL Prisma schema was updated with prospective audit timestamps on the `Appointment` entity:

```prisma
model Appointment {
  id                      String            @id @default(uuid())
  appointmentNumber       String            @unique
  patientId               String
  doctorId                String
  slotId                  String            @unique
  appointmentDate         DateTime
  priority                PriorityLevel     @default(MEDIUM)
  status                  AppointmentStatus @default(SCHEDULED)
  checkInToken            String?           @unique
  checkedInAt             DateTime?         // Captured on patient QR reception scan
  consultationStartedAt   DateTime?         // Captured when doctor clicks "Start Consultation"
  consultationCompletedAt DateTime?         // Captured when doctor clicks "Complete Consultation"
  actualDurationMinutes   Int?              // Calculated: (consultationCompletedAt - consultationStartedAt)
  reminderSentAt          DateTime?
  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt
}
```

These fields populate automatically in real-time during physical clinical operations, establishing the ground truth necessary for mature model retraining.

