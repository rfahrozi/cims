import { useQuery } from '@tanstack/react-query';
import { api, getPersona } from '@/lib/api';
import { useActiveHearing, type HearingSummary } from '@/lib/hearing-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/page-header';
import { BellRing, ShieldAlert } from 'lucide-react';

type Gate = {
  next_gate: string;
  hearing_data: boolean;
  determination: boolean;
  schedule: boolean;
  notice: { ready: boolean };
  readiness: { ready: boolean };
  virtual_session: boolean;
  hearing_ended: boolean;
};

type SlaReportItem = {
  noticeId: string;
  hearingId: string;
  noticeType: string;
  recipientName: string;
  channel: string;
  ackDeadline: string;
  overdueMinutes: number;
};

export function DashboardPage() {
  const { hearingId, hearing, hearings } = useActiveHearing();

  const gate = useQuery({
    queryKey: ['gate', hearingId],
    queryFn: () => api<Gate>(`/hearings/${hearingId}/gate-status`),
    enabled: Boolean(hearingId),
  });

  const stages = gate.data ? [
    gate.data.hearing_data,
    gate.data.determination,
    gate.data.schedule,
    gate.data.notice?.ready ?? false,
    gate.data.readiness?.ready ?? false,
    gate.data.virtual_session,
    gate.data.hearing_ended,
  ] : [];
  const completed = (stages || []).filter(Boolean).length;

  const persona = getPersona();
  // Hanya role pengawasan yang bisa melihat SLA global
  const canSeeSla = ['auditor', 'court-clerk', 'prosecutor', 'liaison-officer', 'system-admin'].includes(persona);

  const slaQuery = useQuery({
    queryKey: ['sla-report'],
    queryFn: () => api<SlaReportItem[]>('/notices/sla-report'),
    enabled: canSeeSla,
    refetchInterval: 30_000,
  });

  return <>
    <PageHeader title="Dashboard" description="Ringkasan data awal persidangan dan workflow lintas instansi." />

    {/* SLA Report Banner */}
    {canSeeSla && Array.isArray(slaQuery.data) && slaQuery.data.length > 0 && (
      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-red-800">
          <ShieldAlert className="h-5 w-5" />
          SLA Monitoring — {slaQuery.data.length} Pemberitahuan Terlambat (Overdue)
        </div>
        <p className="mt-1 text-sm text-red-700">Terdapat pemberitahuan resmi yang belum di-acknowledge melewati batas waktu (SOP 11).</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.isArray(slaQuery.data) && slaQuery.data.slice(0, 3).map((item) => (
            <div key={`${item.noticeId}-${item.recipientName}`} className="rounded border border-red-200 bg-white p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-slate-800">{item.recipientName}</span>
                <Badge variant="destructive">{item.overdueMinutes >= 60 ? `${Math.round(item.overdueMinutes / 60)}h` : `${item.overdueMinutes}m`} telat</Badge>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                <span className="truncate pr-2">{item.noticeType}</span>
                <span>{item.channel}</span>
              </div>
            </div>
          ))}
        </div>
        {slaQuery.data.length > 3 && (
          <div className="mt-3 text-center text-xs text-red-700">
            ... dan {slaQuery.data.length - 3} lainnya. Hubungi pejabat penghubung untuk eskalasi.
          </div>
        )}
      </div>
    )}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[['Backend', 'NestJS + Fastify'], ['Frontend', 'React + shadcn/ui'], ['Data awal', 'Manual oleh Panitera Pengganti'], ['Import DB', 'Fondasi tersedia, belum aktif']].map(([a, b]) => <Card key={a}><CardHeader className="pb-2"><CardDescription>{a}</CardDescription><CardTitle className="text-lg">{b}</CardTitle></CardHeader></Card>)}
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Workflow Gate</CardTitle>
          <CardDescription>
            Persidangan aktif: <strong>{hearing?.caseNumber ?? hearingId}</strong>.
            Next gate: <Badge variant="outline">{gate.data?.next_gate ?? 'Memuat'}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={stages.length ? (completed / stages.length) * 100 : 0} />
          <div className="grid gap-2 sm:grid-cols-2">
            {gate.data && (Object.entries({
              'Data Persidangan': gate.data.hearing_data,
              'Penetapan Hakim': gate.data.determination,
              'Jadwal Sidang': gate.data.schedule,
              'Pemberitahuan': gate.data.notice?.ready ?? false,
              'Kesiapan': gate.data.readiness?.ready ?? false,
              'Ruang Virtual': gate.data.virtual_session,
              'Sidang Selesai': gate.data.hearing_ended,
            }) || []).map(([label, done]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{label}</span>
                <Badge variant={done ? 'success' : 'outline'}>{done ? 'PASS' : 'PENDING'}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Persidangan</CardTitle>
          <CardDescription>{hearings.length} data yang dapat diakses oleh organisasi atau penugasan Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(hearings || []).length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
                Belum ada data persidangan.
              </div>
            )}
            {(hearings || []).map((item: HearingSummary) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition hover:bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-800">{item.caseNumber}</div>
                  <div className="text-xs text-slate-500">
                    #{item.hearingSequence ?? 1} · {item.type} {item.caseTitle ? `· ${item.caseTitle}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={item.intakeStatus === 'ACTIVE' ? 'success' : 'warning'}>{item.intakeStatus ?? 'LEGACY'}</Badge>
                  <Badge variant="outline">{item.state}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </>;
}
