# RaktSetu Production Deployment & Operations Guide

> **RaktSetu** is a production-grade emergency blood donor dispatch and escalation platform engineered to NBTC guidelines and DPDP Act 2023 specifications. This guide details how to deploy, secure, operate, and showcase RaktSetu in production.

---

## 1. System Topology & Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │                 Internet                     │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTPS (:443) / HTTP (:80)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │          Caddy Reverse Proxy                 │
                  │   (Automatic TLS / Let's Encrypt / SSE)       │
                  └──────────────┬───────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        /api/*, /health                          │ All other routes
                 ▼                               ▼
  ┌──────────────────────────────┐ ┌──────────────────────────────┐
  │      Express REST API        │ │      Nginx Static Web        │
  │   (Node 20, Non-Root User)   │ │       (React 19 SPA)         │
  └──────────────┬───────────────┘ └──────────────────────────────┘
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
  ┌──────────────────────────────┐ ┌──────────────────────────────┐
  │     MongoDB 7.0 (rs0)        │ │     Redis 7.2 (BullMQ)       │
  │  - Single-Node Replica Set   │ │  - Wave Queues               │
  │  - Multi-Doc Transactions    │ │  - Distributed SSE Pub/Sub   │
  │  - 2dsphere Geo-Indexes      │ │  - Fast Rate Limiting        │
  └──────────────▲───────────────┘ └──────────────▲───────────────┘
                 │                                │
                 └───────────────┬────────────────┘
                                 │
                  ┌──────────────┴───────────────┐
                  │   Dedicated BullMQ Worker    │
                  │ - 4-Wave Matching Escalation  │
                  │ - WhatsApp Notification Dispatch
                  │ - Expiry Sweeps & Hash Chains│
                  └──────────────────────────────┘
```

---

## 2. Option A: Single-VPS Deployment (Recommended)

Ideal for hosting on any Linux VPS (**Hetzner Cloud CX22 ($4/mo), DigitalOcean Droplet ($6/mo), AWS EC2 t4g.small, or Linode**).

### Prerequisites
- Ubuntu 22.04 LTS or Debian 12
- Docker Engine $\ge$ 24.0 & Docker Compose plugin $\ge$ 2.20
- A registered domain or subdomain (e.g., `raktsetu.yourdomain.com`) pointing its **A record** to your VPS IP address.

### Step-by-Step Deployment

#### 1. Clone the repository on your server
```bash
git clone https://github.com/your-username/RaktSetu.git /opt/raktsetu
cd /opt/raktsetu
```

#### 2. Generate cryptographically strong secrets
```bash
# Generate 64-char random hex secrets
openssl rand -hex 32 # for JWT_ACCESS_SECRET
openssl rand -hex 32 # for JWT_REFRESH_SECRET
openssl rand -hex 24 # for REDIS_PASSWORD
```

#### 3. Configure production environment
Create `/opt/raktsetu/.env`:
```bash
NODE_ENV=production
DOMAIN=raktsetu.yourdomain.com
CLIENT_ORIGIN=https://raktsetu.yourdomain.com

# Database & Cache
MONGODB_URI=mongodb://mongo:27017/raktsetu?replicaSet=rs0
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_GENERATED_REDIS_PASSWORD

# Security Tokens
JWT_ACCESS_SECRET=YOUR_GENERATED_JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=YOUR_GENERATED_JWT_REFRESH_SECRET

# Notification Provider ('mock' for testing, 'twilio' for live WhatsApp/SMS)
NOTIFICATION_PROVIDER=mock
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Live Demo Settings
DEMO_MODE=false
```

#### 4. Launch with Docker Compose
```bash
# Build and start all 6 services (Mongo, Redis, API, Worker, Client, Caddy)
docker compose -f docker-compose.prod.yml up -d --build
```

#### 5. Verify live status
```bash
docker compose -f docker-compose.prod.yml ps
curl -i https://raktsetu.yourdomain.com/health
```

#### 6. Seed initial donor database (Optional)
```bash
docker compose -f docker-compose.prod.yml exec server node dist/scripts/seedDonors.js
```

---

## 3. Option B: Cloud PaaS Deployment (Serverless / Managed)

For a zero-server-maintenance setup using managed cloud providers:

| Component | Recommended Cloud Provider | Tier | Free Tier Available? |
|---|---|---|---|
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | M0 (Shared Cluster) | Yes (512MB, 3-node replica set out of the box) |
| **Queue / Cache** | [Upstash Redis](https://upstash.com/) | Serverless Redis | Yes (10,000 commands/day free) |
| **API Server** | [Render.com](https://render.com/) or [Railway](https://railway.app/) | Web Service (Node.js) | Yes |
| **Worker Process** | [Render.com](https://render.com/) or [Railway](https://railway.app/) | Background Worker | $7/mo |
| **Frontend Client** | [Vercel](https://vercel.com/) or [Cloudflare Pages](https://pages.cloudflare.com/) | Static SPA | Yes (Unlimited bandwidth) |

### Setup Instructions for PaaS:
1. **MongoDB Atlas:** Create a free M0 cluster. In Database Access, whitelist your backend's IP (or allow `0.0.0.0/0`). Copy the SRV URI: `mongodb+srv://user:pass@cluster0.mongodb.net/raktsetu?retryWrites=true&w=majority`.
2. **Upstash Redis:** Create a Redis database with TLS enabled. Copy the host, port, and password.
3. **Render / Railway Web Service:** Set build command `cd server && npm install && npm run build`, start command `cd server && npm run start`. Set environment variables.
4. **Render / Railway Background Worker:** Set build command `cd server && npm install && npm run build`, start command `cd server && npm run start:worker`.
5. **Vercel / Cloudflare Pages:** Connect the repository, set root directory to `client`, build command `npm run build`, output directory `dist`. Add rewrite rule in `vercel.json` to proxy `/api/*` to your Render API URL.

---

## 4. Automated Daily Backup Script (For VPS)

Save this script at `/opt/raktsetu/scripts/backup.sh`:
```bash
#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="/var/backups/raktsetu"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting MongoDB backup..."
docker exec raktsetu-mongo-prod mongodump --db=raktsetu --archive="/tmp/raktsetu_${TIMESTAMP}.gz" --gzip
docker cp "raktsetu-mongo-prod:/tmp/raktsetu_${TIMESTAMP}.gz" "$BACKUP_DIR/"
docker exec raktsetu-mongo-prod rm -f "/tmp/raktsetu_${TIMESTAMP}.gz"

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "raktsetu_*.gz" -mtime +14 -delete
echo "[$(date)] Backup completed: $BACKUP_DIR/raktsetu_${TIMESTAMP}.gz"
```

Add to cron (`crontab -e`):
```cron
0 2 * * * /opt/raktsetu/scripts/backup.sh >> /var/log/raktsetu-backup.log 2>&1
```

---

## 5. Recommended VS Code Extensions for Full-Stack Developers

To navigate and contribute to this repository efficiently, install these recommended VS Code extensions:

1. **Docker (`ms-azuretools.vscode-docker`)**
   - View running containers, inspect Redis/MongoDB container logs, and manage images directly from the sidebar.
2. **REST Client (`humao.rest-client`)** or **Thunder Client (`rangav.vscode-thunder-client`)**
   - Test API endpoints and SSE streams directly inside VS Code without switching to Postman.
3. **MongoDB for VS Code (`mongodb.mongodb-vscode`)**
   - Browse geospatial indexes, run `$geoNear` aggregation queries, and view documents directly in VS Code.
4. **Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)**
   - Autocomplete and hover documentation for all custom Tailwind design tokens and utility classes.
5. **ESLint (`dbaeumer.vscode-eslint`)** & **Prettier (`esbenp.prettier-vscode`)**
   - Consistent code formatting and static analysis across frontend and backend TypeScript files.
6. **Vitest (`vitest.explorer`)**
   - Visual test runner for running individual unit and integration tests with one click.

---

## 6. How to Showcase RaktSetu on Your Resume

Here are high-impact, recruiter-tailored bullet points designed for senior and software engineering resumes:

### Option 1: Full-Stack / Backend Focus
> **RaktSetu — Real-Time Emergency Blood Dispatch & Escalation Platform**
> *TypeScript, Node.js/Express, React 19, MongoDB (Replica Set), Redis, BullMQ, Docker, SSE*
> - Architected a distributed emergency blood dispatch engine executing multi-wave geographic escalation (5km $\to$ 50km) across 5,000+ donors, adhering strictly to NBTC demographic constraints and DPDP Act 2023 consent protocols.
> - Engineered an atomic conditional update algorithm in MongoDB (`$lt: unitsNeeded`) that eliminated race conditions and double-allocation under high-concurrency contention (verified via 50-way simultaneous parallel automated load tests).
> - Implemented real-time event streaming via Server-Sent Events (SSE) backed by distributed Redis Pub/Sub, delivering sub-second live request tracking and dynamic donor status broadcasts.
> - Designed tamper-evident audit logging with SHA-256 cryptographic hash chaining and built a 35-test automated test suite (unit, integration, concurrency) achieving 100% pass rate in containerized CI environments.

### Option 2: Distributed Systems & Performance Focus
> **Distributed Escalation & Matching Engine (RaktSetu)**
> - Designed a 5-factor scoring pipeline (haversine distance, blood compatibility, historical responsiveness, cooldown recency) querying MongoDB 2dsphere indexes in under 25ms.
> - Built a fault-tolerant job scheduler using BullMQ and Redis with exponential backoff and non-blocking worker thread pools to handle asynchronous WhatsApp notification dispatch.
> - Secured production infrastructure with non-root Docker containers, Helmet security headers, fine-grained IP rate-limiting, and automated TLS termination via Caddy.
