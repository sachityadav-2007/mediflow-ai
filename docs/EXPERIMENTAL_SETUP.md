# MediFlow AI — Experimental Setup & Evaluation Environment

**Document Version:** 1.0.0  
**Benchmarking Environment:** Local Isolated Staging & Deterministic Simulation Engine  
**Execution Runtime:** Node.js v25.1.0 (Darwin arm64)  
**Database Engine:** PostgreSQL (Port 5432, Prisma ORM 5.x)  
**Simulation Engine:** Event-Driven Discrete Queue Simulator (`scripts/reproduce_research_experiments.js`)  
**API Profiler:** Live HTTP In-Process Benchmark Suite (`scripts/benchmark_api_performance.js`)  

---

## 1. Experimental Hardware and Software Infrastructure

All empirical experiments, latency profiles, and queuing evaluations were executed on a standardized development workstation under controlled load conditions:

| Parameter | Specification |
|:---|:---|
| **Host Operating System** | macOS Darwin (arm64 architecture) |
| **Node.js Runtime** | Node.js v25.1.0 (V8 JavaScript Engine) |
| **Backend Framework** | Express 4.x with native HTTP/JSON middleware |
| **Database Engine** | PostgreSQL (Relational transactional storage with ACID compliance) |
| **ORM / Data Access** | Prisma Client 5.x (Prepared parameter queries, schema migrations) |
| **Real-Time Layer** | Socket.IO 4.x (WebSocket transport with HTTP long-polling fallback) |
| **Frontend Framework** | React 18 with Vite 5.x bundler (Tailwind CSS, Lucide icons) |
| **Target Host Endpoints** | Backend: `http://localhost:5001` \| Frontend: `http://localhost:5173` |
| **Simulation Seed** | `SEED = 42` (Deterministic PRNG reproducibility) |

---

## 2. Architectural Comparison of Experimental Systems

To evaluate the contributions of each individual innovation in MediFlow AI, four system architectures were instantiated under identical external loads:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Comparative Outpatient Systems Matrix                     │
├──────────┬──────────────────┬─────────────────┬──────────────┬───────────────┤
│ Feature  │ System A         │ System B        │ System C     │ System D      │
│          │ (Baseline FCFS)  │ (AI-Assisted)   │(Presence-Aw.)│ (MediFlow AI) │
├──────────┼──────────────────┼─────────────────┼──────────────┼───────────────┤
│ Presence │ Fixed 09:00 Assumed Fixed 09:00 Assumed QR Verified Gating QR Verified Gating │
│ Slot Alloc│ First Available  │ Demand Balanced │ First Available Demand Balanced│
│ Waitlist │ ❌ Dropped       │ ⚠️ 47.9% Walk-in│ ❌ Dropped   │ ✅ 100% Triage│
│ Queue    │ First-Come First │ First-Come First│ First-Come First Priority-HOL │
│ Real-Time│ ❌ None          │ ❌ None         │ ⚠️ Presence Only Socket.IO Live│
└──────────┴──────────────────┴─────────────────┴──────────────┴───────────────┘
```

### 2.1 System A: Traditional Baseline Hospital (FCFS)
- **Presence Assumption:** Doctors are assumed to start promptly at 09:00:00. Delays or unannounced absences cause immediate waiting room backlog without schedule adjustment.
- **Appointment Booking:** Static First-Come, First-Served booking. Earliest open slot is booked regardless of departmental congestion.
- **Cancellation Handling:** No-show or cancelled slots are permanently lost. Doctor sits idle during the cancelled window.
- **Queuing Discipline:** Strict arrival-ordered FCFS. Emergency patients wait behind earlier-arriving routine patients.

### 2.2 System B: AI-Assisted Scheduling Only
- **Presence Assumption:** Unmonitored (fixed 09:00 assumption).
- **Appointment Booking:** MediFlow AI slot recommender allocates slots across lower-congestion periods.
- **Cancellation Handling:** Partial walk-in recovery ($47.9\%$) without priority triage.
- **Queuing Discipline:** Arrival-ordered FCFS.

### 2.3 System C: Presence-Aware Scheduling Only
- **Presence Assumption:** Real-time doctor presence tracked via QR check-in. If the clinician is delayed, patient dispatch is deferred until the clinician is physically in-clinic.
- **Appointment Booking:** Static FCFS booking.
- **Cancellation Handling:** Vacant slots are dropped (no waitlist reallocation).
- **Queuing Discipline:** Arrival-ordered FCFS.

### 2.4 System D: Integrated MediFlow AI Architecture
- **Presence Tracking:** Cryptographic QR doctor attendance gating. Clinician must scan dynamic QR token to transition from `OFFLINE` to `AVAILABLE`.
- **Intelligent Allocation:** Multi-factor slot recommendation engine balances patient preference against departmental congestion.
- **Smart Waitlist Triage:** Real-time cancellation webhook immediately scans waitlisted patients, sorts by priority tier ($\mathcal{P}_1 \succ \mathcal{P}_2 \succ \mathcal{P}_3$) and original booking timestamp, and reallocates the open slot ($100\%$ recovery).
- **Queuing Discipline:** Non-preemptive Head-of-Line (HOL) Priority Queue. Arrived patients in the waiting room are evaluated such that Emergency ($\mathcal{P}_1$) patients are admitted first upon doctor availability, followed by Urgent ($\mathcal{P}_2$), and Routine ($\mathcal{P}_3$).
- **Predictive Velocity Estimator:** Real-time calculation of remaining wait based on active queue length and historical doctor consultation velocity.

---

## 3. Event-Driven Discrete Simulation Engine Architecture

The simulation engine implemented in [`scripts/reproduce_research_experiments.js`](file:///Users/sachityadav/Documents/mediflow-ai/scripts/reproduce_research_experiments.js) operates on a minute-by-minute discrete timeline across 14 operational days:

```
[Day Loop: d = 1..14]
  │
  ├──► [Doctor Initialization: QR Arrival Event at t = t_arrive]
  │
  ├──► [Patient Timeline Generator: 1000 Patients across 14 days]
  │
  └──► [Minute Loop: minute = 0 .. 480 (09:00 to 17:00)]
         │
         ├── 1. Check Patient Arrivals (at minute = slot_time + offset)
         │      Push to doctor.waitingRoom[]
         │
         ├── 2. Handle Cancellations
         │      Sys A, C: Vacate slot
         │      Sys B: 47.9% walk-in fill
         │      Sys D: Smart Waitlist triage backfill (100%)
         │
         ├── 3. Clinician Consultation State Machine
         │      If doctor is IN_CONSULTATION:
         │        decrement remaining consultation minutes
         │        if finished: doctor state -> AVAILABLE
         │
         └── 4. Patient Dispatch
                If doctor is AVAILABLE and doctor.isPhysicallyPresent:
                  Sys A, B, C: Shift patient with earliest arrival
                  Sys D: Extract patient with highest priority class
                  doctor state -> IN_CONSULTATION
```

---

## 4. Live API Latency Profiling Methodology

The API latency and throughput benchmarks implemented in [`scripts/benchmark_api_performance.js`](file:///Users/sachityadav/Documents/mediflow-ai/scripts/benchmark_api_performance.js) use high-resolution process timers (`process.hrtime.bigint()`):
1. **Sample Size:** 50 sequential HTTP requests per endpoint to observe P50, P95, P99, and tail latencies.
2. **Session Authentication:** Authenticates as System Admin (`admin@mediflow.com`) via `POST /api/auth/login` to obtain an authorized JWT session cookie.
3. **Database Pre-warming:** One preliminary round-trip request is issued prior to benchmarking to warm database connection pools and Prisma prepared statement caches.
4. **Metrics Recorded:** Average latency (ms), median (P50), 95th percentile (P95), minimum, maximum, throughput (requests/second), and error rate percentage.

