import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  CalendarX2,
  CheckCircle2,
  Clock,
  History,
  ListTodo,
  Plus,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { EmptyState } from '@/components/empty-state';
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

type ConflictResult = {
  status: 'CLEAR' | 'WARNING' | 'BLOCKED';
  conflicts: Array<{ code: string; severity: string; message: string }>;
};
type ScheduleResult = {
  id: string;
  start_at: string;
  end_at: string;
  version: number;
  status: string;
  is_reschedule?: boolean;
};
type AgendaItem = {
  id: string;
  sequenceNumber: number;
  itemType: string;
  itemDescription: string;
  estimatedDurationMinutes: number;
  status: string;
};
type ScheduleHistoryItem = {
  id: string;
  version: number;
  status: 'ACTIVE' | 'SUPERSEDED';
  start_at: string;
  end_at: string;
  display_timezone: string;
  approval_reason?: string;
  change_reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
};

const CONFLICT_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  CLEAR: 'success',
  WARNING: 'warning',
  BLOCKED: 'destructive'
};

const DEFAULT_AGENDA_TYPES = [
  'PEMBACAAN_DAKWAAN',
  'PEMERIKSAAN_SAKSI',
  'PEMERIKSAAN_AHLI',
  'PEMERIKSAAN_TERDAKWA',
  'TUNTUTAN',
  'PLEDOI',
  'PEMBACAAN_PUTUSAN',
  'LAINNYA'
];

export function SchedulingPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();

  // Schedule state
  const [room, setRoom] = useState('ROOM-B');
  const [changeReason, setChangeReason] = useState('');
  const [proposal, setProposal] = useState<string>();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState('');
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
  const [step, setStep] = useState<'idle' | 'proposed' | 'checked' | 'approved'>('idle');

  // Agenda state
  const [agendaItems, setAgendaItems] = useState<
    Array<{ itemType: string; itemDescription: string; estimatedDurationMinutes: number }>
  >([
    {
      itemType: 'PEMERIKSAAN_SAKSI',
      itemDescription: 'Pemeriksaan saksi dari pihak JPU',
      estimatedDurationMinutes: 60
    }
  ]);

  const agendaQuery = useQuery({
    queryKey: ['hearing-agenda', hearingId],
    queryFn: () => api<AgendaItem[]>(`/hearings/${hearingId}/agenda`),
    enabled: Boolean(hearingId)
  });

  const historyQuery = useQuery({
    queryKey: ['schedule-history', hearingId],
    queryFn: () => api<ScheduleHistoryItem[]>(`/hearings/${hearingId}/schedule-history`),
    enabled: Boolean(hearingId)
  });

  // Hydrate agendaItems state with fetched data if not yet edited

  useEffect(() => {
    if (Array.isArray(agendaQuery.data) && agendaQuery.data.length > 0) {
      setAgendaItems(
        agendaQuery.data.map((i) => ({
          itemType: i.itemType,
          itemDescription: i.itemDescription,
          estimatedDurationMinutes: i.estimatedDurationMinutes
        }))
      );
    }
  }, [agendaQuery.data]);

  const reset = () => {
    setProposal(undefined);
    setConflictResult(null);
    setScheduleResult(null);
    setStep('idle');
    setError(null);
  };

  async function create() {
    setError(null);
    setConflictResult(null);
    setScheduleResult(null);
    try {
      const start = new Date(Date.now() + 86_400_000).toISOString();
      const end = new Date(Date.now() + 90_000_000).toISOString();
      const data = await api<{ id: string }>(`/hearings/${hearingId}/schedule-proposals`, {
        method: 'POST',
        body: JSON.stringify({
          start_at: start,
          end_at: end,
          display_timezone: 'Asia/Jakarta',
          resources: [
            { resource_type: 'ROOM', resource_id: room, requirement: 'REQUIRED' },
            { resource_type: 'JUDGE', resource_id: 'judge-demo', requirement: 'REQUIRED' }
          ]
        })
      });
      setProposal(data.id);
      setStep('proposed');
    } catch (e) {
      setError(e);
    }
  }

  async function check() {
    if (!proposal) return;
    setError(null);
    try {
      const data = await api<ConflictResult>(`/schedule-proposals/${proposal}/conflicts:check`, {
        method: 'POST'
      });
      setConflictResult(data);
      if (data.status !== 'BLOCKED') setStep('checked');
    } catch (e) {
      setError(e);
    }
  }

  async function approve() {
    if (!proposal) return;
    setError(null);
    try {
      const data = await api<ScheduleResult>(`/schedule-proposals/${proposal}:approve`, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Jadwal telah diverifikasi oleh pejabat berwenang.',
          change_reason: changeReason.trim() || undefined
        })
      });
      setScheduleResult(data);
      setStep('approved');
      await client.invalidateQueries({ queryKey: ['hearing-gate', hearingId] });
    } catch (e) {
      setError(e);
    }
  }

  async function saveAgenda() {
    setError(null);
    setSuccess('');
    try {
      await api(`/hearings/${hearingId}/agenda`, {
        method: 'PUT',
        body: JSON.stringify({
          items: agendaItems.map((i) => ({
            itemType: i.itemType,
            itemDescription: i.itemDescription,
            estimatedDurationMinutes: i.estimatedDurationMinutes
          }))
        })
      });
      setSuccess('Agenda sidang berhasil disimpan.');
      await client.invalidateQueries({ queryKey: ['hearing-agenda', hearingId] });
    } catch (e) {
      setError(e);
    }
  }

  return (
    <>
      <PageHeader
        title="Jadwal & Agenda Sidang"
        description="Buat proposal jadwal, cek konflik resource, dan susun rincian agenda persidangan (multi-item per sesi)."
      />

      <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />
      <AlertBanner
        variant="success"
        message={success}
        onDismiss={() => setSuccess('')}
        className="mb-4"
      />

      <Tabs defaultValue="schedule" className="space-y-5">
        <TabsList>
          <TabsTrigger value="schedule">
            <CalendarCheck className="mr-2 h-4 w-4" />
            Jadwal Sidang
          </TabsTrigger>
          <TabsTrigger value="agenda">
            <ListTodo className="mr-2 h-4 w-4" />
            Rincian Agenda (H-03)
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Riwayat Perubahan
            {(historyQuery.data?.filter((h) => h.status === 'SUPERSEDED').length ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                {historyQuery.data!.filter((h) => h.status === 'SUPERSEDED').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            {/* ── Panel kiri: Form ── */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Buat Proposal Jadwal</CardTitle>
                  <CardDescription>
                    Jadwal H+1 akan diusulkan. Panitera atau Hakim perlu menyetujui setelah cek
                    konflik.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ruang Sidang</Label>
                    <Select value={room} onValueChange={setRoom}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ROOM-A">Ruang A</SelectItem>
                        <SelectItem value="ROOM-B">Ruang B</SelectItem>
                        <SelectItem value="ROOM-C">Ruang C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Alasan perubahan — wajib jika sudah ada jadwal aktif */}
                  <div className="space-y-2">
                    <Label>
                      Alasan Perubahan Jadwal
                      <span className="ml-1 text-xs text-slate-400">
                        (wajib jika mengubah jadwal)
                      </span>
                    </Label>
                    <Textarea
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Contoh: Hakim berhalangan pada tanggal semula, sidang dipindah sesuai kesepakatan para pihak."
                      rows={2}
                    />
                  </div>

                  {proposal && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Proposal ID: <code className="font-mono">{proposal}</code>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={create}>Buat Proposal</Button>
                    <Button
                      variant="secondary"
                      onClick={check}
                      disabled={!proposal || step === 'checked' || step === 'approved'}
                    >
                      Cek Konflik
                    </Button>
                    <Button variant="outline" onClick={approve} disabled={step !== 'checked'}>
                      Setujui Jadwal
                    </Button>
                    {step !== 'idle' && (
                      <Button variant="ghost" onClick={reset} className="text-slate-400">
                        Mulai Ulang
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Conflict result */}
              {conflictResult && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Hasil Cek Konflik</CardTitle>
                      <Badge variant={CONFLICT_VARIANT[conflictResult.status]}>
                        {conflictResult.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {conflictResult.status === 'CLEAR' && (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Tidak ada konflik. Jadwal dapat disetujui.
                      </div>
                    )}
                    {conflictResult.status === 'WARNING' && (
                      <div className="space-y-2">
                        <p className="text-sm text-amber-700">
                          Ada konflik peringatan — jadwal masih bisa disetujui.
                        </p>
                        {(conflictResult.conflicts || []).map((c, i) => (
                          <div
                            key={i}
                            className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800"
                          >
                            {c.message}
                          </div>
                        ))}
                      </div>
                    )}
                    {conflictResult.status === 'BLOCKED' && (
                      <div className="space-y-2">
                        <p className="text-sm text-red-700">
                          Konflik wajib harus diselesaikan sebelum menyetujui jadwal.
                        </p>
                        {(conflictResult.conflicts || []).map((c, i) => (
                          <div key={i} className="rounded bg-red-50 px-3 py-2 text-xs text-red-800">
                            {c.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Panel kanan: Status ── */}
            <div className="space-y-4">
              {/* Status langkah */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Pengajuan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      key: 'proposed',
                      label: 'Proposal dibuat',
                      done: ['proposed', 'checked', 'approved'].includes(step)
                    },
                    {
                      key: 'checked',
                      label: 'Konflik dicek',
                      done: ['checked', 'approved'].includes(step)
                    },
                    { key: 'approved', label: 'Jadwal disetujui', done: step === 'approved' }
                  ].map(({ key, label, done }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                      >
                        {done ? '✓' : '○'}
                      </div>
                      <span className={`text-sm ${done ? 'text-slate-800' : 'text-slate-400'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Hasil approve */}
              {scheduleResult && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-green-800">
                      <CalendarCheck className="h-5 w-5" />
                      <CardTitle className="text-base text-green-800">
                        {scheduleResult.is_reschedule ? 'Jadwal Diperbarui' : 'Jadwal Disetujui'}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-green-900">
                    <div className="flex justify-between">
                      <span>Mulai</span>
                      <strong>
                        {new Date(scheduleResult.start_at).toLocaleString('id-ID', {
                          timeZone: 'Asia/Jakarta'
                        })}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Selesai</span>
                      <strong>
                        {new Date(scheduleResult.end_at).toLocaleString('id-ID', {
                          timeZone: 'Asia/Jakarta'
                        })}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Versi jadwal</span>
                      <Badge variant="outline">v{scheduleResult.version}</Badge>
                    </div>
                    {scheduleResult.is_reschedule && (
                      <div className="mt-2 rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                        📢 Pemberitahuan perubahan jadwal telah dijadwalkan untuk dikirim ke semua
                        pihak.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {step === 'idle' && !error && (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center">
                    <CalendarX2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-400">
                      Mulai dengan membuat proposal jadwal di sebelah kiri.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agenda">
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Susun Agenda Sidang</CardTitle>
                <CardDescription>
                  Satu sesi sidang dapat memiliki beberapa urutan agenda. Total durasi akan
                  digunakan untuk validasi jadwal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {agendaItems.map((item, index) => (
                    <div key={index} className="rounded-lg border bg-slate-50 p-3 relative">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">
                          AGENDA #{index + 1}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                          onClick={() => setAgendaItems(agendaItems.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tipe Kegiatan</Label>
                          <Select
                            value={item.itemType}
                            onValueChange={(v) =>
                              setAgendaItems(
                                agendaItems.map((ai, i) =>
                                  i === index ? { ...ai, itemType: v } : ai
                                )
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DEFAULT_AGENDA_TYPES.map((t) => (
                                <SelectItem key={t} value={t} className="text-xs">
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Durasi (Menit)</Label>
                          <Input
                            type="number"
                            min={5}
                            value={item.estimatedDurationMinutes}
                            onChange={(e) =>
                              setAgendaItems(
                                agendaItems.map((ai, i) =>
                                  i === index
                                    ? { ...ai, estimatedDurationMinutes: Number(e.target.value) }
                                    : ai
                                )
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label className="text-xs">Deskripsi Kegiatan</Label>
                          <Input
                            value={item.itemDescription}
                            onChange={(e) =>
                              setAgendaItems(
                                agendaItems.map((ai, i) =>
                                  i === index ? { ...ai, itemDescription: e.target.value } : ai
                                )
                              )
                            }
                            className="h-8 text-xs"
                            placeholder="Keterangan singkat..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                    setAgendaItems([
                      ...agendaItems,
                      { itemType: 'LAINNYA', itemDescription: '', estimatedDurationMinutes: 30 }
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Tambah Agenda
                </Button>
                <Button
                  onClick={saveAgenda}
                  className="w-full mt-4"
                  disabled={agendaItems.length === 0}
                >
                  Simpan Agenda Sidang
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agenda Tersimpan</CardTitle>
              </CardHeader>
              <CardContent>
                {agendaQuery.isLoading && <p className="text-sm text-slate-400">Memuat...</p>}
                {!agendaQuery.isLoading && (agendaQuery.data || []).length === 0 && (
                  <EmptyState
                    icon={ListTodo}
                    title="Belum ada agenda"
                    description="Susun rincian agenda persidangan di panel kiri agar tercatat secara resmi."
                  />
                )}
                <div className="space-y-3">
                  {(Array.isArray(agendaQuery.data) ? agendaQuery.data : []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">
                          {item.sequenceNumber}. {item.itemType}
                        </div>
                        <div className="text-xs text-slate-500">{item.itemDescription || '—'}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{item.status}</Badge>
                        <div className="mt-1 text-xs text-slate-400">
                          {item.estimatedDurationMinutes} mnt
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab Riwayat Perubahan Jadwal (M-05) ── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                <CardTitle>Riwayat Perubahan Jadwal</CardTitle>
              </div>
              <CardDescription>
                Semua versi jadwal — aktif dan yang telah digantikan (SUPERSEDED). Setiap perubahan
                jadwal wajib menyimpan alasan perubahan sesuai SOP.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading && (
                <p className="text-sm text-slate-400">Memuat riwayat jadwal...</p>
              )}
              {!historyQuery.isLoading && (historyQuery.data ?? []).length === 0 && (
                <EmptyState
                  icon={History}
                  title="Belum ada riwayat jadwal"
                  description="Riwayat akan muncul setelah proposal jadwal pertama disetujui."
                />
              )}
              <div className="space-y-3">
                {(historyQuery.data ?? []).map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 ${
                      item.status === 'ACTIVE'
                        ? 'border-green-200 bg-green-50'
                        : 'border-slate-200 bg-slate-50 opacity-80'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.status === 'ACTIVE' ? 'success' : 'outline'}>
                          {item.status === 'ACTIVE' ? '✓ Aktif' : 'Digantikan'}
                        </Badge>
                        <span className="text-xs font-mono text-slate-500">v{item.version}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {item.approved_at
                          ? new Date(item.approved_at).toLocaleString('id-ID', {
                              timeZone: item.display_timezone ?? 'Asia/Jakarta',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </span>
                    </div>

                    <div className="grid gap-1 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-xs text-slate-500">Mulai sidang</span>
                        <p className="font-medium text-slate-800">
                          {new Date(item.start_at).toLocaleString('id-ID', {
                            timeZone: item.display_timezone ?? 'Asia/Jakarta',
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Selesai</span>
                        <p className="font-medium text-slate-800">
                          {new Date(item.end_at).toLocaleString('id-ID', {
                            timeZone: item.display_timezone ?? 'Asia/Jakarta',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}{' '}
                          WIB
                        </p>
                      </div>
                    </div>

                    {item.change_reason && (
                      <div className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span className="font-semibold">Alasan perubahan: </span>
                        {item.change_reason}
                      </div>
                    )}
                    {item.approval_reason && (
                      <div className="mt-1 text-xs text-slate-500">
                        <span className="font-semibold">Catatan persetujuan: </span>
                        {item.approval_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
