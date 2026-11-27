// Station selection for mocks. Pure functions; the caller supplies the RNG so
// selection can run once on the server (avoids hydration mismatches).
import type { Bank, Preset, Station } from './content';

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 'domains' presets: one core station per domain, in the bank's domain order
 * (fixed order, like the real Auckland MMI). Because every core station carries
 * its domain's anchor attributes, a full mock always covers all 8 attributes.
 * Stations the user hasn't seen are preferred.
 */
export function pickStations(bank: Bank, preset: Preset, seen: Set<string>, rand: () => number = Math.random): Station[] {
  const pick = (pool: Station[]) => {
    const fresh = pool.filter((s) => !seen.has(s.id));
    return shuffle(fresh.length ? fresh : pool, rand)[0];
  };
  if (preset.mode === 'domains') {
    return bank.domains
      .filter((d) => d !== 'Situational')
      .map((d) => pick(bank.stations.filter((s) => s.style === 'core' && s.domain === d)))
      .filter((s): s is Station => !!s);
  }
  const fresh = shuffle(bank.stations.filter((s) => !seen.has(s.id)), rand);
  const rest = shuffle(bank.stations.filter((s) => seen.has(s.id)), rand);
  return fresh.concat(rest).slice(0, preset.stations);
}

/** Every attribute assessed at least once across the chosen stations. */
export function coversAllAttributes(bank: Bank, stations: Station[]): boolean {
  const seen = new Set(stations.flatMap((s) => s.attributes));
  return Object.keys(bank.attributes).every((k) => seen.has(k as never));
}
