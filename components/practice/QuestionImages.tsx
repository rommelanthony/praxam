// Renders question images (Abstract Reasoning sets and test shapes, or any
// other imageRefs). Uses imageRoles when present (setA / setB / testShape),
// otherwise falls back to the plain imageRefs list.
'use client';
/* eslint-disable @next/next/no-img-element */

type Props = {
  imageRoles?: Record<string, string> | null;
  imageRefs?: string[] | null;
};

const ROLE_LABELS: Record<string, string> = {
  setA: 'Set A',
  setB: 'Set B',
  testShape: 'Test shape',
};

function Figure({ src, label, className = '' }: { src: string; label: string; className?: string }) {
  return (
    <figure className={`bg-white border border-line rounded-lg p-2 ${className}`}>
      <img src={src} alt={label} loading="eager" className="w-full h-auto block" />
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

export default function QuestionImages({ imageRoles, imageRefs }: Props) {
  const roles = imageRoles ?? {};
  const hasSets = Boolean(roles.setA || roles.setB);

  if (hasSets || roles.testShape) {
    return (
      <div className="mb-6 space-y-4">
        {hasSets && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roles.setA && <Figure src={roles.setA} label={ROLE_LABELS.setA} />}
            {roles.setB && <Figure src={roles.setB} label={ROLE_LABELS.setB} />}
          </div>
        )}
        {roles.testShape && (
          <div className="flex flex-col items-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Test shape</p>
            <Figure src={roles.testShape} label={ROLE_LABELS.testShape} className="w-40" />
          </div>
        )}
        {Object.entries(roles)
          .filter(([k]) => !(k in ROLE_LABELS))
          .map(([k, src]) => <Figure key={k} src={src} label={k} />)}
      </div>
    );
  }

  const refs = (imageRefs ?? []).filter(Boolean);
  if (refs.length === 0) return null;
  return (
    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {refs.map((src, i) => <Figure key={src + i} src={src} label={`Figure ${i + 1}`} />)}
    </div>
  );
}
