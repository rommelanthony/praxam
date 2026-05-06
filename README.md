# PraxAM Web

Next.js 15 app for praxam.com — UCAT prep platform.

## What's in this scaffold (Phase 1)

- **Foundation**: Next.js 15 + TypeScript + Tailwind, with brand tokens wired in
- **Landing page**: ported from `../landing.html`, split into reusable React components
- **Brand consistency**: every colour/spacing token in `tailwind.config.ts` matches `../BRAND.md`

What's *not* here yet (coming next): authentication, database, question bank UI, Stripe.

## First-time setup

You need [Node.js 20+](https://nodejs.org/) installed. Check with `node -v`.

```bash
cd praxam/web
npm install
npm run dev
```

Then open http://localhost:3000 in your browser. You should see the PraxAM landing page running as a Next.js app.

## Project structure

```
web/
├── app/                    Next.js App Router pages
│   ├── layout.tsx          Root layout, fonts, metadata
│   ├── page.tsx            Landing page (composes section components)
│   └── globals.css         Brand tokens + component styles
├── components/             Reusable React components
│   ├── PraxamMark.tsx      SVG defs for the logo mark
│   ├── Logo.tsx            Wordmark + mark
│   ├── Nav.tsx             Top nav with sticky scroll behaviour
│   ├── Hero.tsx            Above-the-fold hero section
│   ├── Sections.tsx        Stats, Features, Sample, Pricing, FAQ, CTA, Footer
│   └── SampleQuestion.tsx  Interactive demo question
├── tailwind.config.ts      Brand tokens — colours, radii, shadows, fonts
├── tsconfig.json           TypeScript config
├── package.json            Dependencies + scripts
└── .env.example            Template for .env.local — copy and fill in
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values **only when you reach Phase 2+** (auth/payments). For Phase 1 (landing page only), no env vars are needed.

## Phases ahead

1. ✅ **Phase 1 — Foundation.** Landing page works.
2. ✅ **Phase 2 — Auth.** Sign up / sign in via Supabase. Protected `/app` routes.
3. **Phase 3 — Question bank.** Postgres schema, seed from extracted JSON, practice UI.
4. **Phase 4 — Stripe.** Subscriptions, webhooks, free/Pro gating.
5. **Phase 5 — Deployment.** Vercel + praxam.com DNS.

## Phase 2 setup — what to do before `npm run dev`

To make auth actually work:

1. **Create a free Supabase project.** Go to [supabase.com](https://supabase.com), sign up, and create a new project. Pick the EU (Ireland) region for proximity to UK users. Wait ~1 minute for it to provision.
2. **Copy your API credentials.** In Supabase, go to **Project Settings → API** and copy three values:
   - `Project URL`
   - `anon public` key
   - `service_role` secret key (keep this safe — never commit it)
3. **Create `.env.local`.** In `praxam/web/`, copy `.env.example` to `.env.local` and paste the three values into the Supabase block.
4. **(Optional) turn off email confirmation while you test.** In Supabase, go to **Authentication → Providers → Email** and toggle off "Confirm email" so signups work without email-clicking. Turn it back on before launch.
5. Now run `npm install` (only needed once after Phase 2's new deps land) and `npm run dev`.

You should see a working sign-up flow: visit `http://localhost:3000`, click "Start free", create an account, and land on `/app`.

## Auth file layout

```
app/
├── auth/
│   ├── actions.ts            Server actions: signIn, signUp, signOut
│   └── callback/route.ts     Email-confirmation callback handler
├── sign-in/page.tsx          Sign-in form
├── sign-up/page.tsx          Sign-up form
└── app/                      Protected route group (middleware-gated)
    ├── layout.tsx            Authed nav + sign-out
    ├── page.tsx              Dashboard
    └── practice/page.tsx     Placeholder for Phase 3
lib/supabase/
├── server.ts                 Server Components / Server Actions / Route Handlers
├── client.ts                 Client Components
└── middleware.ts             Refreshes session, redirects on protected routes
middleware.ts                 Wires lib/supabase/middleware.ts into Next.js
```

## Third-party accounts you'll eventually need

| Service   | Purpose                          | Cost at MVP scale |
|-----------|----------------------------------|--------------------|
| Vercel    | Hosting                          | Free tier          |
| Supabase  | Auth + Postgres database         | Free tier          |
| Stripe    | Subscription payments            | ~3% per transaction |
| Resend    | Transactional email (optional)   | Free for first 100 / day |

You can sign up for these as we reach each phase — no need to do it all at once.

## Common commands

```bash
npm run dev        # Start dev server at localhost:3000
npm run build      # Production build
npm run start      # Run production build locally
npm run typecheck  # Verify TypeScript with no emit
npm run lint       # Lint with eslint
```

## Deploying to Vercel (when you're ready)

1. Push this repo to GitHub
2. Go to vercel.com → New Project → import the repo
3. Set Root Directory to `praxam/web`
4. Add environment variables (Phase 2+)
5. Deploy
6. Add `praxam.com` as a custom domain in Project → Settings → Domains

Detailed deployment guide will land in Phase 5.
