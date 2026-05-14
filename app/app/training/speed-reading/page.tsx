// Speed Reading Tutor entry page. Server component: handles auth, profile lookup,
// baseline state, fetches the post-filter VR passage pool, and picks one passage
// for the initial Baseline render. The full pool is passed down so drill modules
// (Pacer/Chunking/Scan in PR 2) can drive a PassageSelector without re-fetching.
//
// Auth gating: the middleware + app/app layout already enforce a signed-in user
// is present by the time we render. We still pull the user from createClient()
// to access userId for the baseline lookup.
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/practice';
import { getBaseline } from '@/lib/speed-reading/sessions';
import { getVRPassages } from '@/lib/speed-reading/passages';
import SpeedReadingApp from './SpeedReadingApp';

export const metadata = { title: 'Speed Reading Tutor — PracXAM' };
export const dynamic = 'force-dynamic';

export default async function SpeedReadingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // middleware should have redirected; defensive guard

  const profile = await getOrCreateProfile(user.id, user.email!);
  const baseline = await getBaseline(user.id);
  const passages = await getVRPassages();
  if (passages.length === 0) {
    // Filter pool should be ~70 passages live; empty signals a serious bank
    // problem (everything corrupt/polluted/flagged) — fail loud rather than
    // serving a broken UI.
    throw new Error('No VR passages available — bank may be empty or all rows filtered out');
  }
  // Server-side initial pick keeps SSR and CSR in sync (avoids a hydration
  // mismatch from doing Math.random in the client component).
  const initialPassage = passages[Math.floor(Math.random() * passages.length)];

  return (
    <SpeedReadingApp
      email={profile.email}
      plan={profile.plan as 'free' | 'pro'}
      baseline={baseline}
      passages={passages}
      initialPassage={initialPassage}
    />
  );
}
