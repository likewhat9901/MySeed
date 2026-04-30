"use client";

import { useState } from "react";
import { sendSignupOtp, verifySignupOtp, updatePassword } from "@/features/auth/api";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type VerifyState = "idle" | "verifying" | "verified" | "error";
export type CodeSendState = "idle" | "sending" | "sent";
export type SignupState = "idle" | "loading" | "success" | "error";

const MIN_PASSWORD_LENGTH = 8;

// ─── useSignup ────────────────────────────────────────────────────────────────

/**
 * 회원가입 플로우 상태와 핸들러를 관리하는 훅.
 * SignupPanel은 이 훅의 반환값을 받아 UI만 렌더링합니다.
 *
 * 플로우: 이메일 입력 → 인증코드 발송 → 코드 검증 → 비밀번호 설정 → 완료
 */
export function useSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [codeSendState, setCodeSendState] = useState<CodeSendState>("idle");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [signupState, setSignupState] = useState<SignupState>("idle");

  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  /** 이메일 변경 시 인증 상태 초기화 */
  function handleEmailChange(value: string) {
    setEmail(value);
    setCodeSendState("idle");
    setVerifyState("idle");
    setVerificationCode("");
  }

  /** 인증코드 입력 변경 시 에러 초기화 */
  function handleCodeChange(value: string) {
    setVerificationCode(value);
    setVerifyError(null);
  }

  /** 이메일로 인증코드 발송 — signUp으로 계정 생성 + OTP 자동 발송 */
  async function handleSendCode() {
    if (!email) {
      setCodeError("이메일을 입력해 주세요.");
      return;
    }
    setCodeError(null);
    setVerifyState("idle");
    setVerificationCode("");
    setCodeSendState("sending");

    const errorMsg = await sendSignupOtp(email);

    if (errorMsg) {
      setCodeSendState("idle");
      setCodeError(errorMsg);
      return;
    }

    setCodeSendState("sent");
  }

  /** 인증코드 검증 */
  async function handleVerifyCode() {
    if (!verificationCode) {
      setVerifyError("인증코드를 입력해 주세요.");
      return;
    }
    setVerifyError(null);
    setVerifyState("verifying");

    const errorMsg = await verifySignupOtp(email, verificationCode);

    if (errorMsg) {
      setVerifyState("error");
      setVerifyError(errorMsg);
      return;
    }

    setVerifyState("verified");
  }

  /** 비밀번호 설정 후 가입 완료 */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignupError(null);

    if (verifyState !== "verified") {
      setSignupError("이메일 인증을 먼저 완료해 주세요.");
      return;
    }
    if (!password.trim()) {
      setSignupError("비밀번호를 입력해 주세요.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setSignupError(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.`);
      return;
    }
    if (password !== confirmPassword) {
      setSignupError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSignupState("loading");

    const errorMsg = await updatePassword(password);

    if (errorMsg) {
      setSignupState("error");
      setSignupError(errorMsg);
      return;
    }

    setSignupState("success");
  }

  return {
    // 입력값
    email,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    verificationCode,
    // 상태
    codeSendState,
    verifyState,
    signupState,
    // 에러
    codeError,
    verifyError,
    signupError,
    // 핸들러
    handleEmailChange,
    handleCodeChange,
    handleSendCode,
    handleVerifyCode,
    handleSubmit,
  };
}
