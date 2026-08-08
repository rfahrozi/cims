import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { api, getPersona } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type OrganizationReadiness = { organizationType: string; status: string; version?: number };

const ORG_LABEL: Record<string, string> = {
  COURT: 'Pengadilan',
  PROSECUTION: 'Kejaksaan',
  CORRECTIONS: 'Pemasyarakatan'
};
const PERSONA_ORG: Record<string, string> = {
  'court-clerk': 'COURT',
  'substitute-clerk': 'COURT',
  prosecutor: 'PROSECUTION',
  corrections: 'CORRECTIONS'
};

// CU-05: Template checklist kesiapan standar per instansi
const CHECKLIST_TEMPLATES: Record<
  string,
  Array<{ code: string; label: string; required: boolean }>
> = {
  COURT: [
    { code: 'JUDGE_AVAILABLE', label: 'Hakim/Majelis siap bersidang', required: true },
    { code: 'VIRTUAL_ROOM_READY', label: 'Infrastruktur ruang sidang berfungsi', required: true },
    { code: 'FALLBACK_PROCEDURE', label: 'Prosedur cadangan telah disiapkan', required: false }
  ],
  PROSECUTION: [
    { code: 'PROSECUTOR_AVAILABLE', label: 'Penuntut Umum siap hadir', required: true },
    { code: 'DOCUMENTS_READY', label: 'Dokumen dakwaan/tuntutan/bukti tersedia', required: true }
  ],
  CORRECTIONS: [
    { code: 'DEFENDANT_VERIFIED', label: 'Verifikasi identitas terdakwa', required: true },
    { code: 'ROOM_INSPECTED', label: 'Inspeksi sterilitas ruangan', required: true },
    { code: 'ESCORT_OFFICER_READY', label: 'Petugas pendamping siap', required: true }
  ]
};

export function ReadinessPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState('');

  const query = useQuery({
    queryKey: ['readiness', hearingId],
    queryFn: () =>
      api<{ gate: { ready: boolean; organizations: OrganizationReadiness[] }; items: unknown[] }>(
        `/hearings/${hearingId}/readiness`
      ),
    enabled: Boolean(hearingId)
  });

  const [checklistResults, setChecklistResults] = useState<Record<string, 'PASS' | 'FAIL'>>({});
  const [techResults] = useState<Record<string, 'PASS' | 'FAIL'>>({
    camera: 'PASS',
    microphone: 'PASS',
    audio: 'PASS',
    primary_network: 'PASS'
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['readiness', hearingId] });

  async function post(path: string, body: unknown, label: string) {
    setError(null);
    setSuccess('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body) });
      setSuccess(label);
      await refresh();
    } catch (e) {
      setError(e);
    }
  }

  const { user } = useAuth();
  const persona = user?.role || 'UNKNOWN';
  const myOrgType = PERSONA_ORG[persona];
  const isCorrections = persona === 'corrections';

  const currentTemplate = myOrgType ? CHECKLIST_TEMPLATES[myOrgType] : [];

  async function verifyIdentity() {
    await post(
      `/hearings/${hearingId}/identity-verifications`,
      {
        participant_reference: 'DEFENDANT-001',
        method: 'DOCUMENT_AND_VISUAL',
        result: 'PASS',
        notes: 'Identitas sesuai dokumen resmi.'
      },
      'Verifikasi identitas terdakwa berhasil dicatat.'
    );
  }

  async function inspectRoom() {
    await post(
      `/hearings/${hearingId}/room-inspections`,
      {
        location_code: 'RUTAN-ROOM-01',
        camera_full_view: true,
        unauthorized_person_absent: true,
        confidentiality_ready: true,
        notes: 'Ruangan steril dan sarana konsultasi tersedia.'
      },
      'Inspeksi ruangan berhasil dicatat. Kamera, sterilitas, dan kerahasiaan: PASS.'
    );
  }

  async function submit() {
    const items = currentTemplate.map((item) => ({
      item_code: item.code,
      required: item.required,
      result: checklistResults[item.code] ?? 'PASS'
    }));

    await post(
      `/hearings/${hearingId}/readiness-submissions`,
      {
        location_code: `${persona.toUpperCase()}-ROOM-01`,
        items,
        technical_test: {
          camera: techResults.camera,
          microphone: techResults.microphone,
          audio: techResults.audio,
          primary_network: techResults.primary_network,
          backup_network: 'PASS',
          provider_access: 'PASS'
        }
      },
      `Kesiapan ${ORG_LABEL[myOrgType ?? ''] ?? persona} berhasil disubmit.`
    );
  }

  const organizations = query.data?.gate?.organizations ?? [];
  const readyCount = (organizations || []).filter((o) => o.status === 'READY').length;
  const total = organizations.length || 3;
  const allReady = query.data?.gate?.ready;

  return (
    <>
      <PageHeader
        title="Kesiapan Sidang"
        description="Semua instansi (Pengadilan, Kejaksaan, Pemasyarakatan) harus menyatakan kesiapan sebelum ruang virtual dapat dibuat."
      />

      <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />
      <AlertBanner
        variant="success"
        message={success}
        onDismiss={() => setSuccess('')}
        className="mb-4"
      />

      {allReady && (
        <AlertBanner
          variant="success"
          message="Semua instansi sudah siap. Ruang virtual dapat disiapkan oleh Operator TI."
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
              {!myOrgType && (
                <span className="text-amber-600"> — persona ini tidak memiliki aksi kesiapan</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>Kesiapan lintas instansi</span>
                <span className="font-medium">
                  {readyCount}/{total} instansi
                </span>
              </div>
              <Progress value={(readyCount / total) * 100} className="h-2" />
            </div>

            {/* Status per org */}
            <div className="space-y-2">
              {organizations.length === 0
                ? ['COURT', 'PROSECUTION', 'CORRECTIONS'].map((org) => (
                    <div
                      key={org}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm">{ORG_LABEL[org]}</span>
                      <Badge variant="outline">KOSONG</Badge>
                    </div>
                  ))
                : organizations.map((item) => (
                    <div
                      key={item.organizationType}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm">
                        {ORG_LABEL[item.organizationType] ?? item.organizationType}
                      </span>
                      <Badge variant={item.status === 'READY' ? 'success' : 'warning'}>
                        {item.status === 'READY'
                          ? 'SIAP'
                          : item.status === 'MISSING'
                            ? 'KOSONG'
                            : item.status}
                      </Badge>
                    </div>
                  ))}
            </div>

            {/* Form Checklist sesuai Template Persona */}
            {myOrgType && (
              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold text-slate-800">Checklist Persyaratan</h3>
                <div className="space-y-2">
                  {currentTemplate.map((item) => (
                    <label
                      key={item.code}
                      className="flex items-start gap-3 rounded-lg border bg-slate-50 p-3 text-sm cursor-pointer hover:bg-slate-100 transition"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        checked={(checklistResults[item.code] ?? 'PASS') === 'PASS'}
                        onChange={(e) =>
                          setChecklistResults((prev) => ({
                            ...prev,
                            [item.code]: e.target.checked ? 'PASS' : 'FAIL'
                          }))
                        }
                      />
                      <div>
                        <span className="font-medium text-slate-700">{item.label}</span>
                        {item.required && <span className="ml-1 text-red-500">*</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tombol aksi sesuai persona */}
            {myOrgType ? (
              <div className="space-y-2 border-t pt-4">
                {isCorrections && (
                  <>
                    <p className="text-xs text-amber-700">
                      ⚠ Pemasyarakatan wajib menyelesaikan verifikasi identitas dan inspeksi
                      ruangan sebelum submit kesiapan.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Button variant="outline" onClick={verifyIdentity}>
                        Verifikasi Identitas Terdakwa
                      </Button>
                      <Button variant="outline" onClick={inspectRoom}>
                        Inspeksi Ruangan
                      </Button>
                    </div>
                  </>
                )}
                <Button onClick={submit} className="w-full">
                  Kirim Kesiapan {ORG_LABEL[myOrgType]}
                </Button>
              </div>
            ) : (
              /* QW-02: Empty state untuk persona tanpa aksi */
              <EmptyState
                icon={ClipboardCheck}
                title="Tidak ada aksi untuk persona ini"
                description={`Persona "${persona}" tidak memiliki aksi kesiapan. Gunakan persona Panitera, Penuntut Umum, atau Petugas Pemasyarakatan untuk mengirim kesiapan.`}
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>

        {/* ── Panel panduan ── */}
        <Card>
          <CardHeader>
            <CardTitle>Panduan Checklist Kesiapan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              {[
                {
                  org: 'Pengadilan (Panitera)',
                  items: [
                    'Penetapan elektronik tersedia dan sah',
                    'Ruang sidang virtual disiapkan',
                    'Tautan undangan tersedia'
                  ]
                },
                {
                  org: 'Kejaksaan (Penuntut Umum)',
                  items: [
                    'Penuntut Umum siap hadir',
                    'Dokumen dakwaan/tuntutan tersedia',
                    'Koneksi internet stabil'
                  ]
                },
                {
                  org: 'Pemasyarakatan (Petugas Lapas/Rutan)',
                  items: [
                    'Verifikasi identitas terdakwa ✓',
                    'Inspeksi sterilitas ruangan ✓',
                    'Kamera menampilkan seluruh ruang',
                    'Internet utama dan cadangan tersedia',
                    'Petugas pendamping siap'
                  ]
                }
              ].map(({ org, items }) => (
                <div key={org} className="rounded-lg border p-3">
                  <div className="mb-2 font-semibold text-slate-700">{org}</div>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-slate-600">
                        <span className="mt-0.5 text-slate-300">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
