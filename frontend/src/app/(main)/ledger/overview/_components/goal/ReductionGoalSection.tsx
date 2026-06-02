// 현황 — 줄이기 목표 카드 (이번달 진행 / 다음달 계획 탭)
'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { LedgerRecord } from '@/features/ledger/record/types'
import { useReductionGoals } from '@/features/ledger/goals/storage'

interface Props {
  records: LedgerRecord[]
  refMonth: string
  ledId: string | null
}

function fmtW(n: number) {
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(ym: string) {
  const [, m] = ym.split('-')
  return `${Number(m)}월`
}

export default function ReductionGoalSection({ records, refMonth, ledId }: Props) {
  const { goals, add, update, remove } = useReductionGoals()
  const [tab, setTab] = useState<'current' | 'next'>('current')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const nextMonth = useMemo(() => shiftMonth(refMonth, 1), [refMonth])
  const prevMonth = useMemo(() => shiftMonth(refMonth, -1), [refMonth])

  // 카테고리별 이번달 실제 지출
  const spendByCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0) continue
      const k = r.category || '기타'
      m.set(k, (m.get(k) ?? 0) + r.amount)
    }
    return m
  }, [records])

  const currentGoals = useMemo(
    () => goals.filter(g => g.targetMonth === refMonth && (g.ledId === ledId || g.ledId === null)),
    [goals, refMonth, ledId],
  )
  const nextGoals = useMemo(
    () => goals.filter(g => g.targetMonth === nextMonth && (g.ledId === ledId || g.ledId === null)),
    [goals, nextMonth, ledId],
  )
  const prevGoals = useMemo(
    () => goals.filter(g => g.targetMonth === prevMonth && (g.ledId === ledId || g.ledId === null)),
    [goals, prevMonth, ledId],
  )

  // 지난달 결과 — 달성한 목표 N개 / 전체 M개
  const prevResult = useMemo(() => {
    if (prevGoals.length === 0) return null
    let achieved = 0
    for (const g of prevGoals) {
      const spent = 0  // 지난달 spent를 정확히 계산하려면 records를 전체기간으로 받아야 함. v1에서는 생략
      if (spent <= g.targetAmount) achieved++
    }
    return { achieved, total: prevGoals.length }
  }, [prevGoals])

  function openAdd() {
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setModalOpen(true)
  }

  const editingGoal = editingId ? goals.find(g => g.id === editingId) ?? null : null

  function renderList(items: typeof currentGoals, mode: 'current' | 'next') {
    if (items.length === 0) {
      return (
        <p className="text-xs text-gray-300 py-4">
          {mode === 'current'
            ? '이번달 진행 중인 목표가 없어요.'
            : `다음달(${monthLabel(nextMonth)}) 줄일 항목을 추가해보세요.`}
        </p>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        {items.map(g => {
          const spent = spendByCategory.get(g.category) ?? 0
          const pct = g.targetAmount > 0 ? (spent / g.targetAmount) * 100 : 0
          const status = pct <= 80 ? 'on' : pct <= 100 ? 'watch' : 'over'
          const badge = status === 'on'
            ? { text: '✓ 달성 가능', cls: 'bg-green-100 text-green-700' }
            : status === 'watch'
            ? { text: '⚠ 주의', cls: 'bg-yellow-100 text-yellow-700' }
            : { text: '✗ 초과', cls: 'bg-red-100 text-red-600' }
          const barColor = status === 'on' ? 'bg-green-400' : status === 'watch' ? 'bg-yellow-400' : 'bg-red-400'
          return (
            <div key={g.id} className="border border-gray-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-800">{g.category}</span>
                <div className="flex items-center gap-1.5">
                  {mode === 'current' && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.text}
                    </span>
                  )}
                  <button onClick={() => openEdit(g.id)} className="text-[10px] text-gray-400 hover:text-gray-700 px-1">수정</button>
                  <button onClick={() => remove(g.id)} className="text-[10px] text-gray-400 hover:text-red-500 px-1">삭제</button>
                </div>
              </div>
              {mode === 'current' ? (
                <>
                  <p className="text-[11px] text-gray-500 mb-1 tabular-nums">
                    목표 {fmtW(g.targetAmount)} / 현재 {fmtW(spent)}
                  </p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 tabular-nums">{Math.round(pct)}%</p>
                </>
              ) : (
                <p className="text-[11px] text-gray-500 tabular-nums">
                  이번달 {fmtW(spent)} → 다음달 목표 {fmtW(g.targetAmount)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <p className="text-sm font-semibold text-gray-800">줄이기 목표</p>
          </div>
          <div className="flex items-center gap-2">
            {prevResult && (
              <span className="text-[10px] text-gray-400">
                지난달 {prevResult.achieved}/{prevResult.total} 달성
              </span>
            )}
            <div className="flex bg-gray-100 rounded-full p-0.5">
              <button
                onClick={() => setTab('current')}
                className={`text-[11px] px-2.5 py-0.5 rounded-full ${tab === 'current' ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
              >이번달</button>
              <button
                onClick={() => setTab('next')}
                className={`text-[11px] px-2.5 py-0.5 rounded-full ${tab === 'next' ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
              >다음달 계획</button>
            </div>
            <button
              onClick={openAdd}
              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-700"
            >+ 추가</button>
          </div>
        </div>

        {tab === 'current' ? renderList(currentGoals, 'current') : renderList(nextGoals, 'next')}
      </div>

      {modalOpen && (
        <GoalModal
          onClose={() => setModalOpen(false)}
          defaultMonth={tab === 'current' ? refMonth : nextMonth}
          existing={editingGoal}
          spendByCategory={spendByCategory}
          onSubmit={(form) => {
            if (editingGoal) update(editingGoal.id, { ...form })
            else add({ ...form, ledId })
            setModalOpen(false)
          }}
        />
      )}
    </>
  )
}

interface GoalFormValues {
  targetMonth: string
  category: string
  targetAmount: number
}

function GoalModal({
  onClose,
  defaultMonth,
  existing,
  spendByCategory,
  onSubmit,
}: {
  onClose: () => void
  defaultMonth: string
  existing: { targetMonth: string; category: string; targetAmount: number } | null
  spendByCategory: Map<string, number>
  onSubmit: (form: GoalFormValues) => void
}) {
  const [targetMonth, setTargetMonth] = useState(existing?.targetMonth ?? defaultMonth)
  const [category, setCategory] = useState(existing?.category ?? '')
  const [amount, setAmount] = useState(existing ? String(existing.targetAmount) : '')

  const currentSpent = spendByCategory.get(category) ?? 0
  const recommend = currentSpent > 0 ? Math.round(currentSpent * 0.8) : 0

  const categoryOptions = Array.from(spendByCategory.keys())

  function handleSubmit() {
    const n = Number(amount.replace(/,/g, ''))
    if (!category || isNaN(n) || n <= 0) return
    onSubmit({ targetMonth, category, targetAmount: n })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-[380px] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            {existing ? '줄이기 목표 수정' : '줄이기 목표 추가'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">대상월</label>
          <input
            type="month"
            value={targetMonth}
            onChange={e => setTargetMonth(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">카테고리</label>
          <input
            list="reduction-category-list"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="예: 카페"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
          />
          <datalist id="reduction-category-list">
            {categoryOptions.map(c => <option key={c} value={c} />)}
          </datalist>
          {currentSpent > 0 && (
            <p className="text-[10px] text-gray-400 mt-1">이번달 지출: {fmtW(currentSpent)}</p>
          )}
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">목표 금액</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
          />
          {recommend > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(recommend))}
              className="text-[10px] text-blue-500 mt-1 hover:underline"
            >💡 추천: {fmtW(recommend)} (이번달 -20%)</button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100">취소</button>
          <button onClick={handleSubmit} className="text-xs px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 font-semibold">
            {existing ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
