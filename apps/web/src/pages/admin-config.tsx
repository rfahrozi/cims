import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, RefreshCw, Save, Settings2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type NotificationTemplate = {
  id: string;
  noticeType: string;
  channel: string;
  subject: string;
  messageBody: string;
  isActive: boolean;
  updatedAt: string;
};

type SlaConfig = {
  id: string;
  noticeType: string;
  ackDeadlineHours: number;
  reminderHours: number[];
  isActive: boolean;
  updatedAt: string;
};

const CHANNEL_BADGE: Record<string, string> = {
  EMAIL: 'bg-blue-100 text-blue-800',
  WHATSAPP: 'bg-green-100 text-green-800',
  SMS: 'bg-orange-100 text-orange-800',
  IN_APP: 'bg-purple-100 text-purple-800'
};

const NOTICE_TYPE_LABEL: Record<string, string> = {
  AGENDA_SIDANG: 'Agenda Sidang',
  PERUBAHAN_JADWAL: 'Perubahan Jadwal',
  PEMBACAAN_PUTUSAN_BANDING: 'Putusan Banding',
  PERMOHONAN_ELEKTRONIK: 'Permohonan Elektronik',
  PEMBERITAHUAN_GANGGUAN: 'Gangguan Teknis',
  PEMBERITAHUAN_UMUM: 'Pemberitahuan Umum'
};

// ── Edit inline untuk template ─────────────────────────────────────────────

function TemplateEditRow({
  template,
  onSaved
}: {
  template: NotificationTemplate;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.messageBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api(`/admin/notification-templates/${template.id}`, {
        method: 'PUT',
        body: JSON.stringify({ subject, message_body: body })
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setSubject(template.subject);
    setBody(template.messageBody);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800">
            {NOTICE_TYPE_LABEL[template.noticeType] ?? template.noticeType}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHANNEL_BADGE[template.channel] ?? 'bg-slate-100 text-slate-700'}`}
          >
            {template.channel}
          </span>
          {!template.isActive && (
            <Badge variant="destructive" className="text-xs">
              Nonaktif
            </Badge>
          )}
        </div>
        {!editing ? (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {Boolean(error) && (
        <AlertBanner
          message={error instanceof Error ? error.message : String(error)}
          onDismiss={() => setError(null)}
          className="mb-3"
        />
      )}

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Subjek</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm"
              placeholder="[CIMS] Subjek pemberitahuan"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Isi pesan{' '}
              <span className="text-slate-400">
                (placeholder: {'{recipient_name}'}, {'{case_number}'}, {'{scheduled_at}'},{' '}
                {'{start_time}'}, {'{hearing_mode}'}, {'{change_reason}'}, {'{official_reference}'})
              </span>
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="text-sm font-mono"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500">
            <span className="font-semibold">Subjek:</span> {template.subject}
          </div>
          <div className="rounded bg-slate-50 p-2 text-xs text-slate-600 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
            {template.messageBody}
          </div>
          <div className="text-xs text-slate-400">
            Diperbarui:{' '}
            {new Date(template.updatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit inline untuk SLA config ───────────────────────────────────────────

function SlaConfigRow({ config, onSaved }: { config: SlaConfig; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(String(config.ackDeadlineHours));
  const [reminders, setReminders] = useState(config.reminderHours.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const reminderHours = reminders
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);
      await api(`/admin/sla-configs/${config.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ack_deadline_hours: parseInt(hours, 10),
          reminder_hours: reminderHours
        })
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-800">
          {NOTICE_TYPE_LABEL[config.noticeType] ?? config.noticeType}
        </div>

        {Boolean(error) && (
          <AlertBanner
            message={error instanceof Error ? error.message : String(error)}
            onDismiss={() => setError(null)}
            className="mt-2"
          />
        )}

        {editing ? (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Batas ACK (jam)</Label>
              <Input
                type="number"
                min={1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-8 text-sm w-28"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reminder (jam sebelum batas, pisahkan koma)</Label>
              <Input
                value={reminders}
                onChange={(e) => setReminders(e.target.value)}
                className="h-8 text-sm"
                placeholder="24, 2"
              />
            </div>
          </div>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>
              Batas ACK: <strong className="text-slate-800">{config.ackDeadlineHours} jam</strong>
            </span>
            <span>
              Reminder:{' '}
              <strong className="text-slate-800">
                {config.reminderHours.length > 0
                  ? config.reminderHours.map((h) => `H-${h}jam`).join(', ')
                  : '—'}
              </strong>
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        {!editing ? (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? '...' : 'Simpan'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setHours(String(config.ackDeadlineHours));
                setReminders(config.reminderHours.join(', '));
                setError(null);
              }}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Halaman utama ──────────────────────────────────────────────────────────

export function AdminConfigPage() {
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);

  const templateQuery = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => api<NotificationTemplate[]>('/admin/notification-templates')
  });

  const slaQuery = useQuery({
    queryKey: ['admin-sla'],
    queryFn: () => api<SlaConfig[]>('/admin/sla-configs')
  });

  const templates = templateQuery.data ?? [];
  const slaConfigs = slaQuery.data ?? [];

  // Kelompokkan template per notice_type
  const templatesByType = templates.reduce<Record<string, NotificationTemplate[]>>((acc, t) => {
    if (!acc[t.noticeType]) acc[t.noticeType] = [];
    acc[t.noticeType].push(t);
    return acc;
  }, {});

  function refreshAll() {
    void client.invalidateQueries({ queryKey: ['admin-templates'] });
    void client.invalidateQueries({ queryKey: ['admin-sla'] });
  }

  return (
    <>
      <PageHeader
        title="Konfigurasi Admin"
        description="Kelola template notifikasi dan konfigurasi SLA per jenis pemberitahuan. Perubahan berlaku segera tanpa perlu deploy ulang. Akses: SYSTEM_ADMIN."
      />

      <AlertBanner
        message={error instanceof Error ? error.message : String(error)}
        onDismiss={() => setError(null)}
        className="mb-4"
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚙️ Halaman ini hanya dapat diakses oleh <strong>SYSTEM_ADMIN</strong>. Perubahan template
          akan mempengaruhi semua pemberitahuan baru yang dibuat tanpa mengisi subjek/pesan manual.
        </div>
        <Button size="sm" variant="outline" onClick={refreshAll}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Segarkan
        </Button>
      </div>

      <Tabs defaultValue="templates" className="space-y-5">
        <TabsList>
          <TabsTrigger value="templates">
            <Settings2 className="mr-2 h-4 w-4" />
            Template Notifikasi
            {templates.length > 0 && (
              <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                {templates.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sla">
            <Settings2 className="mr-2 h-4 w-4" />
            Konfigurasi SLA
            {slaConfigs.length > 0 && (
              <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                {slaConfigs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Template Notifikasi ── */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Template Notifikasi per Jenis × Channel</CardTitle>
              <CardDescription>
                Setiap kombinasi jenis pemberitahuan dan channel memiliki template tersendiri.
                Placeholder yang didukung: <code className="text-xs">{'{recipient_name}'}</code>,{' '}
                <code className="text-xs">{'{case_number}'}</code>,{' '}
                <code className="text-xs">{'{scheduled_at}'}</code>,{' '}
                <code className="text-xs">{'{start_time}'}</code>,{' '}
                <code className="text-xs">{'{hearing_mode}'}</code>,{' '}
                <code className="text-xs">{'{change_reason}'}</code>,{' '}
                <code className="text-xs">{'{official_reference}'}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templateQuery.isLoading && (
                <p className="text-sm text-slate-400">Memuat template...</p>
              )}

              {!templateQuery.isLoading && templates.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Settings2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    Belum ada template. Jalankan migration{' '}
                    <code className="text-xs">0014_notification_templates_sla.sql</code> untuk
                    memuat seed data default.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {Object.entries(templatesByType).map(([noticeType, typeTemplates]) => (
                  <div key={noticeType}>
                    <h3 className="mb-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      {NOTICE_TYPE_LABEL[noticeType] ?? noticeType}
                    </h3>
                    <div className="space-y-2">
                      {typeTemplates.map((t) => (
                        <TemplateEditRow
                          key={t.id}
                          template={t}
                          onSaved={() =>
                            client.invalidateQueries({ queryKey: ['admin-templates'] })
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Konfigurasi SLA ── */}
        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi SLA per Jenis Pemberitahuan</CardTitle>
              <CardDescription>
                Tentukan batas waktu acknowledgment (dalam jam) dan jadwal reminder otomatis untuk
                setiap jenis pemberitahuan. Nilai ini digunakan sebagai default saat penerima notice
                tidak memiliki <code className="text-xs">ack_deadline</code> yang ditetapkan manual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slaQuery.isLoading && (
                <p className="text-sm text-slate-400">Memuat konfigurasi SLA...</p>
              )}

              {!slaQuery.isLoading && slaConfigs.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Settings2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    Belum ada konfigurasi SLA. Jalankan migration{' '}
                    <code className="text-xs">0014_notification_templates_sla.sql</code> untuk
                    memuat seed data default.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {slaConfigs.map((c) => (
                  <SlaConfigRow
                    key={c.id}
                    config={c}
                    onSaved={() => client.invalidateQueries({ queryKey: ['admin-sla'] })}
                  />
                ))}
              </div>

              {slaConfigs.length > 0 && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  <strong>Contoh SLA:</strong> Jika batas ACK = 48 jam dan reminder = [24, 2], maka
                  sistem akan mengirim reminder 24 jam sebelum deadline dan 2 jam sebelum deadline.
                  Reminder hanya aktif jika <code>OUTBOX_WORKER_ENABLED=true</code> dan outbox
                  worker berjalan.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
