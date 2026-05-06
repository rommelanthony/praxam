'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`app-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container-px flex items-center justify-between py-4">
        <Logo />
        <div className="hidden md:flex gap-8 items-center">
          <Link href="#features" className="text-[14.5px] font-medium text-ink-soft hover:text-navy transition-colors">Features</Link>
          <Link href="#sample" className="text-[14.5px] font-medium text-ink-soft hover:text-navy transition-colors">Sample question</Link>
          <Link href="#pricing" className="text-[14.5px] font-medium text-ink-soft hover:text-navy transition-colors">Pricing</Link>
          <Link href="#faq" className="text-[14.5px] font-medium text-ink-soft hover:text-navy transition-colors">FAQ</Link>
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/sign-in" className="btn btn-ghost">Sign in</Link>
          <Link href="#pricing" className="btn btn-teal">Start free</Link>
        </div>
      </div>
    </nav>
  );
}
