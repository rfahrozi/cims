import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook M-08/CU-04: Menghubungkan Frontend ke Realtime SSE Backend.
 * Saat menerima event tertentu dari backend (contoh: NOTICE_ACKNOWLEDGED),
 * hook ini akan me-refresh (invalidate) cache React Query secara otomatis
 * sehingga UI akan update seketika tanpa perlu menekan F5.
 */
export function useAppNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const persona = user?.role || 'UNKNOWN';

  useEffect(() => {
    // Ambil base URL dan persona/token untuk autentikasi SSE
    const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1';
    const token = localStorage.getItem('cims_token') ?? '';

    // EventSource tidak mendukung custom headers. Kita passing via query param.
    // Jika OIDC Production kelak menggunakan HTTPOnly Cookies, param ini bisa diabaikan.
    const url = new URL(`${window.location.origin}${baseUrl}/realtime/events`);
    url.searchParams.append('persona', persona);
    if (token) {
      url.searchParams.append('token', token);
    }

    const eventSource = new EventSource(url.toString(), {
      withCredentials: true // Mendukung pertukaran cookie antar domain jika diperlukan
    });

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Invalidate cache berdasarkan jenis event
        if (payload.type === 'NOTICE_ACKNOWLEDGED') {
          // Refetch notices & sla-report karena ada yang baru saja melakukan acknowledgment
          queryClient.invalidateQueries({ queryKey: ['notices', payload.hearingId] });
          queryClient.invalidateQueries({ queryKey: ['sla-report'] });
          queryClient.invalidateQueries({ queryKey: ['gate', payload.hearingId] });
        }

        if (payload.type === 'SCHEDULE_CHANGED') {
          // Refetch jadwal dan history jika ada perubahan jadwal baru disetujui
          queryClient.invalidateQueries({ queryKey: ['schedule-history', payload.hearingId] });
          queryClient.invalidateQueries({ queryKey: ['gate', payload.hearingId] });
        }
      } catch (err) {}
    };

    eventSource.onerror = (error) => {};

    return () => {
      // Pastikan untuk menutup koneksi jika komponen dibongkar (unmount)
      eventSource.close();
    };
  }, [queryClient, persona]);
}
