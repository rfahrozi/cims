import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Video, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function VirtualSessionPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState('');

  const query = useQuery({
    queryKey: ['virtual-session', hearingId],
    queryFn: () => api<Record<string, unknown> | null>(`/hearings/${hearingId}/virtual-session`),
    enabled: Boolean(hearingId)
  });

  async function provision() {
    setError(null);
    setSuccess('');
    try {
      await api(`/hearings/${hearingId}/virtual-session/provision`, {
        method: 'POST',
        body: JSON.stringify({ recording_policy: 'DISABLED' })
      });
      setSuccess('Ruang virtual berhasil disiapkan.');
      await client.invalidateQueries({ queryKey: ['virtual-session', hearingId] });
      await client.invalidateQueries({ queryKey: ['hearing-gate', hearingId] });
    } catch (e) {
      setError(e);
    }
  }

  const session = query.data as
    | {
        state?: string;
        providerSessionReference?: string;
        providerCode?: string;
        rooms?: Array<{
          id: string;
          roomCode: string;
          providerRoomReference: string;
          recordingAllowed: boolean;
        }>;
      }
    | null
    | undefined;

  return (
    <>
      <PageHeader
        title="Ruang Virtual"
        description="Penyediaan ruang virtual secara otomatis. Syarat: penetapan, jadwal, notifikasi, dan kesiapan instansi terpenuhi."
        action={
          <Button onClick={provision} disabled={session?.state === 'READY'}>
            Buat Ruang Virtual
          </Button>
        }
      />

      <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />
      <AlertBanner
        variant="success"
        message={success}
        onDismiss={() => setSuccess('')}
        className="mb-4"
      />

      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status Sesi Virtual</CardTitle>
              <Badge variant={session?.state === 'READY' ? 'success' : 'warning'}>
                {session?.state === 'READY' ? 'SIAP' : (session?.state ?? 'BELUM DIBUAT')}
              </Badge>
            </div>
            <CardDescription>
              Hanya Operator TI atau Panitera yang dapat menyiapkan ruang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading && <p className="text-sm text-slate-500">Memuat status sesi...</p>}

            {!query.isLoading && (!session || !session.rooms || session.rooms.length === 0) && (
              <EmptyState
                icon={Video}
                title="Ruang Virtual Belum Dibuat"
                description="Pastikan semua prasyarat sebelumnya (penetapan, jadwal, notifikasi, dan kesiapan instansi) telah terpenuhi sebelum membuat ruang sidang virtual."
                action={{ label: 'Buat Ruang Virtual', onClick: provision }}
              />
            )}

            {session?.rooms && session.rooms.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 border border-green-200">
                  <CheckCircle2 className="h-5 w-5" />
                  Sesi virtual berhasil dibuat via provider:{' '}
                  <strong className="uppercase">{session.providerCode}</strong>
                  <span className="text-xs text-green-700 ml-2">
                    (Ref: {session.providerSessionReference})
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {(session.rooms || []).map((room) => (
                    <div key={room.id} className="rounded-lg border p-4 bg-white shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-semibold text-slate-800">{room.roomCode}</div>
                        <Badge variant={room.recordingAllowed ? 'destructive' : 'outline'}>
                          {room.recordingAllowed ? 'RECORDING' : 'NO REC'}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 font-mono bg-slate-50 p-1.5 rounded truncate">
                        {room.providerRoomReference}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
