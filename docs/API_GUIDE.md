# MediFlow AI 2.0 — Comprehensive API Specification
**Document ID:** `docs/API_GUIDE.md`  
**Base URL:** `http://localhost:5001/api` (Development) / `https://api.mediflow.yourhospital.com/api` (Production)  
**Authentication:** Signed HTTP-only cookie (`mediflow_token`) or Bearer Header (`Authorization: Bearer <JWT>`)  

---

## 1. Authentication & Session Endpoints

### 1.1 Register User
* **POST** `/auth/register`
* **Access:** Public
* **Payload:**
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "phone": "+919876543210",
    "role": "PATIENT"
  }
  ```
* **Response (201 Created):** Sets HTTP-only authentication cookie and returns user profile.

### 1.2 Sign In
* **POST** `/auth/login`
* **Access:** Public
* **Payload:**
  ```json
  {
    "email": "dr.sharma@mediflow.com",
    "password": "password123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "81adfc93-...",
      "name": "Dr. Rajesh Sharma",
      "email": "dr.sharma@mediflow.com",
      "role": "DOCTOR"
    }
  }
  ```

### 1.3 Active Session Profile
* **GET** `/auth/me`
* **Access:** Authenticated (All Roles)

### 1.4 Sign Out
* **POST** `/auth/logout`
* **Access:** Authenticated
* **Behavior:** Clears session cookie and invalidates client session state.

---

## 2. Doctor Roster & Presence Endpoints

### 2.1 List All Doctors
* **GET** `/doctors`
* **Access:** Public
* **Query Parameters:** `specialization`, `department`, `city`, `presence`

### 2.2 Doctor Working Schedule
* **GET** `/doctors/:id/schedule`
* **Access:** Public

### 2.3 Update Doctor Presence
* **POST** `/doctors/presence`
* **Access:** DOCTOR or ADMIN
* **Payload:**
  ```json
  {
    "presenceStatus": "IN_CONSULTATION"
  }
  ```

---

## 3. Appointments & Queue Management

### 3.1 Book New Consultation Slot
* **POST** `/appointments`
* **Access:** PATIENT
* **Payload:**
  ```json
  {
    "doctorId": "81adfc93-...",
    "slotId": "slot-uuid-...",
    "date": "2026-11-12",
    "slotTime": "10:30",
    "priority": "ROUTINE",
    "notes": "Annual cardiac health review."
  }
  ```
* **Response (201 Created):** Returns confirmed appointment with token number, QR code payload, and room number.

### 3.2 Reschedule Appointment
* **PUT** `/appointments/:id/reschedule`
* **Access:** Appointment Owner (PATIENT) or ADMIN
* **Payload:**
  ```json
  {
    "newSlotId": "slot-new-uuid",
    "newDate": "2026-11-15",
    "newSlotTime": "11:00",
    "reason": "Family emergency"
  }
  ```
* **Automatic Workflow:** The vacated old slot triggers automatic smart allocation to eligible waitlist patients.

### 3.3 Cancel Appointment
* **PUT** `/appointments/:id/cancel`
* **Access:** Appointment Owner (PATIENT) or ADMIN
* **Automatic Workflow:** Marks appointment `CANCELLED`, frees slot, and triggers immediate waitlist promotion.

### 3.4 Patient QR Check-In
* **POST** `/appointments/check-in`
* **Access:** ADMIN or DOCTOR (Reception Kiosk)
* **Payload:**
  ```json
  {
    "appointmentNumber": "APT-20261104-9842"
  }
  ```
* **Response (200 OK):** Assigns sequential OPD queue position and stamps `checkedInAt`.

### 3.5 Lifecycle: Start Consultation
* **POST** `/appointments/:id/start`
* **Access:** DOCTOR
* **Behavior:** Transitions status to `IN_PROGRESS`, sets doctor presence to `IN_CONSULTATION`, and stamps `consultationStartedAt`.

### 3.6 Lifecycle: Complete Consultation
* **POST** `/appointments/:id/complete`
* **Access:** DOCTOR
* **Behavior:** Transitions status to `COMPLETED`, stamps `consultationCompletedAt`, computes `actualDurationMinutes`, and sets doctor presence back to `AVAILABLE`.

---

## 4. Smart Waitlist Queue Endpoints

### 4.1 Join Waitlist
* **POST** `/waitlist`
* **Access:** PATIENT
* **Payload:**
  ```json
  {
    "doctorId": "81adfc93-...",
    "preferredDate": "2026-11-12",
    "preferredTimeSlot": "10:30",
    "priorityLevel": "URGENT",
    "notes": "Severe chest pain recurrence"
  }
  ```

### 4.2 Trigger Smart Waitlist Allocation
* **POST** `/waitlist/allocate`
* **Access:** ADMIN or DOCTOR
* **Payload:** `{"doctorId": "..."}`
* **Algorithm:** Evaluates clinical urgency score ($E > U > R$) and waiting duration to assign freed slots.

---

## 5. Doctor Shift Attendance & Hospital QR

### 5.1 Doctor QR Check-In
* **POST** `/attendance/check-in`
* **Access:** DOCTOR
* **Payload:**
  ```json
  {
    "qrToken": "MEDIFLOW-QR-OPD-91823",
    "latitude": 18.5204,
    "longitude": 73.8567
  }
  ```

### 5.2 Doctor Shift Check-Out
* **POST** `/attendance/check-out`
* **Access:** DOCTOR
* **Behavior:** Calculates working duration and updates presence to `OFFLINE`.

### 5.3 Generate Hospital QR Code
* **POST** `/attendance/admin/generate-qr`
* **Access:** ADMIN
* **Payload:** `{"location": "Main OPD Desk", "validityMinutes": 60}`

---

## 6. Machine Learning & Clinical Intelligence

### 6.1 Predicted Waiting Time
* **GET** `/ai/waiting-time?doctorId=...&date=2026-11-12&startTime=10:30`
* **Access:** Authenticated
* **Output:** Estimated waiting minutes, queue position, confidence interval.

### 6.2 Predicted Doctor Availability & Delay
* **GET** `/ai/doctor-availability?doctorId=...&date=2026-11-12&startTime=10:30`
* **Access:** Authenticated
* **Output:** Availability probability float (`0.0` - `1.0`), delay likelihood, and advisory note.

### 6.3 Predicted Consultation Duration
* **GET** `/ai/appointment-duration?doctorId=...&department=Cardiology&priorityLevel=HIGH`
* **Access:** Authenticated
* **Output:** Estimated duration in minutes.

### 6.4 AI Smart Slot Scoring
* **GET** `/ai/recommend-slots?doctorId=...&date=2026-11-12`
* **Access:** Authenticated
* **Output:** Ranked list of recommended slots with 4-part score breakdown (delay, load, history, convenience).

### 6.5 Master ML Model Registry Status
* **GET** `/ai/admin/evaluation`
* **Access:** ADMIN only
* **Output:** Champion models, statistical baselines, dev test metrics, dataset provenance.

