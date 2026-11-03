# MediFlow AI — Demo Data Inventory & Data Governance Plan

**Document Version:** 1.0  
**Effective Date:** November 3, 2026  
**Compliance Standard:** Healthcare Simulation Data Governance & Privacy Masking  

---

## 1. Inventory of Demo & Synthetic Records

### A. Simulated Medical Specialists (9 Seeded Doctors)

All doctors in the development database are simulated clinical profiles created for architecture demonstration and academic evaluation:

| Doctor Name | Department | Specialization | Room Number | Simulated Contact | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dr. Ketan Vartak** | Urology & Renal Sciences | Urology | Room 302 | `+91 9725885809` | Demo Specialist |
| **Dr. Rajesh Parasnis** | Spine Surgery & Orthopedics | Orthopedics | Room 204 | `+91 9773689061` | Demo Specialist |
| **Dr. Naresh Munot** | Cardiology | Cardiac Sciences | Room 108 | `+91 9867646272` | Demo Specialist |
| **Dr. Smruti Hindaria** | Cardiothoracic Surgery | Cardiac Sciences | Room 112 | `+91 9203616788` | Demo Specialist |
| **Dr. Sunil Jawale** | Nephrology & Dialysis | Nephrology | Room 310 | `+91 9194301734` | Demo Specialist |
| **Dr. Vidita Powle** | Medical Oncology | Oncology | Room 401 | `+91 9426276817` | Demo Specialist |
| **Dr. Suyog Doshi** | Neurosurgery | Neurosciences | Room 505 | `+91 9469786198` | Demo Specialist |
| **Dr. Rajesh Sharma** | Cardiology | Cardiologist | Room 101-B | `+91 98111 99999` | Demo Specialist |
| **Dr. Ananya Patel** | Neurology | Neurologist | Room 201-A | `+91 98222 33445` | Demo Specialist |

> [!NOTE]
> All portraits associated with these profiles use royalty-free Unsplash medical placeholders and are labeled in the UI as `[Demo Roster - Simulated Specialist]`.

---

### B. Seed & Synthetic Patient Records

The database contains two classes of patient records:

1. **Baseline Demo Patients (from `database/seed.js`):**
   - **Rahul Verma** (`rahul.verma@example.com`, Blood Group: `O+`)
   - **Sneha Patil** (`sneha.patil@example.com`, Blood Group: `B+`)
   - **Amit Deshmukh** (`amit.deshmukh@example.com`, Blood Group: `A+`)
   - **Pooja Kulkarni** (`pooja.kulkarni@example.com`, Blood Group: `AB+`)
   - **Vikram Joshi** (`vikram.joshi@example.com`, Blood Group: `O-`)
2. **Automated Test Patients (generated during verification suites):**
   - Prefixed with `Phase 10 Patient One/Two/Three`, `Audit Test Patient`, or emails ending in `@example.com` with timestamped domains.
   - These records hold synthetic appointment slots and waitlist records used to test concurrency, auto-allocation, and check-in.

---

### C. Simulated Helpline & Facility Information

- **Facility:** MediFlow Central Hospital, Pune (`18.5204° N, 73.8567° E`)
- **Toll-Free Helpline:** `1800-200-FLOW (3569)` (Simulated IVR endpoint)
- **Direct Emergency Desk:** `+91 (020) 2612-4000` (Simulated Emergency Desk)
- **Email Dispatcher:** Ethereal SMTP test mailer (`notifications@mediflow.com`)

---

## 2. Safe Data Retention & Cleanup Plan

### Rules of Engagement
1. **No Automatic Deletion:** Existing records are preserved to prevent breaking foreign key relations in appointment slots, waitlist entries, and attendance logs.
2. **Controlled Purge Script:** A dedicated maintenance script is available if a clean reset is explicitly authorized by the project administrator:
   ```bash
   # Run only upon explicit user instruction
   npm run db:seed
   ```
3. **Data Masking on Public Displays:**
   - In accordance with patient privacy standards, all live queue boards mask patient names (e.g. `Rahul Verma` -> `R. Verma` or `PT-***01`).
   - Test patient medical histories remain strictly synthetic (`null` or mock text) and are never displayed in public or unauthenticated routes.

