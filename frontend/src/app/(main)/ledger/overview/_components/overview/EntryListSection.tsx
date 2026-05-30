// 현황 — 이번달 많이 쓴 지출 Top 10 카드 (고정 높이 스크롤)
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

const TAG_COLORS = [
  'bg-orange-100 text-orange-700',
  'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

function tagColor(label: string) {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) & 0xffffffff
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length]
}

export default function EntryListSection({ records }: { records: LedgerRecord[] }) {
  const items = useMemo(() =>
    [...records]
      .filter(r => r.type === '지출')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    [records],
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-200 flex flex-col" style={{ height: '320px' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <p className="text-xs font-semibold text-gray-800">많이 쓴 소비 TOP 10</p>
        <span className="text-[11px] text-gray-400">{items.length}건</span>
      </div>

      <div className="overflow-y-auto divide-y divide-gray-50">
        {items.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-8">지출 내역이 없어요.</p>
        ) : items.map((r, i) => (
          <div key={r.id ?? i} className="flex items-center gap-2 px-4 py-1.5">
            <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-gray-800 truncate">{r.description || '(내용 없음)'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.category && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tagColor(r.category)}`}>
                  {r.category}
                </span>
              )}
              <span className="text-[11px] font-semibold tabular-nums text-gray-800">
                ₩{r.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
