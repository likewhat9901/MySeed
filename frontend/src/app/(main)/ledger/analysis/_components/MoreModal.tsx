// 분석 탭 — 후회 내역/카테고리 전체 목록 더보기 모달

import { X } from 'lucide-react'
import type { LedgerRecord } from '@/features/ledger/record/types'
import type { CategoryStat } from '../_hooks/useRegretAnalysis'

// 금액을 만/천 단위로 축약 (테이블 셀용)
function short(n: number) {
  return n >= 10_000 ? `${(n / 10_000).toFixed(n % 10_000 === 0 ? 0 : 1)}만` : `${(n / 1000).toFixed(0)}천`
}

interface Props {
  kind:          'items' | 'categories'
  regretCount:   number
  regretItems:   LedgerRecord[]
  categoryStats: CategoryStat[]
  onClose:       () => void
}

export function MoreModal({ kind, regretCount, regretItems, categoryStats, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white w-[600px] max-h-[88vh] border border-gray-300 shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 shrink-0">
          <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">
            {kind === 'items' ? `후회 내역 전체 (${regretCount})` : `후회 카테고리 전체 (${categoryStats.length})`}
          </p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50">
          {kind === 'items' ? (
            <div>
              <div className="grid grid-cols-[24px_40px_1fr_64px_56px_28px] gap-x-2 pb-1.5 border-b border-gray-300 text-[9px] font-bold tracking-widest uppercase text-gray-400">
                <span>#</span><span>일자</span><span>내역</span>
                <span className="text-right">카테고리</span><span className="text-right">금액</span><span className="text-right">점수</span>
              </div>
              {(() => {
                const sorted = [...regretItems].sort((a, b) => b.amount - a.amount)
                const maxAmt = sorted[0]?.amount ?? 1
                return sorted.map((r, i) => {
                  const score = Math.round((r.amount / maxAmt) * 100)
                  const [, mm, dd] = r.date.split('-')
                  return (
                    <div key={r.id ?? i} className="grid grid-cols-[24px_40px_1fr_64px_56px_28px] gap-x-2 items-center border-b border-gray-100 py-2 bg-white px-1">
                      <span className="text-[11px] text-gray-400 tabular-nums">{i + 1}</span>
                      <span className="text-[11px] text-gray-400 tabular-nums">{Number(mm)}/{Number(dd)}</span>
                      <span className="text-[12px] text-gray-700 truncate">{r.description || r.category || '(내용 없음)'}</span>
                      <span className="text-[11px] text-gray-500 truncate text-right">{r.category}</span>
                      <span className="text-[12px] font-semibold text-gray-800 tabular-nums text-right">{(r.amount / 10000).toFixed(1)}만</span>
                      <span className="text-[12px] font-bold text-red-500 tabular-nums text-right">{score}</span>
                    </div>
                  )
                })
              })()}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[24px_1fr_56px_64px_72px_64px_28px] gap-x-2 pb-1.5 border-b border-gray-300 text-[9px] font-bold tracking-widest uppercase text-gray-400">
                <span>#</span><span>카테고리</span><span className="text-right">건수</span>
                <span className="text-right">후회 빈도</span><span className="text-right">금액</span>
                <span className="text-right">후회 금액</span><span className="text-right">점수</span>
              </div>
              {(() => {
                const maxAmt = categoryStats[0]?.regretAmt ?? 1
                return categoryStats.map((c, i) => {
                  const score = Math.round(c.ratio * 60 + (c.regretAmt / maxAmt) * 40)
                  const ratioPct = Math.round(c.ratio * 100)
                  const amtPct = Math.round(c.amtRatio * 100)
                  return (
                    <div key={c.label} className="grid grid-cols-[24px_1fr_56px_64px_72px_64px_28px] gap-x-2 items-center border-b border-gray-100 py-2 bg-white px-1">
                      <span className="text-[11px] text-gray-400 tabular-nums">{i + 1}</span>
                      <span className="text-[12px] text-gray-700 truncate">{c.label}</span>
                      <span className="text-[11px] text-gray-500 tabular-nums text-right">{c.regret}/{c.total}건</span>
                      <span className="text-[11px] text-red-500 font-semibold tabular-nums text-right">{ratioPct}%</span>
                      <span className="text-[11px] font-semibold text-gray-800 tabular-nums text-right">{short(c.regretAmt)}/{short(c.totalAmt)}</span>
                      <span className="text-[11px] text-orange-500 font-semibold tabular-nums text-right">{amtPct}%</span>
                      <span className="text-[12px] font-bold text-red-500 tabular-nums text-right">{score}</span>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
