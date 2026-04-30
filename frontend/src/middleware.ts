// ─── middleware.ts ─────────────────────────────────────────────────────────────
// Next.js Edge Middleware — 인증이 필요한 경로 보호.
//
// 동작:
//   1. 요청 경로가 PROTECTED_PATHS 중 하나로 시작하면 Supabase 세션 확인
//   2. 비로그인 상태면 /?redirect=<원래경로>&reason=auth 로 리다이렉트
//   3. 로그인 상태면 그냥 통과 (response 헤더에 Set-Cookie 적용)
//
// config.matcher: /editor/**, /profile/**

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/core/server";

// 로그인이 필요한 경로 prefix 목록
const PROTECTED_PATHS = ["/editor", "/profile"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createSupabaseMiddlewareClient(request, response);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("reason", "auth");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/editor/:path*", "/profile/:path*"],
};
