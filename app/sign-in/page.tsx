import Link from 'next/link';
import Logo from '@/components/Logo';
import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Sign in — PraxAM' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-px py-5">
        <Logo />
      </header>
      <main className="flex-1 grid place-items-center px-6">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[2rem] font-extrabold tracking-tight text-navy mb-1.5">Welcome back.</h1>
          <p className="text-ink-soft mb-8">Sign in to continue your UCAT prep.</p>
          <AuthForm mode="sign-in" next={params.next} />
          <p className="text-[12.5px] text-ink-muted mt-8 text-center">
            By signing in you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
