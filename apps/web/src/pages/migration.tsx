import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
const rows = [
  ['Judicial determination', 'NestJS', 'MIGRATED'],
  ['Scheduling', 'NestJS', 'MIGRATED'],
  ['Official notice and acknowledgment', 'NestJS', 'MIGRATED'],
  ['Readiness and verification', 'NestJS', 'MIGRATED'],
  ['Virtual session provisioning', 'NestJS', 'MIGRATED'],
  ['Hearing control', 'NestJS', 'MIGRATED'],
  ['Participant and join token', 'Legacy', 'NEXT'],
  ['Incident management', 'Legacy', 'NEXT'],
  ['Appeal and reconciliation', 'Legacy', 'NEXT']
];
export function MigrationPage() {
  return (
    <>
      <PageHeader
        title="Matriks Migrasi"
        description="Status perpindahan modul legacy ke NestJS TypeScript."
      />
      <Card>
        <CardHeader>
          <CardTitle>Module parity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([module, runtime, status]) => (
                <TableRow key={module}>
                  <TableCell className="font-medium">{module}</TableCell>
                  <TableCell>{runtime}</TableCell>
                  <TableCell>
                    <Badge variant={status === 'MIGRATED' ? 'success' : 'warning'}>{status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
