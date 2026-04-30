// ─── auth/signup/_components/ui/SocialButtons.tsx ─────────────────────────────
// 회원가입 페이지 소셜 로그인 버튼 (Google / KakaoTalk) — 현재 기능 미구현 UI 목업.

import Image from "next/image";

export default function SocialButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        className="cursor-pointer flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
      >
        <Image
          src="/icons/login/google_icon.png"
          alt=""
          width={20}
          height={20}
          className="shrink-0 rounded-[3px] border border-gray-300 bg-white"
        />
        Google
      </button>
      <button
        type="button"
        className="cursor-pointer flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-[#FEE500] py-2.5 text-sm font-medium text-[#191919] shadow-sm hover:brightness-[0.97] active:brightness-95"
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
  );
}
