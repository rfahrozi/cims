import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { errorMessage } from '@/lib/error-messages';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { AlertBanner } from '@/components/alert-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Incident = {
  id: string; type: string; severity: string; status: string;
  title: string; description: string; occurredAt: string;
  notificationDeadline?: string; notifiedAt?: string;
};

const JENIS_LABEL: Record<string, string> = {
  TECHNICAL: 'Gangguan Teknis', CYBER: 'Insiden Siber', FORCE_MAJEURE: 'Keadaan Kahar',
};
const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Rendah', MEDIUM: 'Sedang', HIGH: 'Tinggi', CRITICAL: 'Kritis',
};
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  CLOSED: 'success', RESOLVED: 'outline', MITIGATING: 'warning', OPEN: 'destructive',
};

export function IncidentsPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [type, setType] = useState('TECHNICAL');
  const [severity, setSeverity] = useState('MEDIUM');
  const [title, setTitle] = useState('Gangguan audio');
  const [description, setDescription] = useState('Audio dari lokasi peserta tidak terdengar dengan jelas.');
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState('');

  const query = useQuery({
    queryKey: ['incidents', hearingId],
    queryFn: () => api<Incident[]>(`/hearings/${hearingId}/incidents`),
    enabled: Boolean(hearingId),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['incidents', hearingId] });

  async function create() {
    setError(null); setSuccess('');
    try {
      await api(`/hearings/${hearingId}/incidents`, {
        method: 'POST',
        body: JSON.stringify({ type, severity, title, description }),
      });
      setSuccess('Insiden berhasil dilaporkan. Tim TI telah dinotifikasi.');
      setTitle(''); setDescription('');
      await refresh();
    } catch (e) { setError(e); }
  }

  async function action(id: string, name: string) {
    setError(null);
    try {
      await api(`/incidents/${id}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action: name, notes: `${name} melalui UI` }),
      });
      await refresh();
    } catch (e) { setError(e); }
  }

  const incidents = Array.isArray(query.data) ? query.data : [];

  return <>
    <PageHeader
      title="Insiden"
      description="Gangguan teknis, insiden siber, dan keadaan kahar. Insiden CRITICAL/HIGH akan otomatis menskors sidang yang berlangsung."
    />

    <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />
    <AlertBanner variant="success" message={success} onDismiss={() => setSuccess('')} className="mb-4" />

    <div className="grid gap-5 xl:grid-cols-[.9fr_1.3fr]">
      {/* ── Form lapor insiden ── */}
      <Card>
        <CardHeader><CardTitle>Laporkan insiden</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Jenis Insiden</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(JENIS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {type === 'CYBER' && (
              <p className="text-xs text-amber-600">⏱ Wajib notifikasi dalam 1×24 jam setelah kejadian.</p>
            )}
            {type === 'FORCE_MAJEURE' && (
              <p className="text-xs text-amber-600">⏱ Wajib notifikasi dalam 3×24 jam setelah kejadian.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Tingkat Keparahan</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SEVERITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {(severity === 'CRITICAL' || severity === 'HIGH') && (
              <p className="text-xs text-red-600">⚠ Insiden {SEVERITY_LABEL[severity]} akan otomatis menskors sidang yang sedang berlangsung.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Judul</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Deskripsi singkat gangguan" />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi Lengkap</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Jelaskan apa yang terjadi, dampak, dan tindakan awal yang sudah diambil." />
          </div>
          <Button onClick={create} disabled={!title || !description}>Simpan Insiden</Button>
        </CardContent>
      </Card>

      {/* ── Daftar insiden ── */}
      <Card>
        <CardHeader><CardTitle>Timeline Insiden</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {query.isLoading && <p className="text-sm text-slate-400">Memuat...</p>}

          {/* QW-02: Empty state informatif */}
          {!query.isLoading && incidents.length === 0 && (
            <EmptyState
              icon={ShieldAlert}
              title="Tidak ada insiden"
              description="Belum ada gangguan teknis, insiden siber, atau keadaan kahar yang dilaporkan untuk persidangan ini."
            />
          )}

          {incidents.map(i => (
            <div key={i.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{i.title}</div>
                  <div className="text-sm text-slate-500">
                    {JENIS_LABEL[i.type] ?? i.type} · {SEVERITY_LABEL[i.severity] ?? i.severity}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[i.status] ?? 'outline'}>{i.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700">{i.description}</p>
              {i.notificationDeadline && !i.notifiedAt && (
                <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                  ⏰ Batas pemberitahuan: {new Date(i.notificationDeadline).toLocaleString('id-ID')}
                </div>
              )}
              {i.notifiedAt && (
                <div className="mt-2 text-xs text-green-700">
                  ✓ Dinotifikasi: {new Date(i.notifiedAt).toLocaleString('id-ID')}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => action(i.id, 'START_MITIGATION')}>Mulai Mitigasi</Button>
                <Button size="sm" variant="outline" onClick={() => action(i.id, 'RESOLVE')}>Selesaikan</Button>
                <Button size="sm" onClick={() => action(i.id, 'CLOSE')}>Tutup</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </>;
}
