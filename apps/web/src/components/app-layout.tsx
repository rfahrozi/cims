import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BellRing,
  CalendarDays,
  ClipboardCheck,
  FilePenLine,
  Gavel,
  LayoutDashboard,
  Scale,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  Video,
  BookOpen,
  RefreshCw,
  UserCog,
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PersonaSwitcher } from '@/components/persona-switcher';
import { HearingSelector } from '@/components/hearing-selector';
import { ActiveHearingBar } from '@/components/active-hearing-bar';
import { ErrorBoundary } from '@/components/error-boundary';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { getPersona, type Persona } from '@/lib/api';

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: Persona[]; // Jika undefined, bisa diakses oleh semua persona
};

const nav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Kalender Lintas Instansi', icon: CalendarDays },
  {
    to: '/hearing-intake',
    label: 'Data Persidangan',
    icon: FilePenLine,
    roles: ['substitute-clerk', 'court-clerk', 'system-admin']
  },
  {
    to: '/determination',
    label: 'Penetapan Hakim',
    icon: Scale,
    roles: ['judge', 'court-clerk', 'system-admin']
  },
  {
    to: '/scheduling',
    label: 'Jadwal Sidang',
    icon: CalendarDays,
    roles: ['court-clerk', 'judge', 'substitute-clerk', 'system-admin']
  },
  {
    to: '/notices',
    label: 'Pemberitahuan',
    icon: BellRing,
    roles: ['prosecutor', 'corrections', 'court-clerk', 'system-admin']
  },
  {
    to: '/readiness',
    label: 'Kesiapan',
    icon: ClipboardCheck,
    roles: ['court-clerk', 'prosecutor', 'corrections', 'system-admin']
  },
  {
    to: '/virtual-session',
    label: 'Ruang Virtual',
    icon: Video,
    roles: ['it-operator', 'court-clerk', 'system-admin']
  },
  {
    to: '/hearing-control',
    label: 'Kontrol Sidang',
    icon: Gavel,
    roles: ['judge', 'system-admin']
  },
  {
    to: '/participants',
    label: 'Peserta',
    icon: UsersRound,
    roles: [
      'court-clerk',
      'substitute-clerk',
      'prosecutor',
      'corrections',
      'it-operator',
      'system-admin'
    ]
  },
  {
    to: '/attendance',
    label: 'Kehadiran',
    icon: UserRoundCheck,
    roles: ['court-clerk', 'corrections', 'system-admin']
  },
  {
    to: '/consultation',
    label: 'Konsultasi Privat',
    icon: ShieldCheck,
    roles: ['judge', 'court-clerk', 'system-admin']
  },
  {
    to: '/incidents',
    label: 'Insiden',
    icon: ShieldAlert,
    roles: ['court-clerk', 'it-operator', 'security-officer', 'system-admin']
  },
  {
    to: '/appeal-decision',
    label: 'Putusan Banding',
    icon: BookOpen,
    roles: ['judge', 'court-clerk', 'system-admin']
  },
  {
    to: '/reconciliation',
    label: 'Rekonsiliasi (SIPP)',
    icon: RefreshCw,
    roles: ['court-clerk', 'substitute-clerk', 'system-admin']
  },
  {
    to: '/audit',
    label: 'Log Audit',
    icon: ShieldCheck,
    roles: ['auditor', 'security-officer', 'system-admin']
  },
  { to: '/user-management', label: 'Pengelolaan User', icon: UserCog, roles: ['system-admin'] },
  { to: '/admin', label: 'Konfigurasi Admin', icon: Settings, roles: ['system-admin'] }
];

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentPersona = getPersona();

  // Filter menu berdasarkan hak akses
  const authorizedNav = nav.filter((item) => !item.roles || item.roles.includes(currentPersona));

  return (
    <div className="min-h-screen bg-[#f4f7fb] md:grid md:grid-cols-[17.5rem_1fr]">
      <OnboardingWizard />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-70 overflow-y-auto bg-[#0b2a4a] p-5 text-white transition-transform duration-300 md:static md:translate-x-0 md:min-h-screen',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black">CIMS</div>
            <div className="mt-1 text-xs text-blue-200">Koordinasi Persidangan Elektronik</div>
          </div>
          <button
            className="md:hidden p-1 rounded hover:bg-white/10"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 space-y-1">
          {authorizedNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-blue-100 transition hover:bg-white/10',
                  isActive && 'bg-white/15 text-white'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 space-y-3">
          {/* <PersonaSwitcher /> dinonaktifkan untuk pengujian manual */}
          <HearingSelector />
        </div>
        <div className="mt-4 rounded-lg border border-white/15 bg-white/5 p-3 text-xs text-blue-100">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Alur Sidang Elektronik
          </div>
          <p className="mt-2 leading-5">
            Data Perkara → Penetapan → Jadwal → Pemberitahuan → Kesiapan → Ruang Virtual → Sidang
          </p>
        </div>
        <div className="mt-6 border-t border-white/10 pt-4">
          <NavLink
            to="/login"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 hover:text-red-100 transition"
          >
            <LogOut className="h-4 w-4" /> Keluar (Ganti Peran)
          </NavLink>
        </div>
      </aside>

      <main className="min-w-0 p-5 md:p-8 flex-1 w-full max-w-[100vw]">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              className="mt-1 flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0b2a4a]">
                Court Intelligence Management System
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Koordinasi persidangan pidana elektronik lintas instansi
              </p>
            </div>
          </div>
          <Badge variant="success" className="shrink-0">
            v0.20.0 MVP
          </Badge>
        </header>
        <ActiveHearingBar />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
