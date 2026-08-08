import { useEffect, useState } from 'react';
import { ShieldCheck, Scale, BellRing, Lock, Play, ChevronRight, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const ONBOARDING_KEY = 'cims_onboarding_completed';

const ROLE_DISPLAY: Record<string, string> = {
  'substitute-clerk': 'Panitera Pengganti',
  'court-clerk': 'Panitera',
  judge: 'Hakim',
  prosecutor: 'Penuntut Umum',
  corrections: 'Petugas Pemasyarakatan',
  'it-operator': 'Operator TI',
  'security-officer': 'Petugas Keamanan',
  auditor: 'Auditor',
  'system-admin': 'Administrator Sistem',
  'liaison-officer': 'Pejabat Penghubung'
};

const ONBOARDING_STEPS = [
  {
    title: 'Selamat Datang di CIMS',
    description:
      'Court Intelligence Management System (CIMS) adalah platform orkestrasi untuk membantu koordinasi persidangan pidana elektronik lintas instansi (Pengadilan, Kejaksaan, dan Pemasyarakatan).',
    icon: <Scale className="h-12 w-12 text-[#0b2a4a] mb-4" />
  },
  {
    title: 'Sistem Kepatuhan (Hard Gates)',
    description:
      'CIMS menerapkan sistem "Hard Gates". Ini berarti Anda tidak bisa membuat ruang sidang virtual (Zoom/WebEx) sebelum semua persyaratan administratif, seperti Penetapan Hakim, Jadwal, dan Kesiapan Instansi terpenuhi.',
    icon: <Lock className="h-12 w-12 text-amber-500 mb-4" />
  },
  {
    title: 'Pemberitahuan & SLA',
    description:
      'Notifikasi antar-instansi akan dikirim secara otomatis via sistem. Anda dan Pejabat Penghubung dapat memantau SLA Acknowledgment secara real-time pada Dashboard. Pastikan Anda merespon tepat waktu.',
    icon: <BellRing className="h-12 w-12 text-blue-500 mb-4" />
  },
  {
    title: 'Siap Menggunakan CIMS',
    description:
      'Gunakan panel "Active Hearing" di bagian atas halaman untuk fokus pada perkara yang sedang berjalan. Navigasi di sebelah kiri disusun berdasarkan urutan 7 langkah utama persidangan CIMS.',
    icon: <ShieldCheck className="h-12 w-12 text-emerald-500 mb-4" />
  }
];

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [personaName, setPersonaName] = useState('Pengguna');

  useEffect(() => {
    const isCompleted = localStorage.getItem(ONBOARDING_KEY);
    if (isCompleted !== 'true') {
      const { user } = useAuth();
  const persona = user?.role || 'UNKNOWN';
      setPersonaName(ROLE_DISPLAY[persona] ?? persona);
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
  };

  const currentStepData = ONBOARDING_STEPS[step];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      {/*
        Prevent closing dialog via click outside or escape key by simply not doing anything on onOpenChange
        User MUST complete the wizard.
      */}
      <DialogContent
        className="sm:max-w-lg outline-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center p-6 pb-2">
          {currentStepData.icon}

          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0b2a4a] mb-2">
              {step === 0 ? `Halo, ${personaName}!` : currentStepData.title}
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 leading-relaxed max-w-md mx-auto">
              {step === 0 ? (
                <>
                  <p className="mb-4">{currentStepData.description}</p>
                  <p className="text-sm bg-blue-50 text-blue-800 p-3 rounded-md font-medium">
                    Sistem ini disesuaikan khusus untuk akses peran Anda sebagai{' '}
                    <strong>{personaName}</strong>.
                  </p>
                </>
              ) : (
                currentStepData.description
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Progress Indicators ── */}
        <div className="flex justify-center space-x-2 my-6">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === step ? 'w-8 bg-[#0b2a4a]' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="flex sm:justify-between items-center w-full px-6 pb-6">
          <Button
            variant="ghost"
            onClick={handleComplete}
            className="text-slate-400 hover:text-slate-600 text-sm font-medium"
          >
            Lewati Panduan
          </Button>

          {step < ONBOARDING_STEPS.length - 1 ? (
            <Button onClick={handleNext} className="bg-[#0b2a4a] hover:bg-[#1a426f]">
              Lanjut <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="bg-emerald-600 hover:bg-emerald-700">
              Mulai Gunakan CIMS <Play className="ml-2 h-4 w-4 fill-current" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
