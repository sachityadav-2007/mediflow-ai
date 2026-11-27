# 🗄️ MediFlow AI — Database Architecture & Specification Reference (`DATABASE.md`)

**Document ID:** `database/DATABASE.md`  
**System:** MediFlow AI — Smart Doctor Appointment Booking & Patient Management System  
**Database Engine:** PostgreSQL 16 (Serverless Neon Cloud Architecture)  
**ORM / Data Layer:** Prisma ORM 5.8.1  
**Schema File:** [`database/schema.prisma`](./schema.prisma)  
**Status:** Production Active & Verified  

---

## 1. Database Overview

MediFlow AI uses a high-performance relational database architecture powered by **PostgreSQL 16** and orchestrated via **Prisma ORM**. The data tier is designed around principles of strict relational integrity, ACID transactional safety, and high-availability connection pooling.

The schema models an enterprise outpatient department (OPD) ecosystem, managing:
* Multi-role authentication and identity profiles (`User`, `Doctor`, `Patient`).
* Clinician presence states and recurring shift schedules (`DoctorAvailability`, `PresenceLog`, `DoctorAttendance`, `HospitalQRCode`).
* Discrete 30-minute bookable slot generation and concurrency locking (`AppointmentSlot`).
* Full appointment lifecycle management with cryptographic QR token verification (`Appointment`, `QRScanAudit`).
* Dynamic, explainable priority waitlist queuing and automated slot reallocation (`Waitlist`).
* Clinical triage history and symptom-to-specialty guidance (`TriageHistory`).
* Asynchronous predictive analytics audit trails (`PredictionLog`).
* Persistent real-time user notification delivery (`Notification`).

---

## 2. PostgreSQL Architecture

MediFlow AI leverages **Neon Serverless PostgreSQL** hosted in AWS (`us-east-2`):

```
┌────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL CLOUD TOPOLOGY                         │
│                                                                        │
│   Node.js / Express API Gateway (Port 5001)                            │
│   Prisma ORM Client (libquery_engine-darwin-arm64 / rhel-openssl)     │
│                     │                             │                    │
│   Pooled Connection │ (Port 6543)                 │ Direct Connection  │ (Port 5432)
│   (PgBouncer Pooler)│                             │ (DDL / Migrations) │
│                     ▼                             ▼                    │
│   ┌───────────────────────────────────┐ ┌───────────────────────────┐  │
│   │ Neon Connection Pooler (PgBouncer)│ │ Direct PostgreSQL Engine  │  │
│   └─────────────────┬─────────────────┘ └─────────────┬─────────────┘  │
│                     │                                 │                │
│                     ▼                                 ▼                │
│        ┌──────────────────────────────────────────────────────┐        │
│        │        PostgreSQL 16 Storage Engine (ACID)           │        │
│        │  • Write-Ahead Logging (WAL)                         │        │
│        │  • Multi-Version Concurrency Control (MVCC)          │        │
│        │  • 14 Relational Tables (Normalized 3NF)             │        │
│        └──────────────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────────────────────┘
```

* **Connection Pooling:** In high-concurrency environments, application instances connect through Neon's PgBouncer proxy (`DATABASE_URL`, port 6543) with `?pgbouncer=true` to prevent socket exhaustion.
* **Direct Migration Pipeline:** Schema migrations (`npx prisma migrate deploy`) utilize an unpooled direct connection (`DATABASE_URL_UNPOOLED`, port 5432) to support transactional DDL lock acquisition.
* **Multi-Version Concurrency Control (MVCC):** Slot bookings and waitlist allocations run inside PostgreSQL serializable / repeatable read transactions to guarantee zero duplicate bookings.

---

## 3. Prisma ORM Configuration

The schema generator and datasource are declared in [`database/schema.prisma`](./schema.prisma):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}
```

* **Prisma Client JS:** Generates strongly-typed TypeScript and JavaScript query clients located in `node_modules/@prisma/client`.
* **Database Symlink Architecture:** To maintain compatibility with standard Node.js practices, the root directory features a symbolic link (`prisma -> database`), and the backend contains (`backend/prisma -> ../database`).

---

## 4. Complete Mermaid Entity Relationship (ER) Diagram

The diagram below documents all **14 models** and their exact foreign key associations, cardinalities, and delete cascade behaviors:

```mermaid
erDiagram
    users ||--o| doctors : "userId (1:1 CASCADE)"
    users ||--o| patients : "userId (1:1 CASCADE)"
    users ||--o{ notifications : "userId (1:N CASCADE)"
    
    doctors ||--o{ doctor_availabilities : "doctorId (1:N CASCADE)"
    doctors ||--o{ presence_logs : "doctorId (1:N CASCADE)"
    doctors ||--o{ appointment_slots : "doctorId (1:N CASCADE)"
    doctors ||--o{ appointments : "doctorId (1:N CASCADE)"
    doctors ||--o{ waitlists : "doctorId (1:N CASCADE)"
    doctors ||--o{ prediction_logs : "doctorId (1:N SET NULL)"
    doctors ||--o{ doctor_attendances : "doctorId (1:N CASCADE)"
    
    patients ||--o{ appointments : "patientId (1:N CASCADE)"
    patients ||--o{ waitlists : "patientId (1:N CASCADE)"
    patients ||--o{ triage_histories : "patientId (1:N CASCADE)"
    
    appointment_slots ||--o| appointments : "slotId (1:1 CASCADE)"
    
    hospital_qr_codes ||--o{ doctor_attendances : "qrCodeId (1:N SET NULL)"
    hospital_qr_codes ||--o{ qr_scan_audits : "qrCodeId (1:N SET NULL)"

    users {
        string id PK "UUID"
        string name
        string email UK
        string password "bcrypt hash"
        Role role "ADMIN|DOCTOR|PATIENT|RECEPTIONIST"
        string phone "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    doctors {
        string id PK "UUID"
        string userId FK "Unique -> users.id"
        string specialization
        string department
        int experience "Years"
        string qualification
        float consultationFee
        int consultationDuration "Default 30 mins"
        PresenceStatus currentPresence "Default OFFLINE"
        string roomNumber "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    patients {
        string id PK "UUID"
        string userId FK "Unique -> users.id"
        datetime dateOfBirth "Nullable"
        Gender gender "Nullable"
        string bloodGroup "Nullable"
        string address "Nullable"
        string emergencyContact "Nullable"
        string medicalHistory "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    doctor_availabilities {
        string id PK "UUID"
        string doctorId FK "-> doctors.id"
        DayOfWeek dayOfWeek
        string startTime "e.g. 09:00"
        string endTime "e.g. 17:00"
        boolean isAvailable "Default true"
        PresenceStatus presenceStatus "Default AVAILABLE"
        datetime createdAt
        datetime updatedAt
    }

    presence_logs {
        string id PK "UUID"
        string doctorId FK "-> doctors.id"
        PresenceStatus status
        DetectionMethod detectionMethod "Default MANUAL"
        string notes "Nullable"
        datetime timestamp "Default now()"
    }

    appointment_slots {
        string id PK "UUID"
        string doctorId FK "-> doctors.id"
        datetime slotDate
        string startTime "e.g. 09:00"
        string endTime "e.g. 09:30"
        SlotStatus status "Default AVAILABLE"
        datetime createdAt
        datetime updatedAt
    }

    appointments {
        string id PK "UUID"
        string appointmentNumber UK "e.g. APT-20261031-001"
        string patientId FK "-> patients.id"
        string doctorId FK "-> doctors.id"
        string slotId FK "Unique -> appointment_slots.id"
        datetime appointmentDate
        PriorityLevel priority "Default MEDIUM"
        AppointmentStatus status "Default SCHEDULED"
        string reason "Nullable"
        string notes "Nullable"
        string checkInToken UK "Nullable"
        datetime checkedInAt "Nullable"
        datetime consultationStartedAt "Nullable"
        datetime consultationCompletedAt "Nullable"
        int actualDurationMinutes "Nullable"
        datetime reminderSentAt "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    waitlists {
        string id PK "UUID"
        string patientId FK "-> patients.id"
        string doctorId FK "-> doctors.id"
        datetime preferredDate
        PriorityLevel priority "Default MEDIUM"
        PriorityLevel urgency "Default MEDIUM"
        int priorityScore "Default 0"
        WaitlistStatus status "Default PENDING"
        string notes "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    prediction_logs {
        string id PK "UUID"
        string predictionType "AVAILABILITY|DEMAND|WAITING_TIME"
        string doctorId FK "Nullable -> doctors.id"
        string department "Nullable"
        datetime targetDate "Nullable"
        string forecastPeriod "Nullable"
        json predictionResult
        float confidenceScore "Nullable"
        string algorithmVersion "Default v1.0-statistical-baseline"
        boolean isCached "Default false"
        datetime createdAt
    }

    hospital_qr_codes {
        string id PK "UUID"
        string code UK "Cryptographic UUID"
        string signedToken "JWT Token"
        string location "Chamber/Wing"
        int validityMinutes "Default 60"
        datetime expiresAt
        boolean isActive "Default true"
        datetime revokedAt "Nullable"
        string revokedBy "Nullable"
        string createdById "Admin User ID"
        datetime createdAt
        datetime updatedAt
    }

    doctor_attendances {
        string id PK "UUID"
        string doctorId FK "-> doctors.id"
        string qrCodeId FK "Nullable -> hospital_qr_codes.id"
        string location
        datetime checkInTime
        datetime checkOutTime "Nullable"
        int durationMinutes "Nullable"
        AttendanceStatus status "Default CHECKED_IN"
        DetectionMethod checkInMethod "Default QR_SCAN"
        DetectionMethod checkOutMethod "Nullable"
        string notes "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    qr_scan_audits {
        string id PK "UUID"
        string qrCodeId FK "Nullable -> hospital_qr_codes.id"
        string userId
        Role userRole
        string doctorId "Nullable"
        string doctorName "Nullable"
        string location
        string action "CHECK_IN|CHECK_OUT"
        string status "SUCCESS|FAILED|EXPIRED"
        string ipAddress "Nullable"
        string userAgent "Nullable"
        string failureReason "Nullable"
        datetime timestamp
    }

    triage_histories {
        string id PK "UUID"
        string patientId FK "-> patients.id"
        string symptoms "Text"
        string duration "Nullable"
        string severity "Nullable"
        string recommendedDepartment
        string specialistType
        string urgency
        float confidence
        string guidance "Nullable Text"
        string[] matchedSymptoms "Default []"
        boolean isEmergency "Default false"
        datetime createdAt
    }

    notifications {
        string id PK "UUID"
        string userId FK "-> users.id"
        NotificationType type "Default SYSTEM_ALERT"
        string title
        string message "Text"
        boolean isRead "Default false"
        datetime readAt "Nullable"
        json metadata "Nullable"
        datetime createdAt
        datetime updatedAt
    }
```

---

## 5. All Prisma Models (Overview)

| # | Model Name | Database Table | Purpose |
|---|---|---|---|
| 1 | `User` | `users` | Primary authentication, role identity, and security credential store. |
| 2 | `Doctor` | `doctors` | Clinical specialist profiles, qualifications, fees, room numbers, and presence. |
| 3 | `Patient` | `patients` | Outpatient demographics, blood groups, emergency contacts, and medical notes. |
| 4 | `DoctorAvailability` | `doctor_availabilities` | Recurring weekly clinic schedules and operational hours by day of week. |
| 5 | `PresenceLog` | `presence_logs` | Historical timeline of doctor presence status changes for hospital auditing. |
| 6 | `AppointmentSlot` | `appointment_slots` | Discrete 30-minute bookable intervals for each doctor and clinic date. |
| 7 | `Appointment` | `appointments` | Confirmed bookings, digital QR tokens, check-in timestamps, and consultation durations. |
| 8 | `Waitlist` | `waitlists` | Dynamic priority queue for overbooked sessions with triage score calculation. |
| 9 | `PredictionLog` | `prediction_logs` | Audit trail of machine learning inference queries, confidence scores, and inputs. |
| 10 | `HospitalQRCode` | `hospital_qr_codes` | Dynamic location-specific cryptographic QR codes for doctor shift check-in. |
| 11 | `DoctorAttendance` | `doctor_attendances` | Doctor clinical shift records, check-in/out timestamps, and working hours. |
| 12 | `QRScanAudit` | `qr_scan_audits` | High-security audit log capturing every QR scan event, IP, user-agent, and status. |
| 13 | `TriageHistory` | `triage_histories` | Patient symptom evaluations, urgency levels, and specialist routing recommendations. |
| 14 | `Notification` | `notifications` | Persistent in-app user notifications for booking updates and triage allocations. |

---

## 6. All Model Fields and Data Types

### 6.1 Model 1: `User` (`users`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Unique user identifier. |
| `name` | `String` | No | No | No | None | User's full legal name. |
| `email` | `String` | No | No | No | None | Unique login email address. |
| `password` | `String` | No | No | No | None | Salted bcrypt password hash (cost factor 10). |
| `role` | `Role` (Enum) | No | No | No | `PATIENT` | Role: `ADMIN`, `DOCTOR`, `PATIENT`, `RECEPTIONIST`. |
| `phone` | `String` | No | No | Yes | `null` | Contact telephone number. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Account creation timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Timestamp of last profile update. |

---

### 6.2 Model 2: `Doctor` (`doctors`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Unique doctor profile identifier. |
| `userId` | `String` (UUID) | No | Yes (`users.id`) | No | None | 1-to-1 link to user authentication account. |
| `specialization` | `String` | No | No | No | None | Clinical specialty (e.g., Cardiologist, Neurologist). |
| `department` | `String` | No | No | No | None | Hospital department (e.g., Cardiology, Neurology). |
| `experience` | `Int` | No | No | No | None | Total years of professional medical experience. |
| `qualification` | `String` | No | No | No | None | Medical degrees and certifications (MBBS, MD, DM, etc.). |
| `consultationFee` | `Float` | No | No | No | None | Outpatient consultation fee in INR (₹). |
| `consultationDuration` | `Int` | No | No | No | `30` | Standard consultation length in minutes. |
| `currentPresence` | `PresenceStatus` | No | No | No | `OFFLINE` | Live clinic status (`PRESENT`, `BUSY`, `AWAY`, `OFFLINE`). |
| `roomNumber` | `String` | No | No | Yes | `null` | Hospital consultation room/chamber designation. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Doctor profile creation timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Last profile modification timestamp. |

---

### 6.3 Model 3: `Patient` (`patients`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Unique patient profile identifier. |
| `userId` | `String` (UUID) | No | Yes (`users.id`) | No | None | 1-to-1 link to user authentication record. |
| `dateOfBirth` | `DateTime` | No | No | Yes | `null` | Patient date of birth. |
| `gender` | `Gender` (Enum) | No | No | Yes | `null` | Biological gender (`MALE`, `FEMALE`, `OTHER`). |
| `bloodGroup` | `String` | No | No | Yes | `null` | Blood type (e.g., `A+`, `B+`, `O+`, `AB-`). |
| `address` | `String` | No | No | Yes | `null` | Residential address. |
| `emergencyContact` | `String` | No | No | Yes | `null` | Emergency contact telephone number. |
| `medicalHistory` | `String` | No | No | Yes | `null` | Relevant medical background summary notes. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Patient profile creation timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Last record update timestamp. |

---

### 6.4 Model 4: `DoctorAvailability` (`doctor_availabilities`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Schedule entry identifier. |
| `doctorId` | `String` (UUID) | No | Yes (`doctors.id`) | No | None | Reference to attending doctor. |
| `dayOfWeek` | `DayOfWeek` (Enum) | No | No | No | None | Day: `MONDAY` through `SUNDAY`. |
| `startTime` | `String` | No | No | No | None | Shift start time in 24-hr format (e.g., `"09:00"`). |
| `endTime` | `String` | No | No | No | None | Shift end time in 24-hr format (e.g., `"17:00"`). |
| `isAvailable` | `Boolean` | No | No | No | `true` | Active flag for scheduling eligibility. |
| `presenceStatus` | `PresenceStatus` | No | No | No | `AVAILABLE` | Scheduled presence status on this day. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Schedule creation timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Schedule update timestamp. |

---

### 6.5 Model 5: `PresenceLog` (`presence_logs`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Presence audit entry identifier. |
| `doctorId` | `String` (UUID) | No | Yes (`doctors.id`) | No | None | Reference to doctor whose status changed. |
| `status` | `PresenceStatus` | No | No | No | None | Updated status (`PRESENT`, `BUSY`, `AWAY`, `OFFLINE`). |
| `detectionMethod` | `DetectionMethod` | No | No | No | `MANUAL` | Method: `MANUAL`, `RFID`, `QR_SCAN`, `FACE_RECOGNITION`. |
| `notes` | `String` | No | No | Yes | `null` | Optional audit explanation or administrative remark. |
| `timestamp` | `DateTime` | No | No | No | `now()` | Moment of presence transition. |

---

### 6.6 Model 6: `AppointmentSlot` (`appointment_slots`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Unique slot interval identifier. |
| `doctorId` | `String` (UUID) | No | Yes (`doctors.id`) | No | None | Doctor conducting this consultation slot. |
| `slotDate` | `DateTime` | No | No | No | None | Date of consultation (normalized to midnight UTC). |
| `startTime` | `String` | No | No | No | None | Slot start time (e.g., `"10:00"`). |
| `endTime` | `String` | No | No | No | None | Slot end time (e.g., `"10:30"`). |
| `status` | `SlotStatus` (Enum) | No | No | No | `AVAILABLE` | Status: `AVAILABLE`, `BOOKED`, `CANCELLED`, `BLOCKED`. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Slot record creation timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Last slot state modification timestamp. |

---

### 6.7 Model 7: `Appointment` (`appointments`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Unique appointment identifier. |
| `appointmentNumber` | `String` | No | No | No | Unique | Human-readable code (e.g., `APT-20261031-001`). |
| `patientId` | `String` (UUID) | No | Yes (`patients.id`) | No | None | Patient attending the appointment. |
| `doctorId` | `String` (UUID) | No | Yes (`doctors.id`) | No | None | Consulting doctor. |
| `slotId` | `String` (UUID) | No | Yes (`appointment_slots.id`) | No | Unique | 1-to-1 reserved discrete appointment slot. |
| `appointmentDate` | `DateTime` | No | No | No | None | Date of scheduled consultation. |
| `priority` | `PriorityLevel` | No | No | No | `MEDIUM` | Priority: `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`. |
| `status` | `AppointmentStatus` | No | No | No | `SCHEDULED` | Status: `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`. |
| `reason` | `String` | No | No | Yes | `null` | Primary clinical reason for booking. |
| `notes` | `String` | No | No | Yes | `null` | Clinical or administrative notes. |
| `checkInToken` | `String` | No | No | Yes | Unique | Cryptographic token encoded in digital QR pass. |
| `checkedInAt` | `DateTime` | No | No | Yes | `null` | Timestamp when patient scanned QR at reception. |
| `consultationStartedAt` | `DateTime` | No | No | Yes | `null` | Timestamp when doctor started examination. |
| `consultationCompletedAt` | `DateTime` | No | No | Yes | `null` | Timestamp when doctor finished consultation. |
| `actualDurationMinutes` | `Int` | No | No | Yes | `null` | Computed duration: `completedAt - startedAt`. |
| `reminderSentAt` | `DateTime` | No | No | Yes | `null` | Timestamp when automated email reminder was dispatched. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Initial booking timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Last status update timestamp. |

---

### 6.8 Model 8: `Waitlist` (`waitlists`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Waitlist entry identifier. |
| `patientId` | `String` (UUID) | No | Yes (`patients.id`) | No | None | Waiting patient. |
| `doctorId` | `String` (UUID) | No | Yes (`doctors.id`) | No | None | Target consulting doctor. |
| `preferredDate` | `DateTime` | No | No | No | None | Requested consultation date. |
| `priority` | `PriorityLevel` | No | No | No | `MEDIUM` | Baseline medical priority (`LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`). |
| `urgency` | `PriorityLevel` | No | No | No | `MEDIUM` | Clinical temporal urgency (`LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`). |
| `priorityScore` | `Int` | No | No | No | `0` | Calculated triage score: $Score = Medical + Urgency + Wait$. |
| `status` | `WaitlistStatus` | No | No | No | `PENDING` | Status: `PENDING`, `NOTIFIED`, `ALLOCATED`, `EXPIRED`, `CANCELLED`. |
| `notes` | `String` | No | No | Yes | `null` | Patient symptom or scheduling notes. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Registration timestamp in waitlist. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Last score recalculation or state update. |

---

### 6.9 Model 9: `PredictionLog` (`prediction_logs`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Prediction log identifier. |
| `predictionType` | `String` | No | No | No | None | Type: `"AVAILABILITY"`, `"DEMAND"`, `"WAITING_TIME"`, `"SLOT_RECOMMENDATION"`. |
| `doctorId` | `String` (UUID) | No | Yes (`doctors.id`) | Yes | `null` | Doctor evaluated by inference model. |
| `department` | `String` | No | No | Yes | `null` | Hospital department evaluated. |
| `targetDate` | `DateTime` | No | No | Yes | `null` | Future date for which prediction was computed. |
| `forecastPeriod` | `String` | No | No | Yes | `null` | Horizon e.g. `"NEXT_7_DAYS"`, `"DAY_SPECIFIC"`. |
| `predictionResult` | `Json` | No | No | No | None | Structured inference payload and model output. |
| `confidenceScore` | `Float` | No | No | Yes | `null` | Statistical confidence metric ($0.0 \dots 1.0$). |
| `algorithmVersion` | `String` | No | No | No | `"v1.0-statistical-baseline"` | Model version identifier. |
| `isCached` | `Boolean` | No | No | No | `false` | Cache hit indicator flag. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Inference request timestamp. |

---

### 6.10 Model 10: `HospitalQRCode` (`hospital_qr_codes`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Unique QR code entity identifier. |
| `code` | `String` | No | No | No | Unique | Cryptographic code string identifier. |
| `signedToken` | `String` | No | No | No | None | Cryptographically signed HMAC/JWT token. |
| `location` | `String` | No | No | No | None | Hospital wing or chamber (e.g., `"Ground Floor OPD Wing B"`). |
| `validityMinutes` | `Int` | No | No | No | `60` | Token expiration lifetime in minutes. |
| `expiresAt` | `DateTime` | No | No | No | None | Timestamp when this QR token expires. |
| `isActive` | `Boolean` | No | No | No | `true` | Administrative activation toggle. |
| `revokedAt` | `DateTime` | No | No | Yes | `null` | Timestamp if revoked by administrator. |
| `revokedBy` | `String` (UUID) | No | No | Yes | `null` | Admin user ID who executed revocation. |
| `createdById` | `String` (UUID) | No | No | No | None | Admin user ID who generated the code. |
| `createdAt` | `DateTime` | No | No | No | `now()` | QR code generation timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Last update timestamp. |

---

### 6.11 Model 11: `DoctorAttendance` (`doctor_attendances`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Shift attendance record identifier. |
| `doctorId` | `String` (UUID) | No | Yes (`doctors.id`) | No | None | Doctor logging attendance. |
| `qrCodeId` | `String` (UUID) | No | Yes (`hospital_qr_codes.id`) | Yes | `null` | QR code scanned for shift check-in. |
| `location` | `String` | No | No | No | None | Physical location verified during check-in. |
| `checkInTime` | `DateTime` | No | No | No | `now()` | Shift start timestamp. |
| `checkOutTime` | `DateTime` | No | No | Yes | `null` | Shift conclusion timestamp. |
| `durationMinutes` | `Int` | No | No | Yes | `null` | Computed working minutes upon check-out. |
| `status` | `AttendanceStatus` | No | No | No | `CHECKED_IN` | Status: `CHECKED_IN`, `CHECKED_OUT`, `AUTO_CLOSED`. |
| `checkInMethod` | `DetectionMethod` | No | No | No | `QR_SCAN` | Method used to verify check-in. |
| `checkOutMethod` | `DetectionMethod` | No | No | Yes | `null` | Method used to verify check-out. |
| `notes` | `String` | No | No | Yes | `null` | Doctor or administrative shift remarks. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Shift creation timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Shift record update timestamp. |

---

### 6.12 Model 12: `QRScanAudit` (`qr_scan_audits`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Audit event identifier. |
| `qrCodeId` | `String` (UUID) | No | Yes (`hospital_qr_codes.id`) | Yes | `null` | QR code target involved in scan attempt. |
| `userId` | `String` (UUID) | No | No | No | None | User who executed the scan. |
| `userRole` | `Role` (Enum) | No | No | No | None | Role claim of scanning user. |
| `doctorId` | `String` (UUID) | No | No | Yes | `null` | Attending doctor involved in scan. |
| `doctorName` | `String` | No | No | Yes | `null` | Doctor's name snapshot at time of scan. |
| `location` | `String` | No | No | No | None | Physical location claimed in scan. |
| `action` | `String` | No | No | No | None | Action: `"CHECK_IN"`, `"CHECK_OUT"`, `"INVALID_SCAN"`. |
| `status` | `String` | No | No | No | None | Status: `"SUCCESS"`, `"FAILED"`, `"REPLAY_REJECTED"`, `"EXPIRED"`, `"REVOKED"`. |
| `ipAddress` | `String` | No | No | Yes | `null` | Client IP address for security audit. |
| `userAgent` | `String` | No | No | Yes | `null` | Client browser / device user-agent string. |
| `failureReason` | `String` | No | No | Yes | `null` | Reason description if scan was rejected. |
| `timestamp` | `DateTime` | No | No | No | `now()` | Audit record timestamp. |

---

### 6.13 Model 13: `TriageHistory` (`triage_histories`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Triage session identifier. |
| `patientId` | `String` (UUID) | No | Yes (`patients.id`) | No | None | Patient triaged by AI Health Assistant. |
| `symptoms` | `String` (Text) | No | No | No | None | Raw text description of reported symptoms. |
| `duration` | `String` | No | No | Yes | `null` | Symptom duration (e.g. `"< 24 hours"`, `"1-3 days"`). |
| `severity` | `String` | No | No | Yes | `null` | Self-reported severity (`"Mild"`, `"Moderate"`, `"Severe"`). |
| `recommendedDepartment` | `String` | No | No | No | None | Clinical specialty department suggested. |
| `specialistType` | `String` | No | No | No | None | Title of specialist (e.g. `"Cardiologist"`). |
| `urgency` | `String` | No | No | No | None | Triage rating (`"Routine"`, `"Soon"`, `"Urgent"`, `"Emergency"`). |
| `confidence` | `Float` | No | No | No | None | Algorithmic match confidence percentage ($0\dots 100\%$). |
| `guidance` | `String` (Text) | No | No | Yes | `null` | Automated clinical first-aid or prep instructions. |
| `matchedSymptoms` | `String[]` | No | No | No | `[]` | Array of recognized medical keywords. |
| `isEmergency` | `Boolean` | No | No | No | `false` | Immediate red-flag emergency alert flag. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Triage interaction timestamp. |

---

### 6.14 Model 14: `Notification` (`notifications`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Notification entity identifier. |
| `userId` | `String` (UUID) | No | Yes (`users.id`) | No | None | Recipient user. |
| `type` | `NotificationType` | No | No | No | `SYSTEM_ALERT` | Type: `APPOINTMENT_BOOKED`, `WAITLIST_ALLOCATED`, etc. |
| `title` | `String` | No | No | No | None | Brief notification headline. |
| `message` | `String` (Text) | No | No | No | None | Full notification body text. |
| `isRead` | `Boolean` | No | No | No | `false` | Acknowledgment status flag. |
| `readAt` | `DateTime` | No | No | Yes | `null` | Timestamp when user opened notification. |
| `metadata` | `Json` | No | No | Yes | `null` | Contextual links (e.g. `appointmentId`, `slotId`). |
| `createdAt` | `DateTime` | No | No | No | `now()` | Delivery timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Notification record update timestamp. |

### 6.15 Model 15: `ImmersiveExperience` (`immersive_experiences`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Unique experience identifier. |
| `title` | `String` | No | No | No | None | Title of AR/VR module. |
| `description` | `String` (Text) | No | No | No | None | Comprehensive educational overview. |
| `type` | `ImmersiveType` | No | No | No | `ANATOMY` | Type: `ANATOMY`, `ORGAN`, `HOSPITAL`, `TRAINING`. |
| `category` | `String` | No | No | No | None | System classification category. |
| `thumbnail` | `String` | No | No | Yes | `null` | Preview thumbnail image URL. |
| `isActive` | `Boolean` | No | No | No | `true` | Publication status flag. |
| `metadata` | `Json` | No | No | Yes | `null` | Scene config, anatomical markers, presets. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Entity creation timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Record modification timestamp. |

### 6.16 Model 16: `ImmersiveModel` (`immersive_models`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | 3D model asset identifier. |
| `title` | `String` | No | No | No | None | Name of the anatomical or equipment asset. |
| `description` | `String` (Text) | No | No | No | None | Detailed anatomical or clinical description. |
| `modelUrl` | `String` | No | No | No | None | Relative or absolute path to GLB file. |
| `previewUrl` | `String` | No | No | Yes | `null` | Poster preview image URL. |
| `category` | `String` | No | No | No | None | `ANATOMY`, `ORGAN`, `HOSPITAL`, `EQUIPMENT`. |
| `format` | `String` | No | No | No | `'GLB'` | Asset format: `GLB`, `GLTF`, `USDZ`, `PROCEDURAL`. |
| `fileSizeMb` | `Float` | No | No | Yes | `null` | Binary asset size in megabytes. |
| `isActive` | `Boolean` | No | No | No | `true` | Active status flag. |
| `metadata` | `Json` | No | No | Yes | `null` | Hotspots, physiological parameters. |
| `createdAt` | `DateTime` | No | No | No | `now()` | Asset registration timestamp. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Asset update timestamp. |

### 6.17 Model 17: `ImmersiveSession` (`immersive_sessions`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Telemetry session unique identifier. |
| `userId` | `String` (UUID) | No | Yes (`users.id`) | No | None | Participating user. |
| `experienceId` | `String` (UUID) | No | Yes (`immersive_experiences.id`) | No | None | Associated experience. |
| `mode` | `ImmersiveMode` | No | No | No | `THREE_D` | `AR`, `VR`, or `THREE_D`. |
| `status` | `SessionStatus` | No | No | No | `IN_PROGRESS` | `IN_PROGRESS`, `COMPLETED`, `ABANDONED`. |
| `deviceType` | `String` | No | No | Yes | `null` | `DESKTOP`, `MOBILE_AR`, `VR_HEADSET`. |
| `startedAt` | `DateTime` | No | No | No | `now()` | Session initiation timestamp. |
| `completedAt` | `DateTime` | No | No | Yes | `null` | Session conclusion timestamp. |
| `duration` | `Int` | No | No | Yes | `null` | Elapsed interaction duration in seconds. |
| `metadata` | `Json` | No | No | Yes | `null` | Interaction telemetry. |

### 6.18 Model 18: `ImmersiveProgress` (`immersive_progress`)

| Field | Data Type | Primary Key | Foreign Key | Nullable | Default | Description |
|---|---|:---:|:---:|:---:|---|---|
| `id` | `String` (UUID) | Yes | No | No | `uuid()` | Progress record identifier. |
| `userId` | `String` (UUID) | No | Yes (`users.id`) | No | None | Enrolled user ID. |
| `experienceId` | `String` (UUID) | No | Yes (`immersive_experiences.id`) | No | None | Experience ID. |
| `completionPercentage` | `Int` | No | No | No | `0` | Completion percentage (0 to 100). |
| `completed` | `Boolean` | No | No | No | `false` | Full completion milestone flag. |
| `score` | `Int` | No | No | Yes | `null` | Clinical assessment score if applicable. |
| `lastStep` | `String` | No | No | Yes | `null` | Most recently completed step label. |
| `updatedAt` | `DateTime` | No | No | No | Auto | Last progress update timestamp. |

---

## 7. Primary Keys and Foreign Keys Summary

Every table in MediFlow AI uses standard version 4 Universally Unique Identifiers (`UUID`) generated natively by PostgreSQL (`gen_random_uuid()` / `@default(uuid())`). This ensures cryptographic unguessability and prevents enumeration attacks.

| Model | Primary Key | Foreign Keys & Target Tables | Cascade Behavior |
|---|---|---|---|
| `User` | `id` | None | N/A |
| `Doctor` | `id` | `userId` $\rightarrow$ `users.id` | `onDelete: Cascade` |
| `Patient` | `id` | `userId` $\rightarrow$ `users.id` | `onDelete: Cascade` |
| `DoctorAvailability` | `id` | `doctorId` $\rightarrow$ `doctors.id` | `onDelete: Cascade` |
| `PresenceLog` | `id` | `doctorId` $\rightarrow$ `doctors.id` | `onDelete: Cascade` |
| `AppointmentSlot` | `id` | `doctorId` $\rightarrow$ `doctors.id` | `onDelete: Cascade` |
| `Appointment` | `id` | `patientId` $\rightarrow$ `patients.id`<br>`doctorId` $\rightarrow$ `doctors.id`<br>`slotId` $\rightarrow$ `appointment_slots.id` | `onDelete: Cascade`<br>`onDelete: Cascade`<br>`onDelete: Cascade` |
| `Waitlist` | `id` | `patientId` $\rightarrow$ `patients.id`<br>`doctorId` $\rightarrow$ `doctors.id` | `onDelete: Cascade`<br>`onDelete: Cascade` |
| `PredictionLog` | `id` | `doctorId` $\rightarrow$ `doctors.id` | `onDelete: SetNull` |
| `HospitalQRCode` | `id` | None (stores administrative `createdById`) | N/A |
| `DoctorAttendance` | `id` | `doctorId` $\rightarrow$ `doctors.id`<br>`qrCodeId` $\rightarrow$ `hospital_qr_codes.id` | `onDelete: Cascade`<br>`onDelete: SetNull` |
| `QRScanAudit` | `id` | `qrCodeId` $\rightarrow$ `hospital_qr_codes.id` | `onDelete: SetNull` |
| `TriageHistory` | `id` | `patientId` $\rightarrow$ `patients.id` | `onDelete: Cascade` |
| `Notification` | `id` | `userId` $\rightarrow$ `users.id` | `onDelete: Cascade` |

---

## 8. Relationships & Cardinality

1. **User Profile Specialization (1:1):**
   * A `User` optionally possesses exactly one `Doctor` profile (`User.doctorProfile`).
   * A `User` optionally possesses exactly one `Patient` profile (`User.patientProfile`).
2. **Doctor Clinical Resources (1:N):**
   * One `Doctor` configures multiple weekly `DoctorAvailability` schedule rows.
   * One `Doctor` logs multiple chronological `PresenceLog` audit entries.
   * One `Doctor` owns multiple discrete `AppointmentSlot` records.
   * One `Doctor` attends multiple `Appointment` clinical consultations.
   * One `Doctor` maintains a queue of multiple `Waitlist` entries.
   * One `Doctor` logs multiple shift `DoctorAttendance` records.
3. **Patient Outpatient Records (1:N):**
   * One `Patient` books multiple `Appointment` visits over time.
   * One `Patient` registers in multiple `Waitlist` queues for different dates.
   * One `Patient` generates multiple `TriageHistory` symptom evaluations.
4. **Slot to Appointment Reservation (1:1):**
   * An `AppointmentSlot` links strictly to at most one `Appointment` (`slotId @unique`). When an appointment is cancelled, the foreign key link is severed, restoring `slot.status` to `AVAILABLE`.
5. **QR Code Attendance Governance (1:N):**
   * A `HospitalQRCode` can authenticate multiple `DoctorAttendance` shifts over its validity lifetime.
   * A `HospitalQRCode` captures multiple `QRScanAudit` security verification logs.

---

## 9. Enums Specification

All 10 enumerated types are declared as first-class native PostgreSQL ENUM types:

| Enum Name | Defined Values | Application Domain |
|---|---|---|
| `Role` | `ADMIN`, `DOCTOR`, `PATIENT`, `RECEPTIONIST` | System authentication and RBAC authorization middleware. |
| `Gender` | `MALE`, `FEMALE`, `OTHER` | Patient clinical demographic profile. |
| `DayOfWeek` | `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY` | Doctor weekly active schedule configuration. |
| `PresenceStatus` | `PRESENT`, `AWAY`, `BUSY`, `OFFLINE`, `AVAILABLE`, `IN_CONSULTATION`, `ON_BREAK`, `ON_LEAVE` | Real-time doctor availability indicator. |
| `DetectionMethod` | `MANUAL`, `RFID`, `FACE_RECOGNITION`, `MOBILE_PROXIMITY`, `QR_SCAN` | Verification mechanism for doctor attendance. |
| `AttendanceStatus` | `CHECKED_IN`, `CHECKED_OUT`, `AUTO_CLOSED` | Doctor daily clinical shift status. |
| `SlotStatus` | `AVAILABLE`, `BOOKED`, `CANCELLED`, `BLOCKED` | Discrete appointment slot reservation state. |
| `PriorityLevel` | `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY` | Medical severity and triage prioritization level. |
| `AppointmentStatus` | `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` | Outpatient consultation lifecycle state. |
| `WaitlistStatus` | `PENDING`, `NOTIFIED`, `ALLOCATED`, `EXPIRED`, `CANCELLED` | Dynamic queue allocation state. |
| `NotificationType` | `APPOINTMENT_BOOKED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_RESCHEDULED`, `DOCTOR_CHECK_IN`, `DOCTOR_CHECK_OUT`, `WAITLIST_ALLOCATED`, `SYSTEM_ALERT` | Real-time notification category dispatch. |

---

## 10. Indexes and Constraints

### 10.1 Unique Constraints

* `users(email)`: Enforces unique email accounts across the entire platform.
* `doctors(userId)`: Enforces 1-to-1 mapping between a user and their doctor profile.
* `patients(userId)`: Enforces 1-to-1 mapping between a user and their patient record.
* `appointments(appointmentNumber)`: Guarantees unique human-readable tracking identifiers.
* `appointments(slotId)`: **Crucial Concurrency Invariant:** Prevents multiple appointments from ever referencing the same discrete slot.
* `appointments(checkInToken)`: Prevents collision of cryptographic QR tokens.
* `hospital_qr_codes(code)`: Guarantees uniqueness of dynamic hospital attendance QR codes.

### 10.2 Database Performance Indexes

Composite B-tree indexes are strategically provisioned to accelerate high-frequency queries:

```prisma
// PredictionLog query optimization
@@index([predictionType, doctorId])
@@index([predictionType, department])
@@index([createdAt])

// Hospital QR code validation
@@index([code])
@@index([isActive, expiresAt])

// Doctor attendance lookups
@@index([doctorId, checkInTime])
@@index([status])

// Security audit lookups
@@index([qrCodeId])
@@index([doctorId])
@@index([timestamp])

// AI symptom triage histories
@@index([patientId, createdAt])

// User notifications feed
@@index([userId, isRead])
@@index([userId, createdAt])
```

---

## 11. Appointment Booking Workflow

The diagram below illustrates the exact database transactional sequence executed when a patient books a slot:

```
[Patient UI] ──> Select Doctor, Date, and 30-min Slot (e.g., 10:00 - 10:30)
                     │
                     ▼
         POST /api/appointments/book
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│               PRISMA ATOMIC TRANSACTION ($transaction)                 │
│                                                                        │
│ 1. SELECT * FROM appointment_slots WHERE id = :slotId FOR UPDATE;     │
│    • Check if slot.status === 'AVAILABLE'                              │
│    • Throw 409 Conflict if already BOOKED                              │
│                                                                        │
│ 2. UPDATE appointment_slots                                            │
│    SET status = 'BOOKED', updatedAt = now()                            │
│    WHERE id = :slotId;                                                 │
│                                                                        │
│ 3. INSERT INTO appointments (                                          │
│      id, appointmentNumber, patientId, doctorId, slotId,               │
│      appointmentDate, priority, status, checkInToken                   │
│    ) VALUES (                                                          │
│      gen_random_uuid(), 'APT-20261123-042', :patientId, :doctorId,     │
│      :slotId, :date, :priority, 'SCHEDULED', :cryptoQrToken            │
│    );                                                                  │
│                                                                        │
│ 4. INSERT INTO notifications (userId, type, title, message)           │
│    VALUES (:userId, 'APPOINTMENT_BOOKED', 'Confirmed', 'Slot booked'); │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         Commit / Rollback
                                    │
                                    ▼
       Return HTTP 201 Created + Appointment Details with QR Token
```

### Cancellation & Slot Reversion
When an appointment is cancelled:
1. `appointments.status` is updated to `'CANCELLED'`.
2. `appointment_slots.status` is reverted to `'AVAILABLE'`.
3. The Smart Allocation Service immediately queries `waitlists` for the highest-scoring candidate for that doctor/date and assigns the vacated slot.

---

## 12. Doctor Attendance and QR Check-in/Check-out

```
[Hospital Admin] Generates 60-min Dynamic Hospital QR Code
     │
     ▼
INSERT INTO hospital_qr_codes (code, signedToken, location, expiresAt, isActive)
VALUES ('HOSP-OR-101', 'eyJhbGciOi...', 'Room 101-B', now() + INTERVAL '60 min', true);
     │
     ▼
[Doctor] Scans QR Code at Clinical Desk via /doctor/attendance
     │
     ▼
POST /api/presence/attendance/scan-qr
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      VERIFICATION PIPELINE                             │
│ 1. Validate JWT cryptographic signature against server secret          │
│ 2. Check: isActive === true AND expiresAt > now()                      │
│ 3. Audit attempt in `qr_scan_audits` (status: 'SUCCESS' or 'FAILED')   │
│ 4. INSERT INTO doctor_attendances (doctorId, qrCodeId, checkInTime)    │
│ 5. UPDATE doctors SET currentPresence = 'PRESENT' WHERE id = :docId    │
│ 6. INSERT INTO presence_logs (doctorId, status, detectionMethod)       │
│    VALUES (:docId, 'PRESENT', 'QR_SCAN');                              │
│ 7. Emit Socket.IO 'doctor_presence_updated' { doctorId, status }       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Doctor Availability Management

Doctor availability operates on a dual-tier model:
1. **Recurring Weekly Schedule Matrix (`doctor_availabilities`):**  
   Defines standard active consultation days (e.g. Dr. Rajesh Sharma on `MONDAY`, `WEDNESDAY`, `FRIDAY` from `09:00` to `17:00`). The slot generator utility parses this matrix to generate discrete 30-minute intervals.
2. **Real-Time Live Presence (`currentPresence` in `doctors`):**  
   Overrides the scheduled availability when a clinician is physically detained in emergency surgery or away from clinic:
   - `● PRESENT` (Emerald): Doctor is in chamber and consulting.
   - `● BUSY` (Amber): Doctor is in an active consultation.
   - `● AWAY` (Purple): Doctor has stepped away for clinical rounds.
   - `● OFFLINE` (Slate): Doctor has not checked in for the current shift.

Every status change automatically creates an immutable audit row in `presence_logs`.

---

## 14. Patient Management

Patient medical profiles are securely decoupled from core login authentication:
* Login credentials and passwords reside in `users`.
* Clinical details (blood group, date of birth, emergency contacts, medical summary) reside in `patients`.
* When a patient deletes their account, foreign key cascade constraints (`onDelete: Cascade`) guarantee that all associated appointments, waitlist requests, and triage history entries are cleanly purged without leaving orphaned data.

---

## 15. Notification Management

The `notifications` model powers the in-app notification bell component:
* **Event Triggers:** Automatically generated by backend services upon slot booking, appointment cancellation, waitlist allocation, and doctor check-in.
* **Persistent Read State:** Unread items have `isRead: false`. Clicking "Mark all as read" executes `UPDATE notifications SET isRead = true, readAt = now() WHERE userId = :id`.
* **Index Optimization:** Accelerated by composite index `@@index([userId, isRead])`.

---

## 16. Migration History

The schema evolution is tracked in [`database/migrations/`](./migrations/):

| Migration Directory | Applied At | Key DDL Changes |
|---|---|---|
| `20261031180337_init` | 2026-10-31 | Initial baseline: `users`, `doctors`, `patients`, `doctor_availabilities`, `presence_logs`, `appointment_slots`, `appointments`, `waitlists`. |
| `20261031185602_add_doctor_presence_and_duration` | 2026-10-31 | Added `consultationDuration` and `currentPresence` enum fields to `doctors`. |
| `20261101071958_add_waitlist_urgency` | 2026-11-01 | Added `urgency` column and formula-based `priorityScore` to `waitlists`. |
| `20261103035351_add_prediction_logs` | 2026-11-03 | Created `prediction_logs` table with composite indexes for ML forecasting. |
| `20261103210000_add_prospective_consultation_timestamps` | 2026-11-03 | Added `HospitalQRCode`, `DoctorAttendance`, `QRScanAudit`, `TriageHistory`, and `Notification` models, plus prospective timestamps (`consultationStartedAt`, `consultationCompletedAt`, `actualDurationMinutes`). |

---

## 17. Database Setup Instructions

### Option A: Serverless Neon Cloud Setup (Recommended)
1. Provision a free PostgreSQL database on [Neon Console](https://console.neon.tech).
2. Copy the pooled connection string into `DATABASE_URL` and direct connection string into `DATABASE_URL_UNPOOLED` in `backend/.env`.
3. Apply migrations:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
4. Seed the database with Apollo-grade specialists and realistic demo data:
   ```bash
   npm run seed
   ```

### Option B: Local Docker PostgreSQL
1. Start the PostgreSQL 16 container:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d db
   ```
2. Run database migration and seeding:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

---

## 18. Environment Variables

The backend requires the following database connection strings:

```env
# Neon Connection Pooled URL (Used for fast runtime application queries via PgBouncer)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/mediflow_ai?sslmode=require&pgbouncer=true"

# Neon Direct Unpooled URL (Used for Prisma migrations and schema alterations)
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/mediflow_ai?sslmode=require"
```

> **Security Rule:** Never commit real database passwords or connection strings to source control. Use `.env.example` as a template.

---

## 19. Essential Prisma Commands

Execute from root or `backend/`:

```bash
# 1. Validate schema syntax and model integrity
npx prisma validate --schema=database/schema.prisma

# 2. Re-generate Prisma Client JavaScript SDK
npx prisma generate --schema=database/schema.prisma

# 3. Apply pending migrations in production (Zero prompt)
npx prisma migrate deploy --schema=database/schema.prisma

# 4. Open Prisma Studio (Interactive database web GUI at http://localhost:5555)
npx prisma studio --schema=database/schema.prisma

# 5. Seed database with doctors, patients, and demo slots
cd backend && npm run seed
```

---

## 20. Database Security & Best Practices

1. **SQL Injection Immunity:** All database queries are executed via Prisma ORM's parameterized query builder, completely neutralizing SQL injection vulnerabilities.
2. **Encrypted Transport:** Enforces TLS/SSL (`?sslmode=require`) across all network links between Vercel/Render servers and the Neon database cluster.
3. **Password Security:** All authentication passwords in `users` are hashed using `bcryptjs` with 10 salt rounds. Plaintext passwords are never logged or stored.
4. **Least Privilege Principles:** In multi-tenant cloud setups, database connection strings use dedicated database users restricted to the `public` schema.

---

## 21. Future Database Improvements

* **Table Partitioning:** Implement PostgreSQL declarative range partitioning on `presence_logs` and `qr_scan_audits` by month to maintain ultra-fast query performance as audit volume exceeds 1,000,000 rows.
* **Read Replicas:** Connect read-heavy doctor directory searches and hospital KPI counters to Neon read replicas to eliminate read load on the primary write node.
* **Archiving Policy:** Provision automated pg_cron jobs to archive completed appointments older than 365 days into cold object storage (S3/GCS).
