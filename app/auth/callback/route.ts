// Handles the email-confirmation redirect from Supabase. After clicking the link
// in their welcome email, users land here with a `code` query parameter that we
// exchange for a session.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  // Fallback — send them to sign-in with an error flag
  return NextResponse.redirect(new URL('/sign-in?error=callback', url.origin));
}
