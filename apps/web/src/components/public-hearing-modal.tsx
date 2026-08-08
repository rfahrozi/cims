import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import {
  Building2,
  Landmark,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Clock,
  User,
  ShieldAlert,
  X,
  FileText
} from 'lucide-react';
import { DialogClose } from '@radix-ui/react-dialog';

export interface HearingDetail {
  id: string;
  caseNumber: string;
  courtRef?: string;
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
  type?: string;
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-slate-50">
        <DialogHeader className="bg-white border-b border-slate-200 p-6 m-0 relative">
          <div className="absolute top-4 right-4">
            <DialogClose className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </DialogClose>
          </div>

          <div className="flex items-start gap-4 pr-8">
            <div className="bg-indigo-100 p-3 rounded-xl hidden sm:block">
              <FileText className="w-6 h-6 text-indigo-700" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                DETAIL PERKARA
              </DialogTitle>
              <DialogDescription className="text-2xl font-bold text-slate-900 mt-1">
                {hearing.caseNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-200">
            <div className="col-span-full">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Terdakwa
              </p>
              <p className="text-lg font-bold text-slate-800">{hearing.defendantName}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Landmark className="w-3.5 h-3.5" />
                Pengadilan Negeri (PN)
              </p>
              <p className="text-sm font-semibold text-slate-800">{hearing.court}</p>
              <p className="text-xs text-slate-500">{hearing.courtRef}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                Kejaksaan Negeri
              </p>
              <p className="text-sm font-semibold text-slate-800">{hearing.prosecutorOffice}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Lapas / Rutan
              </p>
              <p className="text-sm font-semibold text-slate-800">{hearing.prison}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Info Sidang */}
            <div className="lg:col-span-2">
              <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardContent className="p-0">
                  <div className="bg-slate-50 border-b border-slate-100 p-4 px-5">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Informasi Pelaksanaan Sidang
                    </h3>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-slate-50 pb-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Tanggal
                      </p>
                      <p className="text-sm font-medium text-slate-800 md:col-span-3 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        {hearing.date}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-slate-50 pb-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Waktu
                      </p>
                      <p className="text-sm font-medium text-slate-800 md:col-span-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {hearing.time}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-slate-50 pb-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Ruangan
                      </p>
                      <p className="text-sm font-medium text-slate-800 md:col-span-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {hearing.room}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-slate-50 pb-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Agenda
                      </p>
                      <p className="text-sm font-bold text-indigo-700 md:col-span-3">
                        {hearing.agenda}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </p>
                      <div className="md:col-span-3">
                        <Badge
                          variant="outline"
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider border-0 ${
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Security */}
            <div className="lg:col-span-1">
              <Card className="border-amber-200 bg-amber-50 shadow-sm rounded-xl overflow-hidden h-full">
                <CardContent className="p-5 flex flex-col justify-center h-full">
                  <div className="flex flex-col gap-3 text-center items-center">
                    <div className="bg-amber-100 p-3 rounded-full mb-2">
                      <ShieldAlert className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-amber-900">Keamanan Tautan Virtual</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Sesuai standar operasional, <strong>Tautan Zoom Meeting</strong> hanya dapat
                        diakses melalui portal instansi masing-masing (Hakim, Jaksa, Petugas Lapas)
                        dan tidak dipublikasikan secara terbuka untuk umum.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
