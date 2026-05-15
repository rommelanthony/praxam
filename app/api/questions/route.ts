// Bulk question fetch for the practice flow. Plan-gates free users via
// lib/questions/gating.ts:getNextQuestionsForUser — see that file for the
// hard-stop rule (10 questions per subtest, paywall on exhaustion).
//
// Auth: requires a signed-in user. Anonymous requests return 401. This
// closes a pre-existing security gap where the route was anonymously
// accessible. The marketing landing's sample question is hardcoded in
// components/SampleQuestion.tsx and doesn't hit this route — verified
// pre-C3 grep showed only authed /app/* pages fetch it (challenge and
// practice/[subtest]).
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/practice';
import { getNextQuestionsForUser } from '@/lib/questions/gating';

export async function GET(req: NextRequest) {
  const subtest = req.nextUrl.searchParams.get('subtest');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20');

  if (!subtest) {
    return NextResponse.json({ error: 'subtest required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const profile = await getOrCreateProfile(user.id, user.email!);
  const plan = profile.plan as 'free' | 'pro';

  // alreadyAttempted intentionally unset — bulk fetch at session start
  // doesn't dedupe against prior sessions. The Pro path stays
  // byte-identical to the pre-PR response shape (no paywall key).
  // pickNextQuestion (C4) is where recent-dedup is wanted.
  const result = await getNextQuestionsForUser({
    userId: user.id,
    subtest,
    plan,
    limit,
  });

  if ('paywall' in result) {
    return NextResponse.json({ questions: [], paywall: result.paywall });
  }
  return NextResponse.json({ questions: result.questions });
}
