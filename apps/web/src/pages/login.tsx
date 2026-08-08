import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.token) {
        localStorage.setItem('cims_token', data.token);
        
        // Also save persona from API response if available, to ensure UI correctly renders navs
        // using the existing logic, assuming the backend returns it as part of the user obj
        if (data.user && data.user.roles && data.user.roles.length > 0) {
          localStorage.setItem('cims_persona', data.user.roles[0]);
          window.dispatchEvent(new Event('cims-persona-change'));
        }
        
        navigate('/dashboard');
      } else {
        throw new Error('Token not received from server');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
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
              <Label htmlFor="username" className="text-sm font-medium text-slate-700">Username</Label>
              <Input 
                id="username" 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                className="h-11"
                required
              />
            </div>
            
            <div className="space-y-2 text-left">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Anda"
                className="h-11"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 font-medium">
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
