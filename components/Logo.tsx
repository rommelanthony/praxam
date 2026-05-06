import Link from 'next/link';

export default function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="PraxAM home">
      <svg className="mark" aria-hidden="true">
        <use href="#praxam-mark" />
      </svg>
      <span className="word">
        Prax<span className="am">AM</span>
      </span>
    </Link>
  );
}
