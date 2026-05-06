import Link from 'next/link';

export default function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="PracXAM home">
      <svg className="mark" aria-hidden="true">
        <use href="#praxam-mark" />
      </svg>
      <span className="word">
        Prac<span className="am">XAM</span>
      </span>
    </Link>
  );
}
