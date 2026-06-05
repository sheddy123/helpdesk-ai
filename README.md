# Helpdesk AI

An AI-powered ticket management system that ingests support emails, automatically classifies and responds to them using Claude, and routes tickets to the right agent — freeing your team to focus on complex issues.

## Features

- **Email ingestion** — incoming support emails are parsed via Brevo webhook and converted into tickets automatically
- **AI classification** — Claude assigns each ticket a category (General Question, Technical Question, Refund Request)
- **AI auto-reply** — generates and sends a personalized response without agent intervention
- **RAG knowledge base** — uses past resolved tickets as context to improve reply quality over time
- **Smart routing** — Refund Requests always go to admin; other tickets are load-balanced to the agent with the fewest open tickets
- **Auto-escalation** — any ticket unresolved after 5 minutes triggers a Hangfire background job to notify admin or reassign
- **Agent management** — admin can create, update, and deactivate agent accounts
- **Dashboard** — ticket volume, status breakdown, category distribution, and agent workload stats
- **Secure auth** — server-side sessions stored in SQL Server; cookie holds only a session key (no JWTs)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite (TypeScript), React Router, Tailwind CSS, shadcn/ui |
| Backend | ASP.NET Core 10 Web API (C#) |
| ORM | Entity Framework Core 10 |
| Database | SQL Server (MSSQL) |
| AI — responses | Claude API (Anthropic) — classify, summarize, auto-reply |
| AI — embeddings | OpenAI `text-embedding-3-small` — RAG knowledge base |
| Background jobs | Hangfire (MSSQL-backed) — escalation timers |
| Outbound email | Resend |
| Inbound email | Brevo webhook |
| Auth | ASP.NET Core Identity + database sessions (HTTP-only cookie) |
| Hosting | Azure App Service (.NET API), Azure SQL, Vercel (frontend) |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org) and [Bun](https://bun.sh)
- SQL Server or SQL Server Express
- [dotnet-ef CLI](https://learn.microsoft.com/en-us/ef/core/cli/dotnet) (`dotnet tool install --global dotnet-ef`)

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd helpdesk-ai
```

### 2. Configure secrets

Secrets are kept out of source control using [dotnet user-secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets).

```bash
cd backend

# Database
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Data Source=<server>;Initial Catalog=HelpdeskAi;Integrated Security=True;TrustServerCertificate=True"

# Admin seed credentials (created on first run)
dotnet user-secrets set "AdminSeed:Email"    "admin@helpdesk.local"
dotnet user-secrets set "AdminSeed:Password" "Admin@12345"

# API keys (add as you reach each phase)
dotnet user-secrets set "Anthropic:ApiKey" "sk-ant-..."
dotnet user-secrets set "OpenAI:ApiKey"    "sk-..."
dotnet user-secrets set "Resend:ApiKey"    "re_..."
dotnet user-secrets set "Brevo:WebhookSecret" "..."
```

### 3. Apply database migrations

```bash
cd backend
dotnet ef database update
```

This creates the `HelpdeskAi` database and all tables. The admin account (`AdminSeed:Email`) is seeded automatically on first run.

### 4. Run the app

```bash
# From the backend directory — starts both the API and the Vite dev server
dotnet run
```

- API: `https://localhost:7xxx`
- Frontend (Vite): `http://localhost:3000`

## Project Structure

```
helpdesk-ai/
├── backend/
│   ├── Auth/
│   │   └── DatabaseTicketStore.cs      # ITicketStore — stores auth tickets in MSSQL
│   ├── Controllers/
│   │   └── AuthController.cs           # POST /api/auth/login|logout, GET /api/auth/me
│   ├── Data/
│   │   └── AppDbContext.cs             # EF Core DbContext (IdentityDbContext)
│   ├── Middleware/
│   │   └── ExceptionHandlingMiddleware.cs
│   ├── Migrations/                     # EF Core migrations
│   ├── Models/
│   │   ├── ApplicationUser.cs          # Extends IdentityUser
│   │   ├── Ticket.cs                   # Core ticket model + enums
│   │   └── UserSession.cs             # Server-side session storage
│   ├── ClientApp/                      # React + Vite frontend
│   ├── Program.cs
│   └── HelpdeskAi.csproj
├── implementation-plan.md              # Phased build checklist
├── project-scope.md                    # Product requirements
└── tech-stack.md                       # Technology decisions
```

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Log in with email + password |
| `POST` | `/api/auth/logout` | Required | Invalidate current session |
| `GET` | `/api/auth/me` | Required | Return current user + roles |

### Tickets _(coming in Phase 3)_

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets` | List tickets with filter/sort |
| `GET` | `/api/tickets/{id}` | Ticket detail |
| `PATCH` | `/api/tickets/{id}/status` | Update status |

### Users _(coming in Phase 2)_

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List agents |
| `POST` | `/api/users` | Admin | Create agent |
| `PUT` | `/api/users/{id}` | Admin | Update agent |
| `DELETE` | `/api/users/{id}` | Admin | Deactivate agent |

### Webhooks _(coming in Phase 3)_

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks/inbound-email` | Brevo inbound email webhook |

## Domain Model

### Ticket statuses

| Status | Meaning |
|---|---|
| `Open` | Newly received, not yet resolved |
| `Resolved` | AI or agent has responded |
| `Closed` | Manually closed; no further action |

### Ticket categories

| Category | Assigned to |
|---|---|
| `GeneralQuestion` | Agent with fewest open tickets |
| `TechnicalQuestion` | Agent with fewest open tickets |
| `RefundRequest` | Admin only |

### User roles

| Role | Capabilities |
|---|---|
| `Admin` | Full access; manages agents; receives all Refund Requests |
| `Agent` | Handles assigned tickets; can edit/re-send AI replies |

## Authentication

Login returns a `helpdesk.session` HTTP-only cookie. The cookie contains only an opaque session key — the actual auth ticket (user ID, roles, expiry) is stored in the `UserSessions` table in MSSQL. This means:

- Sessions can be invalidated server-side instantly (e.g. when an agent is deactivated)
- The cookie itself contains no sensitive data
- Session lifetime: 7 days with sliding expiration

## Escalation

When a ticket is created, Hangfire schedules a job 5 minutes out. If the ticket is still `Open` when the job fires, the system:

1. Notifies the admin via in-app notification
2. Reassigns the ticket to the agent with the fewest open tickets (if any are available)

The job is cancelled automatically when the ticket is resolved before the timer fires.

## Knowledge Base (RAG)

Resolved tickets are embedded using OpenAI's `text-embedding-3-small` model and stored alongside the ticket. When generating a reply for a new ticket, the system retrieves the top-N most similar past responses via cosine similarity and passes them as context to Claude. Response quality improves automatically as more tickets are resolved.

## Deployment

| Service | Purpose |
|---|---|
| Azure App Service | Hosts the .NET API |
| Azure SQL | Managed SQL Server (production database) |
| Vercel | Hosts the React frontend |

Environment variables required in production:

```
ConnectionStrings__DefaultConnection
AdminSeed__Email
AdminSeed__Password
Anthropic__ApiKey
OpenAI__ApiKey
Resend__ApiKey
Brevo__WebhookSecret
```

## Implementation Progress

See [`implementation-plan.md`](./implementation-plan.md) for the full phase-by-phase checklist.

| Phase | Status |
|---|---|
| 1 — Project setup & foundation | ✅ Complete |
| 2 — Authentication & user management | 🔄 In progress |
| 3 — Email ingestion & ticket core | Pending |
| 4 — Escalation & routing | Pending |
| 5 — AI features | Pending |
| 6 — RAG knowledge base | Pending |
| 7 — Dashboard | Pending |
| 8 — Deployment | Pending |
