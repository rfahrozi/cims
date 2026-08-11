import { useLocation } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveHearingSafe } from '@/lib/hearing-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Definisi langkah alur sidang elektronik ─────────────────────────────────
export const WORKFLOW_STEPS = [
  { path: '/hearing-intake', label: 'Data Perkara', shortLabel: '1', gateKey: 'hearing_data' },
  { path: '/scheduling', label: 'Jadwal', shortLabel: '2', gateKey: 'schedule' },
  { path: '/virtual-session', label: 'Ruang Virtual', shortLabel: '3', gateKey: 'virtual_session' },
  { path: '/determination', label: 'Penetapan Hakim', shortLabel: '4', gateKey: 'determination' },
  { path: '/notices', label: 'Pemberitahuan', shortLabel: '5', gateKey: 'notice' },
  { path: '/readiness', label: 'Kesiapan', shortLabel: '6', gateKey: 'readiness' },
  { path: '/hearing-control', label: 'Sidang', shortLabel: '7', gateKey: 'hearing_ended' }
] as const;

type GateData = {
  hearing_data: boolean;
  determination: boolean;
  schedule: boolean;
  notice: { ready: boolean };
  readiness: { ready: boolean };
  virtual_session: boolean;
  hearing_ended: boolean;
};

function isGateDone(gate: GateData, key: string): boolean {
  const v = gate[key as keyof GateData];
  if (typeof v === 'boolean') return v;
  if (v && typeof v === 'object' && 'ready' in v) return (v as { ready: boolean }).ready;
  return false;
}

export function WorkflowStepper() {
  const location = useLocation();
  // Gunakan versi aman — tidak melempar error jika berada di luar HearingProvider
  const hearingCtx = useActiveHearingSafe();
  const hearingId = hearingCtx?.hearingId ?? '';

  const { data: gate } = useQuery({
    queryKey: ['hearing-gate', hearingId],
    queryFn: () => api<GateData>(`/hearings/${hearingId}/gate-status`),
    enabled: Boolean(hearingId),
    refetchInterval: 15_000 // refresh tiap 15 detik
  });

  // Hanya tampilkan di halaman workflow inti
  const currentStep = WORKFLOW_STEPS.findIndex((s) => location.pathname.startsWith(s.path));
  if (currentStep === -1) return null;

  const currentStepData = WORKFLOW_STEPS[currentStep];
  const doneCount = gate ? WORKFLOW_STEPS.filter((s) => isGateDone(gate, s.gateKey)).length : 0;

  return (
    <div className="mb-5 rounded-xl border bg-white px-4 py-3 shadow-sm">
      {/* ── Progress label ── */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Alur Sidang Elektronik
        </span>
        <span className="text-xs text-slate-400">
          {doneCount} dari {WORKFLOW_STEPS.length} langkah selesai
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${(doneCount / WORKFLOW_STEPS.length) * 100}%` }}
        />
      </div>

      {/* ── Step pills ── */}
      <div className="flex flex-wrap items-center gap-1">
        {WORKFLOW_STEPS.map((step, idx) => {
          const done = gate ? isGateDone(gate, step.gateKey) : false;
          const active = idx === currentStep;
          return (
            <div key={step.path} className="flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : done
                      ? 'bg-green-50 text-green-700'
                      : 'bg-slate-100 text-slate-400'
                )}
              >
                {done && !active ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                ) : (
                  <Circle className={cn('h-3 w-3 shrink-0', active && 'text-blue-200')} />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Current step label (mobile) ── */}
      <div className="mt-2 text-xs text-slate-500 sm:hidden">
        Langkah {currentStep + 1}: <strong>{currentStepData.label}</strong>
      </div>
    </div>
  );
}
