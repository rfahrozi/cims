import { FileText, ChevronDown } from 'lucide-react';
import { useActiveHearing } from '@/lib/hearing-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const STATE_LABEL: Record<string, string> = {
  DRAFT: 'Draf', COORDINATION: 'Koordinasi', IN_PROGRESS: 'Berlangsung',
  READY: 'Siap', COMPLETED: 'Selesai', SUSPENDED: 'Diskors',
  POSTPONED: 'Ditunda', CLOSED: 'Ditutup',
};

const STATE_VARIANT: Record<string, 'success' | 'warning' | 'outline' | 'destructive'> = {
  IN_PROGRESS: 'success', READY: 'success',
  SUSPENDED: 'warning', DRAFT: 'outline', COORDINATION: 'warning',
  POSTPONED: 'destructive', COMPLETED: 'outline', CLOSED: 'outline',
};

/**
 * ActiveHearingBar — bar kontekstual di atas konten utama yang menampilkan
 * perkara aktif saat ini dan memungkinkan pengguna mengganti perkara.
 * Menjawab QW-05: Hearing Selector lebih prominent.
 */
export function ActiveHearingBar() {
  const { hearing, hearings, hearingId, setHearingId, loading } = useActiveHearing();

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
      <FileText className="h-4 w-4 shrink-0 text-blue-700" />
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">
        Perkara aktif:
      </span>

      {/* ── Selector ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Select value={hearingId} onValueChange={setHearingId} disabled={loading || hearings.length === 0}>
          <SelectTrigger className="h-8 min-w-55 max-w-sm border-slate-200 bg-slate-50 text-sm font-medium text-slate-800">
            <SelectValue placeholder="Pilih perkara…" />
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
          </SelectTrigger>
          <SelectContent>
            {(hearings || []).length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">Belum ada perkara.</div>
            )}
            {(hearings || []).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <span className="font-medium">{item.caseNumber}</span>
                <span className="ml-2 text-xs text-slate-400">#{item.hearingSequence ?? 1} · {item.type}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ── Detail perkara terpilih ── */}
        {hearing && (
          <>
            {hearing.caseTitle && (
              <span className="hidden truncate text-sm text-slate-600 md:block max-w-xs">
                {hearing.caseTitle}
              </span>
            )}
            <Badge variant={STATE_VARIANT[hearing.state] ?? 'outline'} className="shrink-0">
              {STATE_LABEL[hearing.state] ?? hearing.state}
            </Badge>
          </>
        )}

        {!hearing && !loading && (
          <span className="text-xs text-amber-600">
            ⚠️ Pilih perkara untuk mulai bekerja
          </span>
        )}
      </div>
    </div>
  );
}
