// 현황 — 고정 지출 카드: is_fixed 플래그가 켜진 내역 집계
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

interface Props {
  records: LedgerRecord[]
  totalExpense: number
}

function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

export default function FixedExpenseSection({ records, totalExpense }: Props) {
  const { items, total } = useMemo(() => {
    const grouped = new Map<string, { label: string; amount: number; lastDate: string; count: number }>()
    let total = 0
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0 || !r.isFixed) continue
      total += r.amount
      const k = r.description || r.category || '기타'
      const cur = grouped.get(k) ?? { label: k, amount: 0, lastDate: r.date, count: 0 }
      cur.amount += r.amount
      cur.count++
      if (r.date > cur.lastDate) cur.lastDate = r.date
      grouped.set(k, cur)
    }
    const items = Array.from(grouped.values()).sort((a, b) => b.amount - a.amount)
    return { items, total }
  }, [records])

  const pct = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0
  const isEmpty = items.length === 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📌</span>
        <p className="text-sm font-semibold text-gray-800">고정 지출</p>
      </div>

      {isEmpty ? (
        <div className="py-4">
          <p className="text-xs text-gray-400 mb-1">아직 고정 지출로 표시된 내역이 없어요.</p>
          <p className="text-[11px] text-gray-300">
            내역 페이지에서 월세·통신·구독 등에 📌 표시하면 여기서 집계됩니다.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-2xl font-extrabold text-gray-800 tabular-nums">{fmtW(total)}</p>
            <p className="text-[11px] text-gray-500">전체 지출의 {pct}%</p>
          </div>

          <div className="flex flex-col divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 truncate">{item.label}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-gray-400">{item.lastDate}</span>
                  <span className="text-xs font-semibold text-gray-800 tabular-nums">{fmtW(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-300 mt-3">
            내역 페이지에서 📌 토글로 고정 지출 추가/해제
          </p>
        </>
      )}
    </div>
  )
}
