import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { AgentUser } from '../types/user';
import { TicketStatus, TicketCategory, type Ticket, type TicketsPage } from '../types/ticket';

export const AGENTS: AgentUser[] = [
  { id: '1', email: 'alice@example.com', userName: 'alice', isActive: true },
  { id: '2', email: 'bob@example.com', userName: 'bob', isActive: true },
  { id: '3', email: 'carol@example.com', userName: 'carol', isActive: false },
];

export const TICKETS: Ticket[] = [
  { id: 1, senderEmail: 'alice@example.com', subject: 'Cannot log in to my account',    status: TicketStatus.Open,     category: TicketCategory.TechnicalQuestion, assignedTo: null,    createdAt: '2026-06-10T09:00:00Z' },
  { id: 2, senderEmail: 'bob@example.com',   subject: 'Request a refund for order #99', status: TicketStatus.Open,     category: TicketCategory.RefundRequest,     assignedTo: 'alice', createdAt: '2026-06-10T08:00:00Z' },
  { id: 3, senderEmail: 'carol@example.com', subject: 'How do I reset my password?',    status: TicketStatus.Resolved, category: TicketCategory.GeneralQuestion,   assignedTo: 'alice', createdAt: '2026-06-09T14:00:00Z' },
];

export const handlers = [
  http.get('/api/tickets', () => {
    const response: TicketsPage = { items: TICKETS, totalCount: TICKETS.length, page: 1, pageSize: 20 };
    return HttpResponse.json(response);
  }),

  http.get('/api/users', () => HttpResponse.json(AGENTS)),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as { email: string; userName: string };
    const created: AgentUser = { id: '99', isActive: true, ...body };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = await request.json() as { email: string; userName: string };
    const agent = AGENTS.find(a => a.id === id);
    if (!agent) return new HttpResponse(null, { status: 404 });
    const updated: AgentUser = { ...agent, email: body.email, userName: body.userName };
    return HttpResponse.json(updated);
  }),

  http.patch('/api/users/:id/activate', () => new HttpResponse(null, { status: 204 })),

  http.delete('/api/users/:id', () => new HttpResponse(null, { status: 204 })),
];

export const server = setupServer(...handlers);
