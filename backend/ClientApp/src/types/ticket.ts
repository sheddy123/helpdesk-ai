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

export interface TicketsPage {
  items: Ticket[];
  totalCount: number;
  page: number;
  pageSize: number;
}
