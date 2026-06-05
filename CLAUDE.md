# CLAUDE.md — AI Helpdesk Ticket Management System

## Project Overview

An AI-powered ticket management system that ingests support emails, classifies them, auto-generates responses using RAG, and routes tickets to the right agent or admin.

## Repository Layout

```
helpdesk-ai/
├── backend/                  # ASP.NET Core 10 Web API (C#)
│   ├── HelpdeskAi.csproj
│   ├── ClientApp/            # React + Vite (TypeScript) frontend
│   └── appsettings.json
├── project-scope.md          # Product requirements
├── tech-stack.md             # Technology decisions
└── implementation-plan.md   # Phased build plan (checkbox checklist)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (TypeScript), React Router, Tailwind CSS, shadcn/ui |
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

## Implementation Progress

See `implementation-plan.md` for the full phase-by-phase checklist. Current state: Phase 1 scaffolding is in place (backend project + ClientApp exist).
