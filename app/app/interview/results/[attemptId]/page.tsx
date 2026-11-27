// Results for one MMI attempt: recordings, AI feedback and self-marking.
import { notFound } from 'next/navigation';
import { currentUser, getAttemptResponses, getOwnedAttempt, getSelfMarks } from '@/lib/mmi/server';
import { getBank, getStation } from '@/lib/mmi/content';
import ResultsView, { type ResultItem } from './ResultsView';

export const metadata = { title: 'MMI feedback — PracXAM' };
export const dynamic = 'force-dynamic';

export default async function ResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { supabase, user } = await currentUser();
  if (!user) return null;
  const attempt = await getOwnedAttempt(attemptId, user.id);
  if (!attempt) notFound();

  const bank = getBank(attempt.edition, { staging: true });
  const responses = await getAttemptResponses(attempt.id);
  const marks = await getSelfMarks(responses.map((r) => r.id), user.id);

  // Short-lived signed URLs for private recordings (owner-only storage policy).
  const paths = responses.map((r) => r.mediaPath).filter((p): p is string => !!p);
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from('mmi-recordings').createSignedUrls(paths, 60 * 60 * 2);
    for (const d of data ?? []) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  }

  const items: ResultItem[] = responses.map((r) => {
    const st = getStation(attempt.edition, r.stationId);
    return {
      id: r.id,
      position: r.position,
      stationId: r.stationId,
      title: st?.title ?? r.stationId,
      domain: st?.domain ?? '',
      scenario: st?.scenario ?? '',
      question: st?.question ?? '',
      attributes: (st?.attributes ?? []).map((k) => ({ key: k, label: bank.attributes[k].label, levels: bank.attributes[k].levels })),
      mediaUrl: r.mediaPath ? urls[r.mediaPath] ?? null : null,
      mediaKind: r.mediaKind,
      durationS: r.durationS ?? 0,
      allowedS: r.allowedS,
      wordCount: r.wordCount,
      transcript: r.transcript ?? '',
      notes: r.notes ?? '',
      answerMode: r.answerMode,
      aiStatus: r.aiStatus,
      aiFeedback: r.aiFeedback ?? null,
      createdAt: r.createdAt.toISOString(),
      selfScores: marks.find((m) => m.responseId === r.id)?.scores ?? {},
    };
  });

  return (
    <ResultsView
      attemptId={attempt.id}
      edition={attempt.edition}
      kind={attempt.kind}
      expected={attempt.stationIds.length}
      startedAt={attempt.startedAt.toISOString()}
      attributeLabels={Object.fromEntries(Object.entries(bank.attributes).map(([k, a]) => [k, a.label]))}
      items={items}
    />
  );
}
