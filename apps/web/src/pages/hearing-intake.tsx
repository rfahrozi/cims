import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, FilePenLine, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { api, getPersona } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { errorMessage } from '@/lib/error-messages';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface Organization {
  id: string;
  name: string;
  type: 'COURT' | 'PROSECUTION' | 'CORRECTIONS';
}
interface ReferenceData {
  organizations: Organization[];
  caseClassifications: string[];
  custodyStatuses: string[];
  hearingTypes: string[];
  judges?: Array<{ id: string; name: string }>;
}
interface DefendantForm {
  display_name: string;
  alias: string;
  protected_identity: boolean;
  custody_status: 'DETAINED' | 'NOT_DETAINED' | 'UNKNOWN';
  detention_organization_id?: string;
}
interface IntakeRecord {
  id: string;
  caseNumber: string;
  caseTitle: string;
  type: string;
  hearingSequence: number;
  intakeStatus: string;
  dataSource: string;
  rowVersion: number;
  returnReason?: string;
  createdAt: string;
  defendants: Array<{ displayName: string }>;
}
interface ImportStatus {
  enabled: boolean;
  phase: string;
  items: Array<{ id: string; code: string; name: string; enabled: boolean; status: string }>;
}

const initialDefendant = (): DefendantForm => ({
  display_name: '',
  alias: '',
  protected_identity: false,
  custody_status: 'NOT_DETAINED'
});

interface JudgeForm {
  user_id: string;
  name: string;
  role: 'HAKIM_KETUA' | 'HAKIM_ANGGOTA';
}

const initialJudge = (role: 'HAKIM_KETUA' | 'HAKIM_ANGGOTA' = 'HAKIM_ANGGOTA'): JudgeForm => ({
  user_id: '',
  name: '',
  role
});

const CUSTODY_LABEL: Record<string, string> = {
  DETAINED: 'Ditahan',
  NOT_DETAINED: 'Tidak Ditahan',
  UNKNOWN: 'Tidak Diketahui',
  MIXED: 'Campuran'
};

const CLASS_LABEL: Record<string, string> = {
  GENERAL_CRIMINAL: 'Pidana Umum',
  SPECIAL_CRIMINAL: 'Pidana Khusus'
};

/** Tombol impor SIPP dengan local loading state — terpisah agar tidak re-render form utama */
function ImportSimulationButton({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handleImport() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // simulasi delay network
    setLoading(false);
    onSuccess();
  }
  return (
    <Button onClick={handleImport} disabled={loading} className="w-full">
      <Database className="mr-2 h-4 w-4" />
      {loading ? 'Mengambil data dari SIPP…' : 'Import ke CIMS'}
    </Button>
  );
}

const INTAKE_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draf',
  SUBMITTED: 'Menunggu Review Panitera',
  ADMIN_VERIFIED: 'Terverifikasi Administrasi',
  JUDGE_VALIDATION: 'Menunggu Validasi Hakim',
  DATA_APPROVED: 'Data Disetujui Hakim',
  ACTIVE: 'Aktif',
  RETURNED: 'Dikembalikan'
};

export function HearingIntakePage() {
  const queryClient = useQueryClient();
  const { setHearingId } = useActiveHearing();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [form, setForm] = useState({
    case_number: '',
    official_case_reference: '',
    case_classification: 'SPECIAL_CRIMINAL',
    case_type_code: 'PID.SUS',
    case_title: '',
    hearing_type: 'PEMERIKSAAN_SAKSI',
    hearing_sequence: 1,
    court_organization_id: 'court-demo',
    prosecution_organization_id: 'prosecution-demo',
    corrections_organization_id: 'corrections-demo',
    defendant_custody_status: 'NOT_DETAINED',
    notes: '',
    defendants: [initialDefendant()],
    judges: [initialJudge('HAKIM_KETUA')]
  });

  const refs = useQuery({
    queryKey: ['hearing-intake-reference'],
    queryFn: () => api<ReferenceData>('/hearing-intake/reference-data')
  });
  const intake = useQuery({
    queryKey: ['hearing-intake-list'],
    queryFn: () => api<{ items: IntakeRecord[] }>('/hearing-intake/manual')
  });
  const importStatus = useQuery({
    queryKey: ['hearing-import-sources'],
    queryFn: () => api<ImportStatus>('/hearing-import/sources')
  });
  const courtOptions = (refs.data?.organizations || []).filter((item) => item.type === 'COURT');
  const prosecutionOptions = (refs.data?.organizations || []).filter(
    (item) => item.type === 'PROSECUTION'
  );
  const correctionsOptions = (refs.data?.organizations || []).filter(
    (item) => item.type === 'CORRECTIONS'
  );
  const currentPersona = getPersona();
  const canReview = currentPersona === 'court-clerk' || currentPersona === 'system-admin';

  const payload = useMemo(
    () => ({
      ...form,
      official_case_reference: form.official_case_reference || undefined,
      corrections_organization_id:
        form.defendant_custody_status === 'DETAINED' || form.defendant_custody_status === 'MIXED'
          ? form.corrections_organization_id
          : undefined,
      defendants: form.defendants.map((item) => ({
        ...item,
        alias: item.alias || undefined,
        detention_organization_id:
          item.custody_status === 'DETAINED'
            ? item.detention_organization_id || form.corrections_organization_id
            : undefined
      })),
      judges: form.judges
        .filter((j) => j.user_id.trim())
        .map((j) => ({ user_id: j.user_id.trim(), role: j.role }))
    }),
    [form]
  );

  function updateDefendant(index: number, patch: Partial<DefendantForm>) {
    setForm((current) => ({
      ...current,
      defendants: current.defendants.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }));
  }

  function updateJudge(index: number, patch: Partial<JudgeForm>) {
    setForm((current) => ({
      ...current,
      judges: current.judges.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }));
  }

  async function createDraft() {
    setLoadingDraft(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const data = await api<IntakeRecord>('/hearing-intake/manual', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSuccessMsg(
        `Draf perkara "${data.caseNumber}" berhasil disimpan. Pilih perkara di bawah untuk melanjutkan.`
      );
      setHearingId(data.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hearing-intake-list'] }),
        queryClient.invalidateQueries({ queryKey: ['hearings'] })
      ]);
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      setLoadingDraft(false);
    }
  }

  async function action(id: string, name: 'submit' | 'activate' | 'return' | 'reopen') {
    const actionKey = `${id}-${name}`;
    setLoadingAction(actionKey);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const body =
        name === 'return'
          ? JSON.stringify({
              reason: 'Data dikembalikan kepada Panitera Pengganti untuk dilengkapi.'
            })
          : undefined;
      await api<IntakeRecord>(`/hearing-intake/manual/${id}/${name}`, {
        method: 'POST',
        body
      });
      const actionLabel: Record<string, string> = {
        submit: 'diajukan untuk review',
        activate: 'diaktifkan',
        return: 'dikembalikan untuk perbaikan',
        reopen: 'dibuka kembali'
      };
      setSuccessMsg(`Perkara berhasil ${actionLabel[name]}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hearing-intake-list'] }),
        queryClient.invalidateQueries({ queryKey: ['hearings'] }),
        queryClient.invalidateQueries({ queryKey: ['gate', id] })
      ]);
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Data Awal Persidangan"
        description="Input manual oleh Panitera Pengganti sebagai sumber data awal, atau impor referensi dari sistem administrasi resmi (SIPP)."
      />

      {successMsg && (
        <AlertBanner
          variant="success"
          message={successMsg}
          onDismiss={() => setSuccessMsg('')}
          className="mb-4"
        />
      )}
      {errorMsg && (
        <AlertBanner
          variant="error"
          message={errorMsg}
          onDismiss={() => setErrorMsg('')}
          className="mb-4"
        />
      )}

      <Tabs defaultValue="manual" className="space-y-5">
        <TabsList>
          <TabsTrigger value="manual">Input Manual</TabsTrigger>
          <TabsTrigger value="import">Impor dari SIPP</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-5">
          <div className="grid gap-5 2xl:grid-cols-[1.15fr_.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Formulir Panitera Pengganti</CardTitle>
                <CardDescription>
                  Data tersimpan sebagai draf dan belum membuka gate determination sebelum direviu
                  serta diaktifkan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <section className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="case_number">
                      Nomor perkara{' '}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Input
                      id="case_number"
                      value={form.case_number}
                      onChange={(e) => setForm({ ...form, case_number: e.target.value })}
                      placeholder="123/Pid.Sus/2026/PN ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="official_case_reference">Referensi resmi sementara</Label>
                    <Input
                      id="official_case_reference"
                      value={form.official_case_reference}
                      onChange={(e) =>
                        setForm({ ...form, official_case_reference: e.target.value })
                      }
                      placeholder="Opsional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case_classification">
                      Klasifikasi{' '}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Select
                      value={form.case_classification}
                      onValueChange={(value) => setForm({ ...form, case_classification: value })}
                    >
                      <SelectTrigger id="case_classification">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          refs.data?.caseClassifications ?? ['GENERAL_CRIMINAL', 'SPECIAL_CRIMINAL']
                        ).map((item) => (
                          <SelectItem key={item} value={item}>
                            {CLASS_LABEL[item] ?? item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case_type_code">Kode jenis perkara</Label>
                    <Input
                      id="case_type_code"
                      value={form.case_type_code}
                      onChange={(e) => setForm({ ...form, case_type_code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="case_title">
                      Judul singkat perkara{' '}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Input
                      id="case_title"
                      value={form.case_title}
                      onChange={(e) => setForm({ ...form, case_title: e.target.value })}
                      placeholder="Penuntut Umum melawan ..."
                    />
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hearing_type">
                      Agenda persidangan{' '}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Select
                      value={form.hearing_type}
                      onValueChange={(value) => setForm({ ...form, hearing_type: value })}
                    >
                      <SelectTrigger id="hearing_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(refs.data?.hearingTypes ?? []).map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hearing_sequence">Urutan persidangan</Label>
                    <Input
                      id="hearing_sequence"
                      type="number"
                      min={1}
                      max={999}
                      value={form.hearing_sequence}
                      onChange={(e) =>
                        setForm({ ...form, hearing_sequence: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="court_organization_id">
                      Pengadilan{' '}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Select
                      value={form.court_organization_id}
                      onValueChange={(value) => setForm({ ...form, court_organization_id: value })}
                    >
                      <SelectTrigger id="court_organization_id">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {courtOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prosecution_organization_id">
                      Kejaksaan{' '}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Select
                      value={form.prosecution_organization_id}
                      onValueChange={(value) =>
                        setForm({ ...form, prosecution_organization_id: value })
                      }
                    >
                      <SelectTrigger id="prosecution_organization_id">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {prosecutionOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defendant_custody_status">Status penahanan keseluruhan</Label>
                    <Select
                      value={form.defendant_custody_status}
                      onValueChange={(value) =>
                        setForm({ ...form, defendant_custody_status: value })
                      }
                    >
                      <SelectTrigger id="defendant_custody_status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(refs.data?.custodyStatuses ?? []).map((item) => (
                          <SelectItem key={item} value={item}>
                            {CUSTODY_LABEL[item] ?? item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="corrections_organization_id">Rutan atau Lapas</Label>
                    <Select
                      value={form.corrections_organization_id}
                      onValueChange={(value) =>
                        setForm({ ...form, corrections_organization_id: value })
                      }
                    >
                      <SelectTrigger id="corrections_organization_id">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {correctionsOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                {/* ── Susunan Majelis Hakim ──────────────────────────────── */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Susunan Majelis Hakim</h3>
                      <p className="text-xs text-slate-500">
                        Hakim Ketua (urutan pertama) yang berwenang melakukan validasi data
                        persidangan. Minimal 1 Hakim Ketua. Anggota bersifat opsional.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          ...form,
                          judges: [...form.judges, initialJudge('HAKIM_ANGGOTA')]
                        })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Tambah Anggota
                    </Button>
                  </div>
                  {form.judges.map((judge, index) => (
                    <div
                      key={index}
                      className={`grid gap-3 rounded-xl border p-4 md:grid-cols-3 ${
                        judge.role === 'HAKIM_KETUA' ? 'border-blue-300 bg-blue-50' : 'bg-slate-50'
                      }`}
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`judge_name_${index}`}>
                          {judge.role === 'HAKIM_KETUA' ? (
                            <span className="font-semibold text-blue-800">
                              Hakim Ketua Majelis{' '}
                              <span className="text-red-500" aria-hidden="true">
                                *
                              </span>
                            </span>
                          ) : (
                            <span>Hakim Anggota {index}</span>
                          )}
                        </Label>
                        <Input
                          id={`judge_name_${index}`}
                          value={judge.name}
                          onChange={(e) => updateJudge(index, { name: e.target.value })}
                          placeholder="Nama lengkap hakim"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`judge_userid_${index}`}>
                          Pilih Hakim{' '}
                          <span className="text-red-500" aria-hidden="true">
                            *
                          </span>
                        </Label>
                        <Select
                          value={judge.user_id}
                          onValueChange={(value) => {
                            const selectedJudge = refs.data?.judges?.find(
                              (j: any) => j.id === value
                            );
                            if (selectedJudge) {
                              updateJudge(index, { user_id: value, name: selectedJudge.name });
                            } else {
                              updateJudge(index, { user_id: value });
                            }
                          }}
                        >
                          <SelectTrigger id={`judge_userid_${index}`}>
                            <SelectValue placeholder="Pilih Hakim" />
                          </SelectTrigger>
                          <SelectContent>
                            {refs.data?.judges?.map((j: any) => (
                              <SelectItem key={j.id} value={j.id}>
                                {j.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <Label>Peran dalam Majelis</Label>
                          <div
                            className={`rounded-md border px-3 py-2 text-sm font-medium ${
                              judge.role === 'HAKIM_KETUA'
                                ? 'border-blue-300 bg-blue-100 text-blue-800'
                                : 'border-slate-300 bg-slate-100 text-slate-700'
                            }`}
                          >
                            {judge.role === 'HAKIM_KETUA' ? '⚖️ Ketua Majelis' : '👤 Hakim Anggota'}
                          </div>
                        </div>
                        {judge.role !== 'HAKIM_KETUA' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Hapus hakim anggota ${index}`}
                            onClick={() =>
                              setForm({
                                ...form,
                                judges: form.judges.filter((_, i) => i !== index)
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Data terdakwa</h3>
                      <p className="text-xs text-slate-500">
                        Nama disimpan terenkripsi pada PostgreSQL production mode.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm({ ...form, defendants: [...form.defendants, initialDefendant()] })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Tambah
                    </Button>
                  </div>
                  {form.defendants.map((defendant, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-2"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`defendant_name_${index}`}>
                          Nama terdakwa {index + 1}{' '}
                          <span className="text-red-500" aria-hidden="true">
                            *
                          </span>
                        </Label>
                        <Input
                          id={`defendant_name_${index}`}
                          value={defendant.display_name}
                          onChange={(e) => updateDefendant(index, { display_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`defendant_alias_${index}`}>Alias</Label>
                        <Input
                          id={`defendant_alias_${index}`}
                          value={defendant.alias}
                          onChange={(e) => updateDefendant(index, { alias: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`defendant_custody_${index}`}>Status penahanan</Label>
                        <Select
                          value={defendant.custody_status}
                          onValueChange={(value) =>
                            updateDefendant(index, {
                              custody_status: value as DefendantForm['custody_status']
                            })
                          }
                        >
                          <SelectTrigger id={`defendant_custody_${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['DETAINED', 'NOT_DETAINED', 'UNKNOWN'].map((item) => (
                              <SelectItem key={item} value={item}>
                                {CUSTODY_LABEL[item] ?? item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <label
                          htmlFor={`defendant_protected_${index}`}
                          className="flex items-center gap-2 pb-2 text-sm cursor-pointer"
                        >
                          <input
                            id={`defendant_protected_${index}`}
                            type="checkbox"
                            checked={defendant.protected_identity}
                            onChange={(e) =>
                              updateDefendant(index, { protected_identity: e.target.checked })
                            }
                          />
                          Identitas dilindungi
                        </label>
                        {form.defendants.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Hapus terdakwa ${index + 1}`}
                            onClick={() =>
                              setForm({
                                ...form,
                                defendants: form.defendants.filter(
                                  (_, itemIndex) => itemIndex !== index
                                )
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </section>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan internal</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Kolom bertanda <span className="text-red-500">*</span> wajib diisi.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={createDraft} disabled={loadingDraft}>
                    <FilePenLine className="mr-2 h-4 w-4" />
                    {loadingDraft ? 'Menyimpan…' : 'Simpan Draf'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setForm({
                        case_number: '',
                        official_case_reference: '',
                        case_classification: 'SPECIAL_CRIMINAL',
                        case_type_code: 'PID.SUS',
                        case_title: '',
                        hearing_type: 'PEMERIKSAAN_SAKSI',
                        hearing_sequence: 1,
                        court_organization_id: 'court-demo',
                        prosecution_organization_id: 'prosecution-demo',
                        corrections_organization_id: 'corrections-demo',
                        defendant_custody_status: 'NOT_DETAINED',
                        notes: '',
                        defendants: [initialDefendant()],
                        judges: [initialJudge('HAKIM_KETUA')]
                      })
                    }
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Atur Ulang
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Data Persidangan</CardTitle>
                <CardDescription>
                  Maker: Panitera Pengganti · Checker: Panitera berwenang (SOP I.1)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {intake.isLoading && (
                  <p className="py-6 text-center text-sm text-slate-400">Memuat data…</p>
                )}
                {!intake.isLoading && (!intake.data?.items || intake.data.items.length === 0) && (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <FilePenLine className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="font-medium text-slate-600">Belum ada data persidangan</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Isi formulir di atas dan klik "Simpan Draf" untuk memulai.
                    </p>
                  </div>
                )}
                {intake.data?.items?.map((item) => {
                  const actionKey = `${item.id}-submit`;
                  return (
                    <div key={item.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="text-left"
                          onClick={() => setHearingId(item.id)}
                          aria-label={`Pilih perkara ${item.caseNumber}`}
                        >
                          <div className="font-semibold text-[#0b2a4a]">{item.caseNumber}</div>
                          <div className="text-xs text-slate-500">
                            #{item.hearingSequence} · {item.type} · {item.defendants.length}{' '}
                            terdakwa
                          </div>
                        </button>
                        <Badge
                          variant={
                            item.intakeStatus === 'ACTIVE'
                              ? 'success'
                              : item.intakeStatus === 'RETURNED'
                                ? 'destructive'
                                : 'warning'
                          }
                        >
                          {INTAKE_STATUS_LABEL[item.intakeStatus] ?? item.intakeStatus}
                        </Badge>
                      </div>
                      {item.returnReason && (
                        <p className="mt-2 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
                          <strong>Catatan pengembalian:</strong> {item.returnReason}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['DRAFT', 'RETURNED'].includes(item.intakeStatus) && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              loadingAction === `${item.id}-submit` ||
                              loadingAction === `${item.id}-reopen`
                            }
                            onClick={() =>
                              action(
                                item.id,
                                item.intakeStatus === 'RETURNED' ? 'reopen' : 'submit'
                              )
                            }
                          >
                            {loadingAction === `${item.id}-submit` ||
                            loadingAction === `${item.id}-reopen`
                              ? 'Memproses…'
                              : item.intakeStatus === 'RETURNED'
                                ? 'Buka kembali'
                                : 'Ajukan review'}
                          </Button>
                        )}
                        {item.intakeStatus === 'SUBMITTED' && canReview && (
                          <>
                            <Button
                              size="sm"
                              disabled={loadingAction === `${item.id}-activate`}
                              onClick={() => action(item.id, 'activate')}
                            >
                              <ShieldCheck className="mr-1 h-4 w-4" />
                              {loadingAction === `${item.id}-activate` ? 'Memproses…' : 'Aktifkan'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={loadingAction === `${item.id}-return`}
                              onClick={() => action(item.id, 'return')}
                            >
                              {loadingAction === `${item.id}-return` ? 'Memproses…' : 'Kembalikan'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab Import SIPP (Simulasi MVP / Pilot) ── */}
        <TabsContent value="import">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Tarik Data Perkara dari Sistem Resmi (SIPP/e-Berpadu)</CardTitle>
              <CardDescription>
                Masukkan nomor atau ID perkara pada sistem SIPP untuk menginisiasi data sidang
                secara otomatis tanpa perlu mengetik manual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <strong>⚠ Mode Simulasi UAT:</strong> Sistem terhubung ke MOCK Gateway. Data yang
                ditarik bersifat simulasi dan tidak berasal dari SIPP riil. Cocok untuk keperluan
                pelatihan dan UAT lintas instansi.
              </div>

              <div className="space-y-2">
                <Label htmlFor="sipp_case_number">
                  Nomor Registrasi / ID Perkara SIPP{' '}
                  <span className="text-red-500" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input id="sipp_case_number" placeholder="Misal: 123/Pid.B/2026/PN Jkt.Pst" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sipp_source">Sistem Sumber</Label>
                <Select defaultValue="SIPP">
                  <SelectTrigger id="sipp_source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIPP">SIPP Mahkamah Agung</SelectItem>
                    <SelectItem value="E_BERPADU">e-Berpadu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ImportSimulationButton
                onSuccess={() =>
                  setSuccessMsg(
                    'Simulasi impor berhasil. Data perkara telah ditambahkan dengan status "Draf". Periksa di tab Input Manual.'
                  )
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
