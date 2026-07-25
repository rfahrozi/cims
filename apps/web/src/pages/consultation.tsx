
import { useState } from 'react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export function ConsultationPage(){const { hearingId } = useActiveHearing();const [defendant,setDefendant]=useState('');const [advocate,setAdvocate]=useState('');const [output,setOutput]=useState('');async function start(){try{setOutput(JSON.stringify(await api(`/hearings/${hearingId}/consultations`,{method:'POST',body:JSON.stringify({defendantParticipantId:defendant,advocateParticipantId:advocate})}),null,2));}catch(e){setOutput(String(e));}}async function end(){try{setOutput(JSON.stringify(await api(`/hearings/${hearingId}/consultations/current/end`,{method:'POST',body:'{}'}),null,2));}catch(e){setOutput(String(e));}}return <><PageHeader title="Konsultasi Privat" description="Ruang konsultasi terdakwa dan advokat. Recording selalu dinonaktifkan."/><Card className="max-w-3xl"><CardHeader><CardTitle>Kontrol konsultasi</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>ID peserta terdakwa</Label><Input value={defendant} onChange={e=>setDefendant(e.target.value)}/></div><div><Label>ID peserta advokat</Label><Input value={advocate} onChange={e=>setAdvocate(e.target.value)}/></div><div className="flex gap-2"><Button onClick={start}>Mulai konsultasi</Button><Button variant="destructive" onClick={end}>Akhiri</Button></div><pre className="min-h-52 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-blue-100">{output}</pre></CardContent></Card></>}
