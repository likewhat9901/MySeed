// ─── auth/signup/page.tsx ─────────────────────────────────────────────────────
// 회원가입 페이지.
// 왼쪽: 초록 브랜드 패널 (lg 이상에서만 표시)
// 오른쪽: SignupPanel 컴포넌트 (이메일 OTP → 비밀번호 설정 플로우)

import { cookies } from "next/headers";
import SignupPanel from "./_components/SignupPanel";
import { signupMessages } from "@/lib/i18n/messages/authMessages";
import type { Locale } from "@/lib/i18n/LocaleContext";

export const metadata = {
  title: "Sign Up — MySeed",
  description: "Create your seed and start your journey toward financial editorial elegance.",
};

export default async function SignupPage() {
  const cookieStore = await cookies()
  const locale = (cookieStore.get("locale")?.value ?? "en") as Locale
  const t = signupMessages[locale]

  return (
    <main className="flex min-h-[calc(100vh-56px)]">
      {/* 왼쪽: 초록 배경 패널 */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between overflow-hidden bg-brand-dark p-10 text-white">
        {/* 배경 그라디언트 오버레이 */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-dark/90 via-brand/60 to-brand-dark/80" />

        {/* 상단: 로고 */}
        <div className="relative z-10 flex items-center gap-2">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M14 3C9 3 5 8 5 14c0 3 1.5 5.5 4 7.5C11.5 23.5 14 25 14 25s2.5-1.5 5-3.5c2.5-2 4-4.5 4-7.5C23 8 19 3 14 3z"
              fill="#86efac"
            />
            <path d="M14 25V13M14 13C14 13 10 10 7 11M14 13C14 13 18 10 21 11" stroke="#166534" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-bold tracking-wide">MYSEED</span>
        </div>

        {/* 중앙: 타이틀 + 설명 */}
        <div className="relative z-10 flex flex-col gap-5">
          <h2 className="text-4xl font-extrabold leading-tight">
            {t.brandTitle1}<br />{t.brandTitle2}
          </h2>
          <p className="text-sm text-green-100 leading-relaxed max-w-xs">
            {t.brandBody}
          </p>
        </div>

        {/* 하단: 소셜 프루프 + 인용 */}
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {/* 아바타 3개 (색상 원) */}
            <div className="flex -space-x-2">
              {["bg-gray-700", "bg-gray-600", "bg-gray-500"].map((c, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full ring-2 ring-brand-dark ${c} flex items-center justify-center text-xs font-medium text-white`}
                >
                  {["A", "B", "C"][i]}
                </div>
              ))}
            </div>
            <span className="text-sm font-semibold text-green-200">+12k</span>
          </div>
          <p className="text-xs text-green-200 italic">
            &ldquo;{t.brandSocial}&rdquo;
          </p>
        </div>
      </div>

      {/* 오른쪽: 회원가입 폼 */}
      <div className="flex flex-1 items-start justify-center bg-gray-50 overflow-y-auto">
        <SignupPanel />
      </div>
    </main>
  );
}
