'use client'

// ─── app/error.tsx ────────────────────────────────────────────────────────────
// Next.js 에러 바운더리. 런타임 오류 발생 시 이 페이지가 렌더됨.
// reset(): 해당 세그먼트를 다시 렌더링 시도 / 홈으로 버튼: / 로 이동.

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">

        {/* 아이콘 */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* 메시지 */}
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold text-gray-800">문제가 발생했습니다</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            {error.message || '예기치 못한 오류가 발생했습니다.'}
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white text-sm font-medium rounded-xl hover:bg-brand-darkest transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
            </svg>
            다시 시도
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            홈으로
          </Link>
        </div>

      </div>
    </div>
  )
}
