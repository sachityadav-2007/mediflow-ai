# MediFlow AI 2.0 — Comprehensive Testing & Quality Assurance Guide
**Document ID:** `docs/TESTING_GUIDE.md`  
**Coverage:** Backend REST APIs, Python ML Service, Real-time WebSocket, Database Transactions, and Frontend SPA  
**Status:** 100% Automated Test Passing Rate  

---

## 1. Test Architecture Overview

MediFlow AI 2.0 maintains a multi-tiered automated testing battery designed to verify data integrity, concurrency protection, machine learning accuracy, and role-based access control.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATED TEST MATRIX                           │
├───────────────────────┬────────────────────────┬───────────────────────┤
│    PYTHON ML SUITE    │   BACKEND REST & E2E   │   INTEGRATION AUDIT   │
│  • Model Loading      │  • Phase 10 E2E (21)   │  • Schema Migration   │
│  • Preprocessing      │  • AI Prediction (28)  │  • Lifecycle Hooks    │
│  • FastAPI Endpoints  │  • Phase 11 Sim (40)   │  • Secret Scan        │
│  • Baseline Comparison│  • QR Attendance (40)  │  • ML Circuit Breaker │
│  • 10 Tests Passing   │  • Data Integrity (21) │  • 21 Checks Passing  │
│                       │  • ML Integration (36) │                       │
│                       │  • 186 Tests Passing   │                       │
└───────────────────────┴────────────────────────┴───────────────────────┘
```

---

## 2. Test Execution Commands

### 2.1 Python Machine Learning Test Suite
Tests FastAPI router endpoints, preprocessing pipelines, model artifact integrity, and regression/classification accuracy.

```bash
# From repository root:
PYTHONPATH=ml-service pytest ml-service/tests
```
**Expected Output:**
```
======================= 10 passed in 1.07s =======================
```

### 2.2 Core Backend & Workflow Test Battery
Executes 6 automated test suites covering appointment lifecycle, transactional waitlist allocations, doctor QR attendance, and Express-to-FastAPI integration.

```bash
npm --prefix backend test
```
**Expected Output:**
```
✓ Phase 10 E2E Verification Suite: 21/21 PASSED
✓ AI Prediction Engine Suite: 28/28 PASSED
✓ Phase 11 Advanced Recovery & Simulation: 40/40 PASSED
✓ Doctor QR Attendance Lifecycle Suite: 40/40 PASSED
✓ Data Integrity & Workflow Suite: 21/21 PASSED
✓ ML Service Integration Tests: 36/36 PASSED
==================================================================
ALL TESTS PASSED: 186/186 (100%)
==================================================================
```

### 2.3 Final System Integration & Resilience Audit
Verifies prospective timestamp recording (`consultationStartedAt`, `consultationCompletedAt`), offline ML fallback circuit breaking, and secret exposure protection.

```bash
node scratch/audit_integration_verification.js
```
**Expected Output:**
```
--- AUDIT CHECK 11: PostgreSQL Schema Audit ---
  ✓ PASS: checkedInAt, consultationStartedAt, consultationCompletedAt exist
--- AUDIT CHECK 8 & 9: Attendance & Consultation Lifecycle ---
  ✓ PASS: Appointment starts -> IN_PROGRESS -> IN_CONSULTATION
  ✓ PASS: Appointment completes -> COMPLETED -> actualDuration computed
--- AUDIT CHECK 12: ML Service Resilience & Fallback Handling ---
  ✓ PASS: Offline waiting time returns fallback gracefully
  ✓ PASS: Offline doctor availability returns fallback gracefully
--- AUDIT CHECK 7: Secret Exposure Security Audit ---
  ✓ PASS: Zero exposed tokens or private keys in public payloads
==================================================================
AUDIT COMPLETED: 21 PASSED, 0 FAILED (100%)
==================================================================
```

### 2.4 Frontend Production Build Verification
Ensures all JSX syntax, CSS class names, asset bundling, and TypeScript/ESLint rules compile cleanly without broken imports.

```bash
npm --prefix frontend run build
```
**Expected Output:**
```
✓ 181 modules transformed.
dist/index.html                   0.67 kB
dist/assets/index-D-CSSIPz.css   60.30 kB
dist/assets/index-BUcg6RfB.js   915.21 kB
✓ built in ~1.2s (0 errors)
```

---

## 3. Manual E2E Demonstration Instructions (Viva / Presentation)

To demonstrate the working system in real-time:

### Step 1: Start Services
In three separate terminal windows:
```bash
# Terminal 1: PostgreSQL & Express Backend
npm --prefix backend run dev

# Terminal 2: Python ML Microservice
PYTHONPATH=ml-service python3 -m uvicorn app.main:app --app-dir ml-service --host 0.0.0.0 --port 5002

# Terminal 3: Vite Frontend Client
npm --prefix frontend run dev
```

### Step 2: Patient Booking & QR Pass
1. Navigate to `http://localhost:5173/login` and click **"🧑‍⚕️ Patient"** quick fill (`rahul.verma@example.com` / `password123`).
2. Click **"Book Appointment"** $\rightarrow$ Select **Dr. Rajesh Sharma (Cardiology)** $\rightarrow$ Pick a slot $\rightarrow$ Submit.
3. Navigate to **"My Appointments"** $\rightarrow$ Click **"View Digital Pass"** to see your unique QR code and token number.

### Step 3: Reception Desk Check-In
1. Navigate to `http://localhost:5173/check-in` (Admin or Doctor).
2. Scan the patient's QR code or enter the appointment token $\rightarrow$ Click **"Process Check-In"**.
3. Observe immediate assignment of sequential OPD Queue Position and live email dispatch.

### Step 4: Doctor OPD Queue & Consultation Workflow
1. Log in as Doctor (`dr.sharma@mediflow.com` / `password123`).
2. Open **Doctor Dashboard** (`/doctor/dashboard`). Notice the patient appears under **"Today's Patient Queue"**.
3. Click **"▶️ Call In"**:
   - Status updates to `IN_PROGRESS`.
   - `consultationStartedAt` timestamp is recorded.
   - Doctor presence automatically updates to `IN_CONSULTATION`.
4. Click **"✅ Complete"**:
   - Status updates to `COMPLETED`.
   - `consultationCompletedAt` is recorded and consultation duration is calculated in minutes.
   - Doctor presence automatically resets to `AVAILABLE`.

### Step 5: Live OPD Waiting Room Screen
1. Open `http://localhost:5173/queue/81adfc93-2cdb-4f69-a04c-baf464127475` in an incognito window.
2. Watch real-time Socket.IO synchronization of tokens and queue positions without requiring a browser refresh.

