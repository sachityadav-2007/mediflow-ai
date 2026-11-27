# 🎓 MediFlow AI — ISD Capstone Project Technical Audit & Viva Video Script

**Candidate / Author:** Sachit Yadav  
**Degree / Program:** Bachelor of Technology in Computer Science & Engineering  
**Evaluation:** Information Systems Design (ISD) Capstone Project Viva & Video Recording (7–8 Minutes)  
**Live Application:** [https://mediflow-ai-app.vercel.app](https://mediflow-ai-app.vercel.app)  
**GitHub Repository:** [https://github.com/sachityadav-2007/mediflow-ai](https://github.com/sachityadav-2007/mediflow-ai)  

---

## 1. Project Overview

* **Actual Project Name:** **MediFlow AI** (Smart Hospital Appointment Booking & Doctor Availability Management System).
* **Project Classification:** Full-Stack Interactive Web Application & Clinical Workflow System (Single Page Application architecture with real-time bidirectional WebSocket event synchronization and asynchronous machine learning advisory microservice).
* **Core Purpose:** Resolves acute outpatient department (OPD) hospital congestion, unpredictable clinician arrival delays, high patient no-show rates, and inequitable first-come-first-served queues by providing:
  1. Concurrency-safe discrete 30-minute booking slot generation.
  2. Authoritative real-time clinician presence tracking (`PRESENT`, `BUSY`, `AWAY`, `OFFLINE`).
  3. Contactless QR-based reception check-in.
  4. Explainable, deterministic emergency triage scoring ($Score = Medical + Urgency + WaitTime$) for dynamic slot reallocation upon cancellation.
  5. Decoupled advisory machine learning for waiting-time regression and demand forecasting.
* **Target Users & Personas:**
  1. **Patients:** Browse 13 medical specialists, filter by department/symptoms, book discrete slots, download digital QR passes, track live queue positions, join the smart priority waitlist, and use the AI symptom triage assistant.
  2. **Doctors / Medical Consultants:** View daily outpatient schedule, toggle real-time chamber presence, conduct shift attendance check-in/out via dynamic QR codes, and advance consultation states (`START`, `COMPLETE`, `NO_SHOW`).
  3. **Hospital Administrators / Receptionists:** Executive Hospital Control Center with live KPIs, staff workload management, patient registry, manual triage overrides, and webcam-based reception QR pass scanning.
* **Current Completion Status:** 100% operational in production across Vercel (Frontend SPA), Render (Express REST API & Python FastAPI ML Service), and Neon Serverless PostgreSQL.

---

## 2. Technologies and Tools

| Layer | Tools & Technologies | Version | Purpose in MediFlow AI |
|---|---|---|---|
| **Frontend Framework** | React | 18.2.0 | Reactive component hierarchy, custom Hooks, and state management. |
| **Frontend Build Tool** | Vite | 5.4.21 | Ultra-fast Hot Module Replacement (HMR) and production bundling (built in 1.32s). |
| **Styling & Design System** | Tailwind CSS | 3.4.1 | Utility-first responsive design, clinical color tokens, badges, and modals. |
| **Client Routing** | React Router DOM | 6.22.0 | Declarative client-side routing with role-based `ProtectedRoute` guards. |
| **HTTP Client** | Axios | 1.6.7 | HTTP client configured with `withCredentials: true` and Bearer token interceptors. |
| **Real-Time Client** | Socket.IO Client | 4.7.4 | Bidirectional WebSocket subscription hook (`useSocket`) for instant UI updates. |
| **QR Code Scanner** | HTML5-QRCode | 2.3.8 | Camera-based webcam and image-file QR code decoding at reception. |
| **Icons & Visuals** | Lucide React | 0.344.0 | Accessible vector iconography for medical specialties and presence states. |
| **Backend Runtime** | Node.js | 20 LTS | Non-blocking, asynchronous event-driven JavaScript server runtime. |
| **Web Server Framework** | Express.js | 4.18.2 | RESTful routing, CORS policies, role middleware, and error containment. |
| **Database ORM** | Prisma ORM | 5.8.1 | Type-safe schema modelling, automated migrations, and parameterized query generation. |
| **Database Engine** | PostgreSQL | 16 | Serverless cloud PostgreSQL on Neon with PgBouncer connection pooling. |
| **Real-Time Server** | Socket.IO | 4.7.4 | Event emission hub managing live queue, presence, and waitlist broadcasts. |
| **Security & Auth** | JWT & bcryptjs | 9.0 / 2.4 | Dual-token authentication with salted 10-round password hashing. |
| **ML Microservice** | Python / FastAPI / Uvicorn | 3.13 / 0.110 | Asynchronous REST microservice running Scikit-Learn analytical models. |
| **ML Libraries** | Scikit-Learn / Joblib | 1.4.1 / 1.3.2 | Regression, classification, and serialized model artifact execution. |
| **Hosting & Cloud** | Vercel & Render | Production | Vercel Edge Network for React SPA; Render for Express API and FastAPI ML. |

---

## 3. Complete Project Folder Structure

```text
mediflow-ai/
├── frontend/                     # React 18 + Vite Frontend Application
│   ├── public/                   # Static icons and manifest
│   ├── src/
│   │   ├── components/           # Reusable UI primitives (Button, Card, Badge, Modal)
│   │   ├── context/              # AuthContext.jsx (global authentication state)
│   │   ├── hooks/                # useSocket.js (WebSocket subscription hook)
│   │   ├── pages/                # 13 dedicated application pages
│   │   ├── services/             # api.js (Axios) and socket.js (Socket.IO client)
│   │   ├── App.jsx               # React Router v6 route configuration
│   │   ├── index.css             # Tailwind CSS global styles
│   │   └── main.jsx              # DOM entry point
│   ├── package.json              # Frontend scripts and dependencies
│   ├── vite.config.js            # Vite configuration (Port 5173)
│   └── vercel.json               # SPA rewrite rules (/* -> /index.html)
│
├── backend/                      # Node.js + Express.js API Gateway
│   ├── src/
│   │   ├── config/               # db.js (Prisma client) and socket.js (Socket.IO server)
│   │   ├── controllers/          # 12 MVC request handlers
│   │   ├── middleware/           # authMiddleware.js and rateLimiter.js
│   │   ├── routes/               # 12 Express route modules
│   │   ├── services/             # Business logic (allocationService, priorityService, checkInService)
│   │   ├── utils/                # slotGenerator.js (30-min discrete interval generator)
│   │   ├── app.js                # Express app setup and CORS whitelist
│   │   └── server.js             # HTTP listener and Socket.IO initialization (Port 5001)
│   ├── package.json              # Backend dependencies
│   └── prisma/                   # Symlink -> ../database
│
├── database/                     # Authoritative Database Layer
│   ├── schema.prisma             # Complete schema (14 models, 10 enums)
│   ├── DATABASE.md               # 21-section comprehensive specification
│   ├── migrations/               # 5 version-controlled SQL migration directories
│   ├── seed.js                   # Automated database seeder (13 doctors, demo data)
│   └── queries.sql               # Diagnostic SQL queries
│
├── ml-service/                   # Python FastAPI ML Microservice
│   ├── app/                      # FastAPI routes and schemas
│   ├── artifacts/                # 4 serialized Scikit-Learn models and model_registry.json
│   ├── training/                 # Training pipelines and dev datasets
│   └── tests/                    # 15 Pytest tests (100% passing)
│
├── docs/                         # Technical Documentation & Architecture
│   ├── architecture.md           # System architecture specification
│   └── screenshots/              # High-resolution application screenshots
│
└── submission/                   # University Major Project Submission Package
    ├── Project_Documentation.md  # 15-chapter formal academic project report
    ├── Project_Links.txt         # Live URLs and demo credentials
    └── Screenshots/              # 10 verified UI feature screenshots
```

---

## 4. Important Scripts and Their Responsibilities

1. **`frontend/src/App.jsx`**: Client routing hub declaring public and protected routes wrapped in `<AuthProvider>` and `<ProtectedRoute allowedRoles={['PATIENT']}>`.
2. **`frontend/src/pages/BookAppointmentPage.jsx`**: Manages interactive date picking, 30-min slot selection matrix, conflict prevention, atomic booking submission, and instant QR pass confirmation modal.
3. **`frontend/src/pages/ReceptionCheckInPage.jsx`**: Initializes the HTML5 webcam scanner container (`'qr-reader-container'`), captures and decodes cryptographic QR passes, and transitions patient status from `BOOKED` to `CHECKED_IN`.
4. **`frontend/src/pages/LiveQueuePage.jsx`**: High-contrast, public waiting-room display (`/queue/:doctorId`) with real-time Socket.IO listeners (`queue_updated`, `patient_checked_in`) and patient privacy masking.
5. **`frontend/src/pages/DoctorAttendancePage.jsx`**: Doctor shift management portal with dynamic QR attendance scanner and past shift duration logs.
6. **`frontend/src/pages/HealthAssistantPage.jsx`**: AI symptom triage interface performing red-flag emergency screening and clinical department specialist routing.
7. **`backend/src/services/priorityService.js`**: Pure mathematical implementation of the explainable waitlist triage scoring formula ($Score = Medical + Urgency + Wait$).
8. **`backend/src/services/allocationService.js`**: Autonomous engine that detects cancelled appointment slots, queries the waitlist for the highest-scoring candidate, and reallocates the slot inside an atomic database transaction.
9. **`backend/src/utils/slotGenerator.js`**: Algorithmic utility that parses doctor availability matrices and generates discrete non-overlapping 30-minute intervals.
10. **`backend/src/middleware/authMiddleware.js`**: Dual-token authentication interceptor that extracts JWT credentials from either HTTP-only cookies or Authorization Bearer headers.

---

## 5. Main Interactive Features

1. **Live Doctor Directory & Search Matrix (`/doctors`):** Real-time specialist catalog with instant search by doctor name, medical department, campus selector (Pune Central Campus), and status badges (`● PRESENT`, `● BUSY`, `● AWAY`, `● OFFLINE`).
2. **Discrete 30-Minute Interactive Slot Engine (`/book`):** Calendar date selector with time-slot pill buttons that visually indicate availability, active locks, and doctor availability predictions.
3. **Digital QR Code Appointment Pass (`/my-appointments`):** Interactive modal rendering a cryptographic QR pass for every booked visit, printable or viewable on mobile screens.
4. **Camera-Based Reception QR Kiosk (`/check-in`):** Interactive webcam scanner with real-time video feed that decodes QR tokens and checks patients into the live OPD queue.
5. **Live OPD Queue Board (`/queue/:doctorId`):** Public-facing board updating in sub-seconds via WebSockets without page reload when patients check in or doctors complete consultations.
6. **Smart Waitlist Prioritization Tracker (`/waitlist`):** Interactive priority tracker displaying transparent point breakdowns (Medical Severity points, Urgency points, and Wait Time bonus).
7. **Doctor Clinical Suite & Shift QR Attendance (`/doctor/dashboard`, `/doctor/attendance`):** Presence state toggle buttons and live patient queue advance controls (`Start Consultation` $\rightarrow$ `Complete Consultation`).
8. **Hospital Analytics & Executive Control Center (`/admin/dashboard`):** Real-time KPI summary cards, filterable patient registry, medical staff workload table, and manual allocation trigger buttons.

---

## 6. Visual Assets and Integration

* **Tailwind CSS Utility Styling:** Cohesive healthcare design tokens with emerald (`#059669`) for active/present states, amber (`#d97706`) for busy/caution, rose (`#e11d48`) for emergencies, and indigo (`#4f46e5`) for administrative actions.
* **Responsive Layouts:** Mobile-first layout using CSS grid and flexbox, ensuring smooth interaction on mobile phones, tablets, reception laptops, and wall-mounted display monitors.
* **Component Design System (`frontend/src/components/ui/`):** Custom reusable primitives: `Button`, `Card`, `Badge`, `Modal`, `Table`, `Input`, `Select`, `StatCard`, `LoadingSkeleton`, and `ConfirmDialog`.
* **Dynamic QR Code Rendering:** In-browser vector SVG rendering (`qrcode.react`) for patient passes and canvas-based scanning via `Html5QrcodeScanner`.
* **Interactive Modals & Floating Helpers:** Overlay modals with backdrop blur for appointment confirmations, rescheduling, and doctor emergency calls (`CallNowModal.jsx`, `MediFlowHelperBubble.jsx`).

---

## 7. Technical Concepts Implemented

1. **Decoupled 3-Tier Architecture:** Client SPA (Vercel) $\leftrightarrow$ Application Gateway (Render Express) $\leftrightarrow$ Database (Neon PostgreSQL) with standalone ML Advisory Service (FastAPI).
2. **ACID Transaction Concurrency:** Prisma `$transaction` blocks preventing race conditions and double-booking on appointment slots.
3. **Dual-Token Authentication:** Cross-domain resilience combining HTTP-only SameSite cookies with Authorization Bearer headers for Safari ITP and private window support.
4. **Role-Based Access Control (RBAC):** Hierarchical permissions enforced at both client route rendering (`<ProtectedRoute>`) and server endpoints (`authorizeRoles('ADMIN', 'DOCTOR')`).
5. **Event-Driven WebSocket Architecture:** Real-time push updates via Socket.IO rooms eliminating costly HTTP client polling.
6. **Explainable Clinical Triage (ESI Model):** Deterministic, bounded mathematical formula for emergency priority calculation rather than uninterpretable black-box models.
7. **Empirical ML Governance:** 4 Scikit-Learn models benchmarked against explicit empirical baselines, tagged as `IMPLEMENTED_BUT_INSUFFICIENT_DATA` until $\ge 500$ real timestamps accumulate.

---

## 8. Technical Challenges and Solutions

| # | Technical Challenge Encountered | Root Cause | Engineering Solution Implemented |
|---|---|---|---|
| **1** | **Double-Booking & Slot Race Conditions** | Concurrent patients attempting to book the exact same 30-minute slot simultaneously. | Enforced an unconditional unique database constraint on `appointments(slotId)` in PostgreSQL via Prisma, wrapped in an atomic `prisma.$transaction()`. Second attempt triggers a `P2002` conflict and rolls back cleanly. |
| **2** | **Cross-Origin Authentication & 401 Errors** | Modern browsers (Safari ITP, Chrome third-party cookie restrictions) block cross-site cookies between `vercel.app` (frontend) and `onrender.com` (backend). | Architected a **Dual-Token Transport Strategy**. The backend issues an HTTP-only cookie AND returns the JWT in the JSON payload. Frontend stores it and transmits it via `Authorization: Bearer <token>` Axios interceptors. The auth middleware extracts from both sources seamlessly. |
| **3** | **Single Page Application 404 on Browser Refresh** | Direct navigation to sub-routes (e.g. `/my-appointments`, `/doctors`) caused Vercel's edge web server to look for physical HTML files that do not exist. | Created a root and frontend `vercel.json` with an edge rewrite rule (`"source": "/(.*)", "destination": "/index.html"`), ensuring the client-side React Router handles all sub-routes. |
| **4** | **Browser Webcam QR Code Scanning Reliability** | Browser security sandboxing and varying camera resolutions across devices caused decoding lag or scanner lockups. | Integrated `Html5QrcodeScanner` with bounded frame-rate (`fps: 10`), fixed bounding box (`qrbox: 250x250`), automatic scanner pause upon detection, and fallback manual alphanumeric token input. |
| **5** | **Academic Transparency in Machine Learning** | Initial development dataset was synthetic, lacking real ground-truth patient consultation duration timestamps. | Implemented an explicit **Model Registry Governance Policy** (`model_registry.json`). Models are honestly tagged as `IMPLEMENTED_BUT_INSUFFICIENT_DATA` until $\ge 500$ real clinical events accumulate. Advisory predictions never override core database logic. |

---

## 9. Testing and Verification

* **Frontend Build Verification:** Production compiler (`vite build`) compiled 183 modules in 1.32s with zero JSX errors:
  ```text
  dist/index.html                     0.67 kB │ gzip:   0.44 kB
  dist/assets/index-Bn_1p8Ts.css     72.72 kB │ gzip:  11.56 kB
  dist/assets/index-CkVLmRG9.js   1,074.33 kB │ gzip: 289.72 kB
  ✓ built in 1.32s
  ```
* **Database Schema Integrity:** Validated with `npx prisma validate`:
  ```text
  The schema at database/schema.prisma is valid 🚀
  ```
* **Live Neon Database Connectivity:** Confirmed via live query:
  ```text
  Database connected! Doctor count: 13 | User count: 17
  ```
* **Machine Learning Pytest Suite:** 15/15 unit tests passing in 3.32s covering API contracts, preprocessing, and baseline comparisons:
  ```text
  tests/test_api.py ...              [ 20%]
  tests/test_data_quality.py .....   [ 53%]
  tests/test_health.py .             [ 60%]
  tests/test_models.py ....          [ 86%]
  tests/test_preprocessing.py ..     [100%]
  ============================== 15 passed in 3.32s ==============================
  ```

---

## 10. Current Limitations

1. **Advisory Machine Learning Cold-Start:** While the 4 Scikit-Learn pipelines are fully implemented and test-verified, they operate under development governance (`IMPLEMENTED_BUT_INSUFFICIENT_DATA`) pending accumulation of $\ge 500$ real clinical event timestamps in the production database.
2. **SMS Gateway Simulation:** Email reminders and notifications are fully operational, but direct cellular SMS dispatch requires a paid Twilio API integration.
3. **Telemedicine Video Streams:** Queue tracking is live and interactive, but direct in-browser WebRTC video calls between patients and doctors are scheduled for the next release.

---

## 11. Detailed Answers to All Five ISD Questions

---

### Question 1: What interactive experience did you create, and what is its purpose?

#### A. What to say (Spoken Script):
> "For my ISD Capstone Project, I created **MediFlow AI**, an enterprise-grade interactive hospital appointment orchestration and patient queue management platform. 
>
> In traditional hospitals, patients suffer from extreme waiting hall congestion, unpredictable doctor arrival times, and rigid appointment systems where cancelled slots are wasted. 
>
> To solve this, I built an interactive clinical web application that connects three types of users in real time: outpatients, medical doctors, and hospital receptionists. 
>
> Patients can interactively search 13 verified medical specialists, select discrete 30-minute booking slots, download digital cryptographic QR passes, and monitor their live position in the outpatient queue from their phone. When they arrive at the hospital, receptionists scan their QR pass using an integrated webcam scanner to automatically activate them into the live queue. 
>
> Most importantly, if a booked patient cancels their visit, my system's Smart Waitlist engine calculates an explainable clinical priority score based on medical severity and waiting time, automatically reallocating the open slot to the most urgent waiting patient in real time. The purpose is to transform crowded, stressful outpatient clinics into an organized, transparent, and fair healthcare experience."

#### B. What to show on screen:
* Browser window open to the **Live Production Application** (`https://mediflow-ai-app.vercel.app`).
* Show the **Home Page**, then navigate to the **Doctors Directory (`/doctors`)**.
* Show the **Apollo Hospitals-grade specialist cards** with real-time status badges (`● PRESENT`, `● OFFLINE`), specialty filters, and search bar.

#### C. Demonstration steps:
1. Open `https://mediflow-ai-app.vercel.app` in your browser.
2. Scroll through the Home Page showing the hero banner, emergency helpline desk, and core capability cards.
3. Click **"Doctors Directory"** in the top navigation.
4. Type `"Cardiology"` in the search bar or click the **"Cardiac Sciences"** specialty filter to show instant filtering.
5. Point out Dr. Rajesh Sharma's card showing qualifications, ₹900 consultation fee, Room 101-B, active clinic days, and the green `● PRESENT` badge.

#### D. Technical explanation:
* The application is built as a responsive Single Page Application using **React 18** and **Tailwind CSS**.
* Client-side routing is handled by **React Router v6** with protected route wrappers (`ProtectedRoute.jsx`).
* The frontend communicates with a **Node.js Express** REST API on Render and subscribes to bidirectional WebSocket events via **Socket.IO** on port 5001.
* All data is persisted in a serverless **PostgreSQL** database on Neon via **Prisma ORM**.

#### E. Important evidence:
* File: `frontend/src/pages/DoctorDirectoryPage.jsx` (Lines 1–150)
* File: `frontend/src/components/DoctorCard.jsx`
* Database Model: `Doctor` and `DoctorAvailability` in `database/schema.prisma` (Lines 135–204)

---

### Question 2: Which tools, technologies, and development concepts did you use?

#### A. What to say (Spoken Script):
> "I used a modern, production-grade full-stack technology stack following a decoupled three-tier architecture.
>
> On the frontend, I used **React 18** with **Vite** for optimized production bundling, and **Tailwind CSS** to build a responsive, clinical design system. I used **Lucide React** for clinical iconography and **HTML5-QRCode** for webcam-based QR scanning.
>
> On the backend, I developed an asynchronous REST API gateway using **Node.js 20 LTS** and **Express.js**. For data persistence, I used **PostgreSQL 16** hosted on **Neon Serverless Cloud**, managed through **Prisma ORM** for type-safe queries and automated schema migrations.
>
> For real-time interactivity, I integrated **Socket.IO v4**, allowing the server to push instant queue updates, doctor presence changes, and waitlist allocations without page refreshes.
>
> For intelligent analytics, I built an independent **Python 3.13** microservice using **FastAPI** and **Scikit-Learn**, hosting four trained models for waiting-time prediction and department demand forecasting.
>
> Crucial development concepts I implemented include **ACID transactional concurrency** to prevent double-booking, **Role-Based Access Control (RBAC)** across three distinct user roles, and a **Dual-Token Authentication strategy** combining HTTP-only SameSite cookies and Authorization Bearer headers to solve cross-origin browser privacy restrictions."

#### B. What to show on screen:
* Open **VS Code** showing the root repository structure.
* Briefly open `package.json` to show frontend and backend dependencies.
* Open `docs/architecture.md` showing the **Multi-Tier System Topology Diagram**.
* Open `database/DATABASE.md` showing the **Mermaid Entity Relationship Diagram**.

#### C. Demonstration steps:
1. In VS Code, open the file explorer showing `frontend/`, `backend/`, `database/`, and `ml-service/`.
2. Open `package.json` and highlight the unified scripts (`npm run dev`, `npm run db:validate`, `npm run build`).
3. Open `docs/architecture.md` in preview mode and walk through the diagram showing how Vercel (Frontend), Render (API Gateway & ML Service), and Neon (PostgreSQL) communicate.
4. Open `database/DATABASE.md` and show the 14 Prisma models and relationship mapping.

#### D. Technical explanation:
* **Separation of Concerns:** The core transactional booking engine (Express + PostgreSQL) is completely decoupled from the ML analytics service (FastAPI). If the ML service is restarting, booking operations are never blocked.
* **Connection Pooling:** The backend connects to Neon PostgreSQL through a PgBouncer connection pooler on port 6543 (`?pgbouncer=true`) to prevent connection exhaustion under high concurrency, while schema migrations run on an unpooled direct connection on port 5432.
* **Prisma Parameterized Queries:** Every database interaction is compiled into parameterized SQL, neutralizing SQL injection vulnerabilities.

#### E. Important evidence:
* File: `package.json` (Root dependencies and unified scripts)
* File: `database/schema.prisma` (Datasource config with pooled `DATABASE_URL` and `directUrl`)
* File: `backend/src/config/db.js` (Prisma client singleton)
* File: `docs/architecture.md` (Architecture specification)

---

### Question 3: How did you implement interactions and behavior in your project?

#### A. What to say (Spoken Script):
> "Interactions and system behaviors in MediFlow AI are implemented through an event-driven reactive pipeline combining React state, REST transactions, and bidirectional WebSockets.
>
> Let's look at the appointment booking interaction. When a patient selects a doctor and date on the `/book` page, React triggers an API call to `getAvailableSlots()`. The backend utility `slotGenerator.js` dynamically computes all 30-minute intervals based on the doctor's weekly active schedule, querying PostgreSQL for any existing reservations. 
>
> When the patient clicks a slot and submits, the backend wraps the booking inside an atomic `prisma.$transaction()`. It acquires a row-level lock, verifies that `slot.status` is strictly `AVAILABLE`, creates the appointment record, generates a unique cryptographic QR token, and sets the slot status to `BOOKED`. If another user clicks the same slot milliseconds earlier, the second transaction is immediately rejected with a clean conflict error, completely preventing double-booking.
>
> Simultaneously, the backend emits a Socket.IO event. Any client listening—such as the doctor's dashboard or the public `/queue` display—catches this event through my custom `useSocket` React hook and re-renders the live queue position instantly without refreshing the browser.
>
> For emergency triage, if a slot is cancelled, `allocationService.js` detects the opening, computes priority scores for all waitlisted patients, and reallocates the slot to the highest-scoring candidate automatically."

#### B. What to show on screen:
* In the browser, navigate to `/login` and click the **"Patient"** demo login button (`rahul.verma@example.com`).
* Go to `/book`, select **Dr. Rajesh Sharma**, pick today's date, and show the interactive **30-minute slot buttons**.
* In VS Code, open `backend/src/services/appointment.service.js` and show the `prisma.$transaction()` code block.
* Open `backend/src/services/priorityService.js` and show the `calculatePriorityScore()` function.

#### C. Demonstration steps:
1. Log in as a Patient using the 1-click test button.
2. Navigate to `/book`. Select a doctor from the dropdown.
3. Show the dynamic time slot pill buttons (e.g., 10:00 AM, 10:30 AM).
4. Click a slot and show how the UI highlights the selection and enables the "Confirm Booking" button.
5. In VS Code, switch to `backend/src/services/appointment.service.js` (around line 120) and highlight the transaction:
   `await prisma.$transaction(async (tx) => { ... })`
6. Switch to `backend/src/services/priorityService.js` and show the formula:
   `Total Score = Medical Priority Points + Urgency Points + Waiting Time Points`.

#### D. Technical explanation:
* **Concurrency Safety:** The unique constraint `@unique` on `appointments(slotId)` acts as an unconditional database invariant. PostgreSQL enforces this at the storage engine level.
* **Explainable Triage Algorithm:** Based on the Emergency Severity Index (ESI):
  - Medical Priority: Low (10), Medium (20), High (30), Emergency (40 pts).
  - Clinical Urgency: Low (5), Medium (10), High (15), Emergency (20 pts).
  - Waiting Time Bonus: 1 point per 30 minutes in queue, capped at 30 points (15 hours) so wait duration never overrides acute emergency conditions.
  - Total score bounded strictly between 15 and 90 points.

#### E. Important evidence:
* File: `backend/src/services/appointment.service.js` (`bookAppointment` function with `$transaction`)
* File: `backend/src/services/priorityService.js` (Lines 1–110: `calculatePriorityScore`, `explainScore`)
* File: `frontend/src/hooks/useSocket.js` (WebSocket hook)
* File: `backend/src/config/socket.js` (Socket.IO event dispatcher)

---

### Question 4: How did you create and integrate the visual or interactive elements?

#### A. What to say (Spoken Script):
> "I designed and implemented the visual elements using a modular, healthcare-specific design system in **Tailwind CSS**, prioritizing clinical clarity, accessibility, and high information contrast.
>
> In `frontend/src/components/ui/`, I built reusable UI primitives including custom `Button`, `Card`, `Badge`, `Modal`, `StatCard`, and `LoadingSkeleton` components.
>
> One key visual element is our **Live Presence Indicator**. Every doctor card features a color-coded status badge: emerald for `● PRESENT`, amber for `● BUSY`, purple for `● AWAY`, and slate for `● OFFLINE`. These badges update dynamically via WebSocket events when doctors check in or step away.
>
> Another major interactive feature is our **Digital QR Code Pass**. When an appointment is confirmed, my system uses SVG vector generation to render a scannable QR code containing the encrypted appointment token. 
>
> On the hospital reception side, I integrated the **HTML5-QRCode** library into `ReceptionCheckInPage.jsx`. It activates the device's webcam inside a styled scanning viewfinder. When a patient presents their smartphone, the scanner captures the video stream, decodes the token at 10 frames per second, and triggers an API verification call. Upon verification, the visual card animates to a green success state, displays the patient's queue token number, and updates the live OPD wall board."

#### B. What to show on screen:
* Show the **Digital QR Pass Modal** on `/my-appointments`.
* Navigate to `/check-in` (log in as Admin `admin@mediflow.com`) to show the **Reception QR Scanner** with the camera viewfinder.
* Show the **Live Queue Page (`/queue/:doctorId`)** demonstrating the high-contrast public waiting-room display.

#### C. Demonstration steps:
1. Log in as Patient and navigate to `/my-appointments`.
2. Click **"Digital QR Pass"** on an appointment card to open the QR pass modal showing the QR code, token string, and instructions.
3. Log out and log in as Admin (`admin@mediflow.com`).
4. Click **"OPD Check-In"** in the navbar to open `/check-in`.
5. Point out the interactive camera container (`qr-reader-container`) and the alternative manual token input field.
6. Open a new tab to `/queue/d1` to show the public waiting board with token numbers and estimated wait times.

#### D. Technical explanation:
* **QR Token Generation:** Generated dynamically using `crypto.randomBytes` or UUID tokens stored in `appointments.checkInToken`.
* **Privacy Masking:** The public `/queue/:doctorId` endpoint passes `isPublic=true` to the backend controller, which masks patient names (e.g., `"R**** V****"`) to comply with healthcare data privacy standards.
* **Component Encapsulation:** Modals use React portals and manage backdrop-blur overlays, trapping focus and supporting ESC-key dismissal.

#### E. Important evidence:
* File: `frontend/src/pages/ReceptionCheckInPage.jsx` (Lines 15–75: `Html5QrcodeScanner` integration)
* File: `frontend/src/pages/MyAppointmentsPage.jsx` (Lines 35–65: QR Pass modal)
* File: `frontend/src/pages/LiveQueuePage.jsx` (Lines 15–80: Live queue display with privacy masking)
* File: `frontend/src/components/ui/Badge.jsx` (Presence status badge styling)

---

### Question 5: What technical challenges did you face, and how did you ensure your project works correctly?

#### A. What to say (Spoken Script):
> "During the development and deployment of MediFlow AI, I encountered and solved three major technical challenges.
>
> The first challenge was **cross-origin authentication failures in production**. Our frontend is hosted on Vercel (`mediflow-ai-app.vercel.app`) while the API gateway is on Render (`onrender.com`). Modern browser security policies, especially Safari's Intelligent Tracking Prevention, blocked our HTTP-only session cookies because they were treated as third-party cookies across different domains. This caused protected requests to return 401 Unauthorized errors. 
>
> I resolved this by architecting a **Dual-Token Authentication Strategy**. Upon login, the server sets the secure cookie AND returns the JWT in the response body. The frontend stores it and transmits it via Axios request interceptors as an `Authorization: Bearer` header. The backend authentication middleware inspects both sources sequentially, ensuring 100% reliable authentication across all browsers.
>
> The second challenge was **Vercel Single Page Application 404 errors**. When users refreshed pages like `/my-appointments` or `/doctors`, Vercel looked for physical static files and returned HTTP 404. I resolved this by configuring `vercel.json` with an edge rewrite rule (`/(.*) -> /index.html`), allowing React Router to handle all sub-routes.
>
> To ensure everything works correctly, I implemented rigorous multi-layered verification:
> 1. Automated unit testing with **15 out of 15 passing Pytest tests** for the ML microservice.
> 2. Database validation using `npx prisma validate` ensuring schema integrity across all 14 models.
> 3. Production build verification using `vite build`, compiling 183 modules in 1.32 seconds with zero errors.
> 4. And complete data-governance transparency, where our ML models are honestly marked as `IMPLEMENTED_BUT_INSUFFICIENT_DATA` until 500 real clinical events accumulate."

#### B. What to show on screen:
* In VS Code, open `backend/src/middleware/authMiddleware.js` showing the dual-token extraction logic:
  `const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');`
* Open `vercel.json` showing the URL rewrite configuration.
* Open the terminal and run `npm run build` in `frontend/` showing the clean 1.32s compilation.
* Show the passing Pytest output: `15 passed in 3.32s`.

#### C. Demonstration steps:
1. In VS Code, open `backend/src/middleware/authMiddleware.js` and point directly to lines 15–25 where both cookie and Bearer header are checked.
2. Open `vercel.json` and show the rewrite rule:
   `"source": "/(.*)", "destination": "/index.html"`.
3. Open the terminal and run:
   `cd frontend && npm run build`
   Show the output confirming 183 modules transformed and build complete in 1.3s.
4. Open `ml-service/artifacts/model_registry.json` and point out the governance status:
   `"status": "IMPLEMENTED_BUT_INSUFFICIENT_DATA"`.

#### D. Technical explanation:
* **Dual-Token Architecture:** Protects against CSRF via SameSite cookie configuration while providing complete fallback immunity against cross-domain iframe and third-party cookie partitioning (CHIPS).
* **Deterministic Fallback:** The appointment slot engine and triage allocator do not rely on probabilistic ML predictions; they run on deterministic relational queries in PostgreSQL.
* **Continuous Integration:** Every commit to GitHub triggers Vercel Edge preview deployments and Render web service rebuilds.

#### E. Important evidence:
* File: `backend/src/middleware/authMiddleware.js` (Lines 15–30: Dual-token extraction)
* File: `backend/src/app.js` (CORS whitelist configuration)
* File: `vercel.json` (SPA URL rewrites)
* File: `ml-service/artifacts/model_registry.json` (Scientific data governance)
* File: `ml-service/tests/` (15/15 passing Pytest suite)

---

## 12. Exact Screen Recording Demonstration Plan (7–8 Minutes)

| Time Stamp | Section | Spoken Content Summary | What to Display on Screen | Action / Click Steps |
|:---:|---|---|---|---|
| **0:00 – 0:30** | **Introduction** | Introduce name, B.Tech program, project title: *MediFlow AI*, and summarize the core problem of hospital OPD congestion and uncoordinated doctor schedules. | Live Web Application (`https://mediflow-ai-app.vercel.app`) on the **Home Page**. | Scroll through the hero banner, emergency helpline badge, and capability overview cards. |
| **0:30 – 1:45** | **Q1: Project & Purpose** | Explain the interactive clinical experience: specialist discovery, discrete slot booking, digital QR passes, live queue board, and smart triage waitlist. | Switch to **Doctors Directory (`/doctors`)**. | Type `"Cardiology"` in search, click specialty pill filters, and highlight Dr. Rajesh Sharma's card showing credentials, fee, and `● PRESENT` badge. |
| **1:45 – 3:00** | **Q2: Tools & Technologies** | Detail the full-stack architecture: React 18, Vite, Tailwind CSS, Node.js Express, PostgreSQL on Neon via Prisma, Socket.IO, and Python FastAPI ML. | Switch to **VS Code**: open `package.json`, `docs/architecture.md`, and `database/DATABASE.md`. | Show the architecture diagram in `docs/architecture.md`, then show the 14 Prisma models in `DATABASE.md`. |
| **3:00 – 4:30** | **Q3: Interactions & Behavior** | Walk through the booking transaction, atomic `$transaction` locking, double-booking prevention, and real-time Socket.IO queue synchronization. | In browser, log in as Patient, open **`/book`**, select doctor, pick date, and show slot pills. In VS Code, show `appointment.service.js`. | Click a slot pill, show button enable, switch to VS Code to show `prisma.$transaction()`, then show `priorityService.js` scoring formula. |
| **4:30 – 5:45** | **Q4: Visual Elements & Integration** | Present the clinical design system: Tailwind badges, modal overlays, vector QR SVG passes, and the HTML5 webcam QR scanner. | In browser, open **`/my-appointments`** (show QR Pass Modal), then log in as Admin and open **`/check-in`**. | Click "Digital QR Pass" modal, switch tabs to `/check-in` showing the active webcam scanning container (`qr-reader-container`). |
| **5:45 – 7:15** | **Q5: Challenges & Testing** | Explain the cross-origin cookie issue and dual-token solution, Vercel SPA 404 rewrites, and demonstrate passing tests and build. | In VS Code, show `authMiddleware.js` and `vercel.json`. In terminal, execute `npm run build`. | Highlight lines 15–25 in `authMiddleware.js`. Run `npm run build` in terminal showing the clean 1.32s compilation. |
| **7:15 – 7:45** | **Conclusion & Wrap-Up** | Conclude with project summary: enterprise architecture, live deployment on Vercel/Render, and readiness for hospital outpatient deployment. | Browser showing **Live Application** on `/patient/dashboard` or `/admin/dashboard`. | Show the clean Hospital Control Center KPI metrics and thank the examiners. |

---

## 13. Important Technical Facts I Must Remember

1. **How many doctors are in the database?**  
   Exactly **13 verified specialists** across Cardiology, Neurology, Dermatology, Orthopedics, Pediatrics, General Medicine, Dentistry, Ophthalmology, Gynecology, Psychiatry, ENT, Oncology, and Nephrology.
2. **What is the slot duration?**  
   Strictly **30-minute discrete non-overlapping intervals** derived dynamically from each doctor's weekly availability schedule matrix.
3. **What is the waitlist scoring formula?**  
   $$\text{Total Score} = W_{\text{medical}} + W_{\text{urgency}} + \min\left(\left\lfloor \frac{\Delta t_{\text{wait}}}{30} \right\rfloor, 30\right)$$
   * Range: 15 points (minimum) to 90 points (maximum).
   * 1 point bonus per 30 minutes in queue, capped at 30 points (15 hours) so wait time never overrides acute emergency triage.
4. **Why is the architecture three-tier decoupled?**  
   Core clinical transactions (slot booking, QR scanning, patient queue) run independently on Node.js and PostgreSQL. If the Python ML microservice restarts or has cold start, appointment scheduling is **never interrupted**.
5. **How is double-booking prevented?**  
   An unconditional `@unique` constraint on `appointments(slotId)` in PostgreSQL enforced by Prisma inside an atomic `prisma.$transaction()` block.
6. **How does real-time communication work?**  
   Bidirectional WebSockets via **Socket.IO 4.7**. Key events: `queue_updated`, `doctor_presence_updated`, `waitlist_allocated`, `notification_received`.
7. **What is the database configuration?**  
   **PostgreSQL 16** on Neon Serverless Cloud (AWS `us-east-2`), using connection pooling via PgBouncer on port 6543 (`?pgbouncer=true`) and unpooled direct migrations on port 5432.
8. **What are the 3 pre-seeded test accounts?**  
   * Admin: `admin@mediflow.com` / `password123`
   * Doctor: `dr.sharma@mediflow.com` / `password123`
   * Patient: `rahul.verma@example.com` / `password123`

---

## 14. Potential Follow-Up Viva Questions & Answers

### Q1: "Why did you use Prisma ORM instead of raw SQL queries or Mongoose?"
> **Answer:** "I chose Prisma ORM for three reasons: First, type-safety and automated compile-time validation, which prevents invalid field queries. Second, relational integrity with PostgreSQL—Prisma generates declarative migrations and handles complex 1-to-1 and 1-to-many foreign key relations with automated delete cascades. Third, built-in protection against SQL injection through parameterized queries, which is mandatory for healthcare data security."

### Q2: "Why use WebSockets instead of simple HTTP polling for the live queue?"
> **Answer:** "HTTP polling requires every connected client to send HTTP GET requests every few seconds. With 500 patients in hospital waiting rooms, that creates thousands of unnecessary requests per minute, overloading the server and database. WebSockets via Socket.IO maintain a single persistent TCP connection per client, and the server pushes updates only when a state change actually happens (event-driven architecture). This reduces network bandwidth by over 90% and achieves sub-second UI updates."

### Q3: "What happens if two patients click 'Book' on the same slot at the exact same millisecond?"
> **Answer:** "My implementation uses an atomic PostgreSQL transaction with Prisma's `$transaction`. The first transaction acquires a row lock and writes the appointment with `slotId`. Because `slotId` has an unconditional unique constraint in PostgreSQL, the second transaction fails immediately with a unique constraint violation (`P2002`). The transaction rolls back cleanly, and my backend returns an HTTP 409 Conflict response, prompting the second user that the slot was just taken."

### Q4: "Why is your waitlist algorithm rule-based instead of using a deep neural network?"
> **Answer:** "In clinical healthcare systems, decisions that determine which patient receives medical care must be **explainable, deterministic, and legally auditable**. A black-box neural network cannot explain to a patient or hospital ombudsman why one person was prioritized over another. Our formula—inspired by the Emergency Severity Index (ESI)—gives a transparent, mathematically bounded score where every point is directly attributed to clinical severity, temporal urgency, or elapsed waiting time."

### Q5: "How do you protect patient privacy on the public live queue display?"
> **Answer:** "When the live queue screen at `/queue/:doctorId` calls the backend endpoint `/api/check-in/queue/:doctorId`, it passes a query parameter `isPublic=true`. The backend controller checks this flag and automatically masks patient names—for example, converting 'Rahul Verma' to 'R**** V****'. This displays queue token numbers and positions while protecting confidential patient health identities in public hospital waiting rooms."
