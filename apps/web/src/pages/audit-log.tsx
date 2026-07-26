import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AuditEvent {
  id: string;
  object_type: string;
  object_id: string;
  sequence: number;
  event_type: string;
  actor_user_id: string | null;
  actor_organization_id: string | null;
  correlation_id: string | null;
  payload: Record<string, unknown>;
  previous_hash: string | null;
  event_hash: string;
  occurred_at: string;
}

interface IntegrityResult {
  valid: boolean;
  checked: number;
  failureAt?: number;
}

interface AuditEventsResponse {
  items: AuditEvent[];
  integrity: IntegrityResult;
}

export function AuditLogPage() {
  const { hearingId, hearing } = useActiveHearing();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery<AuditEventsResponse>({
    queryKey: ['audit-events', hearingId],
    queryFn: () => api<AuditEventsResponse>(`/hearings/${hearingId}/audit-events`),
    enabled: Boolean(hearingId)
  });

  const filteredItems = (data?.items || []).filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.event_type.toLowerCase().includes(term) ||
      (item.actor_user_id && item.actor_user_id.toLowerCase().includes(term)) ||
      (item.payload && JSON.stringify(item.payload).toLowerCase().includes(term))
    );
  });

  return (
    <>
      <PageHeader
        title="Audit Log Viewer"
        description={`Melihat riwayat transaksi dan verifikasi integritas HMAC untuk perkara ${hearing?.caseNumber ?? hearingId}.`}
      />

      <AlertBanner message={error} className="mb-4" />

      {/* ── Integrity Status Banner ── */}
      {data && (
        <div
          className={`mb-5 rounded-xl border p-4 shadow-sm flex items-center justify-between gap-4 ${
            data.integrity.valid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {data.integrity.valid ? (
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h3
                className={`font-semibold ${
                  data.integrity.valid ? 'text-emerald-800' : 'text-red-800'
                }`}
              >
                {data.integrity.valid
                  ? 'Integritas Rantai Audit Valid'
                  : 'Peringatan Integritas Audit: Terjadi Kerusakan/Manipulasi Data'}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  data.integrity.valid ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {data.integrity.valid
                  ? `${data.integrity.checked} log telah berhasil diverifikasi melalui HMAC Chaining. Data otentik dan aman dari manipulasi.`
                  : `Verifikasi HMAC gagal pada sekuens ${data.integrity.failureAt}. Data mungkin telah dimodifikasi secara paksa dari backend/database.`}
              </p>
            </div>
          </div>
          <Badge
            variant={data.integrity.valid ? 'success' : 'destructive'}
            className="shrink-0 text-xs px-3 py-1"
          >
            {data.integrity.valid ? 'Verified' : 'Tampered'}
          </Badge>
        </div>
      )}

      {/* ── Search & Filter ── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            placeholder="Cari event, ID user, atau isi payload..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-500 font-medium">{filteredItems.length} Kejadian</div>
      </div>

      {/* ── Timeline / Table Audit Log ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-500" /> Riwayat Event (Append-Only)
          </CardTitle>
          <CardDescription>Daftar event sesuai urutan waktu (sekuens)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-slate-500">Memuat log...</p>}
          {!isLoading && filteredItems.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
              Tidak ada event audit yang cocok dengan pencarian Anda.
            </div>
          )}

          <div className="space-y-4">
            {filteredItems.map((event) => (
              <div
                key={event.id}
                className="relative rounded-lg border bg-white p-4 text-sm shadow-sm transition-all hover:bg-slate-50"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{event.event_type}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        SEQ: {event.sequence}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        <User className="h-3 w-3" />
                        {event.actor_user_id ? event.actor_user_id.split('-')[0] + '...' : 'System'}
                      </span>
                      <span>•</span>
                      <span>Org: {event.actor_organization_id?.split('-')[0] ?? 'N/A'}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-700">
                      {new Date(event.occurred_at).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}{' '}
                      WIB
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1" title="Event Hash">
                      Hash: {event.event_hash.substring(0, 16)}...
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded p-3 text-xs overflow-auto font-mono text-slate-700 border border-slate-200 mt-2 max-h-[300px]">
                  {event.payload && Object.keys(event.payload).length > 0 ? (
                    JSON.stringify(event.payload, null, 2)
                  ) : (
                    <span className="text-slate-400 italic">Empty payload</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
