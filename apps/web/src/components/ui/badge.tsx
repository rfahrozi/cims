import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
const variants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-blue-100 text-blue-800',
      success: 'bg-emerald-100 text-emerald-800',
      warning: 'bg-amber-100 text-amber-800',
      destructive: 'bg-red-100 text-red-800',
      outline: 'border text-slate-700'
    }
  },
  defaultVariants: { variant: 'default' }
});
export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof variants>) {
  return <div className={cn(variants({ variant }), className)} {...props} />;
}
