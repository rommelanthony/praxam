// Layout for all authenticated /app/* routes. The middleware has already
// guaranteed there's a logged-in user by the time this renders.
import Link from 'next/link';
import Logo from '@/components/Logo';
import { signOut } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { ToastManager } from '@/components/Toast';
import { XpToastManager } from '@/components/XpToast';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <nav className="app-nav">
        <div className="container-px flex items-center justify-between py-4">
          <Logo href="/app" />
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/app" className="text-[14.5px] font-medium text-ink-soft hover:text-navy">Dashboard</Link>
            <Link href="/app/practice" className="text-[14.5px] font-medium text-ink-soft hover:text-navy">Practice</Link>
            <Link href="/app/training/speed-reading" className="text-[14.5px] font-medium text-ink-soft hover:text-navy">Training</Link>
            <Link href="/app/account" className="text-[14.5px] font-medium text-ink-soft hover:text-navy">Account</Link>
          </div>
          <div className="flex gap-3 items-center">
            <span className="hidden sm:inline text-[13px] text-ink-muted">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost">Sign out</button>
            </form>
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <ToastManager />
      <XpToastManager />
    </>
  );
}
