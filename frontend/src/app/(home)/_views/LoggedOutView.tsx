"use client";

// ─── (home)/_views/LoggedOutView.tsx ──────────────────────────────────────────
// 비로그인 상태 홈 화면.

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { signInWithGoogle } from "@/features/auth/api";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/lib/toast/ToastContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { homeMessages } from "@/lib/i18n/homeMessages";

export default function LoggedOutView() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const redirectTo = searchParams.get("redirect");
  const { toast } = useToast();
  const { locale } = useLocale();
  const t = homeMessages[locale];

  const redirectRef = useRef(redirectTo);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    if (reason === "auth") {
      toast("로그인 후 이용할 수 있는 페이지입니다.", "warning");
    }
    if (reason || redirectTo) {
      router.replace("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    const ok = await login(loginEmail, loginPassword);
    if (!ok) {
      setLoginError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.replace(redirectRef.current ?? "/");
  }

  async function handleGoogleLogin() {
    setOauthLoading(true);
    try {
      await signInWithGoogle(redirectRef.current ?? undefined);
    } catch {
      toast("Google 로그인 중 오류가 발생했습니다.", "error");
      setOauthLoading(false);
    }
  }

  return (
    <section className="flex-1 bg-gradient-to-b from-seed-bg via-white to-white flex items-center py-8 sm:py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-6 items-center">

          {/* 왼쪽: 서비스 소개 텍스트 + CTA 버튼 */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              {t.heroTitle1}<br />{t.heroTitle2}<br />
              <span className="text-brand">{t.heroTitleAccent}</span>
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              {t.heroSub}
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <a
                href="/auth/signup"
                className="cursor-pointer bg-brand-dark text-white px-6 py-3 rounded-lg text-sm sm:text-base whitespace-nowrap"
              >
                {t.ctaSeeHow}
              </a>
              <a
                href="/auth/signup"
                className="cursor-pointer border border-brand-dark text-brand-dark px-6 py-3 rounded-lg text-sm sm:text-base whitespace-nowrap hover:bg-seed-muted transition-colors"
              >
                {t.ctaTry}
              </a>
            </div>
          </div>

          {/* 오른쪽: 로그인 폼 카드 */}
          <div className="bg-white rounded-2xl shadow-[0_4px_32px_-4px_rgba(45,140,78,0.12)] border border-brand/10 p-8">
            <h2 className="text-xl font-bold">{t.loginWelcome}</h2>
            <p className="text-sm text-gray-500">{t.loginSub}</p>

            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">
                  {t.labelEmail}
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  className="w-full border rounded-lg px-4 py-2.5 mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label
                    htmlFor="hero-password"
                    className="text-xs font-semibold text-gray-500"
                  >
                    {t.labelPassword}
                  </label>
                  <a
                    href="#"
                    className="cursor-pointer text-xs text-brand whitespace-nowrap shrink-0"
                  >
                    {t.forgotPassword}
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="hero-password"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full border rounded-lg px-4 py-2.5 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="cursor-pointer absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-500 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showPassword ? (
                      <Eye className="size-5" strokeWidth={1.75} aria-hidden />
                    ) : (
                      <EyeOff className="size-5" strokeWidth={1.75} aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              {loginError && (
                <p role="alert" className="text-xs text-red-600">{loginError}</p>
              )}

              <button
                type="submit"
                className="cursor-pointer w-full bg-brand-dark text-white py-3 rounded-lg"
              >
                {t.signIn}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-brand/15" />
              <span className="text-xs text-gray-400">{t.orContinueWith}</span>
              <div className="flex-1 h-px bg-brand/15" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={oauthLoading}
                className="cursor-pointer border rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Image
                  src="/icons/login/google_icon.png"
                  alt=""
                  width={20}
                  height={20}
                  className="shrink-0 rounded-[3px] border border-gray-400 bg-white"
                />
                {oauthLoading ? "연결 중..." : "Google"}
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] border border-black/10 shadow-sm hover:brightness-[0.97] active:brightness-95"
              >
                <Image
                  src="/icons/login/kakaotalk_icon.png"
                  alt=""
                  width={20}
                  height={20}
                  className="shrink-0 rounded-[3px] border border-black/25"
                />
                KakaoTalk
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-5">
              {t.noAccount}{" "}
              <a href="/auth/signup" className="cursor-pointer text-brand">
                {t.createSeed}
              </a>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
