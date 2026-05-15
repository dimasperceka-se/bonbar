# Bon Barang Lapas

A Progressive Web App (PWA) for monitoring and requesting goods/supplies at Lembaga Pemasyarakatan (Correctional Facility) Kelas IIA Kuningan. Converts natural language text requests into structured official Bon Barang forms using AI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 / 8080)
- `pnpm --filter @workspace/bon-barang run dev` — run the frontend PWA
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI integration for NLP parsing

## Demo Accounts

- **Admin**: admin / admin123
- **Kalapas** (Approver): kalapas / kalapas123
- **Peminta** (Requester): user / user123

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS v4, PWA via vite-plugin-pwa
- API: Express 5 with JWT authentication
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI via Replit AI Integrations (no user API key required)
- PDF: jsPDF + html2canvas
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, items, requests, request_items, approval_history)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `artifacts/bon-barang/src/` — React frontend PWA
- `artifacts/bon-barang/src/lib/auth.tsx` — AuthContext & token management
- `artifacts/bon-barang/src/pages/` — Page components

## Architecture decisions

- JWT stored in localStorage (`bon_barang_token`), injected via `setAuthTokenGetter` in the api-client-react custom-fetch module
- Role-based access: `admin`, `kalapas` (approver), `requester`
- AI parsing uses OpenAI gpt-5-mini via Replit AI Integrations — no user API key needed
- PDF export via jsPDF replicates the official Bon Barang government form layout
- PWA manifest configured for standalone display, installable on Android/iOS/Desktop

## Product

Users (government office staff) type free-text goods requests in Indonesian or English. AI parses them into structured items with quantities and purposes. Users review, edit if needed, and submit for approval. Kalapas approves or rejects. Admin fulfills approved requests. All can be exported as official PDF forms.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, always run `pnpm --filter @workspace/api-spec run codegen` before editing frontend or backend
- JWT secret is `bon-barang-lapas-secret` by default; set `JWT_SECRET` env var in production
- The `vite-plugin-pwa` has a peer dep warning for vite v7 but works correctly

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
