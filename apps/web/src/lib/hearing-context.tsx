import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface HearingSummary {
  id: string;
  caseNumber: string;
  caseTitle?: string;
  type: string;
  state: string;
  hearingSequence?: number;
  intakeStatus?: string;
  dataSource?: string;
}

interface HearingContextValue {
  hearingId: string;
  hearing?: HearingSummary;
  hearings: HearingSummary[];
  setHearingId: (id: string) => void;
  loading: boolean;
}

const HearingContext = createContext<HearingContextValue | undefined>(undefined);
const storageKey = 'cims_active_hearing_id';

export function HearingProvider({ children }: { children: ReactNode }) {
  const [hearingId, setHearingIdState] = useState(
    () => localStorage.getItem(storageKey) ?? 'hearing-demo-001'
  );
  const query = useQuery({
    queryKey: ['hearings'],
    queryFn: () => api<{ items: HearingSummary[] }>('/hearings')
  });

  // Amankan agar hearings selalu berupa array, bahkan jika api mengembalikan bentuk lain
  const hearings = Array.isArray(query.data?.items) ? query.data.items : [];

  useEffect(() => {
    if (hearings.length === 0) return;
    if (!hearings.some((item) => item.id === hearingId)) {
      const preferred = hearings.find((item) => item.intakeStatus === 'ACTIVE') ?? hearings[0];
      setHearingIdState(preferred.id);
      localStorage.setItem(storageKey, preferred.id);
    }
  }, [hearings, hearingId]);

  function setHearingId(id: string) {
    setHearingIdState(id);
    localStorage.setItem(storageKey, id);
    window.dispatchEvent(new CustomEvent('cims-hearing-change', { detail: id }));
  }

  const value = useMemo<HearingContextValue>(
    () => ({
      hearingId,
      hearing: hearings.find((item) => item.id === hearingId),
      hearings,
      setHearingId,
      loading: query.isLoading
    }),
    [hearingId, hearings, query.isLoading]
  );

  return <HearingContext.Provider value={value}>{children}</HearingContext.Provider>;
}

export function useActiveHearing(): HearingContextValue {
  const value = useContext(HearingContext);
  if (!value) throw new Error('useActiveHearing must be used inside HearingProvider.');
  return value;
}

/**
 * Versi aman dari useActiveHearing — TIDAK melempar error jika digunakan di luar HearingProvider.
 * Kembalikan null jika context tidak tersedia.
 * Gunakan ini di komponen UI yang bisa muncul sebelum/diluar HearingProvider (mis. WorkflowStepper).
 */
export function useActiveHearingSafe(): HearingContextValue | null {
  return useContext(HearingContext) ?? null;
}
