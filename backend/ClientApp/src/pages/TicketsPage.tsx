import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import axios from 'axios';
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { TicketStatus, TicketCategory, type Ticket, type TicketsPage } from '../types/ticket';
import { useDebounce } from '../hooks/useDebounce';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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

const PAGE_SIZE = 20;

type Filters = { status: TicketStatus | ''; category: TicketCategory | '' };

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [filters, setFilters] = useState<Filters>({ status: '', category: '' });
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput);
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [search]);

  const sortBy  = sorting[0]?.id ?? 'createdAt';
  const sortDir = (sorting[0]?.desc ?? true) ? 'desc' : 'asc';
  const page    = pagination.pageIndex + 1;

  function setFilter(key: keyof Filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

  function clearFilters() {
    setFilters({ status: '', category: '' });
    setSearchInput('');
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

  const hasActiveFilters = filters.status !== '' || filters.category !== '' || searchInput !== '';

  const { data, isLoading, isError } = useQuery<TicketsPage>({
    queryKey: ['tickets', sortBy, sortDir, page, filters.status, filters.category, search],
    queryFn: () =>
      axios.get<TicketsPage>('/api/tickets', {
        params: {
          sortBy,
          sortDir,
          page,
          pageSize: PAGE_SIZE,
          ...(filters.status   && { status:   filters.status }),
          ...(filters.category && { category: filters.category }),
          ...(search           && { search }),
        },
        withCredentials: true,
      }).then(r => r.data),
  });

  const tickets    = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const pageCount  = Math.ceil(totalCount / PAGE_SIZE);

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ getValue }) => (
        <span className="block max-w-xs truncate font-medium text-card-foreground">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'senderEmail',
      header: 'From',
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue<TicketStatus>();
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => {
        const cat = getValue<TicketCategory | null>();
        return cat ? (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {CATEGORY_LABELS[cat]}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue<string | null>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Received',
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {new Date(getValue<string>()).toLocaleString()}
        </span>
      ),
    },
  ], []);

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting, pagination },
    onSortingChange: updater => {
      setSorting(updater);
      setPagination(prev => ({ ...prev, pageIndex: 0 })); // reset to page 1 on sort change
    },
    onPaginationChange: setPagination,
    manualSorting: true,
    manualPagination: true,
    rowCount: totalCount,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
  });

  const from = totalCount === 0 ? 0 : pagination.pageIndex * PAGE_SIZE + 1;
  const to   = Math.min(pagination.pageIndex * PAGE_SIZE + PAGE_SIZE, totalCount);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search subject or sender…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="h-9 w-64 rounded-md border border-input bg-background py-1 pl-8 pr-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <select
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          {Object.values(TicketStatus).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={e => setFilter('category', e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {isError ? (
        <p className="py-8 text-sm text-destructive">Failed to load tickets.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {header.column.getCanSort() ? (
                          <button
                            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === 'asc'  ? <ArrowUp     className="h-3.5 w-3.5" /> :
                             header.column.getIsSorted() === 'desc' ? <ArrowDown   className="h-3.5 w-3.5" /> :
                                                                       <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No tickets yet. They will appear here when emails arrive.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {!isLoading && totalCount > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {from}–{to} of {totalCount} ticket{totalCount !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="px-2">
                  Page {pagination.pageIndex + 1} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
