import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';
import UsersPage from './UsersPage';
import { server, AGENTS } from '../test/server';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('UsersPage', () => {
  describe('loading state', () => {
    it('shows skeleton rows while fetching', () => {
      // delay the response so the loading state is visible
      server.use(
        http.get('/api/users', async () => {
          await new Promise(r => setTimeout(r, 200));
          return HttpResponse.json(AGENTS);
        })
      );
      renderPage();
      // table header is visible immediately
      expect(screen.getByText('Username')).toBeInTheDocument();
      // no real agent names yet
      expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('renders all agents after load', async () => {
      renderPage();
      expect(await screen.findByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText('carol')).toBeInTheDocument();
    });

    it('shows email addresses', async () => {
      renderPage();
      expect(await screen.findByText('alice@example.com')).toBeInTheDocument();
    });

    it('shows Active badge for active agents', async () => {
      renderPage();
      await screen.findByText('alice');
      const aliceRow = screen.getByText('alice').closest('tr')!;
      expect(within(aliceRow).getByText('Active')).toBeInTheDocument();
    });

    it('shows Inactive badge for inactive agents', async () => {
      renderPage();
      await screen.findByText('carol');
      const carolRow = screen.getByText('carol').closest('tr')!;
      expect(within(carolRow).getByText('Inactive')).toBeInTheDocument();
    });

    it('shows Deactivate for active agents and Activate for inactive agents', async () => {
      renderPage();
      await screen.findByText('alice');
      const aliceRow = screen.getByText('alice').closest('tr')!;
      const carolRow = screen.getByText('carol').closest('tr')!;
      expect(within(aliceRow).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
      expect(within(carolRow).queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
      expect(within(carolRow).getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no agents exist', async () => {
      server.use(http.get('/api/users', () => HttpResponse.json([])));
      renderPage();
      expect(await screen.findByText(/no agents yet/i)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      server.use(http.get('/api/users', () => HttpResponse.json({}, { status: 500 })));
      renderPage();
      expect(await screen.findByText(/failed to load agents/i)).toBeInTheDocument();
    });
  });

  describe('create agent', () => {
    beforeEach(async () => {
      renderPage();
      await screen.findByText('alice'); // wait for initial load
      await userEvent.click(screen.getByRole('button', { name: 'Add Agent' }));
    });

    it('opens the dialog on Add Agent click', () => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('shows validation errors for invalid input', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    });

    it('adds the new agent to the list on success', async () => {
      await userEvent.type(screen.getByLabelText('Email'), 'newagent@example.com');
      await userEvent.type(screen.getByLabelText('Username'), 'newagent');
      await userEvent.type(screen.getByLabelText('Password'), 'securepassword1');
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByText('newagent')).toBeInTheDocument();
    });

    it('shows server error when creation fails', async () => {
      server.use(
        http.post('/api/users', () =>
          HttpResponse.json({ errors: ['Email already taken'] }, { status: 400 })
        )
      );
      await userEvent.type(screen.getByLabelText('Email'), 'taken@example.com');
      await userEvent.type(screen.getByLabelText('Username'), 'newagent');
      await userEvent.type(screen.getByLabelText('Password'), 'securepassword1');
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));

      expect(await screen.findByText('Email already taken')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes dialog on Cancel', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });

  describe('edit agent', () => {
    beforeEach(async () => {
      renderPage();
      await screen.findByText('alice');
      const aliceRow = screen.getByText('alice').closest('tr')!;
      await userEvent.click(within(aliceRow).getByRole('button', { name: /edit alice/i }));
    });

    it('opens the edit dialog with pre-populated values', () => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com');
      expect(screen.getByLabelText('Username')).toHaveValue('alice');
      expect(screen.getByLabelText('New Password')).toHaveValue('');
    });

    it('updates the agent in the list on success', async () => {
      const emailInput = screen.getByLabelText('Email');
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'alice2@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByText('alice2@example.com')).toBeInTheDocument();
    });

    it('shows server error when update fails', async () => {
      server.use(
        http.put('/api/users/:id', () =>
          HttpResponse.json({ errors: ['Username already taken'] }, { status: 400 })
        )
      );
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Username already taken')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows validation error for a short new password', async () => {
      await userEvent.type(screen.getByLabelText('New Password'), 'short');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText(/at least 12 characters/i)).toBeInTheDocument();
    });

    it('closes dialog on Cancel', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });

  describe('deactivate agent', () => {
    it('marks the agent as inactive after deactivation', async () => {
      renderPage();
      await screen.findByText('alice');
      const aliceRow = screen.getByText('alice').closest('tr')!;
      await userEvent.click(within(aliceRow).getByRole('button', { name: 'Deactivate' }));

      await waitFor(() =>
        expect(within(aliceRow).getByText('Inactive')).toBeInTheDocument()
      );
      expect(within(aliceRow).queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
      expect(within(aliceRow).getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    });
  });

  describe('activate agent', () => {
    it('marks the agent as active after activation', async () => {
      renderPage();
      await screen.findByText('carol');
      const carolRow = screen.getByText('carol').closest('tr')!;
      await userEvent.click(within(carolRow).getByRole('button', { name: 'Activate' }));

      await waitFor(() =>
        expect(within(carolRow).getByText('Active')).toBeInTheDocument()
      );
      expect(within(carolRow).queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();
      expect(within(carolRow).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    });
  });
});
