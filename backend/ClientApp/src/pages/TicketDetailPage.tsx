import { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Check, Loader2, Sparkles } from 'lucide-react';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { TicketStatus, TicketCategory, type TicketDetail, type TicketReply } from '../types/ticket';
import { type AgentOption } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const openai = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

const STATUS_STYLES: Record<TicketStatus, string> = {
  [TicketStatus.Open]:     'bg-amber-500/15 text-amber-400',
  [TicketStatus.Resolved]: 'bg-green-500/15 text-green-400',
  [TicketStatus.Closed]:   'bg-muted text-muted-foreground',
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.GeneralQuestion]:   'General Question',
  [TicketCategory.TechnicalQuestion]: 'Technical Question',
  [TicketCategory.RefundRequest]:     'Refund Request',
};

function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function MessageBody({ body }: { body: string }) {
  const sanitized = useMemo(() => DOMPurify.sanitize(body), [body]);

  if (isHtml(body)) {
    return (
      <div
        className="overflow-auto text-sm [&_*]:max-w-full [&_a]:text-primary [&_a]:underline [&_img]:h-auto"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm text-card-foreground">
      {body}
    </pre>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 px-4 py-2.5">
      <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-card-foreground">{children}</dd>
    </div>
  );
}

function AgentCombobox({
  currentAgentId,
  agents,
  isPending,
  onAssign,
}: {
  currentAgentId: string | null;
  agents: AgentOption[] | undefined;
  isPending: boolean;
  onAssign: (agentId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentAgent = agents?.find(a => a.id === currentAgentId);
  const filtered = useMemo(
    () => (agents ?? []).filter(a =>
      a.userName.toLowerCase().includes(search.toLowerCase())
    ),
    [agents, search],
  );

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setSearch(''); }
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function select(agentId: string | null) {
    onAssign(agentId);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={isPending || !agents}
        onClick={() => setOpen(o => !o)}
        className="flex h-8 min-w-[180px] items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={currentAgent ? 'text-foreground' : 'text-muted-foreground'}>
          {currentAgent?.userName ?? 'Unassigned'}
        </span>
        {isPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-64 rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="w-full rounded-sm border border-input bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-52 overflow-y-auto border-t border-border p-1">
            <button
              type="button"
              onClick={() => select(null)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Check className={`h-3.5 w-3.5 shrink-0 ${currentAgentId === null ? 'opacity-100' : 'opacity-0'}`} />
              <span className="text-muted-foreground">Unassigned</span>
            </button>

            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No agents found</p>
            ) : (
              filtered.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => select(a.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Check className={`h-3.5 w-3.5 shrink-0 ${a.id === currentAgentId ? 'opacity-100' : 'opacity-0'}`} />
                  {a.userName}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusSelect({
  value,
  isPending,
  onChange,
}: {
  value: TicketStatus;
  isPending: boolean;
  onChange: (status: TicketStatus) => void;
}) {
  return (
    <select
      value={value}
      disabled={isPending}
      onChange={e => onChange(e.target.value as TicketStatus)}
      className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {Object.values(TicketStatus).map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

function CategorySelect({
  value,
  isPending,
  onChange,
}: {
  value: TicketCategory | null;
  isPending: boolean;
  onChange: (category: TicketCategory | null) => void;
}) {
  return (
    <select
      value={value ?? ''}
      disabled={isPending}
      onChange={e => onChange(e.target.value === '' ? null : e.target.value as TicketCategory)}
      className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">Uncategorised</option>
      {(Object.entries(CATEGORY_LABELS) as [TicketCategory, string][]).map(([k, label]) => (
        <option key={k} value={k}>{label}</option>
      ))}
    </select>
  );
}

function AssignRow({
  currentAgentId,
  agents,
  isPending,
  onAssign,
}: {
  currentAgentId: string | null;
  agents: AgentOption[] | undefined;
  isPending: boolean;
  onAssign: (agentId: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Assigned To
      </dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2">
        <AgentCombobox
          currentAgentId={currentAgentId}
          agents={agents}
          isPending={isPending}
          onAssign={onAssign}
        />
      </dd>
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isAdmin = user?.roles.includes('Admin') ?? false;

  const ids: number[] = location.state?.ids ?? [];
  const currentId = Number(id);
  const currentIndex = ids.indexOf(currentId);
  const prevId = currentIndex > 0 ? ids[currentIndex - 1] : null;
  const nextId = currentIndex !== -1 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;

  function goTo(targetId: number) {
    navigate(`/tickets/${targetId}`, { state: { ids } });
  }

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: ['ticket', id],
    queryFn: () =>
      axios.get<TicketDetail>(`/api/tickets/${id}`, { withCredentials: true }).then(r => r.data),
    enabled: !!id,
  });

  const { data: agents } = useQuery<AgentOption[]>({
    queryKey: ['agents'],
    queryFn: () =>
      axios.get<AgentOption[]>('/api/agents', { withCredentials: true }).then(r => r.data),
    enabled: isAdmin,
  });

  const canEditStatus = isAdmin || user?.id === ticket?.assignedToId;

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      axios
        .patch<TicketDetail>(`/api/tickets/${id}/status`, { status }, { withCredentials: true })
        .then(r => r.data),
    onSuccess: updated => {
      queryClient.setQueryData<TicketDetail>(['ticket', id], updated);
    },
  });

  const categoryMutation = useMutation({
    mutationFn: (category: TicketCategory | null) =>
      axios
        .patch<TicketDetail>(`/api/tickets/${id}/category`, { category }, { withCredentials: true })
        .then(r => r.data),
    onSuccess: updated => {
      queryClient.setQueryData<TicketDetail>(['ticket', id], updated);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (agentId: string | null) =>
      axios
        .patch<TicketDetail>(`/api/tickets/${id}/assign`, { agentId }, { withCredentials: true })
        .then(r => r.data),
    onSuccess: updated => {
      queryClient.setQueryData<TicketDetail>(['ticket', id], updated);
    },
  });

  const { data: replies = [] } = useQuery<TicketReply[]>({
    queryKey: ['ticket-replies', id],
    queryFn: () =>
      axios.get<TicketReply[]>(`/api/tickets/${id}/replies`, { withCredentials: true }).then(r => r.data),
    enabled: !!id,
  });

  const [replyBody, setReplyBody] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);

  async function handlePolish() {
    setPolishError(null);
    setIsPolishing(true);
    try {
      const { text } = await generateText({
        model: openai('gpt-5-nano'),
        system: 'You are a professional customer support agent. Improve the given draft reply to be clearer, more professional, and more empathetic. Return only the improved reply text with no additional commentary.',
        prompt: replyBody.trim(),
      });
      setReplyBody(text);
    } catch (err) {
      console.error('[Polish]', err);
      const msg = err instanceof Error ? err.message : 'Failed to polish reply. Please try again.';
      setPolishError(msg);
    } finally {
      setIsPolishing(false);
    }
  }

  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      axios
        .post<TicketReply>(`/api/tickets/${id}/replies`, { body }, { withCredentials: true })
        .then(r => r.data),
    onSuccess: newReply => {
      queryClient.setQueryData<TicketReply[]>(['ticket-replies', id], prev => [...(prev ?? []), newReply]);
      setReplyBody('');
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      {/* Top bar: back link + prev/next arrows */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Tickets
        </Link>

        {ids.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={prevId === null}
              onClick={() => prevId !== null && goTo(prevId)}
              title="Previous ticket"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {currentIndex !== -1 && (
              <span className="px-2 text-xs text-muted-foreground">
                {currentIndex + 1} / {ids.length}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              disabled={nextId === null}
              onClick={() => nextId !== null && goTo(nextId)}
              title="Next ticket"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isError ? (
        <p className="py-8 text-sm text-destructive">Failed to load ticket.</p>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : ticket ? (
        <div className="space-y-5">
          {/* Subject + badges */}
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-semibold leading-tight text-foreground">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                {ticket.status}
              </span>
              {ticket.category ? (
                <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                  {CATEGORY_LABELS[ticket.category]}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Uncategorised
                </span>
              )}
            </div>
          </div>

          {/* Metadata */}
          <dl className="divide-y divide-border rounded-lg border border-border bg-card">
            <MetaRow label="From">
              <span className="break-all">{ticket.senderEmail}</span>
            </MetaRow>

            {canEditStatus ? (
              <div className="flex items-center gap-4 px-4 py-2.5">
                <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2">
                  <StatusSelect
                    value={ticket.status}
                    isPending={statusMutation.isPending}
                    onChange={status => statusMutation.mutate(status)}
                  />
                  {statusMutation.isError && (
                    <span className="text-xs text-destructive">Failed to update.</span>
                  )}
                </dd>
              </div>
            ) : (
              <MetaRow label="Status">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                  {ticket.status}
                </span>
              </MetaRow>
            )}

            {isAdmin ? (
              <div className="flex items-center gap-4 px-4 py-2.5">
                <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2">
                  <CategorySelect
                    value={ticket.category}
                    isPending={categoryMutation.isPending}
                    onChange={category => categoryMutation.mutate(category)}
                  />
                  {categoryMutation.isError && (
                    <span className="text-xs text-destructive">Failed to update.</span>
                  )}
                </dd>
              </div>
            ) : (
              <MetaRow label="Category">
                {ticket.category
                  ? CATEGORY_LABELS[ticket.category]
                  : <span className="text-muted-foreground">—</span>}
              </MetaRow>
            )}

            {isAdmin ? (
              <>
                <AssignRow
                  currentAgentId={ticket.assignedToId}
                  agents={agents}
                  isPending={assignMutation.isPending}
                  onAssign={agentId => assignMutation.mutate(agentId)}
                />
                {assignMutation.isError && (
                  <div className="px-4 py-2 text-xs text-destructive">
                    Failed to update assignment. Please try again.
                  </div>
                )}
              </>
            ) : (
              <MetaRow label="Assigned To">
                {ticket.assignedTo ?? <span className="text-muted-foreground">Unassigned</span>}
              </MetaRow>
            )}

            <MetaRow label="Received">
              {new Date(ticket.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </MetaRow>
            {ticket.resolvedAt && (
              <MetaRow label="Resolved">
                {new Date(ticket.resolvedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </MetaRow>
            )}
          </dl>

          {/* Message body */}
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Message</h2>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              <MessageBody body={ticket.body} />
            </div>
          </section>

          {/* AI Summary */}
          {ticket.aiSummary && (
            <section className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI Summary</h2>
              </div>
              <p className="break-words p-4 text-sm text-card-foreground">{ticket.aiSummary}</p>
            </section>
          )}

          {/* Suggested Reply */}
          {ticket.aiSuggestedReply && (
            <section className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Suggested Reply</h2>
              </div>
              <pre className="whitespace-pre-wrap break-words p-4 font-sans text-sm text-card-foreground">
                {ticket.aiSuggestedReply}
              </pre>
            </section>
          )}

          {/* Thread + Reply form */}
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {replies.length > 0 ? `Thread (${replies.length})` : 'Reply'}
              </h2>
            </div>

            {replies.length > 0 && (
              <div className="max-h-[480px] overflow-y-auto py-4">
                {replies.map((reply, index) => (
                  <div key={reply.id} className="flex gap-3 px-4">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${reply.senderType === 'Agent' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                        {(reply.authorName ?? 'C')[0].toUpperCase()}
                      </span>
                      {index < replies.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-5">
                      <div className="mb-1.5 flex items-baseline gap-2">
                        <span className="text-sm font-medium text-card-foreground">
                          {reply.authorName ?? 'Customer'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(reply.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-card-foreground">
                        {reply.body}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ticket.status === TicketStatus.Closed ? (
              <p className={`px-4 py-3 text-xs text-muted-foreground ${replies.length > 0 ? 'border-t border-border' : ''}`}>
                This ticket is closed. Change the status to reply.
              </p>
            ) : (
              <div className={replies.length > 0 ? 'border-t border-border p-4' : 'p-4'}>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (replyBody.trim()) replyMutation.mutate(replyBody.trim());
                  }}
                  className="space-y-3"
                >
                  <textarea
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder="Write a reply…"
                    rows={4}
                    disabled={replyMutation.isPending}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {(replyMutation.isError || polishError) && (
                    <p className="text-xs text-destructive">
                      {polishError ?? 'Failed to send reply. Please try again.'}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!replyBody.trim() || isPolishing || replyMutation.isPending}
                      onClick={handlePolish}
                    >
                      {isPolishing
                        ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                      {isPolishing ? 'Polishing…' : 'Polish'}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!replyBody.trim() || replyMutation.isPending || isPolishing}
                    >
                      {replyMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      {replyMutation.isPending ? 'Sending…' : 'Send Reply'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
