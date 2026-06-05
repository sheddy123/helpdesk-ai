## Implementation Plan

---

### Phase 1 — Project Setup & Foundation

**Backend**
- [ ] Create ASP.NET Core Web API project
- [ ] Install and configure Entity Framework Core with SQL Server
- [ ] Define base models: `User`, `Ticket`, `Session`
- [ ] Run initial EF migration and verify DB connection
- [ ] Set up global error handling middleware
- [ ] Configure CORS for the React frontend

**Frontend**
- [ ] Scaffold React + Vite project with TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Install React Router and define route structure
- [ ] Create base layout (sidebar, header, content area)

---

### Phase 2 — Authentication & User Management

**Backend**
- [ ] Install and configure ASP.NET Core Identity
- [ ] Set up database session storage (session tokens in MSSQL, HTTP-only cookie)
- [ ] Implement login endpoint (`POST /api/auth/login`)
- [ ] Implement logout endpoint (`POST /api/auth/logout`)
- [ ] Implement "current user" endpoint (`GET /api/auth/me`)
- [ ] Seed the admin account on first deployment
- [ ] Protect routes with `[Authorize]` middleware
- [ ] Implement agent CRUD endpoints (admin only)
  - `GET /api/users` — list agents
  - `POST /api/users` — create agent
  - `PUT /api/users/{id}` — update agent
  - `DELETE /api/users/{id}` — deactivate agent

**Frontend**
- [ ] Build login page
- [ ] Store auth state (current user, role) in React context
- [ ] Implement protected routes (redirect to login if unauthenticated)
- [ ] Build user management page (admin only)
  - List agents
  - Create agent form
  - Deactivate agent

---

### Phase 3 — Email Ingestion & Ticket Core

**Backend**
- [ ] Set up Brevo inbound email webhook (`POST /api/webhooks/inbound-email`)
- [ ] Parse inbound email payload (sender, subject, body)
- [ ] Create ticket from parsed email
- [ ] Define ticket statuses: `Open`, `Resolved`, `Closed`
- [ ] Implement ticket endpoints
  - `GET /api/tickets` — list with filtering (status, category) and sorting
  - `GET /api/tickets/{id}` — ticket detail
  - `PATCH /api/tickets/{id}/status` — update status
- [ ] Implement ticket assignment logic
  - Refund Request → always assign to admin
  - Other categories → assign to agent with fewest open tickets

**Frontend**
- [ ] Build ticket list page with filters (status, category) and sorting
- [ ] Build ticket detail page
  - Show sender, subject, body, status, category, assigned agent
  - Status update controls (Resolve / Close)

---

### Phase 4 — Escalation & Routing

**Backend**
- [ ] Install and configure Hangfire with MSSQL as the job store
- [ ] On ticket creation, schedule a Hangfire job for 5 minutes
- [ ] Escalation job: if ticket is still `Open`, notify admin and/or reassign to agent with fewest open tickets
- [ ] Implement in-app notification model and `GET /api/notifications` endpoint
- [ ] Cancel escalation job when ticket is resolved before 5 minutes

**Frontend**
- [ ] Add notification indicator in the header
- [ ] Build notifications dropdown/panel

---

### Phase 5 — AI Features

**Backend**
- [ ] Install Anthropic SDK and configure Claude API client
- [ ] On ticket creation, call Claude to classify the ticket (General Question / Technical Question / Refund Request)
- [ ] Save the AI-assigned category to the ticket
- [ ] Generate an AI summary of the ticket body and store it
- [ ] Generate an AI-suggested reply and store it on the ticket
- [ ] Auto-send the AI reply via Resend (`POST` to Resend API)
- [ ] Mark ticket status as `Resolved` after auto-reply is sent

**Frontend**
- [ ] Display AI-assigned category on ticket list and detail
- [ ] Display AI summary on ticket detail page
- [ ] Display AI-suggested reply on ticket detail page
- [ ] Allow agent to edit and re-send the AI reply

---

### Phase 6 — RAG Knowledge Base

**Backend**
- [ ] Install OpenAI SDK and configure embeddings client
- [ ] Add `Embedding` column (vector stored as JSON/binary) to resolved tickets
- [ ] On ticket resolution, generate and store an embedding of the response
- [ ] On new ticket, retrieve the top-N most similar past responses using cosine similarity
- [ ] Pass retrieved responses as context when generating AI replies
- [ ] Observe improvement in response quality as knowledge base grows

---

### Phase 7 — Dashboard

**Backend**
- [ ] Implement `GET /api/dashboard` — return aggregate stats:
  - Total tickets by status (open, resolved, closed)
  - Total tickets by category
  - Average resolution time
  - Tickets per agent

**Frontend**
- [ ] Build dashboard page with stat cards and charts
  - Ticket volume over time
  - Breakdown by status and category
  - Agent workload summary

---

### Phase 8 — Deployment

- [ ] Set up Azure SQL database
- [ ] Set up Azure App Service for the .NET API
- [ ] Configure environment variables (Claude API key, OpenAI key, Resend key, Brevo webhook secret, DB connection string)
- [ ] Run EF migrations against Azure SQL
- [ ] Deploy React frontend to Vercel
- [ ] Configure Vercel environment variables (API base URL)
- [ ] Register Brevo inbound webhook to point at the live API URL
- [ ] Smoke test: send a test email and verify the full ticket lifecycle end-to-end
