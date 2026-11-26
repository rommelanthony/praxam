// MMI content: station banks, attributes, rubric and presets.
// Station content is versioned in the repo (lib/mmi/data/*.json) so every
// edit goes through a PR review. Safe to import from client and server.
import nz from './data/nz.json';
import au from './data/au.json';

export type Edition = 'nz' | 'au';
export type AttributeKey = 'comm' | 'equity' | 'ethics' | 'critical' | 'cultural' | 'team' | 'resilience' | 'flex';

export type Attribute = {
  label: string;
  description: string;
  levels: { '1': string; '3': string; '5': string };
};

export type Station = {
  id: string;
  style: 'core' | 'situational';
  domain: string;
  attributes: AttributeKey[];
  title: string;
  scenario: string;
  question: string;
  keyPoints: string[];
  status: 'staging' | 'live' | 'retired';
};

export type Bank = {
  edition: Edition;
  place: string;
  lang: string;
  attributes: Record<AttributeKey, Attribute>;
  domains: string[];
  anchors: Record<string, AttributeKey[]>;
  stations: Station[];
};

export type Preset = {
  key: string;
  label: string;
  description: string;
  stations: number;
  prepS: number;
  responseS: number;
  transitionS: number;
  mode: 'domains' | 'random';
};

const BANKS: Record<Edition, Bank> = { nz: nz as Bank, au: au as Bank };

export const EDITIONS: Record<Edition, { label: string; short: string }> = {
  nz: { label: 'New Zealand (Auckland format)', short: 'NZ' },
  au: { label: 'Australia', short: 'AU' },
};

export const PRESETS: Record<Edition, Preset[]> = {
  nz: [
    { key: 'auckland', label: 'Auckland MMI', description: '7 stations, one per domain. 30 s prep, 3 min answer.', stations: 7, prepS: 30, responseS: 180, transitionS: 10, mode: 'domains' },
    { key: 'melbourne', label: 'Short answers', description: '8 mixed stations. 30 s prep, 1 min answer.', stations: 8, prepS: 30, responseS: 60, transitionS: 10, mode: 'random' },
  ],
  au: [
    { key: 'circuit', label: 'Practice circuit', description: '7 stations, one per area. 30 s prep, 3 min answer.', stations: 7, prepS: 30, responseS: 180, transitionS: 10, mode: 'domains' },
    { key: 'melbourne', label: 'Melbourne MD format', description: '8 mixed stations. 30 s prep, 1 min answer.', stations: 8, prepS: 30, responseS: 60, transitionS: 10, mode: 'random' },
  ],
};

export function isEdition(x: unknown): x is Edition {
  return x === 'nz' || x === 'au';
}

/**
 * Server-only. Stations are reviewed before going live. Staging content is shown in
 * development and Vercel previews, and in production only when
 * MMI_INCLUDE_STAGING=1 (e.g. for a closed beta).
 */
export function includeStaging(): boolean {
  if (process.env.MMI_INCLUDE_STAGING === '1') return true;
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV !== 'production';
  return process.env.NODE_ENV !== 'production';
}

export function getBank(edition: Edition, opts: { staging?: boolean } = {}): Bank {
  const bank = BANKS[edition];
  const staging = opts.staging ?? includeStaging();
  return {
    ...bank,
    stations: bank.stations.filter((s) => s.status === 'live' || (staging && s.status === 'staging')),
  };
}

export function getStation(edition: Edition, id: string): Station | undefined {
  return BANKS[edition].stations.find((s) => s.id === id);
}

export function getPreset(edition: Edition, key: string): Preset | undefined {
  return PRESETS[edition].find((p) => p.key === key);
}

export function practicePreset(edition: Edition): Preset {
  const base = PRESETS[edition][0];
  return { ...base, key: 'practice', label: 'Single station', stations: 1 };
}

export function attributeLabel(bank: Bank, key: string): string {
  return bank.attributes[key as AttributeKey]?.label ?? key;
}

export function bandOf(scores: Record<string, number>): 'Strong' | 'Competent' | 'Developing' | 'Limited' {
  const v = Object.values(scores).filter((n) => typeof n === 'number');
  if (!v.length) return 'Limited';
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return m >= 4.25 ? 'Strong' : m >= 3.25 ? 'Competent' : m >= 2.25 ? 'Developing' : 'Limited';
}

export function countWords(text: string | null | undefined): number {
  return (String(text ?? '').trim().match(/\S+/g) ?? []).length;
}
