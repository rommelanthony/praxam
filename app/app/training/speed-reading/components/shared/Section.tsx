// Light-themed port of the prototype's Section wrapper.
// Title + optional description + children panel.
import type { ReactNode } from 'react';

export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-navy mb-1">{title}</h2>
        {desc && <p className="text-ink-soft text-sm">{desc}</p>}
      </div>
      {children}
    </section>
  );
}
