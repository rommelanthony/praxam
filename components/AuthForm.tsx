'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { signIn, signUp, type AuthState } from '@/app/auth/actions';

interface Props {
  mode: 'sign-in' | 'sign-up';
  next?: string;
}

export default function AuthForm({ mode, next }: Props) {
  const action = mode === 'sign-in' ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  const isSignIn = mode === 'sign-in';

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-navy mb-1.5">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full px-4 py-3 rounded-md border border-line bg-surface text-navy text-[15px] focus:outline-none focus:border-teal focus:ring-3 focus:ring-teal-soft"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-navy mb-1.5">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignIn ? 'current-password' : 'new-password'}
          required
          minLength={isSignIn ? undefined : 8}
          className="w-full px-4 py-3 rounded-md border border-line bg-surface text-navy text-[15px] focus:outline-none focus:border-teal focus:ring-3 focus:ring-teal-soft"
        />
        {!isSignIn && <p className="text-[12.5px] text-ink-muted mt-1.5">At least 8 characters.</p>}
      </div>

      {state?.error && (
        <div className="rounded-md p-3 text-[14px]" style={{ background: 'var(--violet-soft)', color: 'var(--violet)', border: '1px solid var(--violet)' }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-teal btn-large w-full justify-center disabled:opacity-60"
      >
        {pending ? 'Working…' : isSignIn ? 'Sign in' : 'Create account'}
      </button>

      <p className="text-center text-[14px] text-ink-soft mt-2">
        {isSignIn ? (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-teal-deep font-semibold hover:underline">Sign up</Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="text-teal-deep font-semibold hover:underline">Sign in</Link>
          </>
        )}
      </p>
    </form>
  );
}
