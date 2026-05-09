# hse-inspection-logger

> A fully typed Node.js REST API for creating, querying, and managing field HSE inspection records — built with Express, Zod validation, and JWT authentication.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express)

---

## Overview

`hse-inspection-logger` is the backend API layer for a digital HSE inspection system. It allows site supervisors and inspectors to submit inspection records via HTTP and retrieve them with filtering by risk level or site name.

Designed to replace paper-based inspection logs in construction and industrial environments, this API can serve the `hse-compliance-dashboard` frontend or be queried directly by mobile apps or automated reporting pipelines.

---

## Features

- `POST /inspections` — submit a new inspection record
- `GET /inspections` — retrieve all records (filterable by `riskLevel` and `site`)
- `GET /inspections/:id` — fetch a single record by ID
- `PATCH /inspections/:id` — partial update an existing record
- `DELETE /inspections/:id` — remove a record
- `GET /stats` — summary statistics (total, by risk level, PPE compliance rate)
- `POST /auth/login` — obtain a JWT token
- Full request validation via **Zod** schemas
- JWT authentication on all protected routes
- UUID-based record IDs
- In-memory store — easily swappable for PostgreSQL via `pg` or Prisma

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | TypeScript 5.3 |
| Runtime | Node.js 18 |
| Framework | Express 4.18 |
| Validation | Zod 3 |
| Auth | JSON Web Tokens (jsonwebtoken) |
| IDs | uuid v4 |
| Dev server | ts-node-dev |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/your-handle/hse-inspection-logger.git
cd hse-inspection-logger
npm install
```

### Run in development

```bash
npm run dev
```

API runs at `http://localhost:3001`

### Build and run in production

```bash
npm run build
npm start
```

---

## Authentication

All routes (except `/auth/login`) require a Bearer token.

### Get a token

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "hse1234"}'
```

Use the returned token as:

```
Authorization: Bearer <token>
```

---

## API Reference

### Create an inspection

```bash
curl -X POST http://localhost:3001/inspections \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "site": "Block A",
    "inspector": "K. Sam-Bariepie",
    "date": "2025-03-15",
    "ppeCompliant": true,
    "hazards": ["loose scaffolding board", "missing edge protection"],
    "riskLevel": "medium",
    "notes": "Recommend re-inspection within 24 hours."
  }'
```

### Get all inspections (filtered)

```bash
curl "http://localhost:3001/inspections?riskLevel=high&site=Block" \
  -H "Authorization: Bearer <token>"
```

### Get stats

```bash
curl http://localhost:3001/stats \
  -H "Authorization: Bearer <token>"
```

#### Example stats response

```json
{
  "total": 12,
  "byRisk": {
    "low": 7,
    "medium": 3,
    "high": 2
  },
  "ppeComplianceRate": "83%"
}
```

---

## Inspection Record Schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `site` | string | ✅ | Site or block name |
| `inspector` | string | ✅ | Inspector's name |
| `date` | string | ✅ | Format: `YYYY-MM-DD` |
| `ppeCompliant` | boolean | ✅ | Was PPE worn correctly? |
| `hazards` | string[] | ✅ | List of identified hazards |
| `riskLevel` | enum | ✅ | `"low"`, `"medium"`, or `"high"` |
| `notes` | string | — | Optional remarks |

---

## Project Structure

```
hse-inspection-logger/
├── src/
│   └── index.ts         # All routes, middleware, types, and store
├── package.json
├── tsconfig.json
└── README.md
```

---

## Swapping to PostgreSQL

Replace the in-memory `Map` with a `pg` pool:

```ts
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// In POST /inspections:
await pool.query(
  "INSERT INTO inspections (id, site, inspector, ...) VALUES ($1,$2,$3,...)",
  [inspection.id, inspection.site, inspection.inspector, ...]
);
```

---

## Roadmap

- [ ] PostgreSQL persistence via Prisma ORM
- [ ] Role-based access control (admin, inspector, read-only)
- [ ] Pagination on `GET /inspections`
- [ ] Webhook support — notify Slack/Teams on `riskLevel: "high"` records
- [ ] OpenAPI / Swagger docs generation
- [ ] Docker + docker-compose setup

---

## Background

Inspired by the real need to digitise paper-based inspection logs in high-risk industrial and construction sites. The data model reflects what experienced HSE officers actually record during scaffolding inspections — hazard types, PPE status, risk level, and timestamps — structured for programmatic querying and reporting.

---

## License

MIT
