import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, FilePenLine, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { api } from '@/lib/api';
import { useActiveHearingSafe } from '@/lib/hearing-context';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

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

const judgeSchema = z.object({
  user_id: z.string().min(1, 'Silakan pilih Hakim dari daftar'),
  name: z.string(),
  role: z.enum(['HAKIM_KETUA', 'HAKIM_ANGGOTA'])
});

const defendantSchema = z.object({
  display_name: z.string().min(2, 'Nama terdakwa wajib diisi (minimal 2 karakter)'),
  alias: z.string().optional(),
  protected_identity: z.boolean(),
  custody_type: z.enum(['DITAHAN', 'TIDAK_DITAHAN', 'DITANGGUHKAN', 'DIBANTARKAN']),
  custody_status: z.enum(['DETAINED', 'NOT_DETAINED', 'UNKNOWN']).optional(),
  detention_type: z.string().optional(),
  detention_organization_id: z.string().optional()
});

const formSchema = z.object({
  case_number: z.string().min(3, 'Nomor perkara wajib diisi'),
  official_case_reference: z.string().optional(),
  originating_court_id: z.string().optional(),
  is_eberpadu: z.boolean(),
  case_classification: z.string().min(1, 'Klasifikasi wajib dipilih'),
  case_type_code: z.string().optional(),
  case_title: z.string().min(5, 'Judul perkara wajib diisi'),
  hearing_type: z.string().min(1, 'Agenda persidangan wajib dipilih'),
  hearing_sequence: z.number().default(1),
  court_organization_id: z.string().min(1, 'Pengadilan wajib dipilih'),
  prosecution_organization_id: z.string().min(1, 'Kejaksaan wajib dipilih'),
  notes: z.string().optional(),
  defendants: z.array(defendantSchema).min(1, 'Minimal 1 terdakwa wajib ditambahkan'),
  judges: z.array(judgeSchema).min(1, 'Minimal 1 Hakim Ketua wajib ditambahkan')
});

type FormValues = z.infer<typeof formSchema>;

const initialValues: FormValues = {
  case_number: '',
  official_case_reference: '',
  originating_court_id: 'pn-batam',
  is_eberpadu: false,
  case_classification: 'SPECIAL_CRIMINAL',
  case_type_code: 'PID.SUS',
  case_title: '',
  hearing_type: 'PEMERIKSAAN_SAKSI',
  hearing_sequence: 1,
  court_organization_id: 'pt-kepri',
  prosecution_organization_id: 'kejati-kepri',
  notes: '',
  defendants: [
    {
      display_name: '',
      alias: '',
      protected_identity: false,
      custody_status: 'NOT_DETAINED',
      custody_type: 'TIDAK_DITAHAN',
      detention_type: '',
      detention_organization_id: ''
    }
  ],
  judges: [
    {
      user_id: '',
      name: '',
      role: 'HAKIM_KETUA'
    }
  ]
};

const DUMMY_JUDGES = [
  { id: '196506301992121001', name: 'DAHLIA PANJAITAN, S.H.' },
  { id: '196503151992121001', name: 'ELIWARTI, S.H., M.H.' },
  { id: '196308261988031003', name: 'MORGAN SIMANJUNTAK, S.H., M.Hum.' },
  { id: '197008151996031002', name: 'WENDRA RAIS, S.H., M.H.' },
  { id: '197503122001121003', name: 'ESTIONO, S.H., M.H.' }
];

const CLASS_LABEL: Record<string, string> = {
  GENERAL_CRIMINAL: 'Pidana Umum',
  SPECIAL_CRIMINAL: 'Pidana Khusus'
};

const INTAKE_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draf',
  SUBMITTED: 'Menunggu Review Panitera',
  ADMIN_VERIFIED: 'Terverifikasi Administrasi',
  JUDGE_VALIDATION: 'Menunggu Validasi Hakim',
  DATA_APPROVED: 'Data Disetujui Hakim',
  ACTIVE: 'Aktif',
  RETURNED: 'Dikembalikan'
};

function ImportSimulationButton({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handleImport() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // simulasi delay network
    setLoading(false);
    onSuccess();
  }
  return (
    <Button onClick={handleImport} disabled={loading} className="w-full" type="button">
      <Database className="mr-2 h-4 w-4" />
      {loading ? 'Mengambil data dari SIPP…' : 'Import ke CIMS'}
    </Button>
  );
}

export function HearingIntakePage() {
  const queryClient = useQueryClient();
  const activeHearing = useActiveHearingSafe();
  const setHearingId = activeHearing?.setHearingId ?? (() => {});

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialValues
  });

  const {
    fields: defendantFields,
    append: appendDefendant,
    remove: removeDefendant
  } = useFieldArray({
    control: form.control,
    name: 'defendants'
  });

  const {
    fields: judgeFields,
    append: appendJudge,
    remove: removeJudge
  } = useFieldArray({
    control: form.control,
    name: 'judges'
  });

  const refs = useQuery({
    queryKey: ['hearing-intake-reference'],
    queryFn: () => api<ReferenceData>('/hearing-intake/reference-data')
  });
  const intake = useQuery({
    queryKey: ['hearing-intake-list'],
    queryFn: () => api<{ items: IntakeRecord[] }>('/hearing-intake/manual')
  });

  const courtOptions = (refs.data?.organizations || []).filter((item) => item.type === 'COURT');
  const prosecutionOptions = (refs.data?.organizations || []).filter(
    (item) => item.type === 'PROSECUTION'
  );
  const correctionsOptions = (refs.data?.organizations || []).filter(
    (item) => item.type === 'CORRECTIONS'
  );

  const { user } = useAuth();
  const currentPersona = user?.role || 'UNKNOWN';
  const canReview = currentPersona === 'court-clerk' || currentPersona === 'system-admin';

  async function onSubmit(data: FormValues) {
    setLoadingDraft(true);
    setSuccessMsg('');
    setErrorMsg('');

    let overallCustody: 'DETAINED' | 'NOT_DETAINED' | 'MIXED' | 'UNKNOWN' = 'NOT_DETAINED';
    const detainedCount = data.defendants.filter((d: any) => d.custody_type === 'DITAHAN').length;
    if (detainedCount > 0) {
      overallCustody = detainedCount === data.defendants.length ? 'DETAINED' : 'MIXED';
    }

    const overallCorrectionsOrg =
      data.defendants.find((d: any) => d.custody_type === 'DITAHAN' && d.detention_type === 'RUTAN')
        ?.detention_organization_id || undefined;

    const payload = {
      ...data,
      official_case_reference: data.official_case_reference || undefined,
      defendant_custody_status: overallCustody,
      corrections_organization_id: overallCorrectionsOrg,
      defendants: data.defendants.map((item: any) => ({
        ...item,
        alias: item.alias || undefined,
        detention_organization_id:
          item.custody_type === 'DITAHAN' && item.detention_type === 'RUTAN'
            ? item.detention_organization_id
            : undefined
      }))
    };

    try {
      const responseData = await api<IntakeRecord>('/hearing-intake/manual', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSuccessMsg(
        `Draf perkara "${responseData.caseNumber}" berhasil disimpan. Pilih perkara di bawah untuk melanjutkan.`
      );
      setHearingId(responseData.id);
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
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <section className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="case_number"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>
                                Nomor Perkara Tingkat Banding{' '}
                                <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormField
                                control={form.control}
                                name="is_eberpadu"
                                render={({ field: eberpaduField }: { field: any }) => (
                                  <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded cursor-pointer border border-rose-100">
                                    <input
                                      type="checkbox"
                                      checked={eberpaduField.value}
                                      onChange={eberpaduField.onChange}
                                      className="accent-rose-600"
                                    />
                                    eBerpadu
                                  </label>
                                )}
                              />
                            </div>
                            <FormControl>
                              <Input placeholder="Misal: 384/PID.SUS/2026/PT TPG" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="originating_court_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Pengadilan TK I</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih pengadilan..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {courtOptions.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="official_case_reference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nomor Perkara Tingkat Pertama (TK I)</FormLabel>
                            <FormControl>
                              <Input placeholder="Misal: 409/Pid.Sus/2026/PN Btm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="case_classification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Klasifikasi <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih klasifikasi..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(
                                  refs.data?.caseClassifications ?? [
                                    'GENERAL_CRIMINAL',
                                    'SPECIAL_CRIMINAL'
                                  ]
                                ).map((item) => (
                                  <SelectItem key={item} value={item}>
                                    {CLASS_LABEL[item] ?? item}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="case_type_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kode jenis perkara</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="case_title"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>
                              Judul singkat perkara <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Penuntut Umum melawan ..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </section>

                    <section className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="hearing_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Agenda persidangan <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih agenda..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(refs.data?.hearingTypes ?? []).map((item) => (
                                  <SelectItem key={item} value={item}>
                                    {item}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="court_organization_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Pengadilan <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih Pengadilan..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {courtOptions.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="prosecution_organization_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Kejaksaan <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih Kejaksaan..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {prosecutionOptions.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                            appendJudge({ user_id: '', name: '', role: 'HAKIM_ANGGOTA' })
                          }
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Tambah Anggota
                        </Button>
                      </div>

                      {form.formState.errors.judges?.root && (
                        <p className="text-sm font-medium text-red-500">
                          {form.formState.errors.judges.root.message}
                        </p>
                      )}

                      {judgeFields.map((field, index) => {
                        const currentRole = form.watch(`judges.${index}.role`);
                        return (
                          <div
                            key={field.id}
                            className={`grid gap-3 rounded-xl border p-4 md:grid-cols-3 ${
                              currentRole === 'HAKIM_KETUA'
                                ? 'border-blue-300 bg-blue-50'
                                : 'bg-slate-50'
                            }`}
                          >
                            <FormField
                              control={form.control}
                              name={`judges.${index}.user_id`}
                              render={({ field: selectField }: { field: any }) => (
                                <FormItem>
                                  <FormLabel>
                                    {currentRole === 'HAKIM_KETUA' ? (
                                      <span className="font-semibold text-blue-800">
                                        Hakim Ketua Majelis <span className="text-red-500">*</span>
                                      </span>
                                    ) : (
                                      <span>Hakim Anggota {index}</span>
                                    )}
                                  </FormLabel>
                                  <Select
                                    value={selectField.value || undefined}
                                    onValueChange={(val) => {
                                      const selected = DUMMY_JUDGES.find((j) => j.id === val);
                                      if (selected) {
                                        selectField.onChange(val);
                                        form.setValue(`judges.${index}.name`, selected.name);
                                      }
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Pilih Hakim..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {DUMMY_JUDGES.map((j) => (
                                        <SelectItem key={j.id} value={j.id}>
                                          {j.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`judges.${index}.user_id`}
                              render={({ field: inputField }: { field: any }) => (
                                <FormItem>
                                  <FormLabel>ID / NIP Hakim</FormLabel>
                                  <FormControl>
                                    <Input
                                      readOnly
                                      disabled
                                      className="bg-slate-100 cursor-not-allowed"
                                      placeholder="Pilih hakim terlebih dahulu"
                                      value={inputField.value}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <div className="flex items-end justify-between gap-3">
                              <div className="space-y-2 flex-1">
                                <Label>Peran dalam Majelis</Label>
                                <div
                                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                                    currentRole === 'HAKIM_KETUA'
                                      ? 'border-blue-300 bg-blue-100 text-blue-800'
                                      : 'border-slate-300 bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {currentRole === 'HAKIM_KETUA'
                                    ? '⚖️ Ketua Majelis'
                                    : '👤 Hakim Anggota'}
                                </div>
                              </div>
                              {currentRole !== 'HAKIM_KETUA' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeJudge(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </section>

                    {/* ── Data Terdakwa ──────────────────────────────── */}
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
                            appendDefendant({
                              display_name: '',
                              alias: '',
                              protected_identity: false,
                              custody_type: 'TIDAK_DITAHAN',
                              detention_type: '',
                              detention_organization_id: ''
                            })
                          }
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Tambah
                        </Button>
                      </div>

                      {form.formState.errors.defendants?.root && (
                        <p className="text-sm font-medium text-red-500">
                          {form.formState.errors.defendants.root.message}
                        </p>
                      )}

                      {defendantFields.map((field, index) => {
                        const custodyType = form.watch(`defendants.${index}.custody_type`);
                        const detentionType = form.watch(`defendants.${index}.detention_type`);

                        return (
                          <div
                            key={field.id}
                            className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-2"
                          >
                            <FormField
                              control={form.control}
                              name={`defendants.${index}.display_name`}
                              render={({ field: nameField }: { field: any }) => (
                                <FormItem>
                                  <FormLabel>
                                    Nama terdakwa {index + 1}{' '}
                                    <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...nameField} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`defendants.${index}.alias`}
                              render={({ field: aliasField }: { field: any }) => (
                                <FormItem>
                                  <FormLabel>Alias</FormLabel>
                                  <FormControl>
                                    <Input {...aliasField} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-4 md:col-span-2">
                              <div className="grid gap-3 md:grid-cols-2">
                                <FormField
                                  control={form.control}
                                  name={`defendants.${index}.custody_type`}
                                  render={({ field: custodyField }: { field: any }) => (
                                    <FormItem>
                                      <FormLabel>Status Penahanan (Induk)</FormLabel>
                                      <Select
                                        onValueChange={(val) => {
                                          custodyField.onChange(val);
                                          if (val !== 'DITAHAN') {
                                            form.setValue(`defendants.${index}.detention_type`, '');
                                            form.setValue(
                                              `defendants.${index}.detention_organization_id`,
                                              ''
                                            );
                                          }
                                        }}
                                        value={custodyField.value || undefined}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Pilih Status" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="DITAHAN">Ditahan</SelectItem>
                                          <SelectItem value="TIDAK_DITAHAN">
                                            Tidak Ditahan
                                          </SelectItem>
                                          <SelectItem value="DITANGGUHKAN">Ditangguhkan</SelectItem>
                                          <SelectItem value="DIBANTARKAN">Dibantarkan</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {custodyType === 'DITAHAN' && (
                                  <FormField
                                    control={form.control}
                                    name={`defendants.${index}.detention_type`}
                                    render={({ field: detentionTypeField }: { field: any }) => (
                                      <FormItem>
                                        <FormLabel>Jenis Tahanan</FormLabel>
                                        <Select
                                          onValueChange={(val) => {
                                            detentionTypeField.onChange(val);
                                            if (val !== 'RUTAN') {
                                              form.setValue(
                                                `defendants.${index}.detention_organization_id`,
                                                ''
                                              );
                                            }
                                          }}
                                          value={detentionTypeField.value || undefined}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Pilih Jenis" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="RUTAN">Rutan</SelectItem>
                                            <SelectItem value="RUMAH">Rumah</SelectItem>
                                            <SelectItem value="KOTA">Kota</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>

                              {custodyType === 'DITAHAN' && detentionType === 'RUTAN' && (
                                <FormField
                                  control={form.control}
                                  name={`defendants.${index}.detention_organization_id`}
                                  render={({ field: orgField }: { field: any }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Rutan atau Lapas <span className="text-red-500">*</span>
                                      </FormLabel>
                                      <Select
                                        onValueChange={orgField.onChange}
                                        value={orgField.value || undefined}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Pilih Rutan / Lapas" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {correctionsOptions.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                              {item.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>

                            <div className="flex items-end justify-between gap-3 md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`defendants.${index}.protected_identity`}
                                render={({ field: protectedField }: { field: any }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md pb-2">
                                    <FormControl>
                                      <input
                                        type="checkbox"
                                        checked={protectedField.value}
                                        onChange={protectedField.onChange}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 shadow-sm cursor-pointer"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="cursor-pointer text-sm font-medium">
                                        Identitas dilindungi
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />

                              {defendantFields.length > 1 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeDefendant(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </section>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catatan internal</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <p className="text-xs text-slate-400">
                      Kolom bertanda <span className="text-red-500">*</span> wajib diisi.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={loadingDraft}>
                        <FilePenLine className="mr-2 h-4 w-4" />
                        {loadingDraft ? 'Menyimpan…' : 'Simpan Draf'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset(initialValues)}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Atur Ulang
                      </Button>
                    </div>
                  </form>
                </Form>
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
