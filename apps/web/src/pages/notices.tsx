import { useState, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getPersona } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Notice = {
  id: string;
  status: string;
  subject: string;
  officialReference: string;
  recipients: Array<{ id: string; recipientName: string; status: string; requiredAck: boolean }>;
};

export function NoticesPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [output, setOutput] = useState('');
  const [reference, setReference] = useState('PGL-EL/001/2026');
  const query = useQuery({
    queryKey: ['notices', hearingId],
    queryFn: () =>
      api<{
        gate: { ready: boolean; acknowledgedCount: number; requiredAcknowledgmentCount: number };
        items: Notice[];
      }>(`/hearings/${hearingId}/notices`)
  });
  async function create() {
    try {
      const data = await api<Notice>(`/hearings/${hearingId}/notices`, {
        method: 'POST',
        body: JSON.stringify({
          notice_type: 'AGENDA_SIDANG',
          subject: 'Pemberitahuan Persidangan Elektronik',
          message:
            'Agenda persidangan elektronik telah ditetapkan dan wajib dikonfirmasi oleh penerima.',
          official_reference: reference,
          recipients: [
            {
              recipient_user_id: 'prosecutor-demo',
              recipient_organization_id: 'prosecution-demo',
              name: 'Penuntut Umum Demo',
              destination: 'prosecutor@cims.local',
              channel: 'EMAIL',
              required_ack: true
            },
            {
              recipient_user_id: 'corrections-demo',
              recipient_organization_id: 'corrections-demo',
              name: 'Petugas Pemasyarakatan Demo',
              destination: 'corrections@cims.local',
              channel: 'EMAIL',
              required_ack: true
            }
          ]
        })
      });
      setOutput(JSON.stringify(data, null, 2));
      await client.invalidateQueries({ queryKey: ['notices', hearingId] });
    } catch (error) {
      setOutput(String(error));
    }
  }
  async function action(path: string, body?: unknown) {
    try {
      const data = await api(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined
      });
      setOutput(JSON.stringify(data, null, 2));
      await client.invalidateQueries({ queryKey: ['notices', hearingId] });
    } catch (error) {
      setOutput(String(error));
    }
  }
  const latest = query.data?.items[0];
  return (
    <>
      <PageHeader
        title="Pemberitahuan & Tanda Terima"
        description="Migrasi TypeScript untuk pemberitahuan resmi, bukti pengiriman, dan tanda terima."
      />
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Buat pemberitahuan</CardTitle>
              <CardDescription>
                Persona Panitera atau Penuntut Umum diperlukan untuk membuat dan mengirim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Referensi resmi</Label>
                <Input
                  value={reference}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setReference(event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Pesan</Label>
                <Textarea
                  value="Agenda persidangan elektronik telah ditetapkan dan wajib dikonfirmasi oleh penerima."
                  readOnly
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={create}>Buat notice</Button>
                <Button
                  variant="secondary"
                  disabled={!latest}
                  onClick={() => latest && action(`/notices/${latest.id}/send`)}
                >
                  Kirim
                </Button>
                <Button
                  variant="outline"
                  disabled={!latest}
                  onClick={() =>
                    latest &&
                    action(`/notices/${latest.id}/acknowledge`, {
                      receipt_reference: `ACK-${getPersona()}-${Date.now()}`,
                      method: 'IN_APP'
                    })
                  }
                >
                  Acknowledgment persona aktif
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Daftar pemberitahuan</CardTitle>
              <CardDescription>
                Untuk menyelesaikan gate, ganti persona ke Penuntut Umum lalu Pemasyarakatan dan
                lakukan acknowledgment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {query.data?.items?.map((item: Notice) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.subject}</div>
                      <div className="text-xs text-slate-500">{item.officialReference}</div>
                    </div>
                    <Badge variant={item.status === 'ACKNOWLEDGED' ? 'success' : 'warning'}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(item.recipients || []).map((recipient: Notice['recipients'][number]) => (
                      <div key={recipient.id} className="rounded-md bg-slate-50 p-3 text-sm">
                        <div>{recipient.recipientName}</div>
                        <Badge
                          variant={recipient.status === 'ACKNOWLEDGED' ? 'success' : 'outline'}
                        >
                          {recipient.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )) ?? 'Belum ada notice.'}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Gate & respons</CardTitle>
            <CardDescription>
              {query.data?.gate.ready
                ? 'Gate notice sudah terpenuhi.'
                : 'Gate notice belum terpenuhi.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="min-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-blue-100">
              {output || JSON.stringify(query.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
