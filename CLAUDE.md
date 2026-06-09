# CLAUDE.md — AI Helpdesk Ticket Management System

## Project Overview

An AI-powered ticket management system that ingests support emails, classifies them, auto-generates responses using RAG, and routes tickets to the right agent or admin.

## Repository Layout

```
helpdesk-ai/
├── backend/                        # ASP.NET Core 10 Web API (C#)
│   ├── HelpdeskAi.csproj
│   ├── appsettings.json
│   ├── Auth/
│   │   └── DatabaseTicketStore.cs  # ITicketStore — persists auth sessions to MSSQL
│   └── ClientApp/                  # React + Vite (TypeScript) frontend
│       ├── components.json         # shadcn/ui config (default style, neutral theme)
│       ├── vite.config.ts          # @tailwindcss/vite plugin, @ path alias → src/
│       ├── tsconfig.app.json       # paths: { "@/*": ["./src/*"] }
│       └── src/
│           ├── index.css           # Tailwind v4 import + shadcn CSS variables (@theme inline)
│           ├── lib/utils.ts        # cn() helper (clsx + tailwind-merge)
│           ├── components/ui/      # shadcn components (Button, Input, Label, Card)
│           ├── contexts/
│           │   └── AuthContext.tsx # useAuth() — user, loading, login, logout
│           ├── components/
│           │   ├── ProtectedRoute.tsx
│           │   └── Layout.tsx      # nav shell for authenticated pages
│           └── pages/
│               ├── LoginPage.tsx   # shadcn Card + Label + Input + Button
│               └── HomePage.tsx
├── project-scope.md                # Product requirements
├── tech-stack.md                   # Technology decisions
└── implementation-plan.md          # Phased build plan (checkbox checklist)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (TypeScript), React Router, Tailwind CSS, shadcn/ui, axios, TanStack Query |
| Backend | ASP.NET Core 10 Web API (C#), Entity Framework Core |
| Database | SQL Server (MSSQL) — tickets, users, sessions, embeddings |
| AI | Claude API (Anthropic) — classify, summarize, auto-reply |
| Embeddings | OpenAI `text-embedding-3-small` — RAG knowledge base |
| Background Jobs | Hangfire (MSSQL-backed) — 5-min escalation timer |
| Outbound Email | Resend |
| Inbound Email | Brevo webhook |
| Auth | ASP.NET Core Identity, database sessions, HTTP-only cookie (no JWTs) |
| Hosting | Azure App Service (.NET), Azure SQL, Vercel (frontend) |

## Domain Model

**Ticket statuses:** `Open` → `Resolved` → `Closed`

**Ticket categories:**
- `General Question` — any available agent
- `Technical Question` — any available agent
- `Refund Request` — always routed to admin

**User roles:** `Admin` (seeded at deploy), `Agent` (created by admin)

**Escalation:** Any ticket still `Open` after 5 minutes triggers a Hangfire job that notifies admin and/or reassigns to the agent with the fewest open tickets.

## Key API Endpoints

```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

GET    /api/users          # list agents (admin)
POST   /api/users          # create agent (admin)
PUT    /api/users/{id}     # update agent (admin)
DELETE /api/users/{id}     # deactivate agent (admin)

GET   /api/tickets         # list with filter/sort
GET   /api/tickets/{id}    # detail
PATCH /api/tickets/{id}/status

GET /api/notifications
GET /api/dashboard

POST /api/webhooks/inbound-email   # Brevo webhook
```

## Development Commands

```powershell
# Run backend (from repo root)
cd backend && dotnet run

# Run frontend dev server (from repo root)
cd backend/ClientApp && npm run dev

# EF migrations
cd backend && dotnet ef migrations add <Name>
cd backend && dotnet ef database update
```

## MCP Tools

Use **context7** (`mcp__context7__resolve-library-id` + `mcp__context7__query-docs`) to fetch current documentation for any library or framework used in this project — ASP.NET Core, EF Core, Hangfire, Resend SDK, Brevo, Anthropic SDK, OpenAI SDK, shadcn/ui, Tailwind, Vite, React Router — before writing integration code. Always prefer context7 over recalled training data for API specifics.

## Frontend Notes

**Tailwind v4** — configured via `@tailwindcss/vite` plugin. There is no `tailwind.config.js`; all theme tokens live in `src/index.css` using `@theme inline` and CSS custom properties (oklch format).

**shadcn/ui** — manually initialized (the CLI fails on Windows with a workspace detection error). To add a new component:
1. Copy the component source from the shadcn docs/registry into `src/components/ui/`
2. Install any required Radix package (`@radix-ui/react-*`) via npm
3. Do NOT run `npx shadcn add` — it will fail

**Path alias** — `@` resolves to `src/` in both Vite and TypeScript.

**HTTP client** — use **axios** for all API calls (`withCredentials: true` on every request — the backend uses HTTP-only cookies). Never use the native `fetch` API.

**Server state** — use **TanStack Query** (`useQuery` / `useMutation`) for all data fetching and mutation. Never manage server state with `useState` + `useEffect`. `QueryClientProvider` is mounted in `main.tsx`. Update the cache via `queryClient.setQueryData` on successful mutations instead of triggering a refetch. Use `staleTime: Infinity` for data that only changes through explicit mutations (e.g. auth session).

## Implementation Progress

See `implementation-plan.md` for the full phase-by-phase checklist.

| Phase | Status | Notes |
|---|---|---|
| 1 — Scaffolding | Done | Backend + ClientApp created |
| 2 — Auth backend | Done | Identity, EF Core sessions, `/api/auth/*` endpoints |
| 3 — Auth frontend | Done | `AuthContext`, `ProtectedRoute`, `Layout`, login page |
| 4+ | Not started | Ticket ingestion, dashboard, RAG, Hangfire |
