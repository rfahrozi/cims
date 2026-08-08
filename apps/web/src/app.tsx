import { Navigate, Route, Routes } from 'react-router-dom';

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
import { ReconciliationPage } from '@/pages/reconciliation';
import { OperationsPage } from '@/pages/operations';
import { GovernancePage } from '@/pages/governance';
import { ZoomPage } from '@/pages/zoom';
import { MigrationPage } from '@/pages/migration';
import { AdminConfigPage } from '@/pages/admin-config';
import { UserManagementPage } from '@/pages/user-management';
import { AuditLogPage } from '@/pages/audit-log';
import { CalendarPage } from '@/pages/calendar';
import { LandingPage } from '@/pages/landing';
import { LoginPage } from '@/pages/login';
import { PublicSchedulePage } from '@/pages/public-schedule';

import { AppLayout } from '@/components/app-layout';
import { HearingProvider } from '@/lib/hearing-context';
import { useAppNotifications } from '@/lib/use-app-notifications';
import { AuthProvider } from '@/lib/auth-context';

function AppContent() {
  // M-08/CU-04: Mengaktifkan kapabilitas Realtime SSE

  return (
    <Routes>
      {/* ── RUTE PUBLIK (Tanpa Sidebar) ── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public-schedule" element={<PublicSchedulePage />} />

      {/* ── RUTE APLIKASI (Dengan Sidebar) ── */}
      <Route
        element={
          <HearingProvider>
            <AppLayout />
          </HearingProvider>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/hearing-intake" element={<HearingIntakePage />} />
        <Route path="/determination" element={<DeterminationPage />} />
        <Route path="/scheduling" element={<SchedulingPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/readiness" element={<ReadinessPage />} />
        <Route path="/virtual-session" element={<VirtualSessionPage />} />
        <Route path="/hearing-control" element={<HearingControlPage />} />
        <Route path="/participants" element={<ParticipantsPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/consultation" element={<ConsultationPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/appeal-decision" element={<AppealDecisionPage />} />

        {/* Route Admin/Teknis */}
        <Route path="/reconciliation" element={<ReconciliationPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/governance" element={<GovernancePage />} />
        <Route path="/zoom" element={<ZoomPage />} />
        <Route path="/migration" element={<MigrationPage />} />
        <Route path="/admin" element={<AdminConfigPage />} />
        <Route path="/user-management" element={<UserManagementPage />} />
        <Route path="/audit" element={<AuditLogPage />} />

        {/* Fallback di dalam AppLayout */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
