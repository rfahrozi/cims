import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  CalendarDays,
  Search,
  List,
  LogOut,
  MapPin,
  Clock,
  User,
  Activity,
  Gavel
} from 'lucide-react';
import { PublicHearingModal, HearingDetail } from '../components/public-hearing-modal';

// Mock data
const mockHearings: HearingDetail[] = [
  {
    id: '1',
    caseNumber: 'PDM-123/JKT.SEL/08/2026',
    defendantName: 'Budi Santoso',
    defendantStatus: 'Tahanan Rutan',
    court: 'PN Jakarta Selatan',
    prosecutorOffice: 'Kejari Jakarta Selatan',
    prison: 'Rutan Cipinang',
    agenda: 'Pembacaan Dakwaan',
    date: '08 Agustus 2026',
    time: '09:00 WIB',
    room: 'Ruang Sidang Utama (Virtual)',
    status: 'Sedang Berlangsung',
    securityLevel: 'Standar',
    virtualLink: 'https://cims.go.id/public-stream/1'
  },
  {
    id: '2',
    caseNumber: 'PDM-456/BDG/08/2026',
    defendantName: 'Siti Aminah',
    defendantStatus: 'Tahanan Kota',
    court: 'PN Bandung',
    prosecutorOffice: 'Kejari Bandung',
    prison: 'Lapas Wanita Arcamanik',
    agenda: 'Pemeriksaan Saksi',
    date: '08 Agustus 2026',
    time: '11:00 WIB',
    room: 'Ruang Sidang 2',
    status: 'Akan Datang',
    securityLevel: 'Rendah'
  },
  {
    id: '3',
    caseNumber: 'PDM-789/SBY/08/2026',
    defendantName: 'Agus Pratama',
    defendantStatus: 'Tahanan Lapas',
    court: 'PN Surabaya',
    prosecutorOffice: 'Kejari Surabaya',
    prison: 'Lapas Medaeng',
    agenda: 'Pembacaan Putusan',
    date: '08 Agustus 2026',
    time: '14:00 WIB',
    room: 'Ruang Sidang 1 (Tingkat Tinggi)',
    status: 'Selesai',
    securityLevel: 'Tinggi'
  }
];

export function PublicSchedulePage() {
  const [filter, setFilter] = useState<'Hari Ini' | 'Akan Datang' | 'Selesai'>('Hari Ini');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHearing, setSelectedHearing] = useState<HearingDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredHearings = mockHearings.filter(h => {
    // Basic filter mock logic
    if (filter === 'Hari Ini' && h.status === 'Selesai') return false;
    if (filter === 'Selesai' && h.status !== 'Selesai') return false;
    if (filter === 'Akan Datang' && h.status !== 'Akan Datang') return false;

    if (searchQuery) {
      return h.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
             h.defendantName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const openModal = (hearing: HearingDetail) => {
    setSelectedHearing(hearing);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sedang Berlangsung': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Akan Datang': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Selesai': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md z-10 sticky top-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Gavel className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">CIMS Public Portal</h1>
              <p className="text-xs text-slate-400">Jadwal Sidang Terbuka</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
              <List className="w-4 h-4 mr-2" />
              Daftar Sidang
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
              <CalendarDays className="w-4 h-4 mr-2" />
              Kalender Sidang
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
              <Activity className="w-4 h-4 mr-2" />
              Monitoring Jadwal
            </Button>
          </div>

          <div>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              Kembali ke Login
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Jadwal Persidangan</h2>
            <p className="text-slate-500">Informasi jadwal sidang pengadilan hari ini</p>
          </div>

          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Cari no perkara/terdakwa..."
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['Hari Ini', 'Akan Datang', 'Selesai'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className={filter === f ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white text-slate-600 border-slate-300'}
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHearings.length > 0 ? (
            filteredHearings.map((hearing) => (
              <Card key={hearing.id} className="flex flex-col hover:shadow-lg transition-shadow border-slate-200">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className={getStatusColor(hearing.status)}>
                      {hearing.status}
                    </Badge>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {hearing.securityLevel}
                    </span>
                  </div>
                  <CardTitle className="text-lg text-slate-800 line-clamp-1" title={hearing.caseNumber}>
                    {hearing.caseNumber}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 flex-1 space-y-3">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{hearing.defendantName}</p>
                      <p className="text-xs text-slate-500">{hearing.defendantStatus}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-700">{hearing.court}</p>
                      <p className="text-xs text-slate-500">{hearing.room}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-700">{hearing.date}</p>
                      <p className="text-xs font-medium text-amber-600">{hearing.time}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs text-slate-500 mb-1">Agenda</p>
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{hearing.agenda}</p>
                  </div>
                </CardContent>

                <div className="pt-0 pb-4 px-4 mt-auto">
                  <Button
                    className="w-full bg-slate-900 hover:bg-slate-800"
                    onClick={() => openModal(hearing)}
                  >
                    Detail Perkara
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-lg border border-dashed border-slate-300">
              <Gavel className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Tidak ada jadwal ditemukan</h3>
              <p className="text-slate-500">Coba ubah filter atau kata kunci pencarian.</p>
            </div>
          )}
        </div>
      </main>

      <PublicHearingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hearing={selectedHearing}
      />
    </div>
  );
}