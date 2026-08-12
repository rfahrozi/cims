import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { setPersona, type Persona } from '@/lib/api';

// Pemetaan dari email ke DEV persona agar fitur bypass UI DEV tetap konsisten dengan backend DEV
const EMAIL_TO_PERSONA: Record<string, Persona> = {
  'agusman@pt-kepri.go.id': 'substitute-clerk',
  'nurlaili@pt-kepri.go.id': 'substitute-clerk',
  'syaiful@pt-kepri.go.id': 'substitute-clerk',
  'supriadi@pt-kepri.go.id': 'substitute-clerk',
  'sapta@pt-kepri.go.id': 'substitute-clerk',
  'arifin@pt-kepri.go.id': 'judge',
  'zulfahmi@pt-kepri.go.id': 'judge',
  'eliwarti@pt-kepri.go.id': 'judge',
  'wendra@pt-kepri.go.id': 'judge',
  'estiono@pt-kepri.go.id': 'judge',
  'bagus@pt-kepri.go.id': 'judge',
  'elfian@pt-kepri.go.id': 'judge',
  'morgan@pt-kepri.go.id': 'judge',
  'dahlia@pt-kepri.go.id': 'judge',
  'suryadi@pt-kepri.go.id': 'judge',

  'admin@kejati-kepri.go.id': 'prosecutor',
  'admin@kejari-tanjungpinang.go.id': 'prosecutor',
  'admin@kejari-batam.go.id': 'prosecutor',
  'admin@kejari-bintan.go.id': 'prosecutor',
  'admin@kejari-lingga.go.id': 'prosecutor',
  'admin@kejari-karimun.go.id': 'prosecutor',
  'admin@kejari-natuna.go.id': 'prosecutor',
  'admin@kejari-anambas.go.id': 'prosecutor',
  'admin@cabjari-moro.go.id': 'prosecutor',
  'admin@cabjari-tanjungbatu.go.id': 'prosecutor',
  'admin@lapas-batam.go.id': 'corrections',
  'admin@lapas-tanjungpinang.go.id': 'corrections',
  'admin@lapas-perempuan-batam.go.id': 'corrections',
  'admin@lapas-narkotika-tanjungpinang.go.id': 'corrections',
  'admin@lapas-dabo-singkep.go.id': 'corrections',
  'admin@lpka-batam.go.id': 'corrections',
  'admin@rutan-tanjungpinang.go.id': 'corrections',
  'admin@rutan-batam.go.id': 'corrections',
  'admin@rutan-karimun.go.id': 'corrections',
  'clerk@cims.local': 'court-clerk',
  'judge@cims.local': 'judge',
  'prosecutor@cims.local': 'prosecutor',
  'corrections@cims.local': 'corrections',
  'admin@cims.local': 'system-admin'
};

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('agusman@pt-kepri.go.id');
  const [password, setPassword] = useState('Cims123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Lakukan request login Auth ke backend CIMS 
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error?.message || 'Login gagal, periksa email dan kata sandi.');
      }

      // 2. Verify challenge with development OTP
      const verifyRes = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: data.challenge_id, otp: data.development_otp })
      });
      
      const verifyData = await verifyRes.json();
      
      if (!verifyRes.ok) {
        throw new Error('Verifikasi OTP gagal.');
      }

      // 3. Simpan token
      localStorage.setItem('cims_token', verifyData.access_token);
      
      // 4. Set fallback DEV Persona agar tampilan UI (Sidebar/Tombol) terupdate sesuai hak akses
      const mappedPersona = EMAIL_TO_PERSONA[email] || 'substitute-clerk';
      setPersona(mappedPersona);

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
              <Label className="text-sm font-medium text-slate-700">Email Pegawai</Label>
              <Input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@pt-kepri.go.id"
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2 text-left">
              <Label className="text-sm font-medium text-slate-700">Kata Sandi</Label>
              <Input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                required
                className="h-11"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 font-medium bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

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
