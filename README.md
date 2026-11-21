# RaktSetu (रक्तसेतु) 🩸
### Emergency Blood Donor Matching Platform

> **Web-first, WhatsApp-assisted platform that lets a requester raise an emergency blood request in under 60 seconds and automatically finds, ranks, and notifies eligible donors in escalating waves, while showing live acceptances on the requester's screen.**

Inspired by the Rakt Khoj pitch (Build What Moves India). Built with an independent architecture, custom geospatial ranking engine, BullMQ-driven wave escalation, and atomic concurrency-safe unit allocation.

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 19 + Vite + Tailwind CSS)"]
        UI["Mobile-First Web App"]
        SSE_HOOK["useEventSource (SSE Stream)"]
    end

    subgraph Server ["Backend (Node.js + Express + TypeScript)"]
        API["Express REST API (/api/v1)"]
        AUTH["Auth Service (Phone OTP + JWT + httpOnly Cookie)"]
        STATE["State Machine (transition() with Optimistic Locking)"]
        RANK["5-Factor Ranking Engine"]
        WEBHOOK["Signature-Verified Idempotent Webhook Receiver"]
    end

    subgraph Data ["Datastores"]
        MONGO[("MongoDB Atlas / 7.0<br/>2dsphere Index + Multi-Doc Transactions")]
        REDIS[("Redis 7.2 Alpine<br/>BullMQ Queues + Rate Limiting")]
    end

    subgraph Workers ["Async Queue Workers (BullMQ)"]
        WAVE_WORKER["Wave Escalation Worker (matching)"]
        NOTIF_WORKER["Notification Dispatch Worker (notifications)"]
        EXPIRY_WORKER["Request Expiry Sweeper (expiry)"]
    end

    subgraph Messaging ["Outbound Channels"]
        PROVIDER{"NotificationProvider"}
        WA_CLOUD["WhatsApp Cloud API (Meta)"]
        TWILIO["Twilio WhatsApp Sandbox"]
        SMS["SMS Fallback"]
        MOCK["MockProvider (Dev / Tests)"]
    end

    UI -->|HTTPS REST| API
    SSE_HOOK <---|text/event-stream (SSE)| API
    API --> MONGO
    API --> REDIS
    REDIS --> WAVE_WORKER
    REDIS --> NOTIF_WORKER
    REDIS --> EXPIRY_WORKER
    WAVE_WORKER --> MONGO
    WAVE_WORKER --> RANK
    WAVE_WORKER --> REDIS
    NOTIF_WORKER --> PROVIDER
    PROVIDER --> WA_CLOUD
    PROVIDER --> TWILIO
    PROVIDER --> SMS
    PROVIDER --> MOCK
    WA_CLOUD -->|Inbound Webhooks| WEBHOOK
    WEBHOOK --> MONGO
```

---

## ⚡ The Engineering Highlights

### 1. Concurrency-Safe Acceptance (The Showpiece)
* **The Problem:** 50 donors tap "Accept" on WhatsApp simultaneously, but only 2 units of blood are needed.
* **The Solution:** Atomic conditional update using MongoDB:
  ```javascript
  const updated = await RequestModel.findOneAndUpdate(
    {
      _id: requestId,
      unitsConfirmed: { $lt: unitsNeeded },
      state: { $in: ['OPEN', 'MATCHING', 'PARTIALLY_FULFILLED'] }
    },
    { $inc: { unitsConfirmed: 1 } },
    { new: true }
  );
  ```
* If the update succeeds, the donor is marked **`ACCEPTED`**, contact details are unlocked, and the requester dashboard updates via SSE.
* If the update returns `null` (quota filled during race condition), the donor is seamlessly marked **`WAITLISTED`** on standby.
* **Test Proof:** `server/tests/concurrency/acceptContention.test.ts` fires 50 simultaneous accept calls at a 2-unit request:
  - Confirmed: **Exactly 2**
  - Waitlisted: **Exactly 48**
  - Over-allocation: **0 units**

### 2. Multi-Factor Geospatial Ranking Formula
Rather than naive radial broadcasting, donors are selected via `$geoNear` spherical geometry and scored:
$$\text{score} = 0.40 \cdot \text{proximity} + 0.25 \cdot \text{response} + 0.15 \cdot \text{exactMatch} + 0.10 \cdot \text{recency} + 0.10 \cdot \text{fatigue}$$

- **`proximityScore` ($0.40$):** Normalized inverse distance within the current wave radius ($1 - d/R$).
- **`responseScore` ($0.25$):** Historical ratio of accepted to notified requests ($\text{accepted} / \text{notified}$).
- **`exactMatchBonus` ($0.15$):** $1.0$ for identical blood group; $0.0$ for compatible-only.
- **`recencyOfActivity` ($0.10$):** High for donors active within the last 30 days.
- **`fatigueInverse` ($0.10$):** Protects active donors; excludes anyone notified within the last 24 hours.

### 3. Wave-Based Escalation Engine
Driven by delayed BullMQ jobs using deterministic IDs (`wave:{requestId}:{waveNumber}`):
| Wave | Radius | Donors Notified | Wait Time (Critical) | Wait Time (Urgent) |
| :--- | :--- | :--- | :--- | :--- |
| **Wave 1** | 5 km | Top 10 | 10 min | 20 min |
| **Wave 2** | 15 km | Next 20 | 10 min | 20 min |
| **Wave 3** | 30 km | Next 30 | 15 min | 30 min |
| **Wave 4** | 50 km | Next 40 | Until Expiry | Until Expiry |

When each wave fires, it checks if `unitsConfirmed >= unitsNeeded` or if the request is in a terminal state; if so, it exits cleanly without notifying extra donors.

### 4. Privacy by Design (DPDP Act 2023 Aware)
- Donor phone numbers are **never shown** before verified acceptance.
- Requesters see only: First name, blood group, and distance band (e.g., `"about 3 km"`).
- Contact reveal is logged into an immutable audit event (`contactRevealedAt`).
- Right to withdraw and delete data endpoint provided.
- Health-adjacent data is never logged in plaintext.

### 5. Idempotent Signature-Verified Webhooks
- Inbound WhatsApp webhook requests are verified via Meta's `X-Hub-Signature-256` HMAC.
- Every `eventId` is recorded in a unique-indexed `webhook_events` collection to guarantee duplicate callbacks return `200 OK` without re-processing.
- Safe against out-of-order delivery (e.g. `'READ'` status arriving before `'DELIVERED'`).

### 6. Append-Only Tamper-Evident Hash-Chained Audit Log
Every request state transition and contact unlock appends an audit event where:
$$\text{hash} = \text{SHA-256}(\text{prevHash} + \text{canonicalJSON}(\text{event}))$$
Any modification or deletion of past audit records breaks the hash chain immediately.

---

## 📜 National Blood Transfusion Council (NBTC) Guidelines Citation

RaktSetu implements voluntary donation safety intervals following NBTC (Ministry of Health & Family Welfare, Government of India) guidelines:
- **Male Donors:** 90 days (~3 months) minimum interval between whole blood donations.
- **Female Donors:** 120 days (~4 months) minimum interval between whole blood donations.
- **Age limits:** 18 to 65 years.
- **Weight threshold:** Minimum 45 kg.
- **Statutory Law:** Selling blood or receiving financial remuneration is illegal in India under the Drugs and Cosmetics Act. RaktSetu is strictly non-monetary.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, TanStack Query, Leaflet (OpenStreetMap) |
| **Backend API** | Node.js, Express, TypeScript, Zod |
| **Queue & Cache** | BullMQ on Redis 7.2 |
| **Database** | MongoDB 7.0 (Mongoose, 2dsphere geospatial index, Replica Set) |
| **Real-time** | Server-Sent Events (SSE) |
| **Messaging** | `NotificationProvider` (WhatsApp Cloud API, Twilio, SMS, Mock) |
| **Testing** | Vitest, Supertest, 50-way Concurrency Suite |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI |

---

## 🚀 Getting Started

### 1. Prerequisites
- Docker & Docker Compose **or** local MongoDB + Redis + Node.js (v20+ LTS).

### 2. Environment Setup
```bash
cp .env.example .env
```

### 3. Launching with Docker Compose
```bash
docker compose up -d
```
This boots:
- `raktsetu-mongo`: MongoDB with single-node replica set `rs0` on port `27017`
- `raktsetu-redis`: Redis on port `6379`
- `raktsetu-api`: Express API on port `5000`
- `raktsetu-worker`: Background BullMQ Worker process

### 4. Running Locally
```bash
# In server/
npm install
npm run dev

# In a second terminal for the worker
npm run worker

# In client/
npm install
npm run dev
```

### 5. Running the Showpiece Concurrency Test
```bash
cd server
npm run test:concurrency
```

### 6. Seeding Synthetic Donors (5k - 100k)
```bash
cd server
npm run seed 5000
```
