// Inline SVG defs for the PraxAM mark (book + mountains + sun in brand gradient).
// Renders once per page; each <Logo /> instance references the shared <symbol> via <use>.
export default function PraxamMark() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="praxam-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6B4FA8" />
          <stop offset="50%" stopColor="#0F2D4F" />
          <stop offset="100%" stopColor="#1B9D9D" />
        </linearGradient>
        <symbol id="praxam-mark" viewBox="0 0 64 64">
          <path d="M 8 50 L 8 26 Q 8 22 12 22 L 30 25 L 30 53 L 12 50 Z" fill="none" stroke="url(#praxam-grad)" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M 56 50 L 56 26 Q 56 22 52 22 L 34 25 L 34 53 L 52 50 Z" fill="none" stroke="url(#praxam-grad)" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M 14 28 L 24 14 L 30 22 L 36 10 L 44 22 L 50 28" fill="none" stroke="url(#praxam-grad)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="40" cy="8" r="3" fill="none" stroke="url(#praxam-grad)" strokeWidth="2" />
          <g stroke="url(#praxam-grad)" strokeWidth="1.6" strokeLinecap="round">
            <line x1="40" y1="2" x2="40" y2="0.5" />
            <line x1="44.5" y1="4" x2="46" y2="2.5" />
            <line x1="35.5" y1="4" x2="34" y2="2.5" />
            <line x1="46" y1="8" x2="48" y2="8" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}
