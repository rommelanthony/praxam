'use server';
// Server actions called by the QuestionRunner client component.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { pickNextQuestion, submitAnswer, subtestFromSlug, getOrCreateProfile } from '@/lib/practice';

export async function answerAndNext(input: {
  subtestSlug: string;
  questionId: string;
  pickedLetter: string;
  timeTakenMs: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const subtestKey = subtestFromSlug(input.subtestSlug);
  if (!subtestKey) throw new Error('Unknown subtest');

  const result = await submitAnswer({
    userId: user!.id,
    sessionId: null,
    questionId: input.questionId,
    pickedLetter: input.pickedLetter,
    timeTakenMs: input.timeTakenMs,
  });

  const profile = await getOrCreateProfile(user!.id, user!.email!);
  const next = await pickNextQuestion({
    userId: user!.id,
    subtest: subtestKey,
    plan: profile.plan as 'free' | 'pro',
  });

  return {
    grading: result,
    next: next ? JSON.parse(JSON.stringify(next)) : null,
  };
}
