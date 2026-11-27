// POST /api/mmi/responses — save one station's answer (media already uploaded
// to Storage by the browser; we store the path and transcript).
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { currentUser, getOwnedAttempt } from '@/lib/mmi/server';
import { countWords, getPreset, practicePreset } from '@/lib/mmi/content';

export async function POST(req: NextRequest) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const attemptId = String(b.attemptId ?? '');
  const position = Number(b.position);
  const attempt = await getOwnedAttempt(attemptId, user.id);
  if (!attempt) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!Number.isInteger(position) || position < 0 || position >= attempt.stationIds.length) {
    return NextResponse.json({ error: 'bad_position' }, { status: 400 });
  }
  const stationId = attempt.stationIds[position];
  const preset = attempt.preset === 'practice' ? practicePreset(attempt.edition) : getPreset(attempt.edition, attempt.preset);
  const allowedS = preset?.responseS ?? 180;

  // Media must live in this user's folder for this attempt.
  let mediaPath: string | null = typeof b.mediaPath === 'string' ? b.mediaPath : null;
  if (mediaPath && !mediaPath.startsWith(`${user.id}/${attemptId}/`)) mediaPath = null;
  const mediaKind = mediaPath && (b.mediaKind === 'video' || b.mediaKind === 'audio') ? b.mediaKind : null;
  const transcript = typeof b.transcript === 'string' ? b.transcript.slice(0, 20000) : '';
  const answerMode = b.answerMode === 'type' ? 'type' : 'speak';

  const [row] = await db
    .insert(schema.mmiResponses)
    .values({
      attemptId,
      userId: user.id,
      stationId,
      position,
      mediaPath,
      mediaKind,
      mime: mediaPath && typeof b.mime === 'string' ? b.mime.slice(0, 100) : null,
      mediaBytes: mediaPath && Number.isFinite(Number(b.mediaBytes)) ? Math.round(Number(b.mediaBytes)) : null,
      durationS: Math.max(0, Math.min(allowedS, Math.round(Number(b.durationS) || 0))),
      allowedS,
      transcript,
      wordCount: countWords(transcript),
      notes: typeof b.notes === 'string' ? b.notes.slice(0, 4000) : null,
      answerMode,
    })
    .onConflictDoNothing({ target: [schema.mmiResponses.attemptId, schema.mmiResponses.position] })
    .returning({ id: schema.mmiResponses.id });

  if (!row) return NextResponse.json({ error: 'duplicate' }, { status: 409 });
  return NextResponse.json({ id: row.id });
}
