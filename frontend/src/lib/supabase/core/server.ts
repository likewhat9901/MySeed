import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

/**
 * middleware 전용: NextRequest/NextResponse 쌍을 받아 서버용 Supabase 클라이언트를 만듭니다.
 * 반환된 클라이언트를 사용한 뒤 response를 그대로 반환해야 Set-Cookie가 적용됩니다.
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  );
}

/**
 * Route Handler / Server Component 전용: Next.js `cookies()` 스토어를 받아
 * 서버용 Supabase 클라이언트를 만듭니다.
 */
export function createSupabaseServerClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // Server Component에서 호출 시 쿠키 쓰기 불가 — 무시 (읽기는 정상 동작)
              // 실제 토큰 갱신은 middleware에서 처리됩니다
            }
          }),
      },
    }
  );
}

/**
 * Server Component에서 현재 로그인된 유저를 가져오는 헬퍼.
 * cookies()와 createSupabaseServerClient 반복 호출을 대신합니다.
 * @returns 로그인된 User 객체, 미로그인 시 null
 */
export async function getServerUser() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
