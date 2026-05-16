// Stripe webhook receiver for PracXAM-custom event handling.
//
// Two distinct webhook endpoints exist in the system:
//
//   1. The Supabase Stripe Sync Engine endpoint (managed by Supabase,
//      registered automatically when the Sync Engine integration is
//      installed). Receives the full Stripe firehose and mirrors state
//      into the `stripe.*` schema. That schema is the source of truth
//      for subscription state — application reads go through it.
//
//   2. THIS endpoint, `/api/stripe-webhook`. PracXAM-owned, registered
//      separately in the Stripe Dashboard, scoped to the small event set
//      we need custom side-effects for (e.g. payment-failure email).
//      Each endpoint has its OWN `whsec_` secret.
//
// PR A: signature-verified no-op. Logs the event type and returns 200.
// Per-event-type handler logic lands in PR C.
//
// HMAC requires the raw request bytes — do NOT use req.json() or any
// parser that reads + re-serializes the body before constructEvent runs.

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

// Force Node.js runtime — stripe-node's signature verification uses
// node:crypto's HMAC, which is unavailable on the edge runtime.
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[stripe-webhook] signature verification failed: ${msg}`);
    return NextResponse.json({ error: 'signature_verification_failed' }, { status: 400 });
  }

  console.log(`[stripe-webhook] verified event: type=${event.type} id=${event.id}`);

  return NextResponse.json({ received: true });
}
