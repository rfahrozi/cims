import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, FilePenLine, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { api, getPersona } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
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

export function HearingIntakePage() {
  const queryClient = useQueryClient();
  const { setHearingId } = useActiveHearing();
  const [output, setOutput] = useState('');
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
    defendants: [initialDefendant()]
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
      }))
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

  async function createDraft() {
    try {
      const data = await api<IntakeRecord>('/hearing-intake/manual', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setOutput(JSON.stringify(data, null, 2));
      setHearingId(data.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hearing-intake-list'] }),
        queryClient.invalidateQueries({ queryKey: ['hearings'] })
      ]);
    } catch (error) {
      setOutput(String(error));
    }
  }

  async function action(id: string, name: 'submit' | 'activate' | 'return' | 'reopen') {
    try {
      const body =
        name === 'return'
          ? JSON.stringify({
              reason: 'Data dikembalikan kepada Panitera Pengganti untuk dilengkapi.'
            })
          : undefined;
      const data = await api<IntakeRecord>(`/hearing-intake/manual/${id}/${name}`, {
        method: 'POST',
        body
      });
      setOutput(JSON.stringify(data, null, 2));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hearing-intake-list'] }),
        queryClient.invalidateQueries({ queryKey: ['hearings'] }),
        queryClient.invalidateQueries({ queryKey: ['gate', id] })
      ]);
    } catch (error) {
      setOutput(String(error));
    }
  }

  return (
    <>
      <PageHeader
        title="Data Awal Persidangan"
        description="Input manual oleh Panitera Pengganti sebagai sumber data awal. Penarikan dari database disiapkan sebagai fase lanjutan."
      />

      {/* QW-06: Sembunyikan tabs import UI sepenuhnya karena HEARING_IMPORT_ENABLED=false */}
      <div className="space-y-5">
        <div className="grid gap-5 2xl:grid-cols-[1.15fr_.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Formulir Panitera Pengganti</CardTitle>
              <CardDescription>
                Data tersimpan sebagai DRAFT dan belum membuka gate determination sebelum direviu
                serta diaktifkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nomor perkara</Label>
                  <Input
                    value={form.case_number}
                    onChange={(e) => setForm({ ...form, case_number: e.target.value })}
                    placeholder="123/Pid.Sus/2026/PN ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referensi resmi sementara</Label>
                  <Input
                    value={form.official_case_reference}
                    onChange={(e) => setForm({ ...form, official_case_reference: e.target.value })}
                    placeholder="Opsional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Klasifikasi</Label>
                  <Select
                    value={form.case_classification}
                    onValueChange={(value) => setForm({ ...form, case_classification: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        refs.data?.caseClassifications ?? ['GENERAL_CRIMINAL', 'SPECIAL_CRIMINAL']
                      ).map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kode jenis perkara</Label>
                  <Input
                    value={form.case_type_code}
                    onChange={(e) => setForm({ ...form, case_type_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Judul singkat perkara</Label>
                  <Input
                    value={form.case_title}
                    onChange={(e) => setForm({ ...form, case_title: e.target.value })}
                    placeholder="Penuntut Umum melawan ..."
                  />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Agenda persidangan</Label>
                  <Select
                    value={form.hearing_type}
                    onValueChange={(value) => setForm({ ...form, hearing_type: value })}
                  >
                    <SelectTrigger>
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
                  <Label>Urutan persidangan</Label>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={form.hearing_sequence}
                    onChange={(e) => setForm({ ...form, hearing_sequence: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pengadilan</Label>
                  <Select
                    value={form.court_organization_id}
                    onValueChange={(value) => setForm({ ...form, court_organization_id: value })}
                  >
                    <SelectTrigger>
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
                  <Label>Kejaksaan</Label>
                  <Select
                    value={form.prosecution_organization_id}
                    onValueChange={(value) =>
                      setForm({ ...form, prosecution_organization_id: value })
                    }
                  >
                    <SelectTrigger>
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
                  <Label>Status penahanan keseluruhan</Label>
                  <Select
                    value={form.defendant_custody_status}
                    onValueChange={(value) => setForm({ ...form, defendant_custody_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(refs.data?.custodyStatuses ?? []).map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rutan atau Lapas</Label>
                  <Select
                    value={form.corrections_organization_id}
                    onValueChange={(value) =>
                      setForm({ ...form, corrections_organization_id: value })
                    }
                  >
                    <SelectTrigger>
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
                      <Label>Nama terdakwa {index + 1}</Label>
                      <Input
                        value={defendant.display_name}
                        onChange={(e) => updateDefendant(index, { display_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Alias</Label>
                      <Input
                        value={defendant.alias}
                        onChange={(e) => updateDefendant(index, { alias: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status penahanan</Label>
                      <Select
                        value={defendant.custody_status}
                        onValueChange={(value) =>
                          updateDefendant(index, {
                            custody_status: value as DefendantForm['custody_status']
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['DETAINED', 'NOT_DETAINED', 'UNKNOWN'].map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <label className="flex items-center gap-2 pb-2 text-sm">
                        <input
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
                <Label>Catatan internal</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={createDraft}>
                  <FilePenLine className="mr-2 h-4 w-4" />
                  Simpan DRAFT
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      case_number: '',
                      case_title: '',
                      defendants: [initialDefendant()]
                    })
                  }
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Daftar intake</CardTitle>
                <CardDescription>
                  Maker: Panitera Pengganti. Checker: Panitera berwenang.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {intake.data?.items?.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button className="text-left" onClick={() => setHearingId(item.id)}>
                        <div className="font-semibold text-[#0b2a4a]">{item.caseNumber}</div>
                        <div className="text-xs text-slate-500">
                          #{item.hearingSequence} · {item.type} · {item.defendants.length} terdakwa
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
                        {item.intakeStatus}
                      </Badge>
                    </div>
                    {item.returnReason && (
                      <p className="mt-2 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
                        {item.returnReason}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['DRAFT', 'RETURNED'].includes(item.intakeStatus) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            action(item.id, item.intakeStatus === 'RETURNED' ? 'reopen' : 'submit')
                          }
                        >
                          {item.intakeStatus === 'RETURNED' ? 'Buka kembali' : 'Ajukan review'}
                        </Button>
                      )}
                      {item.intakeStatus === 'SUBMITTED' && canReview && (
                        <>
                          <Button size="sm" onClick={() => action(item.id, 'activate')}>
                            <ShieldCheck className="mr-1 h-4 w-4" />
                            Aktifkan
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => action(item.id, 'return')}
                          >
                            Kembalikan
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )) ?? 'Belum ada data.'}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Respons API</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-blue-100">
                  {output || 'Belum ada aksi.'}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
