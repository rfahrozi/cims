import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Filter, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CalendarEvent = {
  id: string;
  hearing_id: string;
  case_number: string;
  case_title?: string;
  hearing_type: string;
  start_at: string;
  end_at: string;
  resources: Array<{ resourceType: string; resourceId: string; requirement: string }>;
};

export function CalendarPage() {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7));

  const [from, setFrom] = useState(() => startOfWeek.toISOString().slice(0, 10));
  const [to, setTo] = useState(() => endOfWeek.toISOString().slice(0, 10));
  const [orgId, setOrgId] = useState('');

  const query = useQuery({
    queryKey: ['calendar', from, to, orgId],
    queryFn: () => {
      const q = new URLSearchParams();
      // Tambahkan waktu 00:00:00 untuk from, dan 23:59:59 untuk to
      q.set('from', `${from}T00:00:00Z`);
      q.set('to', `${to}T23:59:59Z`);
      if (orgId.trim()) q.set('organization_id', orgId.trim());
      return api<CalendarEvent[]>(`/calendar?${q.toString()}`);
    }
  });

  const events = Array.isArray(query.data) ? query.data : [];

  // Group events by date (YYYY-MM-DD)
  const groupedEvents = events.reduce(
    (acc, event) => {
      const date = event.start_at.slice(0, 10);
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    },
    {} as Record<string, CalendarEvent[]>
  );

  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <>
      <PageHeader
        title="Kalender Sidang (Lintas Instansi)"
        description="Tampilan jadwal aktif dari seluruh persidangan yang dapat diakses oleh Anda."
      />

      <Card className="mb-5 bg-white shadow-sm border-blue-100">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Mulai Tanggal</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Sampai Tanggal</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-slate-500">Filter ID Instansi (Opsional)</Label>
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="Misal: court-demo"
                className="h-9"
              />
            </div>
            <Button variant="outline" className="h-9 border-dashed" onClick={() => query.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-700" />
            Agenda {from} s/d {to}
          </CardTitle>
          <CardDescription>Menampilkan {events.length} jadwal sidang aktif.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading && <p className="text-sm text-slate-400">Memuat kalender...</p>}

          {!query.isLoading && sortedDates.length === 0 && (
            <EmptyState
              icon={Filter}
              title="Tidak ada jadwal"
              description="Belum ada jadwal sidang aktif dalam rentang waktu yang dipilih atau pada instansi Anda."
            />
          )}

          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                <h3 className="mb-3 font-bold text-slate-800 border-b pb-1">
                  {new Date(date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {groupedEvents[date].map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded-xl border bg-slate-50 p-4 transition-colors hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-blue-900">{evt.case_number}</div>
                        <Badge variant="outline" className="bg-white">
                          {evt.hearing_type}
                        </Badge>
                      </div>
                      {evt.case_title && (
                        <div className="text-xs text-slate-600 mb-2">{evt.case_title}</div>
                      )}

                      <div className="mt-3 text-sm grid grid-cols-2 gap-1 bg-white p-2 border rounded-md">
                        <div className="text-slate-500 text-xs">Mulai:</div>
                        <div className="font-medium text-xs">
                          {new Date(evt.start_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-slate-500 text-xs">Selesai:</div>
                        <div className="font-medium text-xs">
                          {new Date(evt.end_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {evt.resources.map((r, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-medium border border-blue-200"
                          >
                            {r.resourceType}: {r.resourceId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
