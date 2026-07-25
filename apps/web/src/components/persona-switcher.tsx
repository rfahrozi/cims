import { useEffect, useState } from 'react';
import { getPersona, setPersona, type Persona } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const labels: Record<Persona, string> = {
  'substitute-clerk': 'Panitera Pengganti',
  'court-clerk': 'Panitera',
  judge: 'Hakim',
  prosecutor: 'Penuntut Umum',
  corrections: 'Pemasyarakatan',
  'it-operator': 'Operator TI',
  'security-officer': 'Petugas Keamanan',
  auditor: 'Auditor',
  'system-admin': 'System Admin',
};

export function PersonaSwitcher() {
  const [value, setValue] = useState<Persona>(getPersona());
  useEffect(() => { const listener = () => setValue(getPersona()); window.addEventListener('cims-persona-change', listener); return () => window.removeEventListener('cims-persona-change', listener); }, []);
  return <div className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-3">
    <Label className="text-xs text-blue-100">Persona DEV</Label>
    <Select value={value} onValueChange={(next: string) => { setPersona(next as Persona); setValue(next as Persona); }}>
      <SelectTrigger className="border-white/20 bg-white text-slate-900"><SelectValue /></SelectTrigger>
      <SelectContent>{Object.entries(labels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
    </Select>
    <p className="text-[11px] leading-4 text-blue-200">Header persona hanya untuk DEV dan SIT.</p>
  </div>;
}
