# MediFlow AI 2.0 — Production Deployment & DevOps Guide
**Document ID:** `docs/DEPLOYMENT_GUIDE.md`  
**Target Environment:** Production Linux (Ubuntu 22.04 LTS / 24.04 LTS), Cloud VPS, Docker, or Kubernetes  
**Status:** Validated & Production-Ready  

---

## 1. Prerequisites & System Architecture

MediFlow AI 2.0 consists of four production tiers:
1. **Frontend:** React 18 Single-Page Application (served via Nginx).
2. **Backend API:** Node.js Express server with Socket.IO (Port 5001, managed via PM2).
3. **ML Microservice:** Python FastAPI scientific inference server (Port 5002, managed via Gunicorn/Uvicorn).
4. **Database:** PostgreSQL 15 or 16 with SSL enabled and versioned Prisma migrations.

### Host Minimum Hardware
* **CPU:** 2 vCPUs (4 vCPUs recommended for concurrent ML inference)
* **RAM:** 4 GB RAM (8 GB recommended)
* **Disk:** 40 GB NVMe SSD
* **OS:** Ubuntu 22.04 / 24.04 LTS

---

## 2. Environment Configuration

### 2.1 Backend Environment (`backend/.env`)
```bash
PORT=5001
NODE_ENV=production
CLIENT_URL=https://mediflow.yourhospital.com
DATABASE_URL="postgresql://mediflow_user:STRONG_PASSWORD@db.internal:5432/mediflow_prod?schema=public&sslmode=prefer"
JWT_SECRET=GENERATE_64_CHAR_HEX_SECRET_KEY_HERE
JWT_EXPIRES_IN=7d
ML_SERVICE_URL=http://127.0.0.1:5002
INTERNAL_ML_TOKEN=GENERATE_HIGH_ENTROPY_SHARED_TOKEN_HERE

# Production Mail Relay (SendGrid, AWS SES, or SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_PRODUCTION_KEY
SMTP_FROM="MediFlow AI Central Hospital <no-reply@yourhospital.com>"
```

### 2.2 Python ML Service Environment (`ml-service/.env`)
```bash
PORT=5002
HOST=0.0.0.0
ENVIRONMENT=production
INTERNAL_ML_TOKEN=GENERATE_HIGH_ENTROPY_SHARED_TOKEN_HERE
MODEL_ARTIFACTS_DIR=artifacts
LOG_LEVEL=info
```

### 2.3 Frontend Environment (`frontend/.env`)
```bash
VITE_API_URL=https://api.mediflow.yourhospital.com
```

---

## 3. Database Deployment & Migration Safety

Do **NOT** run `prisma db push` or `prisma migrate reset` in production. Always apply committed, version-controlled migrations:

```bash
cd backend

# 1. Validate Prisma schema integrity
npx prisma validate

# 2. Deploy versioned migrations safely
npx prisma migrate deploy

# 3. (Optional) Generate clean Prisma Client
npx prisma generate
```

### Automated PostgreSQL Backup Script (`/etc/cron.daily/backup-mediflow-db`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mediflow"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"
pg_dump -U mediflow_user -h db.internal mediflow_prod | gzip > "$BACKUP_DIR/mediflow_$TIMESTAMP.sql.gz"
find "$BACKUP_DIR" -type f -mtime +14 -delete
```

---

## 4. Service Process Management (PM2 & Systemd)

### 4.1 Backend Node.js Service (PM2)
```bash
# Start backend in cluster mode
pm2 start backend/src/server.js --name "mediflow-api" -i max
```

### 4.2 Python FastAPI ML Microservice (PM2 or Systemd)
Using PM2 to manage Python virtual environment:
```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start via Uvicorn under PM2
pm2 start "venv/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 5002 --workers 2" --name "mediflow-ml"

# Save PM2 process list and configure auto-restart on system boot
pm2 save
pm2 startup
```

---

## 5. Frontend Production Build & Nginx Configuration

```bash
# Build optimized frontend bundle
npm --prefix frontend run build
```

Create `/etc/nginx/sites-available/mediflow.conf`:

```nginx
# 1. API Gateway & Socket.IO
server {
    listen 443 ssl http2;
    server_name api.mediflow.yourhospital.com;

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

    # WebSocket Real-Time Event Hub
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 2. Frontend React 18 SPA
server {
    listen 443 ssl http2;
    server_name mediflow.yourhospital.com;

    ssl_certificate /etc/letsencrypt/live/mediflow.yourhospital.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mediflow.yourhospital.com/privkey.pem;

    root /var/www/mediflow-ai/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # High performance static caching
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

---

## 6. Post-Deployment Verification Checklist

Execute these smoke tests immediately after deploying:

```bash
# 1. Verify Node.js Backend Health
curl -s https://api.mediflow.yourhospital.com/api/health | jq .
# Expect: {"success": true, "database": {"connected": true}}

# 2. Verify ML Service Health (via internal network)
curl -s http://127.0.0.1:5002/health | jq .
# Expect: {"status": "healthy", "models_loaded": {"waiting_time": true, ...}}

# 3. Verify Frontend Static Asset Delivery
curl -I https://mediflow.yourhospital.com
# Expect: HTTP/2 200 OK
```
