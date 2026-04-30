"use client";

import { useAuthContext } from "@/features/auth/AuthContext";

/**
 * 전역 인증 상태를 읽고 조작하는 커스텀 훅.
 * AuthProvider(layout.tsx)가 공급하는 단일 상태를 반환합니다.
 *
 * - `loggedIn`: 현재 로그인 여부
 * - `user`: 현재 로그인된 Supabase User 객체 (미로그인 시 null)
 * - `login(email, password)`: 인증 시도 — 성공하면 `true`, 실패하면 `false`
 * - `logout()`: 로그아웃
 */
export function useAuth() {
  return useAuthContext();
}
