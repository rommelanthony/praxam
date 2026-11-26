// Starts an MMI sitting. Stations are chosen here on the server (once) so the
// client runner gets a stable list; the attempt row is created only when the
// user finishes the device check and presses Start.
import { redirect } from 'next/navigation';
import { currentUser, getSeenStationIds } from '@/lib/mmi/server';
import { getBank, getPreset, isEdition, practicePreset, type Edition } from '@/lib/mmi/content';
import { pickStations } from '@/lib/mmi/select';
import MmiRunner from './MmiRunner';

export const metadata = { title: 'MMI — PracXAM' };
export const dynamic = 'force-dynamic';

export default async function SessionPage({ searchParams }: { searchParams: Promise<{ edition?: string; preset?: string; station?: string }> }) {
  const params = await searchParams;
  const edition: Edition = isEdition(params.edition) ? params.edition : 'nz';
  const { user } = await currentUser();
  if (!user) return null;
  const bank = getBank(edition);

  let kind: 'mock' | 'single';
  let preset;
  let stations;
  if (params.station) {
    const st = bank.stations.find((s) => s.id === params.station);
    if (!st) redirect(`/app/interview?edition=${edition}`);
    kind = 'single';
    preset = practicePreset(edition);
    stations = [st];
  } else {
    preset = getPreset(edition, params.preset ?? '') ?? getPreset(edition, edition === 'nz' ? 'auckland' : 'circuit')!;
    kind = 'mock';
    stations = pickStations(bank, preset, await getSeenStationIds(user.id));
  }

  return (
    <MmiRunner
      userId={user.id}
      edition={edition}
      lang={bank.lang}
      kind={kind}
      preset={preset}
      stations={stations}
      attributeLabels={Object.fromEntries(Object.entries(bank.attributes).map(([k, a]) => [k, a.label]))}
    />
  );
}
