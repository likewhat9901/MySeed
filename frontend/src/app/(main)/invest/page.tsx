// 투자 페이지 — 보유 종목 및 수익률 현황 (플레이스홀더)
'use client'

export default function InvestPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center bg-white text-gray-300 select-none">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
      <p className="mt-3 text-sm font-medium text-gray-400">투자 기능 준비 중</p>
      <p className="mt-1 text-xs text-gray-300">보유 종목·수익률·자산 배분을 한눈에 볼 수 있어요.</p>
    </div>
  )
}
