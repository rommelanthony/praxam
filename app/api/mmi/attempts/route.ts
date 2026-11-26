// POST /api/mmi/attempts — start an MMI attempt (after the device check).
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { currentUser } from '@/lib/mmi/server';
import { getBank, getPreset, isEdition } from '@/lib/mmi/content';

export async function POST(req: NextRequest) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { edition, preset, kind, stationIds, recordMode } = body as Record<string, unknown>;
  if (!isEdition(edition)) return NextResponse.json({ error: 'bad_edition' }, { status: 400 });
  if (kind !== 'mock' && kind !== 'single') return NextResponse.json({ error: 'bad_kind' }, { status: 400 });
  if (typeof preset !== 'string' || (preset !== 'practice' && !getPreset(edition, preset))) {
    return NextResponse.json({ error: 'bad_preset' }, { status: 400 });
  }
  const mode = recordMode === 'audio' || recordMode === 'none' ? recordMode : 'video';
  const bank = getBank(edition);
  const valid = new Set(bank.stations.map((s) => s.id));
  if (!Array.isArray(stationIds) || !stationIds.length || stationIds.length > 12 || !stationIds.every((id) => typeof id === 'string' && valid.has(id))) {
    return NextResponse.json({ error: 'bad_stations' }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.mmiAttempts)
    .values({ userId: user.id, edition, preset, kind, stationIds: stationIds as string[], recordMode: mode })
    .returning({ id: schema.mmiAttempts.id });
  return NextResponse.json({ id: row.id });
}
