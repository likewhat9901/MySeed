"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getAuthSession, signIn, signOut, subscribeAuthState } from "@/features/auth/api";

const PROTECTED_PATHS = ["/editor", "/profile"];

// ─── Context 타입 ───────────────────────────────────────────────────────────

interface AuthContextValue {
  loggedIn: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

/**
 * 앱 전체에 인증 상태를 공급하는 Provider.
 * layout.tsx에서 한 번만 마운트되므로 Supabase 세션을 앱 전체가 공유합니다.
 *
 * @param initialLoggedIn 서버에서 읽은 초기 로그인 여부 (SSR 깜빡임 방지)
 */
export function AuthProvider({
  children,
  initialLoggedIn = false,
}: {
  children: React.ReactNode;
  initialLoggedIn?: boolean;
}) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 이전 loggedIn 값 추적 — true → false 전환 시에만 리다이렉트
  const prevLoggedInRef = useRef(initialLoggedIn);

  useEffect(() => {
    let cancelled = false;

    // 마운트 시 현재 세션 확인
    getAuthSession().then(session => {
      if (cancelled) return;
      setLoggedIn(!!session);
      setUser(session?.user ?? null);
    });

    // 로그인/로그아웃/토큰 갱신 등 인증 상태 변화 구독
    const unsubscribe = subscribeAuthState(session => {
      setLoggedIn(!!session);
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // loggedIn이 true → false 로 바뀌면 보호 경로에서 홈으로 이동
  useEffect(() => {
    const wasLoggedIn = prevLoggedInRef.current;
    prevLoggedInRef.current = loggedIn;

    if (wasLoggedIn && !loggedIn && PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
      router.replace("/");
    }
  }, [loggedIn, pathname, router]);

  async function login(email: string, password: string): Promise<boolean> {
    return signIn(email, password);
  }

  async function logout(): Promise<void> {
    await signOut();
  }

  return (
    <AuthContext.Provider value={{ loggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * AuthProvider 하위에서 전역 인증 상태를 읽고 조작하는 훅.
 * Provider 없이 호출하면 에러를 던집니다.
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext는 AuthProvider 하위에서 사용해야 합니다.");
  return ctx;
}

export const useAuth = useAuthContext;
