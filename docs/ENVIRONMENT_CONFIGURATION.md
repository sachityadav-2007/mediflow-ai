# MediFlow AI — Staging & Production Environment Configuration
**Document ID:** `docs/ENVIRONMENT_CONFIGURATION.md`  
**Purpose:** Exhaustive reference for all environment variables across Frontend, Backend, Database, and Real-Time subsystems.

---

## 1. Master Environment Variable Reference

### 1.1 Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Default / Staging Value | Production Description | Security Constraints |
|:---|:---:|:---|:---|:---|
| `PORT` | Yes | `5001` | Port on which the Express HTTP & Socket.IO server listens. | Integer; avoid restricted ports (80/443 handled by Nginx). |
| `NODE_ENV` | Yes | `staging` / `production` | Execution mode. Controls cookie security flags, detailed error traces, and logging. | Must be set to `production` in live environments. |
| `CLIENT_URL` | Yes | `https://mediflow-staging.vercel.app` | Comma-separated list of allowed origins for CORS and credentialed cookies. | Strict FQDN matching; never use wildcard `*` with cookies. |
| `DATABASE_URL` | Yes | `postgresql://...` | Connection URI for the PostgreSQL instance. | Must use SSL (`sslmode=require`); omit from logs and Git. |
| `JWT_SECRET` | Yes | *64-character random string* | Secret cryptographic key used to sign and verify session JWTs and QR tokens. | Minimum 32 bytes of cryptographically random entropy. |
| `JWT_EXPIRES_IN` | Yes | `7d` | Time-to-live for authenticated session tokens. | e.g. `1d`, `7d`. |
| `SMTP_HOST` | No | `smtp.sendgrid.net` | Outgoing SMTP server hostname for email dispatch. | If left empty, auto-provisions Ethereal test mailer. |
| `SMTP_PORT` | No | `587` | Port for SMTP TLS negotiation. | Typically `587` (STARTTLS) or `465` (SSL). |
| `SMTP_USER` | No | `apikey` | Username or API key identifier for SMTP server. | Never commit credentials to version control. |
| `SMTP_PASS` | No | `SG.xxxxxxxx...` | Password or secret key for SMTP server. | Must be stored in cloud secret manager or provider env vars. |
| `SMTP_FROM` | No | `"MediFlow AI <no-reply@...>` | Sender address and display name on automated emails. | Must match verified domain sender records (SPF/DKIM). |

---

### 1.2 Frontend Environment Variables (`frontend/.env`)

| Variable Name | Required | Staging Value | Production Value | Description |
|:---|:---:|:---|:---|:---|
| `VITE_API_URL` | Yes | `https://mediflow-api-staging.onrender.com` | `https://api.mediflow.yourhospital.com` | Base URL of the backend Express API and Socket.IO server. |

> **Crucial Rule:** Frontend environment variables prefixed with `VITE_` are embedded into the client-side JavaScript bundle during `npm run build`. Never place database secrets, API keys, or private certificates in `frontend/.env`.

---

## 2. Multi-Tier Security Best Practices

1. **No Localhost in Staging/Production Builds:**
   * Build bundles must be compiled with the staging/production API domain configured in `VITE_API_URL`.
2. **Dynamic CORS Matching:**
   * The backend dynamically parses comma-separated origins from `CLIENT_URL`, permitting both web dashboards and staging previews:
     ```env
     CLIENT_URL="https://mediflow-staging.vercel.app,https://mediflow-frontend.onrender.com"
     ```
3. **Cookie Security Attributes:**
   * In staging and production (`NODE_ENV !== 'development'`), cookies enforce:
     * `httpOnly: true` (Blocks access from document.cookie)
     * `secure: true` (Requires HTTPS connection)
     * `sameSite: 'none'` (Permits cross-site API cookie delivery between Vercel and Render)

