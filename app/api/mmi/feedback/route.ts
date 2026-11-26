// POST /api/mmi/feedback — generate AI feedback for one saved response.
// Fired by the runner after each station; idempotent.
import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { currentUser } from '@/lib/mmi/server';
import { getBank, getStation } from '@/lib/mmi/content';
import { generateFeedback } from '@/lib/mmi/feedback';
import { countWords } from '@/lib/mmi/content';
import { transcribe, transcriptionConfigured, transcriptionModel } from '@/lib/mmi/transcribe';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { responseId } = (await req.json().catch(() => ({}))) as { responseId?: string };
  if (!responseId || !/^[0-9a-f-]{36}$/i.test(responseId)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const [row] = await db
    .select({ r: schema.mmiResponses, edition: schema.mmiAttempts.edition })
    .from(schema.mmiResponses)
    .innerJoin(schema.mmiAttempts, eq(schema.mmiAttempts.id, schema.mmiResponses.attemptId))
    .where(and(eq(schema.mmiResponses.id, responseId), eq(schema.mmiResponses.userId, user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let r = row.r;
  if (r.aiStatus === 'done') return NextResponse.json({ status: 'done' });

  const station = getStation(row.edition, r.stationId);
  const empty: schema.MmiFeedback = { scores: {}, band: 'Limited', summary: '', strengths: [], improvements: [], missed: [], outline: [] };
  const set = (aiStatus: 'done' | 'error' | 'skipped', aiFeedback: schema.MmiFeedback | null) =>
    db.update(schema.mmiResponses).set({ aiStatus, aiFeedback }).where(eq(schema.mmiResponses.id, r.id));
  if (!station) {
    await set('error', null);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }

  // Spoken answers with a recording: transcribe on the server (works in every
  // browser, and is more accurate than the live browser transcript). Saved
  // before feedback so a retry after a timeout doesn't transcribe twice.
  let transcribedBy = r.aiFeedback?.transcribedBy;
  if (r.answerMode === 'speak' && r.mediaPath && !transcribedBy && transcriptionConfigured()) {
    try {
      const { data: media, error } = await supabase.storage.from('mmi-recordings').download(r.mediaPath);
      if (error || !media) throw new Error('download_failed');
      const text = await transcribe(media, r.mime ?? media.type, row.edition, station);
      transcribedBy = transcriptionModel();
      // Keep the browser transcript if the server heard (almost) nothing.
      const useServer = countWords(text) >= Math.min(12, r.wordCount);
      const transcript = useServer ? text : r.transcript ?? '';
      const wordCount = countWords(transcript);
      await db
        .update(schema.mmiResponses)
        .set({ transcript, wordCount, aiFeedback: { ...empty, transcribedBy } })
        .where(eq(schema.mmiResponses.id, r.id));
      r = { ...r, transcript, wordCount };
    } catch (e) {
      // Fall back to whatever the browser captured.
      console.error('mmi transcription failed', r.id, e instanceof Error ? e.message : e);
    }
  }

  // Too little to mark (no recording/transcript, or a near-silent answer).
  if (r.wordCount < 12) {
    await set('skipped', transcribedBy ? { ...empty, transcribedBy } : null);
    return NextResponse.json({ status: 'skipped' });
  }
  try {
    const fb = await generateFeedback(getBank(row.edition, { staging: true }), station, {
      transcript: r.transcript ?? '',
      durationS: r.durationS ?? 0,
      allowedS: r.allowedS,
      answerMode: r.answerMode,
    });
    await set('done', { ...fb, transcribedBy });
    return NextResponse.json({ status: 'done' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    await set('error', { ...empty, error: msg, transcribedBy });
    return NextResponse.json({ status: 'error', error: msg }, { status: 502 });
  }
}
