"use client";

// ─── auth/signup/_components/SignupPanel.tsx ───────────────────────────────────
// 회원가입 폼 패널 (Client Component).
// useSignup 훅에서 상태와 핸들러를 받아 UI만 렌더링합니다.
//
// 단계별 UI:
//   1. 이메일 입력 + "인증번호 보내기" 버튼
//   2. 인증코드 입력 + "인증하기" 버튼 (발송 후 표시)
//   3. 비밀번호 + 비밀번호 확인 (2열)
//   4. Sign Up 버튼 (인증 완료 후 활성화)
//   5. 완료 화면 (signupState === "success")

import Link from "next/link";
import PasswordInput from "./ui/PasswordInput";
import SocialButtons from "./ui/SocialButtons";
import { useSignup } from "../_hooks/useSignup";

export default function SignupPanel() {
  const {
    email,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    verificationCode,
    codeSendState,
    verifyState,
    signupState,
    codeError,
    verifyError,
    signupError,
    handleEmailChange,
    handleCodeChange,
    handleSendCode,
    handleVerifyCode,
    handleSubmit,
  } = useSignup();

  if (signupState === "success") {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto px-6 py-20 sm:px-10 text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
          ✅
        </div>
        <h2 className="text-xl font-bold text-gray-900">회원가입 완료!</h2>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{email}</span>로 가입이 완료되었습니다.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 cursor-pointer text-sm font-medium text-brand-dark hover:underline"
        >
          로그인 페이지로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center w-full max-w-md mx-auto px-6 py-12 sm:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Your Seed</h1>
        <p className="mt-1 text-sm text-gray-500">
          Start your journey toward financial editorial elegance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Email + 인증번호 보내기 */}
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
            Email Address
          </label>
          <div className="flex gap-2">
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
              disabled={verifyState === "verified"}
              className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={codeSendState === "sending" || verifyState === "verified"}
              className="cursor-pointer shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap"
            >
              {codeSendState === "sending"
                ? "발송 중..."
                : codeSendState === "sent"
                ? "재발송"
                : "인증번호 보내기"}
            </button>
          </div>
          {codeError && <p className="text-xs text-red-600">{codeError}</p>}
          {codeSendState === "sent" && verifyState !== "verified" && (
            <p className="text-xs text-brand-dark">인증번호가 이메일로 발송되었습니다.</p>
          )}
        </div>

        {/* 인증코드 입력 (발송 후 표시) */}
        {codeSendState === "sent" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="signup-code" className="text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <div className="flex gap-2">
              {verifyState === "verified" ? (
                <div className="flex-1 flex items-center gap-2 rounded-lg border border-brand bg-green-50 px-4 py-2.5 text-sm font-medium text-brand-dark">
                  <span>✓</span>
                  <span>인증 완료</span>
                </div>
              ) : (
                <>
                  <input
                    id="signup-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="8자리 코드 입력"
                    inputMode="numeric"
                    maxLength={8}
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyState === "verifying"}
                    className="cursor-pointer shrink-0 rounded-lg bg-brand-dark text-white px-3 py-2.5 text-sm font-medium hover:bg-brand-darker disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {verifyState === "verifying" ? "확인 중..." : "인증하기"}
                  </button>
                </>
              )}
            </div>
            {verifyError && <p className="text-xs text-red-600">{verifyError}</p>}
          </div>
        )}

        {/* Password + Confirm Password (2열) */}
        <div className="grid grid-cols-2 gap-3">
          <PasswordInput
            id="signup-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordInput
            id="signup-confirm-password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </div>

        {/* Sign Up 에러 */}
        {signupError && (
          <p role="alert" className="text-xs text-red-600">
            {signupError}
          </p>
        )}

        {/* Sign Up 버튼 */}
        <button
          type="submit"
          disabled={signupState === "loading" || verifyState !== "verified"}
          className="cursor-pointer mt-1 w-full rounded-lg bg-brand-dark py-3 text-sm font-semibold text-white hover:bg-brand-darker active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {signupState === "loading" ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      {/* OR CONTINUE WITH */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-medium text-gray-400 whitespace-nowrap">OR CONTINUE WITH</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <SocialButtons />

      {/* 로그인 링크 */}
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="cursor-pointer font-medium text-brand-dark hover:underline"
        >
          Log In
        </Link>
      </p>
    </div>
  );
}
