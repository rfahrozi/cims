import type { ReactNode } from 'react';
import { WorkflowStepper } from '@/components/workflow-stepper';

/**
 * PageHeader — header standar setiap halaman.
 * Sudah menyertakan WorkflowStepper (QW-01) secara otomatis di halaman workflow inti.
 */
export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <>
      {/* QW-01: Stepper muncul otomatis di halaman alur sidang */}
      <WorkflowStepper />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0b2a4a]">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
    </>
  );
}
