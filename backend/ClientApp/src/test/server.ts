import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { AgentUser } from '../types/user';

export const AGENTS: AgentUser[] = [
  { id: '1', email: 'alice@example.com', userName: 'alice', isActive: true },
  { id: '2', email: 'bob@example.com', userName: 'bob', isActive: true },
  { id: '3', email: 'carol@example.com', userName: 'carol', isActive: false },
];

export const handlers = [
  http.get('/api/users', () => HttpResponse.json(AGENTS)),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as { email: string; userName: string };
    const created: AgentUser = { id: '99', isActive: true, ...body };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete('/api/users/:id', () => new HttpResponse(null, { status: 204 })),
];

export const server = setupServer(...handlers);
