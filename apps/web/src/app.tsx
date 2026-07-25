import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { BellRing, CalendarDays, ClipboardCheck, FilePenLine, Gavel, LayoutDashboard, Scale, ShieldAlert, ShieldCheck, UserRoundCheck, UsersRound, Video, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PersonaSwitcher } from '@/components/persona-switcher';
import { HearingSelector } from '@/components/hearing-selector';
import { ActiveHearingBar } from '@/components/active-hearing-bar'; // QW-05
import { DashboardPage } from '@/pages/dashboard';
import { HearingIntakePage } from '@/pages/hearing-intake';
import { DeterminationPage } from '@/pages/determination';
import { SchedulingPage } from '@/pages/scheduling';
import { NoticesPage } from '@/pages/notices';
import { ReadinessPage } from '@/pages/readiness';
import { VirtualSessionPage } from '@/pages/virtual-session';
import { HearingControlPage } from '@/pages/hearing-control';
import { IncidentsPage } from '@/pages/incidents';
import { ConsultationPage } from '@/pages/consultation';
import { AttendancePage } from '@/pages/attendance';
import { ParticipantsPage } from '@/pages/participants';
import { AppealDecisionPage } from '@/pages/appeal-decision';
// MVP-3: Menu teknis disembunyikan dari pengguna operasional.
// Route tetap terdaftar agar developer bisa akses via URL langsung.
import { ReconciliationPage } from '@/pages/reconciliation';
import { OperationsPage } from '@/pages/operations';
import { GovernancePage } from '@/pages/governance';
import { ZoomPage } from '@/pages/zoom';
import { MigrationPage } from '@/pages/migration';

import { CalendarPage } from '@/pages/calendar';

// ── Menu utama — ditampilkan ke semua pengguna operasional ──────────────────
// Urutan mengikuti alur kerja sidang elektronik (SOP 10.1 s/d 10.15)
const nav = [
  ['/dashboard',        'Dashboard',              LayoutDashboard],
  ['/calendar',         'Kalender Lintas Instansi', CalendarDays], // H-04
  ['/hearing-intake',   'Data Persidangan',       FilePenLine],
  ['/determination',    'Penetapan Hakim',        Scale],
  ['/scheduling',       'Jadwal Sidang',          CalendarDays],
  ['/notices',          'Pemberitahuan',          BellRing],
  ['/readiness',        'Kesiapan',               ClipboardCheck],
  ['/virtual-session',  'Ruang Virtual',          Video],
  ['/hearing-control',  'Kontrol Sidang',         Gavel],
  ['/participants',     'Peserta',                UsersRound],
  ['/attendance',       'Kehadiran',              UserRoundCheck],
  ['/consultation',     'Konsultasi Privat',      ShieldCheck],
  ['/incidents',        'Insiden',                ShieldAlert],
  ['/appeal-decision',  'Putusan Banding',        BookOpen],
] as const;

// ── Menu admin/teknis — DISEMBUNYIKAN dari sidebar MVP ─────────────────────
// Masih bisa diakses via URL langsung oleh developer/admin.
// Aktifkan kembali dengan memindahkan ke array `nav` di atas.
// - /reconciliation  : Rekonsiliasi dengan sistem resmi (MOCK, belum live)
// - /operations      : Outbox dan migration posture (hanya relevan untuk tim teknis)
// - /governance      : Legal hold, retention, evidence export (post-MVP)
// - /zoom            : Zoom admin panel langsung (bypass gate, hanya untuk dev)
// - /migration       : Status migrasi teknis (hanya relevan untuk tim teknis)

export default function App() {
  return <div className="min-h-screen bg-[#f4f7fb] md:grid md:grid-cols-[280px_1fr]">
    <aside className="bg-[#0b2a4a] p-5 text-white md:min-h-screen">
      <div className="text-2xl font-black">CIMS</div>
      <div className="mt-1 text-xs text-blue-200">Koordinasi Persidangan Elektronik</div>
      <nav className="mt-8 space-y-1">
        {nav.map(([to, label, Icon]) => <NavLink key={to} to={to} className={({ isActive }: { isActive: boolean }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-blue-100 transition hover:bg-white/10', isActive && 'bg-white/15 text-white')}><Icon className="h-4 w-4" />{label}</NavLink>)}
      </nav>
      <div className="mt-6 space-y-3"><PersonaSwitcher /><HearingSelector /></div>
      <div className="mt-4 rounded-lg border border-white/15 bg-white/5 p-3 text-xs text-blue-100">
        <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Alur Sidang Elektronik</div>
        <p className="mt-2 leading-5">Data Perkara → Penetapan → Jadwal → Pemberitahuan → Kesiapan → Ruang Virtual → Sidang</p>
      </div>
    </aside>
    <main className="min-w-0 p-5 md:p-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0b2a4a]">Court Intelligence Management System</h1>
          <p className="text-sm text-slate-500">Koordinasi persidangan pidana elektronik lintas instansi</p>
        </div>
        <Badge variant="success">v0.19.0 MVP</Badge>
      </header>
      {/* QW-05: Hearing selector prominent di area konten utama */}
      <ActiveHearingBar />
      <Routes>
        {/* ── Alur utama sidang elektronik ── */}
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/calendar"        element={<CalendarPage />} />
        <Route path="/hearing-intake"  element={<HearingIntakePage />} />
        <Route path="/determination"   element={<DeterminationPage />} />
        <Route path="/scheduling"      element={<SchedulingPage />} />
        <Route path="/notices"         element={<NoticesPage />} />
        <Route path="/readiness"       element={<ReadinessPage />} />
        <Route path="/virtual-session" element={<VirtualSessionPage />} />
        <Route path="/hearing-control" element={<HearingControlPage />} />
        <Route path="/participants"    element={<ParticipantsPage />} />
        <Route path="/attendance"      element={<AttendancePage />} />
        <Route path="/consultation"    element={<ConsultationPage />} />
        <Route path="/incidents"       element={<IncidentsPage />} />
        <Route path="/appeal-decision" element={<AppealDecisionPage />} />
        {/* ── Admin/teknis — route aktif, tidak di sidebar ── */}
        <Route path="/reconciliation"  element={<ReconciliationPage />} />
        <Route path="/operations"      element={<OperationsPage />} />
        <Route path="/governance"      element={<GovernancePage />} />
        <Route path="/zoom"            element={<ZoomPage />} />
        <Route path="/migration"       element={<MigrationPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </main>
  </div>;
}
