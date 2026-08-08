import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import { api, getPersona } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type Result = 'MATCHED' | 'MISMATCH' | 'MISSING_IN_CIMS' | 'MISSING_IN_SOURCE';
type RunItem = {
  id: string;
  fieldPath: string;
  result: Result;
  cimsValue: unknown;
  sourceValue: unknown;
};

type Run = {
  id: string;
  hearingId: string;
  sourceSystem: string;
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RESOLVED';
  requestedAt: string;
  matchedCount: number;
  mismatchCount: number;
  missingCount: number;
  lastError?: string;
  items: RunItem[];
};

export function ReconciliationPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const { user } = useAuth();
  const persona = user?.role || 'UNKNOWN';
  const [sourceSystem, setSourceSystem] = useState('SIPP');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['reconciliation', hearingId],
    queryFn: () => api<{ items: Run[] }>(`/hearings/${hearingId}/reconciliation-runs`),
    refetchInterval: 5000
  });

  async function requestRun() {
    setError(null);
    setSuccess('');
    try {
      await api<Run>(`/hearings/${hearingId}/reconciliation-runs`, {
        method: 'POST',
        headers: {
          traceparent: `00-${crypto.randomUUID().replaceAll('-', '').slice(0, 32)}-${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}-01`
        },
        body: JSON.stringify({ source_system: sourceSystem })
      });
      setOutput('Permintaan rekonsiliasi berhasil dikirim ke antrian.');
      await client.invalidateQueries({ queryKey: ['reconciliation', hearingId] });
    } catch (e) {
      setError(e);
      setOutput(String(e));
    }
  }

  async function resolveConflict(runId: string) {
    setResolvingId(runId);
    setError(null);
    setSuccess('');
    try {
      await api(`/reconciliation-runs/${runId}/resolve`, { method: 'POST' });
      setSuccess('Data CIMS berhasil disinkronkan dengan sumber resmi.');
      await client.invalidateQueries({ queryKey: ['reconciliation', hearingId] });
      await client.invalidateQueries({ queryKey: ['hearings'] }); // refresh list perkara
    } catch (e) {
      setError(e);
    } finally {
      setResolvingId(null);
    }
  }

  // Khusus Panitera & Admin yang boleh melakukan rekonsiliasi
  const canReconcile = ['court-clerk', 'substitute-clerk', 'system-admin'].includes(persona);

  return (
    <>
      <PageHeader
        title="Rekonsiliasi Sistem Resmi"
        description="Bandingkan snapshot data CIMS dengan sistem administrasi perkara yang ditetapkan sebagai sumber resmi (SIPP/e-Berpadu)."
      />

      <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />
      <AlertBanner
        variant="success"
        message={success}
        onDismiss={() => setSuccess('')}
        className="mb-4"
      />

      {hearingId.includes('mismatch') && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm text-sm text-blue-800">
          <div className="font-semibold mb-1 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Mode Simulasi UAT (Mock Mismatch)
          </div>
          Anda sedang mengakses ID perkara yang mengandung kata kunci <strong>mismatch</strong>.
          Gateway integrasi akan secara artifisial mengembalikan data yang berbeda (mismatch) dari
          CIMS untuk keperluan pengujian resolusi konflik.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[.8fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Jalankan Rekonsiliasi</CardTitle>
            <CardDescription>
              Tarik data terbaru dari sistem eksternal untuk dicocokkan dengan data internal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>ID Persidangan (Perkara Aktif)</Label>
              <div className="mt-1 rounded-lg border bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
                {hearingId}
              </div>
            </div>
            <div>
              <Label>Sistem Sumber</Label>
              <Select value={sourceSystem} onValueChange={setSourceSystem}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIPP">SIPP</SelectItem>
                  <SelectItem value="E-BERPADU">E-BERPADU</SelectItem>
                  <SelectItem value="OFFICIAL_CASE_SYSTEM">
                    Sistem Perkara Resmi Nasional
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={requestRun} className="w-full" disabled={!canReconcile}>
              <DownloadCloud className="mr-2 h-4 w-4" />
              Tarik & Bandingkan Data
            </Button>

            <div className="text-xs leading-relaxed text-slate-500 bg-slate-50 p-3 rounded-lg border">
              <strong>Info:</strong> Pada mode PostgreSQL, permintaan masuk{' '}
              <em>transactional outbox</em> dan diproses worker secara asinkron. Pada preproduction
              lokal, ini berjalan secara instan melalui simulasi *MOCK Gateway*.
            </div>

            {output && (
              <div className="mt-4">
                <Label className="text-xs text-slate-500">Log Eksekusi Terakhir</Label>
                <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] font-mono text-blue-100">
                  {output}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Rekonsiliasi</CardTitle>
            <CardDescription>
              Menampilkan hasil komparasi data (Run). Jika terdapat perbedaan (Mismatch), Anda dapat
              melakukan sinkronisasi untuk menimpa data lokal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-150 overflow-y-auto pr-2">
            {query.isLoading && <p className="text-sm text-slate-400">Memuat riwayat...</p>}

            {!query.isLoading && (!query.data?.items || query.data.items.length === 0) && (
              <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
                <RefreshCw className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                Belum ada riwayat rekonsiliasi untuk perkara ini.
              </div>
            )}

            {query.data?.items.map((run) => (
              <div
                key={run.id}
                className={`rounded-xl border p-4 transition-all ${run.status === 'RESOLVED' ? 'bg-slate-50 border-slate-200' : 'bg-white'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      {run.sourceSystem}
                      <span className="text-xs font-mono text-slate-400 font-normal">
                        #{run.id.split('-')[0]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(run.requestedAt).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        dateStyle: 'medium',
                        timeStyle: 'medium'
                      })}{' '}
                      WIB
                    </div>
                  </div>
                  <Badge
                    variant={
                      run.status === 'COMPLETED' || run.status === 'RESOLVED'
                        ? 'success'
                        : run.status === 'FAILED'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {run.status}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2">
                    <div className="text-lg font-bold text-emerald-700">{run.matchedCount}</div>
                    <div className="text-[10px] font-semibold uppercase text-emerald-600">
                      Sesuai
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-2 border ${run.mismatchCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div
                      className={`text-lg font-bold ${run.mismatchCount > 0 ? 'text-amber-700' : 'text-slate-400'}`}
                    >
                      {run.mismatchCount}
                    </div>
                    <div
                      className={`text-[10px] font-semibold uppercase ${run.mismatchCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}
                    >
                      Berbeda
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-2 border ${run.missingCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div
                      className={`text-lg font-bold ${run.missingCount > 0 ? 'text-rose-700' : 'text-slate-400'}`}
                    >
                      {run.missingCount}
                    </div>
                    <div
                      className={`text-[10px] font-semibold uppercase ${run.missingCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}
                    >
                      Hilang
                    </div>
                  </div>
                </div>

                {/* Tampilkan daftar mismatch jika ada */}
                {run.status === 'COMPLETED' && run.mismatchCount > 0 && run.items && (
                  <div className="mt-4 border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Detail Perbedaan
                      (Mismatch)
                    </p>
                    {run.items
                      .filter((item) => item.result === 'MISMATCH')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="text-xs bg-slate-50 border rounded p-2 flex items-center justify-between"
                        >
                          <code className="font-semibold text-slate-800 bg-white px-1 py-0.5 rounded border">
                            {item.fieldPath}
                          </code>
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="line-through opacity-70" title="CIMS Local">
                              {String(item.cimsValue)}
                            </span>
                            <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                            <span className="font-semibold text-blue-700" title="Sistem Resmi">
                              {String(item.sourceValue)}
                            </span>
                          </div>
                        </div>
                      ))}

                    <div className="mt-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => resolveConflict(run.id)}
                        disabled={!canReconcile || resolvingId === run.id}
                      >
                        {resolvingId === run.id
                          ? 'Menyinkronkan...'
                          : 'Terapkan Sinkronisasi (Override)'}
                      </Button>
                    </div>
                  </div>
                )}

                {run.status === 'RESOLVED' && (
                  <div className="mt-3 text-xs text-center text-emerald-600 bg-emerald-50 rounded py-1.5 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Data telah disinkronkan.
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
