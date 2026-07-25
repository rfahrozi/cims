import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { api, getPersona } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { errorMessage } from '@/lib/error-messages';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type OrganizationReadiness = { organizationType: string; status: string; version?: number };

const ORG_LABEL: Record<string, string> = {
  COURT: 'Pengadilan', PROSECUTION: 'Kejaksaan', CORRECTIONS: 'Pemasyarakatan',
};
const PERSONA_ORG: Record<string, string> = {
  'court-clerk': 'COURT', 'substitute-clerk': 'COURT',
  'prosecutor': 'PROSECUTION',
  'corrections': 'CORRECTIONS',
};

export function ReadinessPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState('');

  const query = useQuery({
    queryKey: ['readiness', hearingId],
    queryFn: () => api<{ gate: { ready: boolean; organizations: OrganizationReadiness[] }; items: unknown[] }>(`/hearings/${hearingId}/readiness`),
    enabled: Boolean(hearingId),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['readiness', hearingId] });

  async function post(path: string, body: unknown, label: string) {
    setError(null); setSuccess('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body) });
      setSuccess(label);
      await refresh();
    } catch (e) { setError(e); }
  }

  const persona = getPersona();
  const myOrgType = PERSONA_ORG[persona];
  const isCorrections = persona === 'corrections';

  async function verifyIdentity() {
    await post(
      `/hearings/${hearingId}/identity-verifications`,
      { participant_reference: 'DEFENDANT-001', method: 'DOCUMENT_AND_VISUAL', result: 'PASS', notes: 'Identitas sesuai dokumen resmi.' },
      'Verifikasi identitas terdakwa berhasil dicatat.',
    );
  }

  async function inspectRoom() {
    await post(
      `/hearings/${hearingId}/room-inspections`,
      { location_code: 'RUTAN-ROOM-01', camera_full_view: true, unauthorized_person_absent: true, confidentiality_ready: true, notes: 'Ruangan steril dan sarana konsultasi tersedia.' },
      'Inspeksi ruangan berhasil dicatat. Kamera, sterilitas, dan kerahasiaan: PASS.',
    );
  }

  async function submit() {
    await post(
      `/hearings/${hearingId}/readiness-submissions`,
      {
        location_code: `${persona.toUpperCase()}-ROOM-01`,
        items: [
          { item_code: 'OFFICER_READY', required: true, result: 'PASS' },
          { item_code: 'FALLBACK_PROCEDURE', required: true, result: 'PASS' },
        ],
        technical_test: {
          camera: 'PASS', microphone: 'PASS', audio: 'PASS',
          primary_network: 'PASS', backup_network: 'PASS', provider_access: 'PASS',
        },
      },
      `Kesiapan ${ORG_LABEL[myOrgType ?? ''] ?? persona} berhasil disubmit.`,
    );
  }

  const organizations = query.data?.gate.organizations ?? [];
  const readyCount = (organizations || []).filter(o => o.status === 'READY').length;
  const total = organizations.length || 3;
  const allReady = query.data?.gate.ready;

  return <>
    <PageHeader
      title="Kesiapan Sidang"
      description="Semua instansi (Pengadilan, Kejaksaan, Pemasyarakatan) harus menyatakan kesiapan sebelum ruang virtual dapat dibuat."
    />

    <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />
    <AlertBanner variant="success" message={success} onDismiss={() => setSuccess('')} className="mb-4" />

    {allReady && (
      <AlertBanner
        variant="success"
        message="Semua instansi sudah siap. Ruang virtual dapat diprovisioning oleh Operator TI."
        className="mb-4"
      />
    )}

    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      {/* ── Panel aksi per persona ── */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Kesiapan</CardTitle>
          <CardDescription>
            Persona aktif: <strong>{persona}</strong>
            {myOrgType && ` (${ORG_LABEL[myOrgType]})`}
            {!myOrgType && <span className="text-amber-600"> — persona ini tidak memiliki aksi kesiapan</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>Kesiapan lintas instansi</span>
              <span className="font-medium">{readyCount}/{total} instansi</span>
            </div>
            <Progress value={(readyCount / total) * 100} className="h-2" />
          </div>

          {/* Status per org */}
          <div className="space-y-2">
            {organizations.length === 0
              ? ['COURT', 'PROSECUTION', 'CORRECTIONS'].map(org => (
                  <div key={org} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{ORG_LABEL[org]}</span>
                    <Badge variant="outline">MISSING</Badge>
                  </div>
                ))
              : organizations.map(item => (
                  <div key={item.organizationType} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{ORG_LABEL[item.organizationType] ?? item.organizationType}</span>
                    <Badge variant={item.status === 'READY' ? 'success' : 'warning'}>{item.status}</Badge>
                  </div>
                ))
            }
          </div>

          {/* Tombol aksi sesuai persona */}
          {myOrgType ? (
            <div className="space-y-2 border-t pt-4">
              {isCorrections && (
                <>
                  <p className="text-xs text-amber-700">
                    ⚠ Pemasyarakatan wajib menyelesaikan verifikasi identitas dan inspeksi ruangan sebelum submit kesiapan.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={verifyIdentity}>Verifikasi Identitas Terdakwa</Button>
                    <Button variant="outline" onClick={inspectRoom}>Inspeksi Ruangan</Button>
                  </div>
                </>
              )}
              <Button onClick={submit} className="w-full">
                Submit Kesiapan {ORG_LABEL[myOrgType]}
              </Button>
            </div>
          ) : (
            /* QW-02: Empty state untuk persona tanpa aksi */
            <EmptyState
              icon={ClipboardCheck}
              title="Tidak ada aksi untuk persona ini"
              description={`Persona "${persona}" tidak memiliki aksi kesiapan. Gunakan persona court-clerk, prosecutor, atau corrections untuk submit kesiapan.`}
              className="mt-2"
            />
          )}
        </CardContent>
      </Card>

      {/* ── Panel panduan ── */}
      <Card>
        <CardHeader><CardTitle>Panduan Checklist Kesiapan</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-3">
            {[
              { org: 'Pengadilan (court-clerk)', items: ['Penetapan elektronik tersedia dan sah', 'Ruang sidang virtual disiapkan', 'Tautan undangan tersedia'] },
              { org: 'Kejaksaan (prosecutor)', items: ['Penuntut Umum siap hadir', 'Dokumen dakwaan/tuntutan tersedia', 'Koneksi internet stabil'] },
              { org: 'Pemasyarakatan (corrections)', items: ['Verifikasi identitas terdakwa ✓', 'Inspeksi sterilitas ruangan ✓', 'Kamera menampilkan seluruh ruang', 'Internet utama dan cadangan tersedia', 'Petugas pendamping siap'] },
            ].map(({ org, items }) => (
              <div key={org} className="rounded-lg border p-3">
                <div className="mb-2 font-semibold text-slate-700">{org}</div>
                <ul className="space-y-1">
                  {items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-slate-600">
                      <span className="mt-0.5 text-slate-300">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </>;
}
