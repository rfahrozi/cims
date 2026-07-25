import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// ── Types ─────────────────────────────────────────────────────────────────────
type AppealReadingStatus = 'SCHEDULED' | 'SUPERSEDED' | 'READ' | 'POSTPONED' | 'CANCELLED';

interface AppealReading {
  id: string;
  hearingId: string;
  version: number;
  scheduledAt: string;
  displayTimezone: string;
  deliveryMode: 'LANGSUNG' | 'ELEKTRONIK' | 'HYBRID';
  determinationReference: string;
  status: AppealReadingStatus;
  readAt?: string;
  cassationDeadlineAt?: string;
  cassationDeadlineNote?: string;
  rescheduleReason?: string;
  openToPublic: boolean;
}

interface NoticeStep {
  id: string;
  stepCode: string;
  recipientName: string;
  channel: string;
  officialReference: string;
  status: string;
  sentAt?: string;
  acknowledgedAt?: string;
}

interface PresenceRecord {
  id: string;
  partyRole: string;
  partyName: string;
  attendanceStatus: string;
  attendanceMode: string;
}

// ── Status badge helper ────────────────────────────────────────────────────────
const statusVariant = (s: AppealReadingStatus) => {
  if (s === 'READ') return 'success';
  if (s === 'SCHEDULED') return 'warning';
  if (s === 'POSTPONED') return 'destructive';
  return 'outline';
};

// ── Main page ─────────────────────────────────────────────────────────────────
export function AppealDecisionPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [output, setOutput] = useState('');
  const [selectedReadingId, setSelectedReadingId] = useState<string>('');
  const [tab, setTab] = useState('create');

  // Form states
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 16);
  });
  const [deliveryMode, setDeliveryMode] = useState<'LANGSUNG' | 'ELEKTRONIK' | 'HYBRID'>('ELEKTRONIK');
  const [detRef, setDetRef] = useState('PEN-PT/001/2026');
  const [readAt, setReadAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [excerptRef, setExcerptRef] = useState('PETIKAN/PT/001/2026');
  const [transmissionRef, setTransmissionRef] = useState('TRANSMISI/PT/001/2026');
  const [destCourt, setDestCourt] = useState('Pengadilan Negeri Demo');
  const [presenceRole, setPresenceRole] = useState<'DEFENDANT' | 'PROSECUTOR'>('DEFENDANT');
  const [presenceName, setPresenceName] = useState('Terdakwa Demo');
  const [attendanceStatus, setAttendanceStatus] = useState<'PRESENT' | 'ABSENT'>('PRESENT');

  // Queries
  const readingsQuery = useQuery({
    queryKey: ['appeal-readings', hearingId],
    queryFn: () => api<AppealReading[]>(`/appeal-decisions/hearings/${hearingId}`),
    enabled: Boolean(hearingId),
  });
  const stepsQuery = useQuery({
    queryKey: ['appeal-notice-steps', selectedReadingId],
    queryFn: () => api<NoticeStep[]>(`/appeal-decisions/${selectedReadingId}/notice-steps`),
    enabled: Boolean(selectedReadingId),
  });
  const presenceQuery = useQuery({
    queryKey: ['appeal-presence', selectedReadingId],
    queryFn: () => api<PresenceRecord[]>(`/appeal-decisions/${selectedReadingId}/presence`),
    enabled: Boolean(selectedReadingId),
  });

  const call = async (fn: () => Promise<unknown>) => {
    try {
      const result = await fn();
      setOutput(JSON.stringify(result, null, 2));
      await client.invalidateQueries({ queryKey: ['appeal-readings', hearingId] });
      if (selectedReadingId) {
        await client.invalidateQueries({ queryKey: ['appeal-notice-steps', selectedReadingId] });
        await client.invalidateQueries({ queryKey: ['appeal-presence', selectedReadingId] });
      }
    } catch (e) { setOutput(String(e)); }
  };

  const readings = Array.isArray(readingsQuery.data) ? readingsQuery.data : [];
  const latestScheduled = readings.find(r => r.status === 'SCHEDULED');
  const activeReadingId = selectedReadingId || latestScheduled?.id || '';
  const activeReading = readings.find(r => r.id === activeReadingId);

  return <>
    <PageHeader
      title="Pembacaan Putusan Tingkat Banding"
      description="SOP 10.15 — berlaku mulai 1 Agustus 2026. Pengelolaan jadwal, rantai pemberitahuan, kehadiran, petikan, dan transmisi berkas."
    />

    {/* ── Status bar ── */}
    <div className="mb-5 grid gap-3 sm:grid-cols-4">
      {[
        { label: 'Hearing ID', value: hearingId || '—' },
        { label: 'Jadwal aktif', value: latestScheduled ? new Date(latestScheduled.scheduledAt).toLocaleDateString('id-ID') : '—' },
        { label: 'Mode', value: latestScheduled?.deliveryMode ?? '—' },
        { label: 'Status', value: latestScheduled ? <Badge variant={statusVariant(latestScheduled.status)}>{latestScheduled.status}</Badge> : <Badge variant="outline">—</Badge> },
      ].map(({ label, value }) => (
        <Card key={label}><CardContent className="pt-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-semibold text-sm">{value}</div></CardContent></Card>
      ))}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      {/* ── Left panel: tabs ── */}
      <div className="space-y-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="create">1. Buat Jadwal</TabsTrigger>
            <TabsTrigger value="notices">2. Pemberitahuan</TabsTrigger>
            <TabsTrigger value="presence">3. Kehadiran</TabsTrigger>
            <TabsTrigger value="publish">4. Petikan</TabsTrigger>
            <TabsTrigger value="transmit">5. Transmisi</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Buat jadwal ── */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Buat / Perbarui Jadwal Pembacaan</CardTitle>
                <CardDescription>Penetapan Majelis Hakim PT menentukan tanggal, waktu, dan cara pembacaan putusan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tanggal & Waktu Pembacaan</Label>
                    <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mode Kehadiran</Label>
                    <Select value={deliveryMode} onValueChange={v => setDeliveryMode(v as typeof deliveryMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LANGSUNG">Langsung</SelectItem>
                        <SelectItem value="ELEKTRONIK">Elektronik</SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Referensi Penetapan Majelis Hakim PT</Label>
                    <Input value={detRef} onChange={e => setDetRef(e.target.value)} placeholder="PEN-PT/001/2026" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => call(() => api('/appeal-decisions', {
                    method: 'POST',
                    body: JSON.stringify({
                      hearing_id: hearingId,
                      scheduled_at: new Date(scheduledAt).toISOString(),
                      delivery_mode: deliveryMode,
                      determination_reference: detRef,
                    }),
                  }))}>Buat Jadwal</Button>
                  {latestScheduled && <Button variant="outline" onClick={() => call(() => api(`/appeal-decisions/${latestScheduled.id}/read`, {
                    method: 'POST',
                    body: JSON.stringify({ read_at: new Date(readAt).toISOString() }),
                  }))}>Tandai Sudah Dibacakan</Button>}
                </div>
                {latestScheduled && (
                  <div className="space-y-2 border-t pt-4">
                    <Label>Waktu Aktual Pembacaan (untuk tandai READ)</Label>
                    <Input type="datetime-local" value={readAt} onChange={e => setReadAt(e.target.value)} />
                    {latestScheduled.cassationDeadlineAt && (
                      <p className="text-xs text-amber-600">
                        ⚖️ Tenggang kasasi (referensi): {new Date(latestScheduled.cassationDeadlineAt).toLocaleDateString('id-ID')} — dihitung resmi oleh panitera.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Rantai pemberitahuan ── */}
          <TabsContent value="notices">
            <Card>
              <CardHeader>
                <CardTitle>Rantai Pemberitahuan</CardTitle>
                <CardDescription>PT → Kejaksaan → Pemasyarakatan → Terdakwa & Advokat (SOP 10.15 poin 3–6)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {readings.length > 0 && (
                  <div className="space-y-2">
                    <Label>Pilih Pembacaan</Label>
                    <Select value={activeReadingId} onValueChange={setSelectedReadingId}>
                      <SelectTrigger><SelectValue placeholder="Pilih pembacaan..." /></SelectTrigger>
                      <SelectContent>
                        {readings.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            v{r.version} — {new Date(r.scheduledAt).toLocaleDateString('id-ID')} [{r.status}]
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  {(['PT_TO_PROSECUTION', 'PROSECUTION_TO_CORRECTIONS', 'CORRECTIONS_TO_DEFENDANT', 'PROSECUTION_TO_ADVOCATE'] as const).map(step => (
                    <div key={step} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="text-sm">
                        <div className="font-medium">{step.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-slate-500">
                          {(Array.isArray(stepsQuery.data) ? stepsQuery.data : []).find(s => s.stepCode === step)?.status ?? 'BELUM DIBUAT'}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => call(() => api(`/appeal-decisions/${activeReadingId}/notice-steps`, {
                        method: 'POST',
                        body: JSON.stringify({
                          step_code: step,
                          sender_organization_id: 'court-demo',
                          recipient_reference: 'prosecution-demo',
                          recipient_name: step.includes('PROSECUTION') ? 'Penuntut Umum' : step.includes('CORRECTIONS') ? 'Petugas Pemasyarakatan' : 'Advokat Demo',
                          channel: 'OFFICIAL',
                          official_reference: `PMBRT-BANDING/${step}/${Date.now()}`,
                        }),
                      }))}>Kirim</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Kehadiran ── */}
          <TabsContent value="presence">
            <Card>
              <CardHeader>
                <CardTitle>Catat Kehadiran</CardTitle>
                <CardDescription>Rekam hadir/tidak hadir untuk berita acara dan paragraf penutup putusan (SOP 10.15 poin 7)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Peran Pihak</Label>
                    <Select value={presenceRole} onValueChange={v => setPresenceRole(v as typeof presenceRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEFENDANT">Terdakwa</SelectItem>
                        <SelectItem value="PROSECUTOR">Penuntut Umum</SelectItem>
                        <SelectItem value="ADVOCATE">Advokat</SelectItem>
                        <SelectItem value="CORRECTIONS_OFFICER">Petugas Pemasyarakatan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status Kehadiran</Label>
                    <Select value={attendanceStatus} onValueChange={v => setAttendanceStatus(v as typeof attendanceStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRESENT">Hadir</SelectItem>
                        <SelectItem value="ABSENT">Tidak Hadir</SelectItem>
                        <SelectItem value="EXCUSED">Berhalangan Sah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nama Pihak</Label>
                    <Input value={presenceName} onChange={e => setPresenceName(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => call(() => api(`/appeal-decisions/${activeReadingId}/presence`, {
                  method: 'POST',
                  body: JSON.stringify({
                    party_role: presenceRole,
                    party_reference: `${presenceRole.toLowerCase()}-demo`,
                    party_name: presenceName,
                    attendance_status: attendanceStatus,
                    attendance_mode: deliveryMode === 'LANGSUNG' ? 'LANGSUNG' : 'ELEKTRONIK',
                  }),
                }))}>Catat Kehadiran</Button>
                {Array.isArray(presenceQuery.data) && presenceQuery.data.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    {(presenceQuery.data || []).map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span>{p.partyName} ({p.partyRole})</span>
                        <Badge variant={p.attendanceStatus === 'PRESENT' ? 'success' : 'warning'}>{p.attendanceStatus}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 4: Petikan putusan ── */}
          <TabsContent value="publish">
            <Card>
              <CardHeader>
                <CardTitle>Unggah Petikan Putusan</CardTitle>
                <CardDescription>Petikan wajib diunggah pada hari yang sama dengan pembacaan putusan (SOP 10.15 poin 8)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Referensi Petikan di Sistem Resmi</Label>
                  <Input value={excerptRef} onChange={e => setExcerptRef(e.target.value)} placeholder="PETIKAN/PT/001/2026" />
                </div>
                {activeReading?.readAt && (
                  <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                    📅 Dibacakan: {new Date(activeReading.readAt).toLocaleDateString('id-ID')} — petikan harus diunggah hari ini untuk compliant.
                  </div>
                )}
                {!activeReading?.readAt && (
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    ⚠️ Pembacaan belum ditandai READ. Kepatuhan same-day tidak dapat dihitung.
                  </div>
                )}
                <Button
                  disabled={!activeReadingId}
                  onClick={() => call(() => api(`/appeal-decisions/${activeReadingId}/publish-excerpt`, {
                    method: 'POST',
                    body: JSON.stringify({
                      excerpt_reference: excerptRef,
                      published_at: new Date().toISOString(),
                    }),
                  }))}>Unggah Petikan</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 5: Transmisi ── */}
          <TabsContent value="transmit">
            <Card>
              <CardHeader>
                <CardTitle>Transmisi ke Pengadilan Tingkat Pertama</CardTitle>
                <CardDescription>Salinan putusan dan berkas perkara wajib disampaikan dalam 7 hari (SOP 10.15 poin 9)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nama Pengadilan Tujuan (PT1)</Label>
                    <Input value={destCourt} onChange={e => setDestCourt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nomor Transmisi / Surat</Label>
                    <Input value={transmissionRef} onChange={e => setTransmissionRef(e.target.value)} />
                  </div>
                </div>
                {activeReading?.readAt && (
                  <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                    ⏱️ Dibacakan: {new Date(activeReading.readAt).toLocaleDateString('id-ID')} — batas 7 hari: {
                      new Date(new Date(activeReading.readAt).getTime() + 7 * 86400000).toLocaleDateString('id-ID')
                    }
                  </div>
                )}
                <Button
                  disabled={!activeReadingId}
                  onClick={() => call(() => api(`/appeal-decisions/${activeReadingId}/transmit`, {
                    method: 'POST',
                    body: JSON.stringify({
                      destination_court_name: destCourt,
                      transmission_reference: transmissionRef,
                      transmitted_at: new Date().toISOString(),
                    }),
                  }))}>Kirim ke PT1</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Right panel: daftar pembacaan + output ── */}
      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Daftar Pembacaan</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {readings.length === 0 && <p className="text-sm text-slate-500">Belum ada pembacaan putusan banding.</p>}
            {readings.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedReadingId(r.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition hover:bg-slate-50 ${activeReadingId === r.id ? 'border-blue-500 bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Versi {r.version}</span>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(r.scheduledAt).toLocaleString('id-ID')} · {r.deliveryMode}
                </div>
                <div className="text-xs text-slate-400">{r.determinationReference}</div>
                {r.readAt && (
                  <div className="mt-1 text-xs text-green-700">✓ Dibacakan: {new Date(r.readAt).toLocaleDateString('id-ID')}</div>
                )}
                {r.cassationDeadlineAt && (
                  <div className="text-xs text-amber-700">⚖️ Kasasi s/d: {new Date(r.cassationDeadlineAt).toLocaleDateString('id-ID')}</div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Respons API</CardTitle></CardHeader>
          <CardContent>
            <pre className="min-h-48 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-blue-100">
              {output || 'Belum ada aksi.'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  </>;
}
