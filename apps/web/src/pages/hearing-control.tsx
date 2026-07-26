import { useState, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gavel, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { errorMessage } from '@/lib/error-messages';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RuntimeEvent = { id: string; eventType: string; occurredAt: string; reason?: string };
type RuntimeState = { state: string; events: RuntimeEvent[] };

// Aksi yang butuh konfirmasi eksplisit (irreversible atau berdampak besar)
const CONFIRM_ACTIONS: Record<
  string,
  { label: string; desc: string; variant: 'destructive' | 'warning' }
> = {
  end: {
    label: 'Tutup Sidang',
    desc: 'Sidang akan ditutup secara permanen. Tindakan ini tidak dapat dibatalkan. Pastikan semua pemeriksaan sudah selesai.',
    variant: 'destructive'
  },
  suspend: {
    label: 'Skors Sidang',
    desc: 'Sidang akan diskors sementara. Seluruh peserta akan menunggu di ruang tunggu sampai sidang dilanjutkan kembali.',
    variant: 'warning'
  }
};

const STATE_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  STARTED: 'success',
  READY: 'success',
  SUSPENDED: 'warning',
  NOT_READY: 'outline',
  ENDED: 'outline',
  POSTPONED: 'destructive'
};

const EVENT_LABEL: Record<string, string> = {
  HEARING_STARTED: 'Sidang dibuka',
  HEARING_SUSPENDED: 'Sidang diskors',
  HEARING_RESUMED: 'Sidang dilanjutkan',
  HEARING_ENDED: 'Sidang ditutup',
  HEARING_POSTPONED: 'Sidang ditunda'
};

export function HearingControlPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();

  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState<keyof typeof CONFIRM_ACTIONS | null>(null);

  const query = useQuery({
    queryKey: ['runtime', hearingId],
    queryFn: () => api<RuntimeState>(`/hearings/${hearingId}/runtime`),
    enabled: Boolean(hearingId),
    refetchInterval: 10_000
  });

  const state = query.data?.state ?? 'NOT_READY';
  const events = query.data?.events ?? [];
  const refresh = () => client.invalidateQueries({ queryKey: ['runtime', hearingId] });

  async function doAction(name: string) {
    setError(null);
    setSuccess('');
    const r = reason.trim() || 'Aksi dilakukan melalui UI.';
    try {
      await api(`/hearings/${hearingId}/${name}`, {
        method: 'POST',
        body: JSON.stringify({ reason: r })
      });
      const labels: Record<string, string> = {
        start: 'Sidang berhasil dibuka.',
        suspend: 'Sidang berhasil diskors. Peserta dialihkan ke ruang tunggu.',
        resume: 'Sidang berhasil dilanjutkan.',
        end: 'Sidang berhasil ditutup.'
      };
      setSuccess(labels[name] ?? `Aksi ${name} berhasil.`);
      setReason('');
      await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setPending(null);
    }
  }

  // Aksi langsung (tidak perlu konfirmasi)
  async function directAction(name: string) {
    await doAction(name);
  }

  // Aksi dengan konfirmasi
  function requestConfirm(name: keyof typeof CONFIRM_ACTIONS) {
    setPending(name);
  }
  async function confirmAction() {
    if (pending) await doAction(pending);
  }

  const confirmData = pending ? CONFIRM_ACTIONS[pending] : null;

  return (
    <>
      <PageHeader
        title="Kontrol Sidang"
        description="Buka, skors, lanjutkan, dan tutup sidang. Hanya Hakim yang dapat melakukan aksi ini."
      />

      <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />
      <AlertBanner
        variant="success"
        message={success}
        onDismiss={() => setSuccess('')}
        className="mb-4"
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {/* ── Panel kontrol ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status Sidang</CardTitle>
              <Badge variant={STATE_VARIANT[state] ?? 'outline'}>{state}</Badge>
            </div>
            <CardDescription>
              Gunakan persona Hakim untuk mengoperasikan kontrol sidang.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="action-reason">Catatan / Alasan (opsional)</Label>
              <Input
                id="action-reason"
                value={reason}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                placeholder="Contoh: Istirahat makan siang, saksi berikutnya dipersiapkan"
              />
            </div>

            {/* Tombol aksi dengan warna semantik */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="col-span-2"
                disabled={state !== 'READY'}
                onClick={() => directAction('start')}
              >
                <Gavel className="mr-2 h-4 w-4" />
                Buka Sidang
              </Button>
              <Button
                variant="secondary"
                disabled={state !== 'STARTED'}
                onClick={() => requestConfirm('suspend')}
              >
                Skors Sidang
              </Button>
              <Button
                variant="outline"
                disabled={state !== 'SUSPENDED'}
                onClick={() => directAction('resume')}
              >
                Lanjutkan Sidang
              </Button>
              <Button
                variant="destructive"
                className="col-span-2"
                disabled={!['STARTED', 'SUSPENDED'].includes(state)}
                onClick={() => requestConfirm('end')}
              >
                Tutup Sidang
              </Button>
            </div>

            {/* Panduan state */}
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              {state === 'NOT_READY' &&
                '⚠ Semua gate belum terpenuhi. Selesaikan checklist kesiapan dan provisioning ruang virtual terlebih dahulu.'}
              {state === 'READY' && '✅ Sidang siap dibuka. Hakim dapat membuka sidang.'}
              {state === 'STARTED' &&
                '🟢 Sidang berlangsung. Hakim dapat menskors atau menutup sidang.'}
              {state === 'SUSPENDED' &&
                '⏸ Sidang sedang diskors. Hakim dapat melanjutkan atau menutup.'}
              {state === 'ENDED' && '✅ Sidang telah ditutup. Selesaikan dokumentasi pasca-sidang.'}
              {state === 'POSTPONED' && '📅 Sidang ditunda. Buat jadwal baru untuk melanjutkan.'}
            </div>
          </CardContent>
        </Card>

        {/* ── Panel timeline ── */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline Kejadian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Belum ada kejadian tercatat untuk sidang ini.
              </p>
            )}
            {(Array.isArray(events) ? events : []).map((event: RuntimeEvent) => (
              <div key={event.id} className="rounded-lg border p-3">
                <div className="font-semibold text-sm">
                  {EVENT_LABEL[event.eventType] ?? event.eventType}
                </div>
                {event.reason && (
                  <div className="mt-0.5 text-xs text-slate-500">{event.reason}</div>
                )}
                <div className="mt-1 text-xs text-slate-400">
                  {new Date(event.occurredAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* QW-07: Konfirmasi dialog untuk aksi destruktif */}
      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle
                className={`h-5 w-5 ${confirmData?.variant === 'destructive' ? 'text-red-500' : 'text-amber-500'}`}
              />
              Konfirmasi: {confirmData?.label}
            </DialogTitle>
            <DialogDescription className="pt-1 leading-relaxed">
              {confirmData?.desc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Alasan (opsional)</Label>
              <Input
                value={reason}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                placeholder="Contoh: Semua agenda sidang telah selesai"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={confirmData?.variant === 'destructive' ? 'destructive' : 'default'}
                className="flex-1"
                onClick={confirmAction}
              >
                Ya, {confirmData?.label}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setPending(null)}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
