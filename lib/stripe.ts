// Stripe server SDK singleton. Lazy-initialized so importing this module
// at build time (e.g. via route-level imports in a route that hasn't been
// reached yet) doesn't crash when STRIPE_SECRET_KEY is unset.
//
// PR A (foundation) only wires this up — the only call site is the webhook
// route's signature verification. Plan-sync and checkout-session code lands
// in PR C / PR B.

import 'server-only';
import Stripe from 'stripe';

// Pinned to the API version baked into stripe@22.1.1 (see CHANGELOG and
// node_modules/stripe/cjs/apiVersion.d.ts). Webhook payloads from Stripe
// arrive in whichever apiVersion the endpoint was registered under; pinning
// here keeps the SDK's serialization assumptions and the wire format in sync
// across SDK bumps.
const STRIPE_API_VERSION = '2026-04-22.dahlia';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeClient = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return stripeClient;
}
