import { useActiveHearing } from '@/lib/hearing-context';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function HearingSelector() {
  const { hearingId, hearings, setHearingId, loading } = useActiveHearing();
  return <div className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-3">
    <Label className="text-xs text-blue-100">Persidangan aktif</Label>
    <Select value={hearingId} onValueChange={setHearingId} disabled={loading || (hearings || []).length === 0}>
      <SelectTrigger className="border-white/20 bg-white text-slate-900"><SelectValue placeholder="Pilih persidangan" /></SelectTrigger>
      <SelectContent>{(hearings || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.caseNumber} · #{item.hearingSequence ?? 1}</SelectItem>)}</SelectContent>
    </Select>
    <p className="line-clamp-2 text-[11px] leading-4 text-blue-200">Pilihan ini dipakai oleh seluruh modul workflow.</p>
  </div>;
}
