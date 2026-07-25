import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorMessage } from '@/lib/error-messages';

type AlertVariant = 'error' | 'success' | 'info' | 'warning';

interface AlertBannerProps {
  variant?: AlertVariant;
  /** Terima Error object, string, atau unknown — dikonversi otomatis ke pesan ramah */
  message: unknown;
  onDismiss?: () => void;
  className?: string;
}

const config: Record<AlertVariant, { icon: typeof AlertCircle; bg: string; border: string; text: string; iconColor: string }> = {
  error:   { icon: AlertCircle,    bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-800',   iconColor: 'text-red-500'   },
  success: { icon: CheckCircle2,   bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800', iconColor: 'text-green-500' },
  info:    { icon: Info,           bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-800',  iconColor: 'text-blue-500'  },
  warning: { icon: AlertCircle,    bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-800', iconColor: 'text-amber-500' },
};

/**
 * AlertBanner — tampilkan pesan sukses atau error yang human-readable.
 * Otomatis konversi error code teknis ke Bahasa Indonesia via errorMessage().
 */
export function AlertBanner({ variant = 'error', message, onDismiss, className }: AlertBannerProps) {
  if (!message) return null;
  const { icon: Icon, bg, border, text, iconColor } = config[variant];
  const displayMessage = variant === 'error' ? errorMessage(message) : String(message);

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3.5 text-sm', bg, border, text, className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor)} />
      <p className="flex-1 leading-relaxed">{displayMessage}</p>
      {onDismiss && (
        <button onClick={onDismiss} className={cn('shrink-0 rounded p-0.5 hover:bg-black/5', text)}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
