"use client";

// ─── (home)/_views/LoggedOutView.tsx ──────────────────────────────────────────
// 비로그인 상태 홈 화면.
//
// 구성 (2열 레이아웃):
//   - 왼쪽: 서비스 소개 텍스트 + CTA 버튼 (lg 이상에서만 표시)
//   - 오른쪽: 이메일/비밀번호 로그인 폼 + 소셜 로그인 버튼
//
// 로직:
//   - ?reason=auth 파라미터: 마운트 시 인증 필요 토스트 표시 후 URL에서 제거
//   - ?redirect= 파라미터: 로그인 성공 후 해당 경로로 이동 (ref로 보존)
//   - handleLogin: 이메일/비밀번호 → AuthContext.login()
//   - handleGoogleLogin: Supabase OAuth redirect 방식
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { signInWithGoogle } from "@/features/auth/api";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/lib/toast/ToastContext";

export default function LoggedOutView() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");     // "auth" → 인증 필요 toast 표시
  const redirectTo = searchParams.get("redirect"); // 로그인 후 돌아갈 경로
  const { toast } = useToast();

  // URL 파라미터는 마운트 즉시 제거하므로 ref로 값을 보존
  const redirectRef = useRef(redirectTo);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // 마운트 시 URL 파라미터 처리 후 즉시 제거 (새로고침 시 중복 방지)
  useEffect(() => {
    if (reason === "auth") {
      toast("로그인 후 이용할 수 있는 페이지입니다.", "warning");
    }
    // reason, redirect 파라미터 모두 제거 (새로고침 시 토스트 중복 방지 + URL 정리)
    if (reason || redirectTo) {
      router.replace("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이메일/비밀번호 로그인
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const ok = await login(loginEmail, loginPassword);
    if (!ok) {
      setLoginError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.replace(redirectRef.current ?? "/");
  }

  // Google OAuth 로그인 (Supabase redirect 방식)
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
    <section className="min-h-[calc(100vh-56px)] bg-gray-50 flex items-center py-8 sm:py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">

          {/* 왼쪽: 서비스 소개 텍스트 + CTA 버튼 */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <span className="inline-flex bg-green-50 border border-green-200 px-3 py-1 rounded-full text-xs whitespace-nowrap">
              ● Smart Custom Ledger Service
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              Create your own<br />
              wealth with<br />
              our <span className="text-brand">own custom</span><br />
              ledger.
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Stop fighting rigid spreadsheets. MySeed adapts to your financial
              life...
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <button
                type="button"
                className="cursor-pointer bg-brand-dark text-white px-6 py-3 rounded-lg text-sm sm:text-base whitespace-nowrap"
              >
                See How It Works
              </button>
              <button
                type="button"
                className="cursor-pointer text-gray-700 text-sm sm:text-base"
              >
                View Our Template
              </button>
            </div>
          </div>

          {/* 오른쪽: 로그인 폼 카드 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold">Welcome Back</h2>
            <p className="text-sm text-gray-500">Access your account</p>

            {/* 이메일/비밀번호 폼 */}
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Email Address
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
                    Password
                  </label>
                  <a
                    href="#"
                    className="cursor-pointer text-xs text-brand whitespace-nowrap shrink-0"
                  >
                    Forgot?
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
                  {/* 비밀번호 표시/숨기기 토글 */}
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
                Sign In
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* 소셜 로그인 버튼 */}
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
              Don&apos;t have an account?{" "}
              <a href="/auth/signup" className="cursor-pointer text-brand">
                Create Seed
              </a>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
