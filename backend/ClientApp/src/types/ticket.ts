export enum TicketStatus {
  Open     = 'Open',
  Resolved = 'Resolved',
  Closed   = 'Closed',
}

export enum TicketCategory {
  GeneralQuestion   = 'GeneralQuestion',
  TechnicalQuestion = 'TechnicalQuestion',
  RefundRequest     = 'RefundRequest',
}

export interface Ticket {
  id: number;
  senderEmail: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory | null;
  assignedTo: string | null;
  createdAt: string;
}

export interface TicketDetail extends Ticket {
  body: string;
  aiSummary: string | null;
  aiSuggestedReply: string | null;
  resolvedAt: string | null;
}

export interface TicketsPage {
  items: Ticket[];
  totalCount: number;
  page: number;
  pageSize: number;
}
