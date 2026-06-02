// 현황 — 자주 쓴 메모 키워드(상) + 카테고리별 최대 vs 평균 지출(하) 합산 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

const STOPWORDS = new Set(['에서', '에', '의', '을', '를', '이', '가', '은', '는', '과', '와', '로', '으로', '에게', '부터', '까지'])

function fmtShort(n: number) {
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`
  return n.toLocaleString('ko-KR')
}

export default function KeywordAndMaxSection({ records }: { records: LedgerRecord[] }) {
  const keywords = useMemo(() => {
    const freq = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출') continue
      const text = r.memo || r.category || ''
      if (!text) continue
      const tokens = text.split(/\s+/).filter(t => t.length >= 2 && !STOPWORDS.has(t))
      for (const token of tokens) freq.set(token, (freq.get(token) ?? 0) + 1)
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word, count]) => ({ word, count }))
  }, [records])

  const maxKeyCount = Math.max(...keywords.map(k => k.count), 1)

  const maxItems = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const r of records) {
      if (r.type !== '지출') continue
      const key = r.category ?? '기타'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r.amount)
    }
    return Array.from(map.entries())
      .map(([label, amounts]) => ({
        label,
        max: Math.max(...amounts),
        avg: Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length),
      }))
      .sort((a, b) => b.max - a.max)
      .slice(0, 4)
  }, [records])

  const absMax = Math.max(...maxItems.flatMap(i => [i.max, i.avg]), 1)

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {/* 키워드 */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2">자주 쓴 키워드</p>
        {keywords.length === 0 ? (
          <p className="text-[11px] text-gray-300">내역이 없어요.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map(k => {
              const ratio = k.count / maxKeyCount
              const weight = ratio > 0.6 ? 'font-semibold text-blue-500 bg-blue-50' : 'font-medium text-gray-500 bg-gray-100'
              return (
                <span key={k.word} className={`text-[11px] px-1.5 py-0.5 rounded-full ${weight}`}>
                  {k.word}
                  {k.count > 1 && <span className="ml-1 opacity-50 text-[10px]">{k.count}</span>}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* 최대 vs 평균 */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2">최대 vs 평균</p>
        {maxItems.length === 0 ? (
          <p className="text-[11px] text-gray-300">내역이 없어요.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {maxItems.map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[11px] text-gray-700">{item.label}</span>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {fmtShort(item.avg)} / {fmtShort(item.max)}
                  </span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="absolute left-0 top-0 h-full bg-blue-200 rounded-full" style={{ width: `${(item.avg / absMax) * 100}%` }} />
                  <div className="absolute left-0 top-0 h-full bg-red-200 rounded-full opacity-60" style={{ width: `${(item.max / absMax) * 100}%` }} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-gray-300">파랑: 평균 / 빨강: 최대</p>
          </div>
        )}
      </div>
    </div>
  )
}
