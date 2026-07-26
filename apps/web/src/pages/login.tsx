import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { setPersona, type Persona } from '@/lib/api';

const ROLE_OPTIONS: { value: Persona; label: string }[] = [
  { value: 'substitute-clerk', label: 'Panitera Pengganti (Pengadilan)' },
  { value: 'court-clerk', label: 'Panitera Berwenang (Pengadilan)' },
  { value: 'judge', label: 'Majelis Hakim (Pengadilan)' },
  { value: 'prosecutor', label: 'Penuntut Umum (Kejaksaan)' },
  { value: 'corrections', label: 'Petugas Lapas/Rutan (Pemasyarakatan)' },
  { value: 'it-operator', label: 'Operator TI / Ruang Virtual' },
  { value: 'security-officer', label: 'Security Officer' },
  { value: 'auditor', label: 'Auditor Pengawasan' },
  { value: 'system-admin', label: 'Administrasi Sistem' }
];

export function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Persona>('court-clerk');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Di backend DEV, identitas bergantung penuh pada persona header yang dikirim.
    setTimeout(() => {
      setPersona(selectedRole);
      setLoading(false);
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="flex min-h-screen w-full bg-white font-sans selection:bg-blue-100">
      <div className="flex w-full flex-col justify-center px-6 sm:px-12 md:w-1/2 lg:w-[45%] xl:px-24">
        <div className="absolute top-8 left-8 sm:left-12 lg:left-16 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0b2a4a] text-white">
            <Scale className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0b2a4a]">CIMS</span>
        </div>

        <div className="mx-auto w-full max-w-md pt-16">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Portal CIMS</h1>
            <p className="mt-2 text-sm text-slate-500">
              Sistem Koordinasi Persidangan Pidana Elektronik Lintas Instansi.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 text-left">
              <Label className="text-sm font-medium text-slate-700">Pilih Peran Uji Coba</Label>
              <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as Persona)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih Peran" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-[#0b2a4a] text-base font-semibold hover:bg-blue-900"
            >
              {loading ? 'Memproses...' : 'Masuk Aplikasi'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            © 2026 Mahkamah Agung RI. Lingkungan simulasi UAT.
          </p>
        </div>
      </div>

      <div className="hidden flex-1 bg-[#0b2a4a] md:block relative overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl mix-blend-multiply" />
        <div className="absolute top-48 right-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl mix-blend-multiply" />
        <div className="flex h-full flex-col justify-center px-12 lg:px-24 xl:px-32 relative z-10 text-white text-center">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
            Integrasi Lintas Instansi
          </h2>
          <p className="text-blue-100 text-lg">
            Membangun ekosistem peradilan yang transparan, akuntabel, dan terhubung dalam satu data.
          </p>
        </div>
      </div>
    </div>
  );
}
