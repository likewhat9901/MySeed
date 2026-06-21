// 내역 탭 — 내역이 비어있을 때 가져오기를 중앙 CTA로 보여주는 빈 상태 화면
'use client'

import { FileSpreadsheet, Plus } from 'lucide-react'

interface Props {
  onUpload: () => void
  onAddRow: () => void
  uploading: boolean
}

export function EmptyRecordsState({ onUpload, onAddRow, uploading }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <FileSpreadsheet size={40} className="text-gray-300" />
      <p className="text-sm text-gray-400">아직 내역이 없어요</p>
      <button
        onClick={onUpload}
        disabled={uploading}
        className="text-sm font-bold px-5 py-2.5 bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {uploading ? '업로드 중...' : '엑셀 파일 가져오기'}
      </button>
      <button
        onClick={onAddRow}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        <Plus size={12} />
        직접 행 추가하기
      </button>
    </div>
  )
}
