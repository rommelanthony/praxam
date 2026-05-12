import { permanentRedirect } from 'next/navigation';

// /app/training is reserved as the future hub for tutors (Speed Reading,
// Decision Making, Quantitative Reasoning, etc.). For now it permanently
// redirects (308) to the only tutor that exists.
export default function TrainingHub(): never {
  permanentRedirect('/app/training/speed-reading');
}
