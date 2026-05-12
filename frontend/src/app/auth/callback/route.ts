// ─── auth/callback/route.ts ───────────────────────────────────────────────────
// Google OAuth 콜백 Route Handler.
// Google 리다이렉트에서 ?code= 파라미터를 받아 Supabase 세션으로 교환한 뒤
// ?next= 경로(또는 /)로 리다이렉트. 실패 시 /auth/login?error=oauth로 이동.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/core/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
}
