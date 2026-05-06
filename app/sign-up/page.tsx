import Link from 'next/link';
import Logo from '@/components/Logo';
import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Sign up — PracXAM' };

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-px py-5">
        <Logo />
      </header>
      <main className="flex-1 grid place-items-center px-6">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[2rem] font-extrabold tracking-tight text-navy mb-1.5">Start practising.</h1>
          <p className="text-ink-soft mb-8">Free forever. No card required.</p>
          <AuthForm mode="sign-up" />
          <p className="text-[12.5px] text-ink-muted mt-8 text-center">
            By signing up you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
