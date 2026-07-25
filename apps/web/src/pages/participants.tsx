import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UsersRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { errorMessage } from '@/lib/error-messages';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertBanner } from '@/components/alert-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Participant = {
  id: string; displayName: string; alias?: string;
  role: string; state: string; protectedIdentity: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  DEFENDANT: 'Terdakwa', ADVOCATE: 'Advokat', WITNESS: 'Saksi',
  EXPERT: 'Ahli', INTERPRETER: 'Penerjemah',
  PROSECUTOR: 'Penuntut Umum', JUDGE: 'Hakim', COURT_CLERK: 'Panitera',
  CORRECTIONS_OFFICER: 'Petugas Pemasyarakatan', IT_OPERATOR: 'Operator TI',
};

const STATE_VARIANT: Record<string, 'success' | 'warning' | 'outline'> = {
  ADMITTED: 'success', WAITING: 'warning', TOKEN_ISSUED: 'warning',
  REGISTERED: 'outline', LEFT: 'outline', REMOVED: 'outline', REVOKED: 'outline',
};

export function ParticipantsPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('DEFENDANT');
  const [protectedIdentity, setProtected] = useState(false);
  const [alias, setAlias] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState('');

  // H-12: Location state untuk advokat / pihak lain
  const [locationType, setLocationType] = useState('COURT');
  const [locationName, setLocationName] = useState('Pengadilan Negeri Demo');
  const [determinationRef, setDeterminationRef] = useState('');

  const query = useQuery({
    queryKey: ['participants', hearingId],
    queryFn: () => api<Participant[]>(`/hearings/${hearingId}/participants`),
    enabled: Boolean(hearingId),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['participants', hearingId] });

  // H-06: Jika peran berubah ke saksi rentan, aktifkan perlindungan identitas otomatis
  function handleRoleChange(newRole: string) {
    setRole(newRole);
    if (['WITNESS', 'EXPERT', 'INTERPRETER'].includes(newRole)) {
      setProtected(true);
    } else {
      setProtected(false);
    }
  }

  async function register() {
    if (!displayName.trim()) { setError('Nama peserta wajib diisi.'); return; }
    setError(null); setSuccess(''); setToken('');
    try {
      const data = await api<Participant>(`/hearings/${hearingId}/participants`, {
        method: 'POST',
        body: JSON.stringify({
          displayName: displayName.trim(),
          role,
          protectedIdentity,
          alias: protectedIdentity ? alias.trim() : undefined,
        }),
      });

      // H-12: Record lokasi secara berkesinambungan
      if (locationType && locationName) {
        await api(`/hearings/${hearingId}/participants/${data.id}/location`, {
          method: 'POST',
          body: JSON.stringify({
            location_type: locationType,
            location_name: locationName.trim(),
            determination_reference: determinationRef.trim() || undefined,
          })
        });
      }

      setSuccess(`Peserta "${displayName.trim()}" berhasil didaftarkan sebagai ${ROLE_LABEL[role] ?? role}.`);
      setDisplayName('');
      setAlias('');
      await refresh();
    } catch (e) { setError(e); }
  }

  async function issue(id: string) {
    setError(null); setToken('');
    try {
      const data = await api<{ token: string; expiresAt: string }>(
        `/hearings/${hearingId}/participants/${id}/join-token`,
        { method: 'POST', body: JSON.stringify({ ttlSeconds: 900 }) },
      );
      setToken(data.token);
      setSuccess('Token akses berhasil dibuat. Token hanya ditampilkan sekali — simpan dan kirimkan ke peserta.');
      await refresh();
    } catch (e) { setError(e); }
  }

  async function admit(id: string) {
    setError(null);
    try {
      await api(`/hearings/${hearingId}/participants/${id}/admit`, {
        method: 'POST', body: JSON.stringify({ roomCode: 'MAIN' }),
      });
      setSuccess('Peserta berhasil diizinkan masuk ke ruang utama.');
      await refresh();
    } catch (e) { setError(e); }
  }

  const participants = Array.isArray(query.data) ? query.data : [];

  return <>
    <PageHeader
      title="Peserta Sidang"
      description="Registrasi peserta, perlindungan identitas, token akses sekali pakai, dan kontrol admission ke ruang sidang."
    />

    <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />
    <AlertBanner variant="success" message={success} onDismiss={() => setSuccess('')} className="mb-4" />

    <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      {/* ── Form registrasi ── */}
      <Card>
        <CardHeader><CardTitle>Daftarkan peserta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="participant-name">Nama Peserta</Label>
            <Input
              id="participant-name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Nama sesuai dokumen identitas"
            />
          </div>
          <div className="space-y-2">
            <Label>Peran</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={protectedIdentity}
                onChange={e => setProtected(e.target.checked)}
                className="rounded"
              />
              <span>Identitas dilindungi <span className="font-normal text-slate-500">(SOP 10.9)</span></span>
            </label>
            {protectedIdentity && (
              <div className="space-y-1.5 pl-5">
                <Label className="text-xs">Nama Samaran (Alias) Opsional</Label>
                <Input
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
                  placeholder="Misal: Saksi 1"
                  className="h-8 text-sm"
                />
                <p className="text-[11px] text-slate-500 leading-tight">Nama asli akan disembunyikan dari peserta lain, kecuali Hakim dan Panitera.</p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-blue-900">Lokasi Fisik Peserta (SOP 10.8)</Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COURT">Pengadilan Negeri</SelectItem>
                  <SelectItem value="PROSECUTION">Kejaksaan</SelectItem>
                  <SelectItem value="CORRECTIONS">Lapas / Rutan</SelectItem>
                  <SelectItem value="OTHER_COURT">Pengadilan Negeri Lain</SelectItem>
                  <SelectItem value="EMBASSY">Perwakilan RI (KBRI/KJRI)</SelectItem>
                  <SelectItem value="REMOTE">Lokasi Lain (Remote)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-blue-900">Nama Lokasi Detail</Label>
              <Input
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="Misal: Ruang Sidang 2 / Rutan Kelas I"
                className="h-8 text-sm"
              />
            </div>

            {role === 'ADVOCATE' && locationType !== 'COURT' && locationType !== 'CORRECTIONS' && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs text-amber-700">Referensi Penetapan Pisah Lokasi (Wajib)</Label>
                <Input
                  value={determinationRef}
                  onChange={e => setDeterminationRef(e.target.value)}
                  placeholder="Misal: PEN-123/2026"
                  className="h-8 text-sm border-amber-300"
                />
                <p className="text-[11px] text-amber-600 leading-tight">Sesuai SOP 10.8, Advokat harus berada di lokasi yang sama dengan terdakwa, kecuali ada penetapan.</p>
              </div>
            )}
          </div>

          <Button onClick={register} disabled={!displayName.trim()}>Daftarkan Peserta</Button>

          {/* Token — tampil sekali saja */}
          {token && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <div className="mb-1 text-xs font-semibold text-amber-800">⚠️ Token akses — tampil sekali saja</div>
              <code className="block break-all text-xs text-amber-900">{token}</code>
              <p className="mt-2 text-xs text-amber-700">Salin dan kirimkan token ini ke peserta. Token berlaku 15 menit.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Daftar peserta ── */}
      <Card>
        <CardHeader><CardTitle>Daftar Peserta ({participants.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {query.isLoading && <p className="text-sm text-slate-400">Memuat daftar peserta...</p>}

          {/* QW-02: Empty state */}
          {!query.isLoading && participants.length === 0 && (
            <EmptyState
              icon={UsersRound}
              title="Belum ada peserta terdaftar"
              description="Daftarkan peserta sidang — terdakwa, advokat, saksi, ahli, atau penerjemah — menggunakan form di sebelah kiri."
              action={{ label: 'Isi nama dan daftarkan', onClick: () => document.getElementById('participant-name')?.focus() }}
            />
          )}

          {participants.map(p => (
            <div key={p.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {p.displayName}
                    {p.protectedIdentity && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Dilindungi</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{ROLE_LABEL[p.role] ?? p.role}</div>
                </div>
                <Badge variant={STATE_VARIANT[p.state] ?? 'outline'}>{p.state}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => issue(p.id)}>Buat Token Akses</Button>
                {p.state === 'WAITING' && (
                  <Button size="sm" onClick={() => admit(p.id)}>Izinkan Masuk</Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </>;
}
