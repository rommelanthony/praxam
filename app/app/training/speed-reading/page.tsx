// Speed Reading Tutor entry page. Server component: handles auth, profile lookup,
// baseline state, and the initial Baseline passage fetch, then hands all of it
// to the client-side <SpeedReadingApp /> tab router.
//
// Auth gating: the middleware + app/app layout already enforce a signed-in
// user is present by the time we render. We still pull the user from
// createClient() to access userId for the baseline lookup.
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/practice';
import { getBaseline } from '@/lib/speed-reading/sessions';
import { getRandomVRPassage } from '@/lib/speed-reading/passages';
import SpeedReadingApp from './SpeedReadingApp';

export const metadata = { title: 'Speed Reading Tutor — PracXAM' };
export const dynamic = 'force-dynamic';

export default async function SpeedReadingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // middleware should have redirected, defensive guard

  const profile = await getOrCreateProfile(user.id, user.email!);
  const baseline = await getBaseline(user.id);
  const initialPassage = await getRandomVRPassage();

  return (
    <SpeedReadingApp
      email={profile.email}
      plan={profile.plan as 'free' | 'pro'}
      baseline={baseline}
      initialPassage={initialPassage}
    />
  );
}
