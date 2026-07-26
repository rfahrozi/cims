import type { ReactNode } from 'react';
import { type LucideIcon, InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  /** Tombol aksi utama */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  /** Konten tambahan (link, hint, dll.) */
  children?: ReactNode;
  className?: string;
}

/**
 * EmptyState — komponen standar untuk halaman/section yang belum memiliki data.
 * Selalu berikan panduan aksi selanjutnya agar pengguna tidak bingung.
 */
export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  children,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {action && (
        <Button className="mt-5" variant={action.variant ?? 'default'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
