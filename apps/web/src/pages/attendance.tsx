import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
export function AttendancePage() {
  const { hearingId } = useActiveHearing();
  const query = useQuery({
    queryKey: ['attendance', hearingId],
    queryFn: () =>
      api<{
        participantCount: number;
        events: Array<{
          id: string;
          participantId: string;
          eventType: string;
          roomCode?: string;
          occurredAt: string;
          source: string;
        }>;
      }>(`/hearings/${hearingId}/attendance`),
    refetchInterval: 5000
  });
  return (
    <>
      <PageHeader
        title="Riwayat Kehadiran"
        description="Timeline append-only dari token exchange, waiting room, admission, room transfer, dan leave."
      />
      <Card>
        <CardHeader>
          <CardTitle>{query.data?.participantCount ?? 0} peserta terdeteksi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Peserta</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Ruang</TableHead>
                <TableHead>Sumber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data?.events || []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.occurredAt).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-mono text-xs">{e.participantId}</TableCell>
                  <TableCell>{e.eventType}</TableCell>
                  <TableCell>{e.roomCode ?? '-'}</TableCell>
                  <TableCell>{e.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
