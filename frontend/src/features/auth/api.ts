"use client";

// ─── features/auth/api.ts ─────────────────────────────────────────────────────
// 인증(Auth) API
//
// 구성요소
// - sendSignupOtp: 회원가입 OTP 이메일 발송
// - verifySignupOtp: 회원가입 OTP 인증
// - updatePassword: 인증 후 실제 비밀번호 설정
// - signInWithGoogle: Google OAuth 로그인 시작
// - signIn: 이메일/비밀번호 로그인
// - signOut: 로그아웃
// - getCurrentUser: 현재 로그인 유저 조회
// - getAuthSession: 현재 세션 조회
// - subscribeAuthState: 인증 상태 변경 구독

import { getSupabaseBrowserClient } from "@/lib/supabase/core/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

// ── sendSignupOtp ─────────────────────────────────────────────────────────────

/**
 * 이메일로 회원가입을 시작합니다.
 * 임시 비밀번호로 계정을 생성하고 Supabase가 OTP 인증코드를 이메일로 발송합니다.
 * 인증 완료 후 updatePassword()로 실제 비밀번호를 설정해야 합니다.
 * @returns 에러 메시지 문자열, 성공 시 null
 */
export async function sendSignupOtp(email: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const tempPassword = crypto.randomUUID();
  const { error } = await supabase.auth.signUp({ email, password: tempPassword });

  if (error) {
    console.error("[auth/api] sendSignupOtp 실패:", error.message);
    return error.message;
  }
  return null;
}

// ── verifySignupOtp ───────────────────────────────────────────────────────────

/**
 * 이메일 OTP 인증코드를 검증합니다. (회원가입용)
 * @returns 에러 메시지 문자열, 성공 시 null
 */
export async function verifySignupOtp(
  email: string,
  token: string
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    console.error("[auth/api] verifySignupOtp 실패:", error.message);
    return "인증코드가 올바르지 않습니다.";
  }
  return null;
}

// ── updatePassword ────────────────────────────────────────────────────────────

/**
 * 인증 완료 후 실제 비밀번호를 설정합니다.
 * @returns 에러 메시지 문자열, 성공 시 null
 */
export async function updatePassword(password: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[auth/api] updatePassword 실패:", error.message);
    return error.message;
  }
  return null;
}

// ── signInWithGoogle ──────────────────────────────────────────────────────────

/**
 * Google OAuth 로그인을 시작합니다.
 * Supabase가 Google 리디렉션 URL로 보내므로 반환값은 없습니다.
 * @param redirectTo 로그인 성공 후 돌아올 경로 (예: "/editor")
 */
export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo ?? "/"}`,
    },
  });
}

// ── signIn ────────────────────────────────────────────────────────────────────

/**
 * 이메일/비밀번호로 로그인합니다.
 * @returns 성공 시 true, 실패 시 false
 */
export async function signIn(email: string, password: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

// ── signOut ───────────────────────────────────────────────────────────────────

/**
 * 로그아웃합니다.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}

// ── getCurrentUser ────────────────────────────────────────────────────────────

/**
 * 현재 로그인한 유저를 반환합니다.
 * @returns User 객체 또는 미로그인 시 null
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ── getAuthSession ────────────────────────────────────────────────────────────

/**
 * 현재 세션을 반환합니다.
 * @returns Session 객체 또는 없으면 null
 */
export async function getAuthSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

// ── subscribeAuthState ────────────────────────────────────────────────────────

// 인증 상태 변경 시 최신 세션을 전달받는 콜백.
type AuthStateCallback = (session: Session | null) => void

// 구독 해제 함수.
type UnsubscribeAuthState = () => void

/**
 * 인증 상태 변화(로그인/로그아웃/토큰 갱신)를 구독합니다.
 * @returns unsubscribe 함수
 */
export function subscribeAuthState(
  callback: AuthStateCallback
): UnsubscribeAuthState {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
      callback(session);
    }
  );
  return () => subscription.unsubscribe();
}
