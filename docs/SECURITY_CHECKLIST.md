# MediFlow AI — Production Security Checklist
**Document ID:** `docs/SECURITY_CHECKLIST.md`  
**Standard:** OWASP Top 10 Compliance for Outpatient & Clinical Healthcare Applications

---

## 1. Authentication & Session Management
- [x] **Stateless JWT Tokens:** Authentication tokens are cryptographically signed using HMAC-SHA256 (`JWT_SECRET`).
- [x] **HTTP-Only Cookies:** Tokens are transmitted exclusively through HTTP-only cookies (`httpOnly: true`) to mitigate JavaScript token theft (XSS).
- [x] **Production Cookie Encryption:** In production (`NODE_ENV=production`), cookies enforce `secure: true` (HTTPS only) and `sameSite: 'none'` (or `'lax'`).
- [x] **Password Hashing:** Passwords are salted and hashed using `bcryptjs` with salt round factor of 10.
- [x] **Public Role Restrictions:** The `ADMIN` role cannot be self-registered via public endpoints (`/api/auth/register` explicitly forbids `ADMIN` assignment).

---

## 2. Authorization & Role-Based Access Control (RBAC)
- [x] **Granular Middleware:** All sensitive endpoints are guarded by `authenticateUser` and `authorizeRoles('ADMIN', 'DOCTOR', 'PATIENT')`.
- [x] **Server-Side Identity Binding:** In all clinician operations (presence changes, QR check-in, attendance logs), doctor identity is derived from authenticated session data (`req.user.id`), ignoring any client-supplied doctor IDs in the request body.
- [x] **Ownership Enforcement:** Appointment cancellations and rescheduling strictly verify that the caller is either the owning patient, attending doctor, or hospital administrator.

---

## 3. QR Token Security & Physical Attendance
- [x] **HMAC-SHA256 Token Signature:** Hospital check-in QR codes encode signed JWTs containing code ID, expiration timestamp, location, and claim `HOSPITAL_DOCTOR_ATTENDANCE`.
- [x] **Database State Verification:** Scanned tokens are checked against `HospitalQRCode` records to verify `isActive: true`, non-expiration, and non-revocation.
- [x] **Anti-Replay & Anti-Duplicate:** Clinicians with an active `CHECKED_IN` session cannot perform double check-ins.
- [x] **Sliding-Window Rate Limiting:** Check-in and checkout endpoints are protected by in-memory rate limiters (30 requests/minute per IP) to mitigate brute-force QR replay attacks.
- [x] **Audit Trail Persistence:** All scan events (success, invalid signature, expired, duplicate, unauthorized role) are recorded in `QRScanAudit`.
- [x] **Clinical Governance Disclaimer:** Clearly documented that QR scanning proves an authenticated check-in interaction, not continuous uninterrupted physical presence.

---

## 4. Real-Time Socket.IO & Data Privacy
- [x] **CORS Origins:** WebSockets strictly restrict connections to configured `CLIENT_URL`.
- [x] **Room-Based Isolation:** Authenticated clients join dedicated rooms (`user_${userId}`, `doctor_${doctorId}`, `dept_${department}`) to prevent public broadcast of private medical and consultation data.
- [x] **Public Board Sanitization:** Queue displays for waiting rooms mask patient personal identifiable information (PII).

---

## 5. Injection & Input Sanitization
- [x] **Parameterized SQL Queries:** PostgreSQL queries are managed exclusively through Prisma ORM, preventing SQL injection vulnerabilities.
- [x] **Input Validation:** Required fields, regex email verification, date formatting, and numerical validation applied across all controllers.
- [x] **Strict Content Type:** All incoming payloads parsed via `express.json()` with body size limits.

---

## 6. Infrastructure & Deployment Security
- [x] **No Secrets in Source:** Secret variables (`JWT_SECRET`, `DATABASE_URL`) are loaded from environment files and omitted from version control via `.gitignore`.
- [x] **HTTPS Protocol:** Production Nginx terminates TLS 1.3/1.2 using modern cipher suites.
- [x] **Reverse Proxy Headers:** `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` configured.

