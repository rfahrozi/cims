import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Readiness = {
  decision: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
  release: string;
  checks: Array<{
    code: string;
    status: 'PASS' | 'WARNING' | 'FAIL';
    blocking: boolean;
    message: string;
  }>;
  generated_at: string;
};
type LegalHold = {
  id: string;
  holdType: string;
  officialReference: string;
  reason: string;
  status: 'ACTIVE' | 'RELEASED';
  createdAt: string;
  createdBy: string;
};
type ExportRecord = {
  id: string;
  status: string;
  exportFormat: string;
  requestedAt: string;
  itemCount: number;
  manifestHash?: string;
  objectHash?: string;
  storageUri?: string;
  lastError?: string;
};
type Policy = {
  id: string;
  policyCode: string;
  retentionDays?: number;
  dispositionAction: string;
  enabled: boolean;
  legalBasisReference?: string;
};
type Preview = {
  id: string;
  eligibilityStatus: string;
  eligibleForReview: boolean;
  activeLegalHoldCount: number;
  closureAt?: string;
  dueAt?: string;
};
type AccessReview = {
  id: string;
  campaignName: string;
  status: string;
  dueAt: string;
  items: Array<{
    id: string;
    subjectUserId: string;
    assignmentRole: string;
    status: string;
    hearingId: string;
  }>;
};

export function GovernancePage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [holdType, setHoldType] = useState('AUDIT');
  const [holdReason, setHoldReason] = useState('Pengamanan data untuk pemeriksaan dan audit.');
  const [holdReference, setHoldReference] = useState('REF-GOV-001');
  const [policyCode, setPolicyCode] = useState('CIMS_HEARING_REVIEW_ONLY');
  const [campaignId, setCampaignId] = useState('');
  const [output, setOutput] = useState('');

  const readiness = useQuery({
    queryKey: ['production-readiness'],
    queryFn: () => api<Readiness>('/production-readiness'),
    retry: false
  });
  const holds = useQuery({
    queryKey: ['legal-holds', hearingId],
    queryFn: () => api<{ items: LegalHold[] }>(`/hearings/${hearingId}/legal-holds`),
    retry: false
  });
  const exportsQuery = useQuery({
    queryKey: ['evidence-exports', hearingId],
    queryFn: () => api<{ items: ExportRecord[] }>(`/hearings/${hearingId}/evidence-exports`),
    refetchInterval: 5000,
    retry: false
  });
  const policies = useQuery({
    queryKey: ['retention-policies'],
    queryFn: () => api<{ items: Policy[] }>('/retention/policies'),
    retry: false
  });
  const campaign = useQuery({
    queryKey: ['access-review', campaignId],
    queryFn: () => api<AccessReview>(`/access-reviews/${campaignId}`),
    enabled: Boolean(campaignId),
    retry: false
  });

  const blocking = useMemo(
    () => readiness.data?.checks.filter((item) => item.blocking && item.status !== 'PASS') ?? [],
    [readiness.data]
  );

  async function createHold() {
    try {
      const result = await api<LegalHold>(`/hearings/${hearingId}/legal-holds`, {
        method: 'POST',
        body: JSON.stringify({
          hold_type: holdType,
          reason: holdReason,
          official_reference: holdReference
        })
      });
      setOutput(JSON.stringify(result, null, 2));
      await client.invalidateQueries({ queryKey: ['legal-holds', hearingId] });
    } catch (error) {
      setOutput(String(error));
    }
  }

  async function releaseHold(id: string) {
    try {
      const result = await api<LegalHold>(`/legal-holds/${id}/release`, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Dasar pelepasan telah diverifikasi oleh pemeriksa yang berbeda.'
        })
      });
      setOutput(JSON.stringify(result, null, 2));
      await client.invalidateQueries({ queryKey: ['legal-holds', hearingId] });
    } catch (error) {
      setOutput(String(error));
    }
  }

  async function previewRetention() {
    try {
      const result = await api<Preview>(`/hearings/${hearingId}/retention-preview`, {
        method: 'POST',
        body: JSON.stringify({ policy_code: policyCode })
      });
      setOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setOutput(String(error));
    }
  }

  async function createExport() {
    try {
      const result = await api<ExportRecord>(`/hearings/${hearingId}/evidence-exports`, {
        method: 'POST',
        body: JSON.stringify({ export_format: 'JSON' })
      });
      setOutput(JSON.stringify(result, null, 2));
      await client.invalidateQueries({ queryKey: ['evidence-exports', hearingId] });
    } catch (error) {
      setOutput(String(error));
    }
  }

  async function createAccessReview() {
    try {
      const result = await api<AccessReview>('/access-reviews', {
        method: 'POST',
        body: JSON.stringify({
          campaign_name: `Review akses ${hearingId}`,
          hearing_id: hearingId,
          due_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
        })
      });
      setCampaignId(result.id);
      setOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setOutput(String(error));
    }
  }

  async function decide(campaignIdValue: string, itemId: string, decision: 'KEEP' | 'REVOKE') {
    try {
      const result = await api<AccessReview>(
        `/access-reviews/${campaignIdValue}/items/${itemId}/decision`,
        {
          method: 'POST',
          body: JSON.stringify({
            decision,
            reason:
              decision === 'KEEP'
                ? 'Akses masih diperlukan untuk tugas aktif.'
                : 'Penugasan sudah berakhir.'
          })
        }
      );
      setOutput(JSON.stringify(result, null, 2));
      await campaign.refetch();
    } catch (error) {
      setOutput(String(error));
    }
  }

  return (
    <>
      <PageHeader
        title="Tata Kelola Produksi"
        description="Legal hold, evidence export, retention preview, access review, dan production readiness gate."
      />
      <div className="mb-5 flex justify-end">
        <Button
          variant="outline"
          onClick={() =>
            Promise.all([
              readiness.refetch(),
              holds.refetch(),
              exportsQuery.refetch(),
              policies.refetch()
            ])
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <div className="mt-3 text-xs text-slate-500">Production gate</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-bold">{readiness.data?.decision ?? 'N/A'}</span>
              <Badge
                variant={
                  readiness.data?.decision === 'GO'
                    ? 'success'
                    : readiness.data?.decision === 'NO_GO'
                      ? 'destructive'
                      : 'warning'
                }
              >
                {readiness.data?.release ?? '-'}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {blocking.length} blocking check belum lulus
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <LockKeyhole className="h-5 w-5 text-blue-700" />
            <div className="mt-3 text-xs text-slate-500">Legal hold aktif</div>
            <div className="text-xl font-bold">
              {holds.data?.items.filter((item) => item.status === 'ACTIVE').length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <FileCheck2 className="h-5 w-5 text-blue-700" />
            <div className="mt-3 text-xs text-slate-500">Evidence export</div>
            <div className="text-xl font-bold">{exportsQuery.data?.items.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Legal hold</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Jenis</Label>
              <Select value={holdType} onValueChange={setHoldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['LITIGATION', 'INVESTIGATION', 'AUDIT', 'COURT_ORDER', 'OTHER'].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referensi resmi</Label>
              <Input
                value={holdReference}
                onChange={(event) => setHoldReference(event.target.value)}
              />
            </div>
            <div>
              <Label>Alasan</Label>
              <Textarea
                value={holdReason}
                onChange={(event) => setHoldReason(event.target.value)}
              />
            </div>
            <Button onClick={createHold}>
              <LockKeyhole className="mr-2 h-4 w-4" />
              Aktifkan legal hold
            </Button>
            <div className="space-y-2">
              {holds.data?.items?.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <div>
                      <b>{item.holdType}</b>
                      <div className="text-xs text-slate-500">{item.officialReference}</div>
                    </div>
                    <Badge variant={item.status === 'ACTIVE' ? 'warning' : 'outline'}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-slate-600">{item.reason}</p>
                  {item.status === 'ACTIVE' && (
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      onClick={() => releaseHold(item.id)}
                    >
                      Lepaskan
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Membuat paket JSON dengan manifest dan hash SHA-256. File disimpan melalui evidence
              storage adapter.
            </p>
            <Button onClick={createExport}>
              <FileCheck2 className="mr-2 h-4 w-4" />
              Buat evidence export
            </Button>
            <div className="space-y-2">
              {exportsQuery.data?.items?.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <div>
                      <b>{item.exportFormat}</b>
                      <div className="text-xs text-slate-500">
                        {new Date(item.requestedAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <Badge
                      variant={
                        item.status === 'COMPLETED'
                          ? 'success'
                          : item.status === 'FAILED'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-2 break-all text-xs text-slate-500">
                    Manifest: {item.manifestHash ?? '-'}
                  </div>
                  {item.lastError && <p className="mt-2 text-rose-700">{item.lastError}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retention preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Fase ini hanya melakukan preview. Penghapusan otomatis tetap dinonaktifkan.
            </p>
            <div>
              <Label>Kebijakan</Label>
              <Select value={policyCode} onValueChange={setPolicyCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(policies.data?.items ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.policyCode}>
                      {item.policyCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={previewRetention}>
              <Archive className="mr-2 h-4 w-4" />
              Jalankan preview
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Snapshot penugasan pengguna dan keputusan KEEP atau REVOKE dengan larangan
              self-approval.
            </p>
            <Button onClick={createAccessReview}>
              <UserCheck className="mr-2 h-4 w-4" />
              Buat campaign
            </Button>
            {campaign.data && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <b>{campaign.data.campaignName}</b>
                  <Badge variant={campaign.data.status === 'COMPLETED' ? 'success' : 'warning'}>
                    {campaign.data.status}
                  </Badge>
                </div>
                {(campaign.data.items || []).map((item) => (
                  <div key={item.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <b>{item.subjectUserId}</b>
                        <div className="text-xs text-slate-500">{item.assignmentRole}</div>
                      </div>
                      <Badge variant={item.status === 'PENDING' ? 'warning' : 'outline'}>
                        {item.status}
                      </Badge>
                    </div>
                    {item.status === 'PENDING' && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide(campaign.data!.id, item.id, 'KEEP')}
                        >
                          Keep
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => decide(campaign.data!.id, item.id, 'REVOKE')}
                        >
                          Revoke
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-blue-100">
            {output || 'Belum ada aksi.'}
          </pre>
        </CardContent>
      </Card>
    </>
  );
}
