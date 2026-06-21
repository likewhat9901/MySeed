// 분석 탭 — 후회 카테고리 TOP5 + 후회 내역 TOP5 (더보기 버튼은 모달 트리거)

import { SectionLabel } from './SectionLabel'
import type { LedgerRecord } from '@/features/ledger/record/types'
import type { CategoryStat } from '../_hooks/useRegretAnalysis'

// 금액을 만/천 단위로 축약 (테이블 셀용)
function short(n: number) {
  return n >= 10_000 ? `${(n / 10_000).toFixed(n % 10_000 === 0 ? 0 : 1)}만` : `${(n / 1000).toFixed(0)}천`
}

interface Props {
  categoryStats: CategoryStat[]
  regretItems:   LedgerRecord[]
  onMore:        (kind: 'items' | 'categories') => void
}

export function CategorySection({ categoryStats, regretItems, onMore }: Props) {
  const maxCatAmt = categoryStats[0]?.regretAmt ?? 1
  const sortedItems = [...regretItems].sort((a, b) => b.amount - a.amount).slice(0, 5)
  const maxItemAmt = sortedItems[0]?.amount ?? 1

  return (
    <div>
      <SectionLabel label="Regret by Category — 후회 카테고리 / 내역" />
      <div className="grid grid-cols-3 gap-4">

        {/* 카테고리 TOP5 — 2열 차지 (후회율 바 포함) */}
        <div className="col-span-2 bg-white border border-gray-300">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">후회 카테고리 TOP 5</p>
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-[14px_80px_56px_1fr_88px_1fr_26px] gap-x-2 pb-1 border-b border-gray-200 text-[9px] font-bold tracking-widest uppercase text-gray-400">
              <span>#</span>
              <span className="truncate">카테고리</span>
              <span className="text-right">건수</span>
              <span className="truncate text-right">후회 빈도</span>
              <span className="text-right">금액</span>
              <span className="truncate text-right">후회 금액</span>
              <span className="text-right">점수</span>
            </div>
            {categoryStats.slice(0, 5).map((c, i) => {
              const score = Math.round(c.ratio * 60 + (c.regretAmt / maxCatAmt) * 40)
              const ratioPct = Math.round(c.ratio * 100)
              const amtPct = Math.round(c.amtRatio * 100)
              return (
                <div key={c.label} className="grid grid-cols-[14px_80px_56px_1fr_88px_1fr_26px] gap-x-2 items-center border-b border-gray-100 py-1.5">
                  <span className="text-[10px] text-gray-400 tabular-nums">{i + 1}</span>
                  <span className="text-[11px] text-gray-700 truncate">{c.label}</span>
                  <span className="text-[10px] text-gray-500 tabular-nums text-right">{c.regret}/{c.total}건</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-gray-100">
                      <div className="h-full bg-red-400" style={{ width: `${ratioPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 tabular-nums w-7 text-right shrink-0">{ratioPct}%</span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-800 tabular-nums text-right">{short(c.regretAmt)}/{short(c.totalAmt)}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-gray-100">
                      <div className="h-full bg-orange-400" style={{ width: `${amtPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 tabular-nums w-7 text-right shrink-0">{amtPct}%</span>
                  </div>
                  <span className="text-[11px] font-bold text-red-500 tabular-nums text-right">{score}</span>
                </div>
              )
            })}
            {categoryStats.length > 5 && (
              <div className="text-right mt-1.5">
                <button
                  onClick={() => onMore('categories')}
                  className="text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
                >
                  더보기 →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 후회 내역 TOP5 — 1열 */}
        <div className="bg-white border border-gray-300">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">후회 내역 TOP 5</p>
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-[12px_34px_1fr_44px_44px_22px] gap-x-1.5 pb-1 border-b border-gray-200 text-[9px] font-bold tracking-widest uppercase text-gray-400">
              <span>#</span>
              <span>일자</span>
              <span>내역</span>
              <span className="truncate">카테고리</span>
              <span className="text-right">금액</span>
              <span className="text-right">점수</span>
            </div>
            {sortedItems.map((r, i) => {
              const score = Math.round((r.amount / maxItemAmt) * 100)
              const [, mm, dd] = r.date.split('-')
              return (
                <div key={r.id ?? i} className="grid grid-cols-[12px_34px_1fr_44px_44px_22px] gap-x-1.5 items-center border-b border-gray-100 py-1.5">
                  <span className="text-[10px] text-gray-400 tabular-nums">{i + 1}</span>
                  <span className="text-[10px] text-gray-400 tabular-nums">{Number(mm)}/{Number(dd)}</span>
                  <span className="text-[11px] text-gray-700 truncate">{r.description || r.category || '(내용 없음)'}</span>
                  <span className="text-[10px] text-gray-400 truncate">{r.category}</span>
                  <span className="text-[11px] font-semibold text-gray-800 tabular-nums text-right">{(r.amount / 10000).toFixed(1)}만</span>
                  <span className="text-[11px] font-bold text-red-500 tabular-nums text-right">{score}</span>
                </div>
              )
            })}
            {regretItems.length > 5 && (
              <div className="text-right mt-1.5">
                <button
                  onClick={() => onMore('items')}
                  className="text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
                >
                  더보기 →
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
