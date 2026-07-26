import { useQuery } from '@tanstack/react-query';
import { Activity, Database, RefreshCw, ServerCog } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Dashboard = {
  release: string;
  persistence_mode: string;
  hearings: Array<{
    id: string;
    case_number: string;
    state: string;
    gate: { next_gate?: string; completed?: boolean };
  }>;
  outbox: Record<string, number | string>;
  migration: {
    backend: string;
    frontend: string;
    postgres_native_modules: string[];
    transactional_outbox: boolean;
    legacy_proxy: boolean;
  };
};

export function OperationsPage() {
  const query = useQuery({
    queryKey: ['operations-dashboard'],
    queryFn: () => api<Dashboard>('/compliance-dashboard'),
    refetchInterval: 10000
  });
  const data = query.data;
  const pending = Number(data?.outbox?.PENDING ?? data?.outbox?.pending ?? 0);
  const failed = Number(data?.outbox?.FAILED ?? 0);
  const dead = Number(data?.outbox?.DEAD_LETTER ?? 0);
  return (
    <>
      <PageHeader
        title="Operasional Produksi"
        description="Persistence mode, transactional outbox, workflow gate, dan status migrasi PostgreSQL."
      />
      <div className="mb-5 flex justify-end">
        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Database className="h-5 w-5 text-blue-700" />
            <div className="mt-3 text-xs text-slate-500">Persistence</div>
            <div className="text-xl font-bold">{data?.persistence_mode ?? 'Loading'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <ServerCog className="h-5 w-5 text-blue-700" />
            <div className="mt-3 text-xs text-slate-500">Outbox pending</div>
            <div className="text-xl font-bold">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Activity className="h-5 w-5 text-amber-700" />
            <div className="mt-3 text-xs text-slate-500">Failed</div>
            <div className="text-xl font-bold">{failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Activity className="h-5 w-5 text-rose-700" />
            <div className="mt-3 text-xs text-slate-500">Dead letter</div>
            <div className="text-xl font-bold">{dead}</div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workflow gate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.hearings.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <div className="font-semibold">{item.case_number}</div>
                  <div className="text-xs text-slate-500">
                    {item.id} · {item.state}
                  </div>
                </div>
                <Badge variant={item.gate.completed ? 'success' : 'warning'}>
                  {item.gate.completed ? 'COMPLETED' : (item.gate.next_gate ?? 'IN PROGRESS')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Migration posture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Release</span>
              <b>{data?.release ?? '-'}</b>
            </div>
            <div className="flex justify-between">
              <span>Backend</span>
              <b>{data?.migration.backend ?? '-'}</b>
            </div>
            <div className="flex justify-between">
              <span>Frontend</span>
              <b>{data?.migration.frontend ?? '-'}</b>
            </div>
            <div className="flex justify-between">
              <span>Transactional outbox</span>
              <Badge variant={data?.migration.transactional_outbox ? 'success' : 'warning'}>
                {String(data?.migration.transactional_outbox ?? false)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Legacy proxy</span>
              <Badge variant={data?.migration.legacy_proxy ? 'warning' : 'success'}>
                {String(data?.migration.legacy_proxy ?? false)}
              </Badge>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                PostgreSQL native modules
              </div>
              <div className="flex flex-wrap gap-2">
                {data?.migration.postgres_native_modules.map((module) => (
                  <Badge key={module} variant="outline">
                    {module}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
