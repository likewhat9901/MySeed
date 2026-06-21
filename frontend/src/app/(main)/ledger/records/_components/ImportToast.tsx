// 내역 탭 — 엑셀 가져오기 완료 직후 우하단 토스트 (추가 건수 + 점검 유도)

interface Props {
  addedCount: number      // 추가된 건수 (0이면 "내역 가져옴")
  remaining:  number      // 미점검 건수
  onReview:   () => void
  onClose:    () => void
}

export function ImportToast({ addedCount, remaining, onReview, onClose }: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] w-72 bg-white border border-gray-300 shadow-md">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">Import 완료</p>
        <p className="text-[13px] font-semibold text-gray-800 tabular-nums">
          {addedCount > 0 ? `${addedCount}건 추가됨` : '내역 가져옴'}
        </p>
        {remaining > 0 && (
          <p className="text-[11px] text-gray-500 mt-1">
            점검 안 한 <span className="font-semibold text-gray-700 tabular-nums">{remaining}건</span>을 확인하면 후회 분석이 시작됩니다
          </p>
        )}
      </div>
      <div className="flex">
        {remaining > 0 && (
          <button
            onClick={onReview}
            className="flex-1 text-xs font-bold text-gray-800 py-2 hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            지금 점검
          </button>
        )}
        <button
          onClick={onClose}
          className="flex-1 text-xs font-medium text-gray-400 py-2 hover:bg-gray-50 transition-colors"
        >
          나중에
        </button>
      </div>
    </div>
  )
}
