// 현황 예산 카드 — budget 진행바 + 상태 + BY CATEGORY + Adjust budget
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface CategoryItem { label: string; amount: number; color: string }

interface Props {
  expense: number
  categoryItems: CategoryItem[]
  daysLeft: number
  viewMode: 'week' | 'month' | 'year'
}

function fmtK(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`
  return `${n.toLocaleString()}`
}

function fmtLarge(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

function parseAmount(s: string): number {
  const n = Number(s.replace(/,/g, ''))
  return isNaN(n) || n < 0 ? 0 : n
}

export default function BudgetCard({ expense, categoryItems, daysLeft, viewMode }: Props) {
  const [budget, setBudget] = useState<{ total: number; categories: Record<string, number> }>({
    total: 0,
    categories: {},
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [draftTotal, setDraftTotal] = useState('')
  const [draftCats, setDraftCats] = useState<Record<string, string>>({})

  const top5 = categoryItems

  const hasBudget = budget.total > 0
  const budgetPct = hasBudget ? Math.min(Math.round((expense / budget.total) * 100), 100) : 0
  const remaining = budget.total - expense

  function openModal() {
    setDraftTotal(budget.total > 0 ? String(budget.total) : '')
    const init: Record<string, string> = {}
    for (const item of top5) {
      init[item.label] = budget.categories[item.label] ? String(budget.categories[item.label]) : ''
    }
    setDraftCats(init)
    setModalOpen(true)
  }

  function handleConfirm() {
    const total = parseAmount(draftTotal)
    const categories: Record<string, number> = {}
    for (const [k, v] of Object.entries(draftCats)) {
      const n = parseAmount(v)
      if (n > 0) categories[k] = n
    }
    setBudget({ total, categories })
    setModalOpen(false)
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5 flex flex-col gap-3">
        {/* 행 1: BUDGET 헤더 + 진행률 % */}
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-semibold text-gray-400 tracking-wider">BUDGET</p>
          {hasBudget ? (
            <span className={`text-[10px] font-semibold tabular-nums ${
              budgetPct >= 100 ? 'text-red-500' : budgetPct >= 80 ? 'text-orange-500' : 'text-green-600'
            }`}>
              {budgetPct}%{budgetPct >= 80 ? ' ⚠' : ''}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-gray-400">미설정</span>
          )}
        </div>

        {/* 진행 바 */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          {hasBudget ? (
            <div
              className={`h-full rounded-full transition-all ${budgetPct >= 100 ? 'bg-red-400' : budgetPct >= 80 ? 'bg-orange-400' : 'bg-green-400'}`}
              style={{ width: `${budgetPct}%` }}
            />
          ) : (
            <div className="h-full w-full bg-gray-100 rounded-full" />
          )}
        </div>

        {/* 행 3: 금액 + remaining (좌/우 정렬) */}
        {hasBudget ? (
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-gray-500 tabular-nums">
              {fmtLarge(expense)} / {fmtLarge(budget.total)}
            </p>
            <p className="text-[11px] text-gray-500 tabular-nums">
              <span className="font-semibold text-gray-800">{fmtLarge(Math.max(remaining, 0))}</span> remaining
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 tabular-nums">{fmtLarge(expense)}</p>
        )}

        {/* 행 4 (미설정일 때만): 상태 뱃지 */}
        {!hasBudget && (
          <div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
              예산 미설정
            </span>
          </div>
        )}

        {/* 행 5: 남은 일수 (month 모드에서만) */}
        {hasBudget && viewMode === 'month' && daysLeft > 0 && (
          <p className="text-[11px] text-gray-400">{daysLeft}일 남음</p>
        )}

        {/* 카테고리별 예산 — 1열 한 줄 (3개 초과 시 스크롤) */}
        {hasBudget && top5.some(it => (budget.categories[it.label] ?? 0) > 0) && (
          <div className="border-t border-gray-100 pt-2 flex flex-col gap-1 overflow-y-auto pr-1" style={{ maxHeight: 60 }}>
            {top5
              .filter(it => (budget.categories[it.label] ?? 0) > 0)
              .map(item => {
                const catBudget = budget.categories[item.label] ?? 0
                const pct = Math.round((item.amount / catBudget) * 100)
                const barPct = Math.min(pct, 100)
                const isOver = pct >= 100
                return (
                  <div key={item.label} className="flex items-center gap-2 min-w-0">
                    {/* 이름 */}
                    <div className="flex items-center gap-1 shrink-0" style={{ width: 64 }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-[10px] font-medium text-gray-700 truncate">{item.label}</span>
                    </div>
                    {/* 바 */}
                    <div className="relative flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all"
                        style={{ width: `${barPct}%`, background: isOver ? '#f87171' : item.color, opacity: 0.85 }}
                      />
                    </div>
                    {/* % */}
                    <span className={`text-[10px] tabular-nums shrink-0 text-right ${isOver ? 'text-red-500 font-semibold' : 'text-gray-500'}`} style={{ width: 32 }}>
                      {pct}%
                    </span>
                    {/* 사용/예산 */}
                    <span className="text-[10px] text-gray-400 tabular-nums shrink-0 text-right" style={{ width: 64 }}>
                      {fmtK(item.amount)}/{fmtK(catBudget)}
                    </span>
                  </div>
                )
              })}
          </div>
        )}

        {/* 행 6: Adjust 버튼 (하단 고정) */}
        <button
          onClick={openModal}
          className="mt-auto w-full bg-gray-900 text-white text-xs font-semibold rounded-xl py-2.5 hover:bg-gray-700 transition-colors"
        >
          Adjust budget →
        </button>
      </div>

      {/* Adjust Budget 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-[400px] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">예산 설정</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 tracking-wider block mb-1">총 예산</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2.5">₩</span>
                <input
                  type="number"
                  value={draftTotal}
                  onChange={e => setDraftTotal(e.target.value)}
                  placeholder="0"
                  className="flex-1 px-3 py-2.5 text-sm text-gray-800 focus:outline-none"
                />
              </div>
            </div>
            {top5.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-gray-400 tracking-wider block mb-2">카테고리별 예산 (선택)</label>
                <div className="flex flex-col gap-2">
                  {top5.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-24 shrink-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-xs text-gray-700 truncate">{item.label}</span>
                      </div>
                      <div className="flex-1 flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 py-2">₩</span>
                        <input
                          type="number"
                          value={draftCats[item.label] ?? ''}
                          onChange={e => setDraftCats(prev => ({ ...prev, [item.label]: e.target.value }))}
                          placeholder="0"
                          className="flex-1 px-2 py-2 text-xs text-gray-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="text-xs px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="text-xs px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-700 transition-colors font-semibold"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
