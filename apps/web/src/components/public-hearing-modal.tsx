import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import {
  User,
  Building2,
  Landmark,
  ShieldCheck,
  CalendarClock,
  MapPin,
  Gavel,
  ShieldAlert
} from 'lucide-react';

export interface HearingDetail {
  id: string;
  caseNumber: string;
  defendantName: string;
  defendantStatus: string;
  court: string;
  prosecutorOffice: string;
  prison: string;
  agenda: string;
  date: string;
  time: string;
  room: string;
  status: string;
  securityLevel: string;
  virtualLink?: string;
}

interface PublicHearingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hearing: HearingDetail | null;
}

export function PublicHearingModal({ isOpen, onClose, hearing }: PublicHearingModalProps) {
  if (!hearing) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start pr-6">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Gavel className="w-6 h-6 text-amber-500" />
                Detail Perkara
              </DialogTitle>
              <DialogDescription className="text-lg mt-1 font-medium text-slate-700">
                {hearing.caseNumber}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={`text-sm px-3 py-1 ${
                hearing.status === 'Selesai' ? 'bg-green-100 text-green-800 border-green-200' :
                hearing.status === 'Sedang Berlangsung' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              {hearing.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left Column */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Informasi Terdakwa
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Nama Terdakwa</p>
                    <p className="font-medium">{hearing.defendantName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status Penahanan</p>
                    <Badge variant="outline" className="mt-1">{hearing.defendantStatus}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
                  <CalendarClock className="w-5 h-5 text-blue-500" />
                  Info Sidang
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Agenda</p>
                    <p className="font-medium">{hearing.agenda}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Tanggal</p>
                      <p className="font-medium">{hearing.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Waktu</p>
                      <p className="font-medium">{hearing.time}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Ruang Sidang</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {hearing.room}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
                  <Landmark className="w-5 h-5 text-blue-500" />
                  Instansi Terkait
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Landmark className="w-4 h-4" />
                      Pengadilan Negeri (PN)
                    </p>
                    <p className="font-medium pl-5">{hearing.court}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      Kejaksaan Negeri (Kejari)
                    </p>
                    <p className="font-medium pl-5">{hearing.prosecutorOffice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      Lembaga Pemasyarakatan (Lapas)
                    </p>
                    <p className="font-medium pl-5">{hearing.prison}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-5 h-5 text-blue-600" />
                  Keamanan & Akses Virtual
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-blue-700">Tingkat Keamanan</p>
                    <Badge className="mt-1 bg-blue-600 hover:bg-blue-700">
                      {hearing.securityLevel}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 mb-1">Status Akses Virtual</p>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-slate-700">Jalur Komunikasi Aman (Enkripsi E2E Aktif)</span>
                    </div>
                  </div>
                  {hearing.virtualLink && (
                    <div className="pt-2">
                      <p className="text-xs text-blue-600 mb-1">Tautan Publik Tersedia (Terbatas)</p>
                      <a
                        href={hearing.virtualLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-700 underline hover:text-blue-800"
                      >
                        Akses Streaming Sidang Terbuka
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
