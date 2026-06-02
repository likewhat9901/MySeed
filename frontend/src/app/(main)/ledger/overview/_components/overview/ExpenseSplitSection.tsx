// 현황 — 지출 쪼개기: 고정 vs 변동 비중 + 각 TOP 미니 바 리스트
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

interface Props {
  records: LedgerRecord[]
  expense: number
}

function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

function fmtShort(n: number) {
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`
  return n.toLocaleString()
}

function topGroups(records: LedgerRecord[], keyOf: (r: LedgerRecord) => string, limit = 3) {
  const map = new Map<string, number>()
  for (const r of records) map.set(keyOf(r), (map.get(keyOf(r)) ?? 0) + r.amount)
  return Array.from(map.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export default function ExpenseSplitSection({ records, expense }: Props) {
  const { fixedTotal, varTotal, fixedCount, varCount, fixedTop, varTop } = useMemo(() => {
    const fixed: LedgerRecord[] = []
    const variable: LedgerRecord[] = []
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0) continue
      if (r.isFixed) fixed.push(r)
      else variable.push(r)
    }
    return {
      fixedTotal: fixed.reduce((s, r) => s + r.amount, 0),
      varTotal:   variable.reduce((s, r) => s + r.amount, 0),
      fixedCount: fixed.length,
      varCount:   variable.length,
      fixedTop:   topGroups(fixed, r => r.description || r.category || '기타'),
      varTop:     topGroups(variable, r => r.category || '기타'),
    }
  }, [records])

  const fixedPct = expense > 0 ? Math.round((fixedTotal / expense) * 100) : 0
  const varPct   = expense > 0 ? Math.round((varTotal   / expense) * 100) : 0

  // TOP 바 기준: 고정/변동 각자 최대값 기준
  const fixedMax = fixedTop[0]?.amount ?? 1
  const varMax   = varTop[0]?.amount   ?? 1

  if (expense === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
        <p className="text-sm font-semibold text-gray-800 mb-3">지출 분석</p>
        <p className="text-xs text-gray-300 py-6 text-center">지출 내역이 없어요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <p className="text-sm font-semibold text-gray-800 mb-4">지출 분석</p>

      {/* 고정 / 변동 숫자 블록 */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-1">📌 고정</p>
          <p className="text-xl font-extrabold text-gray-800 tabular-nums leading-tight">{fmtW(fixedTotal)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{fixedPct}% · {fixedCount}건</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-1">📊 변동</p>
          <p className="text-xl font-extrabold text-gray-800 tabular-nums leading-tight">{fmtW(varTotal)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{varPct}% · {varCount}건</p>
        </div>
      </div>

      {/* 스택 비율 바 */}
      <div className="relative h-3 flex rounded-full overflow-hidden bg-gray-100 mb-1.5">
        <div className="bg-gray-700 transition-all" style={{ width: `${fixedPct}%` }} />
        <div className="bg-gray-300 transition-all" style={{ width: `${varPct}%` }} />
      </div>

      {/* 바 하단 % 레이블 */}
      <div className="flex justify-between text-[10px] text-gray-400 tabular-nums mb-4">
        <span>← {fixedPct}%</span>
        <span>{varPct}% →</span>
      </div>

      {/* TOP 리스트 */}
      <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-x-6">
        {/* 고정 TOP */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2">고정 TOP</p>
          {fixedTop.length === 0 ? (
            <p className="text-[11px] text-gray-300">📌 표시한 항목이 없어요.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {fixedTop.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-gray-600 truncate mr-2">{item.label}</span>
                    <span className="text-gray-700 font-semibold tabular-nums shrink-0">{fmtShort(item.amount)}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-700 rounded-full"
                      style={{ width: `${Math.round((item.amount / fixedMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 변동 TOP */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2">변동 TOP</p>
          {varTop.length === 0 ? (
            <p className="text-[11px] text-gray-300">—</p>
          ) : (
            <div className="flex flex-col gap-2">
              {varTop.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-gray-600 truncate mr-2">{item.label}</span>
                    <span className="text-gray-700 font-semibold tabular-nums shrink-0">{fmtShort(item.amount)}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-300 rounded-full"
                      style={{ width: `${Math.round((item.amount / varMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
