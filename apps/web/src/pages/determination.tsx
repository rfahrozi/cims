import { useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Scale } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveHearing } from '@/lib/hearing-context';
import { PageHeader } from '@/components/page-header';
import { AlertBanner } from '@/components/alert-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type DeterminationResult = {
  id: string;
  version: number;
  decision: string;
  hearing_mode: string;
  official_reference: string;
  reason: string;
  created_at: string;
};

export function DeterminationPage() {
  const { hearingId } = useActiveHearing();
  const client = useQueryClient();

  const [reference, setReference] = useState('PEN-EL/001/2026');
  const [mode, setMode] = useState('ELEKTRONIK');
  const [reason, setReason] = useState(
    'Sesuai dengan permohonan dan kelayakan teknis, sidang dilaksanakan secara elektronik.'
  );
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<DeterminationResult | null>(null);

  async function save() {
    setError(null);
    setResult(null);
    try {
      const data = await api<DeterminationResult>('/judicial-determinations', {
        method: 'POST',
        body: JSON.stringify({
          hearing_id: hearingId,
          decision: 'APPROVED',
          hearing_mode: mode,
          official_reference: reference.trim(),
          reason: reason.trim()
        })
      });
      setResult(data);
      await client.invalidateQueries({ queryKey: ['hearing-gate', hearingId] });
    } catch (e) {
      setError(e);
    }
  }

  return (
    <>
      <PageHeader
        title="Penetapan Hakim"
        description="Gerbang wajib sebelum penjadwalan dan ruang virtual. Hakim harus menetapkan mode persidangan."
      />

      <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-4" />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Keluarkan Penetapan</CardTitle>
            <CardDescription>
              Hanya persona Hakim yang dapat menyimpan penetapan ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mode Persidangan</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LANGSUNG">Hadir Langsung (Offline)</SelectItem>
                  <SelectItem value="ELEKTRONIK">Elektronik Penuh (Online)</SelectItem>
                  <SelectItem value="HYBRID">Hybrid (Campuran)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referensi Resmi / Nomor Penetapan</Label>
              <Input
                value={reference}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Alasan Penetapan</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            <Button onClick={save} disabled={!reference.trim() || !reason.trim()}>
              Simpan Penetapan
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {result && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <CardTitle className="text-base text-green-800">
                    Penetapan Berhasil Disimpan
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-green-900">
                <div className="flex justify-between">
                  <span>Keputusan</span>
                  <strong>{result.decision}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Mode Sidang</span>
                  <strong>{result.hearing_mode}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Referensi</span>
                  <strong>{result.official_reference}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Versi</span>
                  <span>v{result.version}</span>
                </div>
                <div className="mt-3 rounded bg-green-100 p-2 text-xs">{result.reason}</div>
              </CardContent>
            </Card>
          )}
          {!result && !error && (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <Scale className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-400">
                  Silakan isi dan simpan form penetapan di sebelah kiri.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
