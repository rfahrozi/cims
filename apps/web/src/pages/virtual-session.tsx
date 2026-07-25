import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function VirtualSessionPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient(); const [output, setOutput] = useState('');
  const query = useQuery({ queryKey: ['virtual-session', hearingId], queryFn: () => api<Record<string, unknown> | null>(`/hearings/${hearingId}/virtual-session`) });
  async function provision() { try { const data = await api(`/hearings/${hearingId}/virtual-session/provision`, { method: 'POST', body: JSON.stringify({ recording_policy: 'DISABLED' }) }); setOutput(JSON.stringify(data, null, 2)); await client.invalidateQueries({ queryKey: ['virtual-session', hearingId] }); } catch (error) { setOutput(String(error)); } }
  const session = query.data as { state?: string; providerCode?: string; rooms?: Array<{ id: string; roomCode: string; recordingAllowed: boolean }> } | null | undefined;
  return <><PageHeader title="Virtual Session Provisioning" description="Provider-neutral provisioning dengan gate determination, jadwal, notice, dan readiness." action={<Button onClick={provision}>Provision session</Button>} />
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><Card><CardHeader><CardTitle>Session</CardTitle><CardDescription>Gunakan persona Operator TI atau Panitera.</CardDescription></CardHeader><CardContent className="space-y-4"><Badge variant={session?.state === 'READY' ? 'success' : 'warning'}>{session?.state ?? 'NOT PROVISIONED'}</Badge><div className="grid gap-3 sm:grid-cols-2">{session?.rooms?.map((room) => <div key={room.id} className="rounded-lg border p-4"><div className="font-semibold">{room.roomCode}</div><div className="text-xs text-slate-500">Recording: {room.recordingAllowed ? 'Allowed' : 'Disabled'}</div></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Respons API</CardTitle></CardHeader><CardContent><pre className="min-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-blue-100">{output || JSON.stringify(query.data, null, 2)}</pre></CardContent></Card></div></>;
}
