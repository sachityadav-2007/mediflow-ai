# MediFlow AI — Smart Hospital Appointment & Doctor Availability Management System

MediFlow AI is a modern full-stack hospital management and intelligent scheduling system. It addresses critical hospital operational challenges: crowded outpatient departments (OPDs), inefficient manual appointment booking, unpredictable doctor availability, long patient wait times, and opaque queue triage.

By integrating automated slot generation, live clinician presence tracking, a transparent rule-based priority scoring algorithm, and event-driven real-time updates via Socket.IO, MediFlow AI ensures clinical fairness, eliminates double bookings, and empowers patients, doctors, and hospital administrators.

---

## 🌟 Key Features

### 1. Multi-Role Authentication & Access Control (RBAC)
- Secure registration and login for **ADMIN**, **DOCTOR**, and **PATIENT** roles.
- Passwords salted and hashed with **bcrypt** (salt rounds: 10).
- Stateless **JWT** authentication transmitted via secure, **HTTP-only cookies** to mitigate XSS attacks.
- Role-based middleware guards on both backend REST routes and client-side React routes.

### 2. Doctor Presence & Schedule Management
- Real-time presence status tracking: `PRESENT`, `BUSY`, `AWAY`, and `OFFLINE`.
- Immutable **audit logging** (`PresenceLog`) capturing detection method (recorded as `MANUAL` for current phase).
- Weekly recurring working schedule configuration (e.g., Mondays 09:00–17:00).
- Configurable consultation duration (default 30 minutes) and consultation fee.

### 3. Dynamic Appointment Slot Generation & Booking
- Generates discrete, non-overlapping bookable time slots based on the doctor's weekly availability and duration.
- Enforces presence checks (slots are only generated and bookable when clinicians are active and accepting patients).
- Instant booking with conflict prevention and unique appointment numbering (e.g., `APT-20261102-001-4521`).
- Patient cancellation automatically releases time slots for reallocation.

### 4. Smart Waitlist & Rule-Based Priority Allocation
- Automated triage queue for patients when their preferred doctor's slots are fully booked.
- Transparent, explainable scoring formula evaluating **Medical Priority**, **Clinical Urgency**, and **Waiting Duration**.
- Automated or administrator-triggered slot reallocation to the highest-scoring candidate with a First-In, First-Out (FIFO) tie-breaker.

### 5. Hospital Administrator Analytics & Control Center
- High-level KPIs: Total Doctors, Total Patients, Total Appointments, Active Waitlists, and Live Doctor Presence.
- Doctor staff management with credential inspection modal (schedules, audit logs, and recent appointments).
- Patient directory with appointment counts and active triage indicators.
- Multi-criteria appointment monitoring filtered by clinical status, doctor, and date.
- Ranked waitlist monitoring with manual allocation demonstration trigger.

### 6. Event-Driven Real-Time Updates (Socket.IO)
- Instant synchronization across all connected clients without manual page refreshes.
- Broadcasts events for doctor status changes, appointment creations, cancellations, waitlist entries, and slot allocations.
- Graceful degradation: The application operates seamlessly via standard REST APIs if WebSockets disconnect.

---

## 🛠️ Technology Stack

### Frontend
- **React 18** (Component-based user interface)
- **Vite** (Next-generation frontend tooling and bundler)
- **Tailwind CSS** (Utility-first CSS framework for clean, responsive design)
- **React Router v6** (Declarative client-side routing & route guards)
- **Axios** (Promise-based HTTP client configured with cookie credentials)
- **Socket.IO Client** (Real-time WebSocket client listener)

### Backend
- **Node.js** (JavaScript runtime engine)
- **Express.js** (REST API web framework)
- **JSON Web Tokens (JWT)** (Session authorization)
- **Cookie-Parser** (HTTP-only cookie serialization and extraction)
- **Bcrypt.js** (Cryptographic password hashing)
- **Socket.IO** (Bidirectional real-time event broadcasting)
- **CORS** (Secure cross-origin resource sharing)

### Database & ORM
- **PostgreSQL** (ACID-compliant relational database management system)
- **Prisma ORM** (Declarative database modeling, automated migrations, and type-safe queries)

---

## 🏗️ System Architecture

### Data Flow Diagram

```text
[ React Client (Vite) ]
       │
       │ HTTP Requests (Cookies / JSON)
       ▼
[ Express Router & Auth Middleware ]
       │
       │ Validated & Authorized Request
       ▼
[ Controller Layer ] (Request Validation & Formatting)
       │
       ▼
[ Service Layer ] (Business Logic & Scoring Algorithm)
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
[ Prisma ORM Client ]             [ Socket.IO Server ]
       │                                 │
       ▼                                 │ Real-Time Broadcasts
[ PostgreSQL Database ]                  ▼
                                  [ All Connected Clients ]
```

### Real-Time Flow
1. A state change occurs (e.g. Doctor toggles presence to `BUSY`, or Patient cancels an appointment).
2. The Express service executes the database mutation within a Prisma transaction.
3. Upon transaction success, `getIO()` emits an event (e.g. `doctor_status_changed`, `appointment_cancelled`).
4. Connected React components consume the event via the custom `useSocket` hook and re-fetch the latest REST data, preserving data consistency.

---

## 📐 Smart Allocation Algorithm

MediFlow AI utilizes a transparent, rule-based clinical scoring model rather than an unverified black-box model.

### Mathematical Formula

$$\text{Total Priority Score} = \text{Medical Priority} + \text{Clinical Urgency} + \text{Waiting Time Bonus}$$

### Scoring Breakdown

1. **Medical Severity Priority (Base Tier):**
   - `LOW` = 10 points
   - `MEDIUM` = 20 points
   - `HIGH` = 30 points
   - `CRITICAL` / `EMERGENCY` = 40 points

2. **Clinical Urgency (Time Sensitivity):**
   - `LOW` = 5 points
   - `MEDIUM` = 10 points
   - `HIGH` = 15 points
   - `EMERGENCY` = 20 points

3. **Waiting Time Stagnation Bonus:**
   - $+1\text{ point}$ for every **30 minutes** elapsed since joining the waitlist.
   - **Cap:** Maximum of **30 points** (reached after 15 hours) to ensure lower-acuity patients do not wait indefinitely while preventing non-urgent cases from permanently overtaking urgent ones.

4. **Tie-Breaker Rule:**
   - When two patients obtain identical total priority scores, the system selects the patient with the earlier registration timestamp (`createdAt` ascending — FIFO).

> **Note:** This implementation is a deterministic, rule-based clinical priority system designed for explainability during viva defense, not a trained statistical machine-learning model.

---

## 📋 API Overview

All API responses return consistent JSON structures (`{ success: true, ... }`).

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new Patient or Doctor account.
- `POST /api/auth/login` — Authenticate and receive HTTP-only JWT cookie.
- `POST /api/auth/logout` — Invalidate session and clear auth cookie.
- `GET  /api/auth/me` — Retrieve the currently authenticated user profile.

### 2. Doctors & Schedules (`/api/doctors`, `/api/presence`)
- `GET /api/doctors` — Search and filter doctor directory.
- `GET /api/doctors/:id` — View specific doctor details.
- `GET /api/doctors/profile` — View authenticated doctor profile.
- `PUT /api/doctors/profile` — Update doctor clinical credentials.
- `GET /api/doctors/:id/schedule` — View doctor weekly schedule.
- `PUT /api/doctors/schedule` — Configure doctor working days & hours.
- `GET /api/presence` — View live presence list of all clinicians.
- `PUT /api/presence/status` — Update doctor presence (`PRESENT`, `BUSY`, `AWAY`, `OFFLINE`).

### 3. Appointments (`/api/appointments`)
- `GET  /api/appointments/slots/:doctorId?date=YYYY-MM-DD` — Generate open consultation slots.
- `POST /api/appointments` — Book an appointment slot (Patient only).
- `GET  /api/appointments/my` — Get authenticated patient's appointments.
- `GET  /api/appointments/doctor/my` — Get authenticated doctor's appointments.
- `PUT  /api/appointments/:id/cancel` — Cancel appointment and free up time slot.
- `PUT  /api/appointments/:id/status` — Update appointment status (`COMPLETED`, `IN_PROGRESS`, etc.).

### 4. Smart Waitlist (`/api/waitlist`)
- `POST /api/waitlist` — Join doctor waitlist with priority and urgency.
- `GET  /api/waitlist/my` — View authenticated patient's waitlist positions.
- `GET  /api/waitlist/doctor/my` — View doctor's prioritized triage queue.
- `PUT  /api/waitlist/:id/leave` — Leave the waitlist queue.
- `POST /api/waitlist/allocate` — Trigger rule-based allocation demonstration (Admin/Doctor).

### 5. Admin Control Center (`/api/admin`)
- `GET /api/admin/stats` — Hospital-wide real-time operational statistics.
- `GET /api/admin/doctors` — Comprehensive doctor roster with workload metrics.
- `GET /api/admin/doctors/:id` — Detailed doctor inspection with audit trail.
- `GET /api/admin/patients` — Registered patient directory with booking history.
- `GET /api/admin/appointments` — Hospital-wide appointment monitor with filters.
- `GET /api/admin/waitlist` — System-wide priority waitlist monitor.

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher recommended)
- `npm` (v9 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/sachityadav-2007/mediflow-ai.git
cd mediflow-ai
```

### 2. Backend Setup
```bash
cd server
npm install
```

Configure `server/.env` based on `server/.env.example`:
```env
PORT=5001
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:password@localhost:5432/mediflow_ai?schema=public"
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

Run database migrations and seed default data:
```bash
npx prisma migrate dev
npm run seed
```

Start backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd client
npm install
```

Configure `client/.env` based on `client/.env.example`:
```env
VITE_API_URL=http://localhost:5001
```

Start frontend development server:
```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🔐 Environment Variables

| Variable | Location | Description |
|---|---|---|
| `PORT` | `server/.env` | Port on which the Express server listens (e.g. `5001`). |
| `CLIENT_URL` | `server/.env` | Allowed origin for CORS and cookies (e.g. `http://localhost:5173`). |
| `DATABASE_URL` | `server/.env` | PostgreSQL connection string with username, password, host, port, and database name. |
| `JWT_SECRET` | `server/.env` | Secret cryptographic key for signing JSON Web Tokens. |
| `JWT_EXPIRES_IN` | `server/.env` | Expiration time frame for JWT sessions (e.g. `7d`). |
| `NODE_ENV` | `server/.env` | Environment mode (`development` or `production`). |
| `VITE_API_URL` | `client/.env` | Backend API base URL consumed by Axios and Socket.IO. |

---

## 👥 Default Seed Accounts (for Testing & Viva Demonstration)

| Role | Email | Password | Details |
|---|---|---|---|
| **ADMIN** | `admin@mediflow.com` | `password123` | System Administrator with full control center access. |
| **DOCTOR** | `dr.sharma@mediflow.com` | `password123` | Dr. Rajesh Sharma (Cardiologist, Room 101). |
| **DOCTOR** | `dr.patel@mediflow.com` | `password123` | Dr. Ananya Patel (Neurologist, Room 204). |
| **PATIENT** | `rahul.verma@example.com` | `password123` | Registered patient with cardiac history. |
| **PATIENT** | `priya.singh@example.com` | `password123` | Registered patient with migraine history. |
| **PATIENT** | `amit.sharma@example.com` | `password123` | Registered patient with active waitlist entry. |

---

## 🔮 Future Roadmap & Improvements

While MediFlow AI provides a complete full-stack core, the following enhancements represent natural extensions for production deployment:
1. **IoT RFID Scanner Integration:** Automate doctor presence toggling via physical RFID badges at clinic doorways.
2. **Facial Recognition Attendance:** Integrate computer vision at consultation rooms to eliminate manual presence logging.
3. **Mobile BLE Proximity:** Use Bluetooth Low Energy beacons to detect physician arrival in OPD zones.
4. **Machine Learning Predictive Availability:** Train predictive models on historical consultation times to dynamically forecast OPD delay windows.
5. **Multi-Channel Notifications:** Add Twilio SMS and SendGrid email notifications when waitlist slots are allocated.
6. **Containerized Cloud Deployment:** Dockerize client and server containers for deployment on AWS ECS or Kubernetes with HTTPS certificates.

---

## 📄 License
This project was developed for an academic capstone portfolio. All rights reserved.
