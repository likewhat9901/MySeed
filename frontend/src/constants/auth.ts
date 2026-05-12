// constants/auth.ts — 인증·라우팅 상수

// 로그인이 필요한 경로 prefix. middleware.ts와 AuthContext.tsx가 이 목록 기준으로 리다이렉트합니다.
export const PROTECTED_PATHS = ['/editor', '/profile'] as const
