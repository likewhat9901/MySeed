// 내역 탭 — 리뷰/내역 초기화 확인 다이얼로그

interface Props {
  kind:         'review' | 'records' | 'month'
  monthLabels?: string[]
  monthCount?:  number
  onCancel:     () => void
  onConfirm:    () => void
}

export function ConfirmResetDialog({ kind, monthLabels, monthCount, onCancel, onConfirm }: Props) {
  const monthTitle = monthLabels && monthLabels.length === 1 ? monthLabels[0] : `${monthLabels?.length ?? 0}개 월`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white w-[300px] border border-gray-300 shadow-xl flex flex-col">
        <div className="px-5 py-4">
          <p className="text-[13px] font-bold text-gray-800 mb-1">
            {kind === 'review' ? '리뷰 초기화' : kind === 'records' ? '내역 초기화' : `${monthTitle} 삭제`}
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {kind === 'review'
              ? '이번달 모든 리뷰(만족·보통·후회)가 삭제됩니다. 저장 전까지는 되돌릴 수 없어요.'
              : kind === 'records'
              ? '현재 내역이 모두 삭제됩니다. 저장 전까지는 되돌릴 수 없어요.'
              : `${monthTitle}의 내역 ${monthCount ?? 0}건이 삭제됩니다. 저장 전까지는 되돌릴 수 없어요.`}
          </p>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-gray-500 border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="text-xs font-bold text-white bg-gray-900 px-3 py-1.5 hover:bg-gray-700 transition-colors"
          >
            {kind === 'month' ? '삭제' : '초기화'}
          </button>
        </div>
      </div>
    </div>
  )
}
