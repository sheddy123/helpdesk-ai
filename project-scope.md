## AI-Powered Ticket Management System

## Problem

We receive hundreds of support emails daily. Our agents manually classify, read, and respond to each ticket - which is slow and leads to impersonal, canned responses.

## Solution

Build a ticket management system that uses AI to automatically classify, respond to, and route support tickets - delivering faster, more personalized responses to students while freeing up agents for complex issues.

## Ticket Statuses

- **Open** — newly received, not yet resolved
- **Resolved** — agent or AI has provided a response/resolution
- **Closed** — agent manually closes the ticket; no further action needed

Auto-escalate any ticket that remains unresolved after **5 minutes**. Escalation notifies the admin or, if agents are available, the agent with the fewest open tickets (load-balanced assignment).

## Ticket Categories

Each ticket belongs to exactly one category:

- **General Question** — handled by any available agent
- **Technical Question** — handled by any available agent
- **Refund Request** — always routed to the admin

## User Roles

- **Admin** — seeded at deployment; can manage agents and has full system access
- **Agent** — created by the admin; handles ticket responses and resolution

## Email Ingestion

Emails are received via a free email provider (specific provider TBD — e.g. Gmail via IMAP/API). Incoming emails are automatically parsed and converted into tickets in the system.

## Knowledge Base

The knowledge base is built from previous agent responses and improves over time. When generating a reply, the AI retrieves relevant past responses to inform the new one (RAG-style). The more tickets are resolved, the more accurate and context-aware future responses become.

## Response Workflow

AI-generated responses are sent automatically without agent review. Agents can still intervene, edit, or override responses at any point. If no prior knowledge is available, the AI drafts a best-effort response based on the ticket content.

## Features

- Receive support emails and create tickets
- Auto-generate human-friendly responses using a knowledge base
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification (assigns one of the above categories)
- AI summaries
- AI-suggested replies
- User management (admin only — create/manage agent accounts)
- Dashboard to view and manage all tickets
- Authentication
