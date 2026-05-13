'use client';
// Generic Pro-upgrade prompt. Stub for PR 1 — replaced wholesale when Stripe
// integration lands. Intentionally dumb: no drill-specific copy or pricing.
//
// Open/closed state lives in this module so call sites just call openPaywall();
// there's a single source of truth that can be migrated cleanly later.
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Listener = (open: boolean) => void;
const listeners: Listener[] = [];

export function openPaywall() {
  listeners.forEach((l) => l(true));
}

export function PaywallModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h: Listener = (v) => setOpen(v);
    listeners.push(h);
    return () => {
      const i = listeners.indexOf(h);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);
  // Escape-to-close. Only active while the modal is open so we're not
  // listening on every page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-surface border border-line rounded-lg shadow-lg max-w-md w-full p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold tracking-tight text-navy mb-2">Upgrade to Pro to unlock this drill</h2>
        <p className="text-ink-soft mb-6">
          Baseline and Pacer are free. The remaining drills — Chunking, Scan, Qualifier Hunt,
          Triage Trainer, and Passage Drill — are part of Pro.
        </p>
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
            Not now
          </button>
          <Link
            href="/app/account"
            onClick={() => setOpen(false)}
            className="btn btn-teal"
          >
            See plan
          </Link>
        </div>
      </div>
    </div>
  );
}
