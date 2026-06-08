import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AgentUser } from '../types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const createSchema = z.object({
  email: z.string().email('Enter a valid email'),
  userName: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

type CreateForm = z.infer<typeof createSchema>;

export default function UsersPage() {
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    fetch('/api/users', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<AgentUser[]>;
      })
      .then(setAgents)
      .catch(() => setPageError('Failed to load agents.'))
      .finally(() => setPageLoading(false));
  }, []);

  function closeDialog() {
    setDialogOpen(false);
    reset();
  }

  async function onCreate(data: CreateForm) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { errors?: string[] };
      setError('root', { message: body.errors?.[0] ?? 'Failed to create agent.' });
      return;
    }

    const created = await res.json() as AgentUser;
    setAgents(prev => [...prev, created].sort((a, b) => a.userName.localeCompare(b.userName)));
    closeDialog();
  }

  async function onDeactivate(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      setAgents(prev => prev.map(a => a.id === id ? { ...a, isActive: false } : a));
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-800" />
      </div>
    );
  }

  if (pageError) {
    return <p className="py-8 text-sm text-destructive">{pageError}</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Agents</h1>
        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button>Add Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreate)} className="mt-4 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="userName">Username</Label>
                <Input
                  id="userName"
                  autoComplete="off"
                  aria-invalid={!!errors.userName}
                  {...register('userName')}
                />
                {errors.userName && (
                  <p className="text-xs text-destructive">{errors.userName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              {errors.root && (
                <p className="text-sm text-destructive">{errors.root.message}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No agents yet. Add one to get started.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-card-foreground">{agent.userName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{agent.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        agent.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {agent.isActive && (
                      <Button variant="outline" size="sm" onClick={() => onDeactivate(agent.id)}>
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
