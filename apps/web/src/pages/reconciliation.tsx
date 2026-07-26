import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type Result = 'MATCHED' | 'MISMATCH' | 'MISSING_IN_CIMS' | 'MISSING_IN_SOURCE';
type Run = {
  id: string;
  hearingId: string;
  sourceSystem: string;
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  requestedAt: string;
  matchedCount: number;
  mismatchCount: number;
  missingCount: number;
  lastError?: string;
  items: Array<{
    id: string;
    fieldPath: string;
    result: Result;
    cimsValue: unknown;
    sourceValue: unknown;
  }>;
};

export function ReconciliationPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [sourceSystem, setSourceSystem] = useState('SIPP');
  const [output, setOutput] = useState('');
  const query = useQuery({
    queryKey: ['reconciliation', hearingId],
    queryFn: () => api<{ items: Run[] }>(`/hearings/${hearingId}/reconciliation-runs`),
    refetchInterval: 5000
  });

  async function requestRun() {
    try {
      const run = await api<Run>(`/hearings/${hearingId}/reconciliation-runs`, {
        method: 'POST',
        headers: {
          traceparent: `00-${crypto.randomUUID().replaceAll('-', '').slice(0, 32)}-${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}-01`
        },
        body: JSON.stringify({ source_system: sourceSystem })
      });
      setOutput(JSON.stringify(run, null, 2));
      await client.invalidateQueries({ queryKey: ['reconciliation', hearingId] });
    } catch (error) {
      setOutput(String(error));
    }
  }

  return (
    <>
      <PageHeader
        title="Rekonsiliasi Sistem Resmi"
        description="Bandingkan snapshot CIMS dengan sistem administrasi perkara yang ditetapkan sebagai sumber resmi."
      />
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Jalankan rekonsiliasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Hearing</Label>
              <div className="mt-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                {hearingId}
              </div>
            </div>
            <div>
              <Label>Sistem sumber</Label>
              <Select value={sourceSystem} onValueChange={setSourceSystem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['SIPP', 'E-BERPADU', 'OFFICIAL_CASE_SYSTEM'].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={requestRun}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Buat reconciliation run
            </Button>
            <p className="text-xs leading-5 text-slate-500">
              Pada mode PostgreSQL, permintaan masuk transactional outbox dan diproses worker. Mode
              mock menyelesaikan snapshot sintetis secara langsung.
            </p>
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-blue-100">
              {output}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Riwayat dan mismatch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {query.data?.items.map((run) => (
              <div key={run.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{run.sourceSystem}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(run.requestedAt).toLocaleString('id-ID')} · {run.id}
                    </div>
                  </div>
                  <Badge
                    variant={
                      run.status === 'COMPLETED'
                        ? 'success'
                        : run.status === 'FAILED'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {run.status}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <b>{run.matchedCount}</b>
                    <div className="text-xs text-emerald-700">Match</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2">
                    <b>{run.mismatchCount}</b>
                    <div className="text-xs text-amber-700">Mismatch</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-2">
                    <b>{run.missingCount}</b>
                    <div className="text-xs text-rose-700">Missing</div>
                  </div>
                </div>
                {run.lastError && <p className="mt-3 text-sm text-rose-700">{run.lastError}</p>}
                {(run.items || [])
                  .filter((item) => item.result !== 'MATCHED')
                  .map((item) => (
                    <div key={item.id} className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <b>{item.fieldPath}</b>
                        <Badge variant="warning">{item.result}</Badge>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <span className="text-slate-500">CIMS</span>
                          <pre className="overflow-auto">{JSON.stringify(item.cimsValue)}</pre>
                        </div>
                        <div>
                          <span className="text-slate-500">Sumber</span>
                          <pre className="overflow-auto">{JSON.stringify(item.sourceValue)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
            {!query.data?.items.length && (
              <p className="text-sm text-slate-500">Belum ada reconciliation run.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
