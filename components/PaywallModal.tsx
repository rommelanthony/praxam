'use client';
// Generic Pro-upgrade prompt. Stub for the upgrade-flow PR — replaced
// wholesale when Stripe integration lands. Intentionally minimal.
//
// Open/closed state lives in this module so call sites just call openPaywall();
// there's a single source of truth that can be migrated cleanly later.
//
// Config: callers may pass { title, body } to customise the modal for their
// context. Unspecified fields fall back to the Speed-Reading-flavoured
// defaults below (which is what the original signature produced). Partial
// override is the common case — practice plan-gating will pass a custom
// title; Speed Reading drill clicks pass a per-drill title; the See-plan
// CTA copy and the close paths are constant across all callers.
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';

export type PaywallConfig = {
  title?: string;
  body?: ReactNode;
};

type Listener = (config: PaywallConfig) => void;
const listeners: Listener[] = [];

export function openPaywall(config: PaywallConfig = {}) {
  listeners.forEach((l) => l(config));
}

const DEFAULT_TITLE = 'Upgrade to Pro to unlock this drill';
const DEFAULT_BODY: ReactNode = (
  <>
    Baseline and Pacer are free. The remaining drills — Chunking, Scan, Qualifier Hunt,
    Triage Trainer, and Passage Drill — are part of Pro.
  </>
);

export function PaywallModal() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PaywallConfig>({});

  useEffect(() => {
    const h: Listener = (cfg) => {
      setConfig(cfg);
      setOpen(true);
    };
    listeners.push(h);
    return () => {
      const i = listeners.indexOf(h);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);

  // Escape-to-close. Only active while open so we're not listening every page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const title = config.title ?? DEFAULT_TITLE;
  const body = config.body ?? DEFAULT_BODY;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-surface border border-line rounded-lg shadow-lg max-w-md w-full p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold tracking-tight text-navy mb-2">{title}</h2>
        <p className="text-ink-soft mb-6">{body}</p>
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
