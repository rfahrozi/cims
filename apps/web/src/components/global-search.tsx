import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { useActiveHearingSafe } from '@/lib/hearing-context';
import { Badge } from '@/components/ui/badge';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Ambil konteks hearing secara aman (fallback array kosong jika di luar provider)
  const hearingCtx = useActiveHearingSafe();
  const hearings = hearingCtx?.hearings ?? [];
  const setHearingId = hearingCtx?.setHearingId ?? (() => {});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-start rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 sm:w-64 md:w-80"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline-flex">Cari perkara...</span>
        <span className="inline-flex sm:hidden">Cari...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Ketik nomor perkara atau judul..." />
        <CommandList>
          <CommandEmpty>Tidak ada perkara yang ditemukan.</CommandEmpty>
          <CommandGroup heading="Data Persidangan">
            {hearings.map((hearing) => (
              <CommandItem
                key={hearing.id}
                value={`${hearing.caseNumber} ${hearing.caseTitle ?? ''} ${hearing.id}`}
                onSelect={() => {
                  setHearingId(hearing.id);
                  setOpen(false);
                  navigate('/dashboard');
                }}
                className="flex cursor-pointer items-center justify-between py-3"
              >
                <div>
                  <div className="font-medium text-slate-900">{hearing.caseNumber}</div>
                  {hearing.caseTitle && (
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {hearing.caseTitle}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {hearing.state}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
