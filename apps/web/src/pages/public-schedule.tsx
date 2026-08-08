import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  CalendarDays,
  Search,
  List,
  MapPin,
  User,
  Activity,
  Gavel,
  ArrowLeft,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicHearingModal, HearingDetail } from '../components/public-hearing-modal';

export function PublicSchedulePage() {
  const [filter, setFilter] = useState<'Hari Ini' | 'Akan Datang' | 'Selesai'>('Akan Datang');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHearing, setSelectedHearing] = useState<HearingDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hearings, setHearings] = useState<HearingDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real data from API
  useEffect(() => {
    const fetchHearings = async () => {
      try {
        setLoading(true);
        // Using standard fetch instead of the internal api() wrapper to avoid token/auth checks
        // since this is a public endpoint
        const response = await fetch(
          import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/hearings`
            : '/api/v1/hearings'
        );

        if (!response.ok) {
          throw new Error('Failed to fetch hearings');
        }

        const data = await response.json();
        const items = data.items || [];

        // Transform API data to HearingDetail format
        const formattedHearings: HearingDetail[] = items.map((item: any) => {
          // Categorize status based on hearing state
          let status = 'Akan Datang';
          let type = 'Penjadwalan';

          if (item.state === 'COMPLETED' || item.state === 'FINISHED') {
            status = 'Selesai';
            type = 'Selesai / Putus';
          } else if (item.state === 'ACTIVE' || item.state === 'IN_PROGRESS') {
            status = 'Hari Ini';
            type = 'Persidangan Aktif';
          }

          return {
            id: item.id,
            caseNumber: item.caseNumber,
            courtRef: item.courtRef || `No. PN: ${item.caseNumber}`,
            defendantName: item.defendantName || 'Data Tidak Tersedia',
            defendantStatus: item.defendantStatus || 'Tahanan',
            court: item.court || 'Pengadilan Negeri',
            prosecutorOffice: item.prosecutorOffice || 'Kejaksaan Negeri',
            prison: item.prison || 'Lembaga Pemasyarakatan',
            agenda: item.agenda || 'Agenda Persidangan',
            date:
              item.date ||
              new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
            time: item.time || '09:00 WIB',
            room: item.room || 'Ruang Sidang Utama',
            status: status,
            securityLevel: item.securityLevel || status,
            type: type
          };
        });

        setHearings(formattedHearings);
      } catch (error) {
        console.error('Error fetching public hearings:', error);
        setHearings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHearings();
  }, []);

  const filteredHearings = hearings.filter((h) => {
    if (filter === 'Hari Ini' && h.status !== 'Hari Ini') return false;
    if (filter === 'Selesai' && h.status !== 'Selesai') return false;
    if (filter === 'Akan Datang' && h.status !== 'Akan Datang') return false;

    if (searchQuery) {
      return (
        h.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.defendantName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const openModal = (hearing: HearingDetail) => {
    setSelectedHearing(hearing);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50 overflow-x-hidden">
      {/* Background styling */}
      <div className="absolute inset-0 bg-slate-100 z-0 pointer-events-none"></div>

      {/* Header Area */}
      <div className="bg-[#1e293b] border-b border-slate-700 shadow-md z-20 relative text-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg border border-white/20">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-tight">Jadwal Sidang Publik</h1>
              <p className="text-xs font-medium text-slate-400">
                Court Intelligence Management System
              </p>
            </div>
          </div>

          <Link to="/login">
            <Button
              variant="outline"
              className="text-white border-slate-600 hover:bg-slate-700 hover:text-white bg-transparent font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Login
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 pt-8 pb-12 z-10 relative flex-1 flex flex-col">
        {/* Search and Filter Section */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-5 justify-between">
            {/* Search Bar */}
            <div className="flex-1 w-full md:max-w-md relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Cari Nomor Perkara atau Terdakwa..."
                className="pl-10 h-11 bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-slate-500 mr-2">Status:</span>
              <Button
                variant={filter === 'Hari Ini' ? 'default' : 'outline'}
                onClick={() => setFilter('Hari Ini')}
                className={`h-11 ${filter === 'Hari Ini' ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-slate-600'}`}
              >
                Hari Ini
              </Button>
              <Button
                variant={filter === 'Akan Datang' ? 'default' : 'outline'}
                onClick={() => setFilter('Akan Datang')}
                className={`h-11 ${filter === 'Akan Datang' ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-slate-600'}`}
              >
                Akan Datang
              </Button>
              <Button
                variant={filter === 'Selesai' ? 'default' : 'outline'}
                onClick={() => setFilter('Selesai')}
                className={`h-11 ${filter === 'Selesai' ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-slate-600'}`}
              >
                Selesai / Putus
              </Button>
            </div>
          </div>
        </div>

        {/* Grid List Area */}
        <div className="flex-1">
          {loading ? (
            <div className="w-full py-20 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">Memuat data jadwal persidangan...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredHearings.length > 0 ? (
                filteredHearings.map((hearing) => (
                  <Card
                    key={hearing.id}
                    className="flex flex-col bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all h-full"
                  >
                    <CardHeader className="p-5 pb-3 border-b border-slate-50 bg-slate-50/50">
                      <div className="flex justify-between items-start mb-3">
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px] border-slate-200"
                        >
                          {hearing.court}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border-0 ${
                            hearing.status === 'Selesai'
                              ? 'text-teal-700 bg-teal-100'
                              : hearing.status === 'Hari Ini'
                                ? 'text-indigo-700 bg-indigo-100'
                                : 'text-amber-700 bg-amber-100'
                          }`}
                        >
                          {hearing.type || hearing.status}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <CardTitle
                          className="text-lg font-bold text-slate-800 leading-tight line-clamp-1"
                          title={hearing.caseNumber}
                        >
                          {hearing.caseNumber}
                        </CardTitle>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-4 flex-1 space-y-4">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-medium text-slate-500 mb-0.5">Terdakwa</p>
                          <p className="text-sm font-semibold text-slate-800 leading-tight">
                            {hearing.defendantName}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> Tanggal
                          </p>
                          <p className="text-xs font-semibold text-slate-800">{hearing.date}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Waktu
                          </p>
                          <p className="text-xs font-semibold text-slate-800">{hearing.time}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-medium text-slate-500 mb-0.5">
                            Lokasi Ruang
                          </p>
                          <p className="text-sm font-medium text-slate-700">{hearing.room}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <List className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-medium text-slate-500 mb-0.5">Agenda</p>
                          <p className="text-sm font-bold text-slate-700 line-clamp-2">
                            {hearing.agenda}
                          </p>
                        </div>
                      </div>
                    </CardContent>

                    <div className="p-5 pt-0 mt-auto">
                      <Button
                        variant="outline"
                        className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-medium"
                        onClick={() => openModal(hearing)}
                      >
                        <Info className="w-4 h-4 mr-2" />
                        Detail Informasi
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-12">
                  <div className="bg-white border border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-sm max-w-md mx-auto">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                      <CalendarDays className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Data Tidak Ditemukan</h3>
                    <p className="text-sm text-slate-500">
                      Tidak ada jadwal persidangan yang dapat ditampilkan saat ini.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PublicHearingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hearing={selectedHearing}
      />
    </div>
  );
}
