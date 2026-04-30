// ─── app/not-found.tsx ────────────────────────────────────────────────────────
// Next.js 404 페이지. 존재하지 않는 경로 접근 시 렌더됨.

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">

        {/* 숫자 */}
        <div className="flex items-center gap-2 select-none">
          <span className="text-8xl font-black text-brand-dark leading-none">4</span>
          <div className="w-14 h-14 rounded-full border-4 border-brand bg-brand-dark/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-dark">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <span className="text-8xl font-black text-brand-dark leading-none">4</span>
        </div>

        {/* 메시지 */}
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold text-gray-800">페이지를 찾을 수 없어요</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            주소가 잘못됐거나 삭제된 페이지입니다.
          </p>
        </div>

        {/* 버튼 */}
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-dark text-white text-sm font-medium rounded-xl hover:bg-brand-darkest transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          홈으로 돌아가기
        </Link>

      </div>
    </div>
  )
}
