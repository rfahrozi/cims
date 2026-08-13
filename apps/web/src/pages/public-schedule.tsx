import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Filter, RefreshCw, Scale, Search, Clock, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Helper function to format date
const formatDate = (dateString: string | number | Date) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatTime = (dateString: string | number | Date) => {
  const d = new Date(dateString);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function PublicSchedulePage() {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7));

  const [from, setFrom] = useState(() => startOfWeek.toISOString().slice(0, 10));
  const [to, setTo] = useState(() => endOfWeek.toISOString().slice(0, 10));
  const [search, setSearch] = useState('');

  // Panggil API (meskipun tidak login, server akan memproses jika public guard aktif)
  const query = useQuery({
    queryKey: ['public-calendar', from, to],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set('from', `${from}T00:00:00Z`);
      q.set('to', `${to}T23:59:59Z`);
      return api<any[]>(`/hearings?${q.toString()}`);
    }
  });

  const events = Array.isArray(query.data) ? query.data : [];

  // Filter lokal berdasarkan pencarian perkara
  const filteredEvents = events.filter(e =>
    !search ||
    e.case_number?.toLowerCase().includes(search.toLowerCase()) ||
    e.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0b2a4a] text-white">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0b2a4a]">CIMS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hidden sm:flex">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 shadow-sm">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
            Jadwal Sidang Elektronik
          </h1>
          <p className="text-lg text-slate-600">
            Informasi publik jadwal persidangan pidana elektronik lintas instansi (Pengadilan, Kejaksaan, Rutan).
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Cari Perkara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Nomor Perkara atau Nama..."
                  className="pl-10 border-slate-300"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">Dari Tanggal</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full md:w-[160px] border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Sampai Tanggal</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full md:w-[160px] border-slate-300"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="mt-2 shrink-0 md:mt-0"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Schedule List */}
        {query.isPending ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 border-dashed bg-slate-50/50">
            <div className="flex flex-col items-center text-slate-400">
              <RefreshCw className="mb-4 h-8 w-8 animate-spin text-blue-500" />
              <p>Memuat jadwal persidangan...</p>
            </div>
          </div>
        ) : query.isError ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 p-6 text-center">
            <p>Terjadi kesalahan saat memuat jadwal. <br/><span className="text-sm opacity-80">Pastikan backend API sudah aktif dan tidak membutuhkan autentikasi untuk route ini.</span></p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 border-dashed bg-slate-50/50">
            <div className="flex flex-col items-center text-slate-500">
              <CalendarDays className="mb-4 h-12 w-12 opacity-20" />
              <p className="text-lg font-medium">Tidak ada jadwal sidang ditemukan</p>
              <p className="text-sm">Cobalah menyesuaikan filter pencarian atau rentang tanggal.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => {
              const startDate = new Date(event.schedule?.start_at || event.created_at);
              const endDate = new Date(event.schedule?.end_at || new Date(startDate.getTime() + 3600000));

              return (
                <div key={event.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        Elektronik
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                        {event.status || 'TERJADWAL'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">
                      {event.case_number || 'No Perkara Belum Tersedia'}
                    </h3>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <div className="flex items-center text-slate-700">
                      <Clock className="mr-3 h-5 w-5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{formatDate(startDate)}</p>
                        <p className="text-sm text-slate-500">
                          {formatTime(startDate)} - {formatTime(endDate)} WIB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start text-slate-700">
                      <Users className="mr-3 h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-slate-900 mb-1">Agenda & Lokasi:</p>
                        <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          <li>Ruang Sidang Virtual (Zoom)</li>
                          <li>Pengadilan Tinggi Kepri</li>
                          <li>Rutan Terkait</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}