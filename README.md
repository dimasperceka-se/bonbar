# Bon Barang Lapas

A Progressive Web App (PWA) for monitoring and requesting goods/supplies at Lembaga Pemasyarakatan (Correctional Facility) Kelas IIA Kuningan. Converts natural language text requests into structured official Bon Barang forms using AI.

## Prerequisites

- Node.js 20+ (24 recommended)
- pnpm 9+
- PostgreSQL (local or remote)
- (Optional) OpenAI API key — only needed for the AI parsing feature

## Setup

1. Install dependencies:
   ```
   pnpm install
   ```

2. Copy `.env.example` to `.env` and fill in:
   ```
   DATABASE_URL=postgres://user:password@localhost:5432/bonbarang
   JWT_SECRET=change-me-in-production
   PORT=9091
   BASE_PATH=/
   # OPENAI_API_KEY=sk-...
   # OPENAI_MODEL=gpt-4o-mini
   ```

3. First-time database setup:
   ```
   pnpm --filter @workspace/db run create   # creates the bonbarang DB on localhost
   pnpm --filter @workspace/db run push     # applies the Drizzle schema
   pnpm --filter @workspace/db run seed     # inserts demo users and items
   ```

## Run locally (development)

Two terminals — frontend dev server proxies `/api` to the backend.

- API server (port 9091):
  ```
  pnpm --filter @workspace/api-server run dev
  ```
- Frontend PWA (port 5173):
  - PowerShell:
    ```
    $env:PORT='5173'; $env:BASE_PATH='/'; $env:API_URL='http://localhost:9091'
    pnpm --filter @workspace/bon-barang run dev
    ```
  - bash / zsh:
    ```
    PORT=5173 BASE_PATH=/ API_URL=http://localhost:9091 pnpm --filter @workspace/bon-barang run dev
    ```

Open http://localhost:5173/ in your browser.

## Production / single-port deployment (port 9091)

The API server can serve the built frontend as static files on the same port, so the whole app runs on a single process behind one port (e.g. 9091).

```
# 1. Install
pnpm install --frozen-lockfile=false

# 2. Push schema + seed (first deploy only)
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed     # optional — only if you need demo users

# 3. Build everything
pnpm --filter @workspace/bon-barang run build
pnpm --filter @workspace/api-server run build

# 4. Start (reads PORT, DATABASE_URL, JWT_SECRET from .env)
pnpm --filter @workspace/api-server run start
```

Or use the one-shot helper:

```
pnpm --filter @workspace/scripts run deploy
```

Open `http://your-server:9091/`. API routes live under `/api/*` on the same host.

For a production deployment, run the API server under a process supervisor (systemd, pm2, docker, etc.) so it restarts on failure.

### Demo accounts

- Admin: `admin` / `admin123`
- Kalapas: `kalapas` / `kalapas123`
- Peminta: `user` / `user123`

## Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/db run seed` — insert demo users and items

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS v4, PWA via vite-plugin-pwa
- API: Express 5 with JWT authentication
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI (gpt-4o-mini) for NLP parsing
- PDF: jsPDF + html2canvas-pro (supports modern `oklch()` colors)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `artifacts/api-server/src/app.ts` — App entry; serves `/api/*` + static frontend in production
- `artifacts/bon-barang/src/` — React frontend PWA
- `artifacts/bon-barang/public/logo_product.jpeg` — sidebar/login logo
- `artifacts/bon-barang/public/logo_instansi.png` — Kementerian Imigrasi & Pemasyarakatan logo (PDF kop)

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before editing frontend or backend
- JWT secret defaults to `bon-barang-lapas-secret`; **always** set `JWT_SECRET` env var in production
- The api-server build expects the frontend dist at `../bon-barang/dist/public` — override with `FRONTEND_DIST=/absolute/path` if deploying differently
