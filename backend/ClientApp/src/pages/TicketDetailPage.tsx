import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';
import { TicketStatus, TicketCategory, type TicketDetail } from '../types/ticket';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_STYLES: Record<TicketStatus, string> = {
  [TicketStatus.Open]:     'bg-amber-100 text-amber-700',
  [TicketStatus.Resolved]: 'bg-green-100 text-green-700',
  [TicketStatus.Closed]:   'bg-muted text-muted-foreground',
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.GeneralQuestion]:   'General',
  [TicketCategory.TechnicalQuestion]: 'Technical',
  [TicketCategory.RefundRequest]:     'Refund',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: ['ticket', id],
    queryFn: () =>
      axios.get<TicketDetail>(`/api/tickets/${id}`, { withCredentials: true }).then(r => r.data),
    enabled: !!id,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/tickets"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      {isError ? (
        <p className="py-8 text-sm text-destructive">Failed to load ticket.</p>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : ticket ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{ticket.subject}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                {ticket.status}
              </span>
              {ticket.category && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {CATEGORY_LABELS[ticket.category]}
                </span>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
            <Field label="From">{ticket.senderEmail}</Field>
            <Field label="Assigned To">{ticket.assignedTo ?? '—'}</Field>
            <Field label="Received">{new Date(ticket.createdAt).toLocaleString()}</Field>
            {ticket.resolvedAt && (
              <Field label="Resolved">{new Date(ticket.resolvedAt).toLocaleString()}</Field>
            )}
          </dl>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">Message</h2>
            <pre className="whitespace-pre-wrap text-sm text-card-foreground font-sans">{ticket.body}</pre>
          </section>

          {ticket.aiSummary && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">AI Summary</h2>
              <p className="text-sm text-card-foreground">{ticket.aiSummary}</p>
            </section>
          )}

          {ticket.aiSuggestedReply && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">Suggested Reply</h2>
              <pre className="whitespace-pre-wrap text-sm text-card-foreground font-sans">{ticket.aiSuggestedReply}</pre>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
