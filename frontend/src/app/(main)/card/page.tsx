// 카드 페이지 — 카드 내역 및 혜택 현황 (플레이스홀더)
'use client'

export default function CardPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center bg-white text-gray-300 select-none">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
      <p className="mt-3 text-sm font-medium text-gray-400">카드 기능 준비 중</p>
      <p className="mt-1 text-xs text-gray-300">카드 내역·혜택·한도를 한눈에 볼 수 있어요.</p>
    </div>
  )
}
