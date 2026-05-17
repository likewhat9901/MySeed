// 현황 — 이번달 메모 키워드 빈도 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
const STOPWORDS = new Set(['에서', '에', '의', '을', '를', '이', '가', '은', '는', '과', '와', '로', '으로', '에게', '부터', '까지'])

export default function KeywordSection({ records }: { records: LedgerRecord[] }) {
  const keywords = useMemo(() => {
    const freq = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출' || !r.memo) continue
      const tokens = r.memo.split(/\s+/).filter(t => t.length >= 2 && !STOPWORDS.has(t))
      for (const token of tokens) {
        freq.set(token, (freq.get(token) ?? 0) + 1)
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }))
  }, [records])

  const maxCount = Math.max(...keywords.map(k => k.count), 1)

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-3">자주 쓴 메모 키워드</p>
      {keywords.length === 0 ? (
        <p className="text-xs text-gray-300">메모가 있는 지출 내역이 없어요.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map(k => {
            const ratio = k.count / maxCount
            const size = ratio > 0.7 ? 'text-sm font-semibold' : ratio > 0.4 ? 'text-xs font-medium' : 'text-[11px]'
            const color = ratio > 0.7 ? 'text-blue-500 bg-blue-50' : ratio > 0.4 ? 'text-gray-600 bg-gray-100' : 'text-gray-400 bg-gray-50'
            return (
              <span key={k.word} className={`px-2 py-0.5 rounded-full ${size} ${color}`}>
                {k.word}
                {k.count > 1 && <span className="ml-1 opacity-60 text-[10px]">{k.count}</span>}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
