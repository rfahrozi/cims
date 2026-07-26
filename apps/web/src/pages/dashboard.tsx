import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getPersona } from '@/lib/api';
import { useActiveHearing, type HearingSummary } from '@/lib/hearing-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/page-header';
import {
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileWarning,
  ShieldAlert,
  TriangleAlert,
  Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

// ── Pemetaan persona ke nama peran + instansi ─────────────────────────────

const PERSONA_META: Record<
  string,
  {
    roleName: string;
    orgType: 'COURT' | 'PROSECUTION' | 'CORRECTIONS' | 'SYSTEM';
    orgLabel: string;
  }
> = {
  'substitute-clerk': { roleName: 'Panitera Pengganti', orgType: 'COURT', orgLabel: 'Pengadilan' },
  'court-clerk': { roleName: 'Panitera', orgType: 'COURT', orgLabel: 'Pengadilan' },
  judge: { roleName: 'Majelis Hakim', orgType: 'COURT', orgLabel: 'Pengadilan' },
  prosecutor: { roleName: 'Penuntut Umum', orgType: 'PROSECUTION', orgLabel: 'Kejaksaan' },
  corrections: {
    roleName: 'Petugas Pemasyarakatan',
    orgType: 'CORRECTIONS',
    orgLabel: 'Lapas/Rutan'
  },
  'it-operator': { roleName: 'Operator TI', orgType: 'SYSTEM', orgLabel: 'Tim Teknis' },
  auditor: { roleName: 'Auditor', orgType: 'SYSTEM', orgLabel: 'Pengawasan' },
  'liaison-officer': {
    roleName: 'Pejabat Penghubung',
    orgType: 'SYSTEM',
    orgLabel: 'Lintas Instansi'
  },
  'security-officer': { roleName: 'Security Officer', orgType: 'SYSTEM', orgLabel: 'Keamanan' },
  'system-admin': {
    roleName: 'System Administrator',
    orgType: 'SYSTEM',
    orgLabel: 'Administrasi Sistem'
  }
};

const ORG_BADGE_CLASS: Record<string, string> = {
  COURT: 'bg-blue-100 text-blue-800 border border-blue-200',
  PROSECUTION: 'bg-purple-100 text-purple-800 border border-purple-200',
  CORRECTIONS: 'bg-orange-100 text-orange-800 border border-orange-200',
  SYSTEM: 'bg-slate-100 text-slate-700 border border-slate-200'
};

// ── Sub-komponen widget stat ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  color = 'slate',
  icon: Icon
}: {
  label: string;
  value: string | number;
  color?: 'slate' | 'amber' | 'blue' | 'rose' | 'emerald' | 'purple';
  icon?: React.ElementType;
}) {
  const colorClass: Record<string, string> = {
    slate: 'text-slate-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    rose: 'text-rose-700',
    emerald: 'text-emerald-700',
    purple: 'text-purple-700'
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </CardDescription>
        <CardTitle className={`text-lg ${colorClass[color]}`}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// ── Halaman utama ─────────────────────────────────────────────────────────

export function DashboardPage() {
  const { hearingId, hearing, hearings } = useActiveHearing();
  const persona = getPersona();
  const meta = PERSONA_META[persona] ?? {
    roleName: persona,
    orgType: 'SYSTEM' as const,
    orgLabel: 'Instansi'
  };

  const gate = useQuery({
    queryKey: ['gate', hearingId],
    queryFn: () => api<Gate>(`/hearings/${hearingId}/gate-status`),
    enabled: Boolean(hearingId)
  });

  const stages = gate.data
    ? [
        gate.data.hearing_data,
        gate.data.determination,
        gate.data.schedule,
        gate.data.notice?.ready ?? false,
        gate.data.readiness?.ready ?? false,
        gate.data.virtual_session,
        gate.data.hearing_ended
      ]
    : [];
  const completed = stages.filter(Boolean).length;

  // SLA hanya untuk role pengawasan
  const canSeeSla = [
    'auditor',
    'court-clerk',
    'prosecutor',
    'liaison-officer',
    'system-admin'
  ].includes(persona);

  const slaQuery = useQuery({
    queryKey: ['sla-report'],
    queryFn: () => api<SlaReportItem[]>('/notices/sla-report'),
    enabled: canSeeSla,
    refetchInterval: 30_000
  });

  // Hitung metrik dari daftar perkara (RBAC-filtered dari server)
  const activeHearings = hearings.filter((h) => h.intakeStatus === 'ACTIVE').length;
  const pendingReview = hearings.filter((h) => h.intakeStatus === 'SUBMITTED').length;
  const inSessionHearings = hearings.filter((h) => h.state === 'IN_SESSION').length;
  const completedHearings = hearings.filter((h) => h.state === 'COMPLETED').length;

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const token = localStorage.getItem('cims_token');
    const currentPersona = getPersona();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? '/api/v1'}/notices/sla-report/export`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-cims-dev-persona': currentPersona
          }
        }
      );

      if (!response.ok) throw new Error('Gagal mengunduh laporan SLA');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sla-overdue-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed', err);
      alert('Gagal mengekspor laporan. Terlalu banyak permintaan atau terjadi kesalahan server.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={`Dashboard — ${meta.roleName}`}
        description="Ringkasan tugas operasional persidangan elektronik hari ini berdasarkan peran dan kewenangan Anda."
      />

      {/* ── Badge instansi ── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${ORG_BADGE_CLASS[meta.orgType]}`}
        >
          <Building2 className="h-3.5 w-3.5" />
          {meta.orgLabel}
        </span>
        <span className="text-xs text-slate-400">
          Data yang ditampilkan dibatasi sesuai kewenangan instansi dan penugasan sidang Anda.
        </span>
      </div>

      {/* ── SLA Overdue Banner ── */}
      {canSeeSla && Array.isArray(slaQuery.data) && slaQuery.data.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-red-800">
              <ShieldAlert className="h-5 w-5" />
              SLA Monitoring — {slaQuery.data.length} Pemberitahuan Terlambat (Overdue)
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-red-200 text-red-700 hover:bg-red-100 bg-white"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {exporting ? 'Mengekspor...' : 'Export CSV'}
            </Button>
          </div>
          <p className="mt-1 text-sm text-red-700">
            Terdapat pemberitahuan resmi yang belum di-acknowledge melewati batas waktu (SOP 11).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slaQuery.data.slice(0, 3).map((item) => (
              <div
                key={`${item.noticeId}-${item.recipientName}`}
                className="rounded border border-red-200 bg-white p-3 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium text-slate-800">{item.recipientName}</span>
                  <Badge variant="destructive">
                    {item.overdueMinutes >= 60
                      ? `${Math.round(item.overdueMinutes / 60)}j`
                      : `${item.overdueMinutes}m`}{' '}
                    telat
                  </Badge>
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

      {/* ── Stat Cards per instansi ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* === COURT (Pengadilan) === */}
        {meta.orgType === 'COURT' && (
          <>
            <StatCard
              label="Perkara Aktif"
              value={`${activeHearings} Perkara`}
              color="blue"
              icon={Users}
            />
            <StatCard
              label="Menunggu Aktivasi"
              value={pendingReview > 0 ? `${pendingReview} Perlu Review` : 'Tidak Ada'}
              color={pendingReview > 0 ? 'amber' : 'emerald'}
              icon={TriangleAlert}
            />
            <StatCard
              label="Sidang Berlangsung"
              value={inSessionHearings > 0 ? `${inSessionHearings} Sidang` : 'Tidak Ada'}
              color={inSessionHearings > 0 ? 'emerald' : 'slate'}
              icon={CheckCircle2}
            />
            <StatCard
              label="Selesai"
              value={`${completedHearings} Perkara`}
              color="slate"
              icon={CheckCircle2}
            />
          </>
        )}

        {/* === PROSECUTION (Kejaksaan) === */}
        {meta.orgType === 'PROSECUTION' && (
          <>
            <StatCard
              label="Perkara Terlibat"
              value={`${hearings.length} Total`}
              color="blue"
              icon={Users}
            />
            <StatCard
              label="Overdue Acknowledgment"
              value={
                canSeeSla && Array.isArray(slaQuery.data) && slaQuery.data.length > 0
                  ? `${slaQuery.data.length} Perlu ACK`
                  : 'Semua Tepat Waktu'
              }
              color={
                canSeeSla && Array.isArray(slaQuery.data) && slaQuery.data.length > 0
                  ? 'rose'
                  : 'emerald'
              }
              icon={BellRing}
            />
            <StatCard
              label="Sidang Berlangsung"
              value={inSessionHearings > 0 ? `${inSessionHearings} Sidang` : 'Tidak Ada'}
              color={inSessionHearings > 0 ? 'emerald' : 'slate'}
              icon={CheckCircle2}
            />
            <StatCard
              label="Selesai"
              value={`${completedHearings} Perkara`}
              color="slate"
              icon={CheckCircle2}
            />
          </>
        )}

        {/* === CORRECTIONS (Lapas/Rutan) === */}
        {meta.orgType === 'CORRECTIONS' && (
          <>
            <StatCard
              label="Perkara Terlibat"
              value={`${hearings.length} Total`}
              color="blue"
              icon={Users}
            />
            <StatCard
              label="Sidang Berlangsung"
              value={inSessionHearings > 0 ? `${inSessionHearings} Sidang` : 'Tidak Ada'}
              color={inSessionHearings > 0 ? 'emerald' : 'slate'}
              icon={CheckCircle2}
            />
            <StatCard
              label="Verifikasi Identitas"
              value="Cek Readiness"
              color="amber"
              icon={FileWarning}
            />
            <StatCard label="Status Ruangan" value="Cek Readiness" color="amber" icon={Building2} />
          </>
        )}

        {/* === SYSTEM (IT, Auditor, Liaison, Security, Admin) === */}
        {meta.orgType === 'SYSTEM' && (
          <>
            <StatCard
              label="Total Perkara"
              value={`${hearings.length}`}
              color="blue"
              icon={Users}
            />
            <StatCard
              label="Berlangsung"
              value={`${inSessionHearings}`}
              color={inSessionHearings > 0 ? 'emerald' : 'slate'}
              icon={CheckCircle2}
            />
            <StatCard
              label="SLA Overdue"
              value={canSeeSla && Array.isArray(slaQuery.data) ? `${slaQuery.data.length}` : '—'}
              color={
                canSeeSla && Array.isArray(slaQuery.data) && slaQuery.data.length > 0
                  ? 'rose'
                  : 'emerald'
              }
              icon={Clock}
            />
            <StatCard
              label="Selesai"
              value={`${completedHearings}`}
              color="slate"
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      {/* ── Workflow Gate + Daftar Perkara ── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Gate — Perkara Aktif</CardTitle>
            <CardDescription>
              Persidangan: <strong>{hearing?.caseNumber ?? hearingId}</strong>. Next gate:{' '}
              <Badge variant="outline">{gate.data?.next_gate ?? 'Memuat…'}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gate.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Progress value={stages.length ? (completed / stages.length) * 100 : 0} />
                <div className="grid gap-2 sm:grid-cols-2">
                  {gate.data &&
                    Object.entries({
                      'Data Persidangan': gate.data.hearing_data,
                      'Penetapan Hakim': gate.data.determination,
                      'Jadwal Sidang': gate.data.schedule,
                      Pemberitahuan: gate.data.notice?.ready ?? false,
                      Kesiapan: gate.data.readiness?.ready ?? false,
                      'Ruang Virtual': gate.data.virtual_session,
                      'Sidang Selesai': gate.data.hearing_ended
                    }).map(([label, done]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <span className="text-sm">{label}</span>
                        <Badge variant={done ? 'success' : 'outline'}>
                          {done ? 'PASS' : 'PENDING'}
                        </Badge>
                      </div>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Persidangan — {meta.orgLabel}</CardTitle>
            <CardDescription>
              {hearings.length} perkara yang dapat diakses sesuai kewenangan{' '}
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${ORG_BADGE_CLASS[meta.orgType]}`}
              >
                {meta.orgLabel}
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hearings.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
                  Belum ada data persidangan yang dapat diakses oleh instansi Anda.
                </div>
              )}
              {hearings.map((item: HearingSummary) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition hover:bg-slate-50"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{item.caseNumber}</div>
                    <div className="text-xs text-slate-500">
                      #{item.hearingSequence ?? 1} · {item.type}
                      {item.caseTitle ? ` · ${item.caseTitle}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={item.intakeStatus === 'ACTIVE' ? 'success' : 'warning'}>
                      {item.intakeStatus ?? 'LEGACY'}
                    </Badge>
                    <Badge variant="outline">{item.state}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
