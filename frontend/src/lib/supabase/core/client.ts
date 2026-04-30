import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(클라이언트 컴포넌트)에서 Supabase를 쓸 때 이 함수를 호출합니다.
 * 매번 새 인스턴스를 만들지 않도록 모듈 레벨에서 싱글톤으로 관리합니다.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase 환경변수가 설정되지 않았습니다. " +
        ".env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 추가하세요."
    );
  }

  client = createBrowserClient(url, publishableKey);
  return client;
}
