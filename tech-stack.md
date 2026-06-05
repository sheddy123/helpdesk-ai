## Tech Stack

### Frontend
- **React + Vite** (TypeScript)
- **React Router** — client-side routing
- **Tailwind CSS + shadcn/ui** — component library for dashboard and data-heavy UIs

### Backend
- **ASP.NET Core Web API** (C#)
- **Entity Framework Core** — ORM for MSSQL

### Database
- **SQL Server (MSSQL)** — tickets, users, categories, sessions
- Embeddings stored as a column in MSSQL; cosine similarity computed in C# (no separate vector DB needed at this scale)

### AI
- **Claude API (Anthropic)** — ticket classification, summarization, auto-response generation
- **OpenAI Embeddings** (`text-embedding-3-small`) — generate embeddings from past responses to power the RAG knowledge base

### Background Jobs
- **Hangfire** — C#-native job scheduler backed by MSSQL; handles the 5-minute escalation timer with no extra infrastructure

### Email
- **Resend** — outbound email (AI-generated replies to students)
- **Brevo** — inbound email via webhook (free tier, parses incoming support emails)

### Authentication
- **ASP.NET Core Identity** with **database sessions** — session tokens stored server-side in MSSQL, sent to the client as a secure HTTP-only cookie; no JWTs

### Hosting
- **Azure App Service** — .NET API hosting
- **Azure SQL** — managed SQL Server instance
- **Vercel** — React frontend
