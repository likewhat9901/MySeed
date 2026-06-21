// 내역 탭 — 미점검 지출이 있을 때 표시되는 점검 유도 배너

interface Props {
  remaining: number
  reviewed:  number
  total:     number
  onStart:   () => void
  onDismiss: () => void
}

export function ReviewBanner({ remaining, reviewed, total, onStart, onDismiss }: Props) {
  return (
    <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-200 shrink-0">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-700">
          <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mr-1.5">Review</span>
          점검 안 한 지출 <span className="font-bold text-gray-900 tabular-nums">{remaining}건</span>
          <span className="text-gray-400"> · 점검하면 후회 소비를 분석해 다음 목표로 이어집니다</span>
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="w-44 h-1.5 bg-gray-200 overflow-hidden">
            <div className="h-full bg-gray-700 transition-all" style={{ width: `${total > 0 ? (reviewed / total) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 tabular-nums">{reviewed}/{total}건 점검</span>
        </div>
      </div>
      <button
        onClick={onStart}
        className="shrink-0 text-xs font-bold tracking-wide px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-700 transition-colors"
      >
        점검 시작
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 text-gray-300 hover:text-gray-500 text-xs"
        aria-label="배너 닫기"
      >
        ✕
      </button>
    </div>
  )
}
