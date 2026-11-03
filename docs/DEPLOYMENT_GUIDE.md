# MediFlow AI — Production Deployment Guide
**Document ID:** `docs/DEPLOYMENT_GUIDE.md`  
**Target Environment:** Production Linux (Ubuntu 22.04 LTS / 24.04 LTS), Docker, or Cloud VPS (AWS EC2, DigitalOcean, Railway)

---

## 1. System Requirements & Prerequisites
* **Runtime:** Node.js v20.x or v22.x LTS, npm v10+
* **Database:** PostgreSQL 15 or 16 with SSL enabled
* **Process Manager:** PM2 or Docker Compose
* **Web Server:** Nginx 1.22+ (acting as Reverse Proxy & SSL termination)
* **SSL Certificate:** Let's Encrypt Certbot or Cloudflare Origin CA

---

## 2. Environment Variables Configuration

Set up production `.env` files based on `.env.example`:

### Backend Configuration (`backend/.env`)
```bash
PORT=5001
NODE_ENV=production
CLIENT_URL=https://mediflow.yourhospital.com
DATABASE_URL="postgresql://mediflow_user:STRONG_PASSWORD@db-host.internal:5432/mediflow_prod?schema=public&sslmode=prefer"
JWT_SECRET=GENERATE_RANDOM_64_CHAR_HEX_STRING_HERE
JWT_EXPIRES_IN=7d

# SMTP Configuration (SendGrid, AWS SES, or Hospital Mail Relay)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
SMTP_FROM="MediFlow AI Central Hospital <no-reply@yourhospital.com>"
```

### Frontend Configuration (`frontend/.env`)
```bash
VITE_API_URL=https://api.mediflow.yourhospital.com
```

---

## 3. Database Deployment & Migration Steps

Never run `prisma db push` or `prisma migrate reset` in production environments. Always apply committed SQL migrations safely:

```bash
cd backend

# Validate schema
npx prisma validate

# Deploy committed migrations safely without data loss
npx prisma migrate deploy

# (Optional) Seed standard admin and department records on a fresh DB
npm run seed
```

---

## 4. Building the Production Assets

```bash
# In the root repository directory:
npm run build
```
This builds the optimized frontend bundle into `frontend/dist/`.

---

## 5. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/mediflow.conf`:

```nginx
# API & Socket.IO Gateway
server {
    server_name api.mediflow.yourhospital.com;

    # SSL Configuration (Certbot managed)
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/mediflow.yourhospital.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mediflow.yourhospital.com/privkey.pem;

    # Backend Express REST API
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Real-Time WebSocket Upgrades (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend Single-Page Application (SPA)
server {
    server_name mediflow.yourhospital.com;

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/mediflow.yourhospital.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mediflow.yourhospital.com/privkey.pem;

    root /var/www/mediflow-ai/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

---

## 6. PM2 Process Management

Start backend processes using PM2:

```bash
pm2 start backend/src/server.js --name "mediflow-api" -i max
pm2 save
pm2 startup
```

---

## 7. Health Check Verification
After deployment, verify that endpoints return `200 OK`:
```bash
curl -I https://api.mediflow.yourhospital.com/api/health
```
Expected response:
```http
HTTP/2 200
content-type: application/json; charset=utf-8
```

