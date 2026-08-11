import { useAuth } from '@/lib/auth-context';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getPersona } from '@/lib/api';
import { errorMessage } from '@/lib/error-messages';
import { useActiveHearing, type HearingSummary } from '@/lib/hearing-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import {
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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

// ── Helper: rentang tanggal bulan ─────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun→jadikan 1=Sen sebagai hari pertama
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];
const HARI_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// ── Komponen kalender mini ─────────────────────────────────────────────────

function MiniCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().slice(0, 10));

  // Fetch kalender bulan ini + bulan depan agar seamless saat navigasi
  const fromDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const lastDay = getDaysInMonth(viewYear, viewMonth);
  const toDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const calQuery = useQuery({
    queryKey: ['dashboard-calendar', fromDate, toDate],
    queryFn: () =>
      api<CalendarEvent[]>(`/calendar?from=${fromDate}T00:00:00Z&to=${toDate}T23:59:59Z`),
    staleTime: 5 * 60 * 1000
  });

  const events = Array.isArray(calQuery.data) ? calQuery.data : [];

  // Kelompokkan per tanggal → { 'YYYY-MM-DD': CalendarEvent[] }
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const d = ev.start_at.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    }
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = today.toISOString().slice(0, 10);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  // Warna dot per jumlah sidang
  function dotColor(count: number) {
    if (count >= 3) return 'bg-rose-500';
    if (count === 2) return 'bg-amber-500';
    return 'bg-blue-500';
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-[#0b2a4a] text-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-300" />
            <CardTitle className="text-base text-white">Kalender Persidangan</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              aria-label="Bulan sebelumnya"
              className="flex h-7 w-7 items-center justify-center rounded-md text-blue-200 hover:bg-white/10 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-30 text-center text-sm font-semibold text-white">
              {BULAN_ID[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              aria-label="Bulan berikutnya"
              className="flex h-7 w-7 items-center justify-center rounded-md text-blue-200 hover:bg-white/10 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <CardDescription className="text-blue-200 text-xs mt-1">
          {events.length > 0
            ? `${events.length} sidang terjadwal bulan ini`
            : 'Tidak ada sidang bulan ini'}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Grid kalender ── */}
        <div className="p-4">
          {/* Header hari */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {HARI_SHORT.map((h) => (
              <div
                key={h}
                className="py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Sel hari */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Offset kosong sebelum hari pertama */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayEvents = eventsByDate[dateStr] ?? [];
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    relative flex flex-col items-center justify-start rounded-lg py-1.5 text-sm font-medium transition-all
                    ${
                      isSelected
                        ? 'bg-[#0b2a4a] text-white shadow-md'
                        : isToday
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300'
                          : hasEvents
                            ? 'hover:bg-slate-100 text-slate-700'
                            : 'hover:bg-slate-50 text-slate-500'
                    }
                  `}
                >
                  <span className="leading-none">{day}</span>
                  {hasEvents && (
                    <span
                      className={`mt-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-blue-300' : dotColor(dayEvents.length)}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Legenda dot ── */}
        <div className="flex items-center gap-4 border-t px-4 py-2">
          {[
            { color: 'bg-blue-500', label: '1 sidang' },
            { color: 'bg-amber-500', label: '2 sidang' },
            { color: 'bg-rose-500', label: '3+ sidang' }
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className={`h-2 w-2 rounded-full ${color}`} />
              {label}
            </div>
          ))}
          {calQuery.isLoading && (
            <span className="ml-auto text-[10px] text-slate-400 animate-pulse">Memuat…</span>
          )}
        </div>

        {/* ── Daftar sidang tanggal terpilih ── */}
        <div className="border-t bg-slate-50">
          <div className="px-4 py-2.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                : 'Pilih tanggal'}
            </p>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="px-4 pb-4 text-center">
              <p className="text-xs text-slate-400">Tidak ada sidang pada tanggal ini.</p>
            </div>
          ) : (
            <div className="space-y-2 px-4 pb-4">
              {selectedEvents.map((ev) => {
                const startTime = new Date(ev.start_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Jakarta'
                });
                const endTime = new Date(ev.end_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Jakarta'
                });
                return (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 rounded-xl border border-blue-100 bg-white p-3 shadow-sm"
                  >
                    {/* Strip waktu */}
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-blue-50 py-1.5 text-center">
                      <span className="text-[11px] font-bold text-blue-700">{startTime}</span>
                      <span className="text-[9px] text-blue-400">—</span>
                      <span className="text-[11px] font-bold text-blue-700">{endTime}</span>
                    </div>
                    {/* Detail */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {ev.case_number}
                      </p>
                      {ev.case_title && (
                        <p className="truncate text-[11px] text-slate-500">{ev.case_title}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {ev.hearing_type}
                        </span>
                        {ev.resources.slice(0, 2).map((r, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                          >
                            {r.resourceId}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Pemetaan persona ke nama peran + instansi ─────────────────────────────

const PERSONA_META: Record<
  string,
  {
    roleName: string;
    orgType: 'COURT' | 'PROSECUTION' | 'CORRECTIONS' | 'SYSTEM';
    orgLabel: string;
  }
> = {
  SUBSTITUTE_CLERK: { roleName: 'Panitera Pengganti', orgType: 'COURT', orgLabel: 'Pengadilan' },
  COURT_CLERK: { roleName: 'Panitera', orgType: 'COURT', orgLabel: 'Pengadilan' },
  JUDGE: { roleName: 'Majelis Hakim', orgType: 'COURT', orgLabel: 'Pengadilan' },
  PROSECUTOR: { roleName: 'Penuntut Umum', orgType: 'PROSECUTION', orgLabel: 'Kejaksaan' },
  CORRECTIONS: {
    roleName: 'Petugas Pemasyarakatan',
    orgType: 'CORRECTIONS',
    orgLabel: 'Lapas/Rutan'
  },
  IT_OPERATOR: { roleName: 'Operator TI', orgType: 'SYSTEM', orgLabel: 'Tim Teknis' },
  AUDITOR: { roleName: 'Auditor', orgType: 'SYSTEM', orgLabel: 'Pengawasan' },
  LIAISON_OFFICER: {
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

// ── Helper: mapping next_gate ke bahasa Indonesia ─────────────────────────
const GATE_LABEL: Record<string, string> = {
  HEARING_DATA: 'Data Persidangan',
  JUDICIAL_DETERMINATION: 'Penetapan Hakim',
  SCHEDULE: 'Jadwal Sidang',
  NOTICE: 'Pemberitahuan',
  READINESS: 'Kesiapan Instansi',
  VIRTUAL_SESSION: 'Ruang Virtual',
  COMPLETED: 'Selesai'
};

export function DashboardPage() {
  const { hearingId, hearing, hearings } = useActiveHearing();
  const { user } = useAuth();
  const persona = user?.role || 'UNKNOWN';
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
        gate.data.schedule,
        gate.data.virtual_session,
        gate.data.determination,
        gate.data.notice?.ready ?? false,
        gate.data.readiness?.ready ?? false,
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
  const [exportError, setExportError] = useState('');

  async function handleExport() {
    setExporting(true);
    setExportError('');
    const token = localStorage.getItem('cims_token');
    const currentPersona = user?.role || 'UNKNOWN'; // use the user from the top of the component

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

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
      setExportError(errorMessage(err));
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

      {exportError && (
        <AlertBanner
          variant="error"
          message={exportError}
          onDismiss={() => setExportError('')}
          className="mb-4"
        />
      )}

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
            Terdapat pemberitahuan resmi yang belum di-acknowledge melewati batas waktu.
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
              label="Status Kesiapan"
              value={
                !hearingId
                  ? 'Pilih perkara'
                  : gate.isLoading
                    ? 'Memuat…'
                    : gate.data?.readiness?.ready
                      ? 'Kesiapan Terpenuhi'
                      : 'Belum Siap'
              }
              color={gate.data?.readiness?.ready ? 'emerald' : hearingId ? 'amber' : 'slate'}
              icon={FileWarning}
            />
            <StatCard
              label="Verifikasi Identitas"
              value={
                !hearingId
                  ? 'Pilih perkara'
                  : gate.isLoading
                    ? 'Memuat…'
                    : gate.data?.readiness?.ready
                      ? 'Terverifikasi'
                      : 'Perlu Verifikasi'
              }
              color={gate.data?.readiness?.ready ? 'emerald' : hearingId ? 'amber' : 'slate'}
              icon={Building2}
            />
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

      {/* ── Workflow Gate + Daftar Perkara + Kalender ── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Gate — Perkara Aktif</CardTitle>
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span>
                Persidangan: <strong>{hearing?.caseNumber ?? hearingId}</strong>. Tahap selanjutnya:
              </span>
              <Badge variant="outline" className="inline-flex">
                {gate.data?.next_gate
                  ? (GATE_LABEL[gate.data.next_gate] ?? gate.data.next_gate)
                  : 'Memuat…'}
              </Badge>
            </div>
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
                      'Jadwal Sidang': gate.data.schedule,
                      'Ruang Virtual': gate.data.virtual_session,
                      'Penetapan Hakim': gate.data.determination,
                      Pemberitahuan: gate.data.notice?.ready ?? false,
                      Kesiapan: gate.data.readiness?.ready ?? false,
                      'Sidang Selesai': gate.data.hearing_ended
                    }).map(([label, done]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <span className="text-sm">{label}</span>
                        <Badge variant={done ? 'success' : 'outline'}>
                          {done ? 'SELESAI' : 'TERTUNDA'}
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
            <div className="text-sm text-slate-500 mt-1">
              {hearings.length} perkara yang dapat diakses sesuai kewenangan{' '}
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${ORG_BADGE_CLASS[meta.orgType]}`}
              >
                {meta.orgLabel}
              </span>
              .
            </div>
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

        {/* ── Kalender Persidangan ── */}
        <MiniCalendar />
      </div>
    </>
  );
}
