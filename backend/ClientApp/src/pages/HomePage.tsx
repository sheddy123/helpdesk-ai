import type { ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Inbox, Clock, Bot, TrendingUp, Timer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DayCount {
  date: string;
  count: number;
}

interface DashboardData {
  totalTickets: number;
  openTickets: number;
  resolvedByAi: number;
  aiResolutionPercent: number;
  avgResolutionMinutes: number | null;
  ticketsPerDay: DayCount[];
}

function formatDuration(minutes: number): string {
  if (minutes < 60)   return `${Math.round(minutes)} min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} h`;
  return `${(minutes / 1440).toFixed(1)} d`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ElementType;
  iconClass: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-medium uppercase tracking-wide">
            {label}
          </CardDescription>
          <span className={`rounded-md p-1.5 ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-card-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-3.5 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-20" />
        <Skeleton className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () =>
      axios.get<DashboardData>('/api/dashboard', { withCredentials: true }).then(r => r.data),
  });

  const chartData = data?.ticketsPerDay.map(d => ({
    label: formatDate(d.date),
    count: d.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your support queue</p>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Failed to load dashboard data.</p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : data ? (
          <>
            <StatCard
              label="Total Tickets"
              value={data.totalTickets}
              icon={Inbox}
              iconClass="bg-muted text-muted-foreground"
            />
            <StatCard
              label="Open Tickets"
              value={data.openTickets}
              sub={data.totalTickets > 0
                ? `${Math.round(data.openTickets / data.totalTickets * 100)}% of total`
                : undefined}
              icon={Clock}
              iconClass="bg-amber-100 text-amber-600"
            />
            <StatCard
              label="Resolved by AI"
              value={data.resolvedByAi}
              icon={Bot}
              iconClass="bg-green-100 text-green-600"
            />
            <StatCard
              label="AI Resolution Rate"
              value={`${data.aiResolutionPercent}%`}
              sub="of all tickets"
              icon={TrendingUp}
              iconClass="bg-blue-100 text-blue-600"
            />
            <StatCard
              label="Avg Resolution Time"
              value={data.avgResolutionMinutes != null
                ? formatDuration(data.avgResolutionMinutes)
                : '—'}
              sub={data.avgResolutionMinutes != null
                ? 'open to resolved'
                : 'no resolved tickets yet'}
              icon={Timer}
              iconClass="bg-purple-100 text-purple-600"
            />
          </>
        ) : null}
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tickets per day</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : chartData ? (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                  }}
                  formatter={(value: number) => [value, 'Tickets']}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
