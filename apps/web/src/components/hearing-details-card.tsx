import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface HearingDetailsCardProps {
  caseType?: string;
  caseNumber: string;
  defendant: string;
  senderCourt: {
    name: string;
    courtNumber: string;
  };
  prosecutorOffice: string;
  relatedPrison: string;
  hearingInfo: {
    date: string;
    time: string;
    agenda: string;
    status: string;
  };
  onClose?: () => void;
  className?: string;
}

export function HearingDetailsCard({
  caseType = "DETAIL PERKARA BANDING",
  caseNumber,
  defendant,
  senderCourt,
  prosecutorOffice,
  relatedPrison,
  hearingInfo,
  onClose,
  className
}: HearingDetailsCardProps) {
  return (
    <div className={cn("flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm w-full max-w-3xl", className)}>
      {/* Header Section */}
      <div className="bg-[#242b6a] px-6 py-5 flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-300/80 uppercase tracking-wider mb-2">
            {caseType}
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">
            {caseNumber}
          </h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-white/10 -mr-2 -mt-2 h-8 w-8"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>

      {/* Main Content Section */}
      <div className="p-6 md:p-8 space-y-7 text-sm">
        {/* Row 1: Terdakwa */}
        <div>
          <Label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 block">
            Terdakwa
          </Label>
          <div className="font-bold text-slate-900 text-[15px]">
            {defendant}
          </div>
        </div>

        {/* Row 2: Pengadilan Negeri Pengirim */}
        <div>
          <Label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 block">
            Pengadilan Negeri Pengirim (PN)
          </Label>
          <div className="font-bold text-slate-900 text-[15px]">
            {senderCourt.name} (No. PN: {senderCourt.courtNumber})
          </div>
        </div>

        {/* Row 3: Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-4">
          <div>
            <Label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 block">
              Kejaksaan Negeri (Kejari)
            </Label>
            <div className="font-bold text-slate-900 text-[15px]">
              {prosecutorOffice}
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 block">
              Lapas / Rutan Terkait
            </Label>
            <div className="font-bold text-slate-900 text-[15px]">
              {relatedPrison}
            </div>
          </div>
        </div>

        {/* Nested Hearing Information Card */}
        <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-5 mt-2 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <Clock className="h-[18px] w-[18px] text-blue-700" strokeWidth={2.5} />
            <h3 className="font-bold text-[#0b2a4a] text-[15px]">Informasi Sidang</h3>
          </div>

          <div className="space-y-2.5 text-[14.5px]">
            <div className="flex gap-2">
              <span className="text-slate-600 font-medium w-[75px] shrink-0">Tanggal:</span>
              <span className="text-slate-700">{hearingInfo.date}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-600 font-medium w-[75px] shrink-0">Waktu:</span>
              <span className="text-slate-700">{hearingInfo.time}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-600 font-medium w-[75px] shrink-0">Agenda:</span>
              <span className="text-slate-700">{hearingInfo.agenda}</span>
            </div>

            <div className="flex gap-2 items-center mt-4 pt-1">
              <span className="text-slate-600 font-medium w-[75px] shrink-0">Status:</span>
              <Badge
                variant="default"
                className="uppercase bg-[#e1eaf7] hover:bg-[#e1eaf7] text-[#1e3a8a] border-none font-bold tracking-wide rounded-md px-3 py-0.5 text-xs"
              >
                {hearingInfo.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}