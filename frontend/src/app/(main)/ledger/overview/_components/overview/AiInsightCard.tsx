// 현황 — AI 줄일 소비 인사이트 카드 (Coming soon)
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

export default function AiInsightCard({ records }: { records: LedgerRecord[] }) {
  const unreviewed = useMemo(
    () => records.filter(r => r.type === '지출' && r.review === null).length,
    [records],
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-700">줄일 소비</p>
        <span className="text-[9px] font-bold tracking-wider text-amber-500 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">AI</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-lg">+</div>
        <p className="text-xs text-gray-300">Coming soon</p>
      </div>

      {unreviewed > 0 && (
        <div className="mt-auto pt-3 border-t border-gray-100">
          <p className="text-[11px] text-amber-600">
            리뷰 미완료 <span className="font-bold">{unreviewed}건</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">만족/후회 체크 시 AI 분석 정확도가 높아져요.</p>
        </div>
      )}
    </div>
  )
}
