// 목표 — 모으기 목표 (이번달 목표 2fr + 적립 현황 1fr 레이아웃)
'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useSavingsGoals } from '@/features/ledger/goals/storage'
import type { SavingsGoal } from '@/features/ledger/goals/types'

interface Props {
  refMonth: string
  ledId: string | null
  netIncome?: number   // 이번달 순수입 (적립 요약의 '순수입 중 적립 %'용)
}

function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null
  const target = deadline.length === 7 ? new Date(`${deadline}-01`) : new Date(deadline)
  const ms = target.getTime() - new Date().getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function SavingsGoalSection({ refMonth, ledId, netIncome = 0 }: Props) {
  const { goals, deposits, addGoal, removeGoal, setDeposit } = useSavingsGoals()
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  const visibleGoals = useMemo(
    () => goals.filter(g => g.ledId === ledId || g.ledId === null),
    [goals, ledId],
  )

  function getCurrent(goal: SavingsGoal): number {
    return goal.startAmount + deposits
      .filter(d => d.goalId === goal.id)
      .reduce((s, d) => s + d.amount, 0)
  }

  function getThisMonth(goal: SavingsGoal): number {
    return deposits
      .filter(d => d.goalId === goal.id && d.targetMonth === refMonth)
      .reduce((s, d) => s + d.amount, 0)
  }

  const depositGoal = depositGoalId ? visibleGoals.find(g => g.id === depositGoalId) ?? null : null
  const monthNum = Number(refMonth.slice(5, 7))

  // 진행중 / 완료 분리
  const activeGoals = visibleGoals.filter(g => getCurrent(g) < g.targetAmount)
  const doneGoals   = visibleGoals.filter(g => getCurrent(g) >= g.targetAmount)
  const listGoals   = showDone ? visibleGoals : activeGoals

  // 적립 요약 — 이번달 전체 적립 합계 / 순수입 중 적립률 / 진행중 목표 수
  const monthDeposit = visibleGoals.reduce((s, g) => s + getThisMonth(g), 0)
  const savingRate   = netIncome > 0 ? Math.round((monthDeposit / netIncome) * 100) : null

  return (
    <>
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500 shrink-0">Savings Goals — 모으기 목표</span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      {visibleGoals.length === 0 ? (
        <div className="bg-white border border-gray-300">
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">모으기 목표</p>
            <button
              onClick={() => setGoalModalOpen(true)}
              className="text-[11px] font-bold px-2 py-0.5 bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >+ 목표 추가</button>
          </div>
          <div className="px-5 py-10 text-center">
            <p className="text-xs text-gray-400 mb-1">모으기 목표를 추가해보세요</p>
            <p className="text-[11px] text-gray-300">비상금, 여행, 노트북 등 매달 얼마씩 모을지 기록할 수 있어요</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* 좌: 목표 리스트 (2열) */}
          <div className="col-span-2 bg-white border border-gray-300 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">모으기 목표</p>
              <button
                onClick={() => setGoalModalOpen(true)}
                className="text-[11px] font-bold px-2 py-0.5 bg-gray-900 text-white hover:bg-gray-700 transition-colors"
              >+ 목표 추가</button>
            </div>
            <div className="divide-y divide-gray-100">
              {listGoals.map(goal => {
                const current   = getCurrent(goal)
                const totalPct  = goal.targetAmount > 0 ? Math.min((current / goal.targetAmount) * 100, 100) : 0
                const thisMonth = getThisMonth(goal)
                const dLeft     = daysUntil(goal.deadline)
                const done      = current >= goal.targetAmount

                return (
                  <div key={goal.id} className="px-4 py-2.5 flex items-center gap-2.5">
                    <p className="w-28 shrink-0 text-[13px] font-semibold text-gray-800 truncate flex items-center gap-1.5">
                      {goal.emoji && <span className="text-sm">{goal.emoji}</span>}
                      {goal.name}
                    </p>
                    {done ? (
                      <span className="shrink-0 text-[10px] font-bold text-green-600">완료</span>
                    ) : dLeft !== null ? (
                      <span className={`shrink-0 text-[10px] font-bold tabular-nums ${dLeft < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {dLeft < 0 ? `D+${Math.abs(dLeft)}` : `D-${dLeft}`}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-gray-300">진행중</span>
                    )}
                    <div className="flex-1 h-2 bg-gray-100 overflow-hidden">
                      <div className={`h-full transition-all ${done ? 'bg-green-500' : 'bg-gray-800'}`} style={{ width: `${totalPct}%` }} />
                    </div>
                    <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{fmtW(current)} / {fmtW(goal.targetAmount)}</span>
                    <span className="text-[11px] font-bold text-gray-700 tabular-nums shrink-0 w-9 text-right">{Math.round(totalPct)}%</span>
                    <button
                      onClick={() => setDepositGoalId(goal.id)}
                      className="text-[11px] font-semibold px-2 py-0.5 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
                    >
                      {thisMonth > 0 ? '수정' : '입력'}
                    </button>
                    <button onClick={() => removeGoal(goal.id)} className="shrink-0 text-gray-300 hover:text-red-400 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
            {/* 완료된 목표 보기 토글 */}
            {doneGoals.length > 0 && (
              <button
                onClick={() => setShowDone(v => !v)}
                className="mt-auto border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {showDone ? '완료된 목표 숨기기' : `완료된 목표 보기 (${doneGoals.length})`}
              </button>
            )}
          </div>

          {/* 우: 적립 요약 (1열) */}
          <div className="bg-white border border-gray-300 px-4 py-3 flex flex-col gap-3">
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">적립 요약</p>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">{monthNum}월 적립</p>
              <p className="text-2xl font-extrabold text-gray-800 tabular-nums leading-none">{fmtW(monthDeposit)}</p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[10px] text-gray-400 mb-0.5">순수입 중 적립</p>
              {savingRate != null ? (
                <p className="text-[13px] font-bold text-gray-700 tabular-nums">
                  {savingRate}% <span className="text-[10px] font-normal text-gray-400">({fmtW(netIncome)} 중)</span>
                </p>
              ) : (
                <p className="text-[13px] font-bold text-gray-300">—</p>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[10px] text-gray-400 mb-0.5">진행중 목표</p>
              <p className="text-[13px] font-bold text-gray-700 tabular-nums">{activeGoals.length}개</p>
            </div>
          </div>
        </div>
      )}

      {goalModalOpen && (
        <SavingsGoalModal
          onClose={() => setGoalModalOpen(false)}
          onSubmit={form => { addGoal({ ...form, ledId }); setGoalModalOpen(false) }}
        />
      )}

      {depositGoal && (
        <DepositModal
          goal={depositGoal}
          initialMonth={refMonth}
          getAmountForMonth={month => deposits
            .filter(d => d.goalId === depositGoal.id && d.targetMonth === month)
            .reduce((s, d) => s + d.amount, 0)}
          onClose={() => setDepositGoalId(null)}
          onSubmit={(month, amount) => { setDeposit(depositGoal.id, month, amount); setDepositGoalId(null) }}
        />
      )}
    </>
  )
}

const GOAL_EMOJIS = ['✈️', '🎁', '💰', '🏠', '🚗', '💻', '📱', '🎓', '💍', '🏖️']

function SavingsGoalModal({
  onClose, onSubmit,
}: {
  onClose: () => void
  onSubmit: (form: { name: string; emoji?: string; targetAmount: number; monthlyTarget: number; deadline: string | null; startAmount: number }) => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [target, setTarget] = useState('')
  const [monthly, setMonthly] = useState('')
  const [deadline, setDeadline] = useState('')
  const [start, setStart] = useState('')

  function handleSubmit() {
    const targetN  = Number(target.replace(/,/g, ''))
    const monthlyN = Number((monthly || '0').replace(/,/g, ''))
    const startN   = Number((start || '0').replace(/,/g, ''))
    if (!name.trim() || isNaN(targetN) || targetN <= 0) return
    onSubmit({
      name: name.trim(),
      emoji: emoji || undefined,
      targetAmount: targetN,
      monthlyTarget: isNaN(monthlyN) ? 0 : monthlyN,
      deadline: deadline || null,
      startAmount: isNaN(startN) ? 0 : startN,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-gray-300 shadow-xl w-[380px] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">모으기 목표 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {/* 아이콘 선택 */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">아이콘 (선택)</label>
          <div className="flex flex-wrap gap-1">
            {GOAL_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(emoji === e ? '' : e)}
                className={`w-7 h-7 flex items-center justify-center text-sm border transition-colors ${
                  emoji === e ? 'border-gray-800 bg-gray-100' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >{e}</button>
            ))}
          </div>
        </div>

        {[
          { label: '목표명', value: name, set: setName, type: 'text', placeholder: '예: 비상금' },
          { label: '목표 금액', value: target, set: setTarget, type: 'number', placeholder: '예: 1000000' },
          { label: '월 적립 목표 (선택)', value: monthly, set: setMonthly, type: 'number', placeholder: '예: 200000' },
        ].map(f => (
          <div key={f.label}>
            <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">{f.label}</label>
            <input
              type={f.type}
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">기한 (선택)</label>
          <input
            type="month"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">시작 금액 (선택)</label>
          <input
            type="number"
            value={start}
            onChange={e => setStart(e.target.value)}
            placeholder="이미 모은 금액"
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs px-4 py-2 text-gray-500 hover:bg-gray-100">취소</button>
          <button onClick={handleSubmit} className="text-xs px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 font-semibold">추가</button>
        </div>
      </div>
    </div>
  )
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function DepositModal({
  goal, initialMonth, getAmountForMonth, onClose, onSubmit,
}: {
  goal: SavingsGoal
  initialMonth: string
  getAmountForMonth: (month: string) => number
  onClose: () => void
  onSubmit: (month: string, amount: number) => void
}) {
  const [month, setMonth] = useState(initialMonth)
  const [val, setVal] = useState(() => {
    const amount = getAmountForMonth(initialMonth)
    return amount > 0 ? String(amount) : ''
  })

  function changeMonth(delta: number) {
    const next = shiftMonth(month, delta)
    setMonth(next)
    const amount = getAmountForMonth(next)
    setVal(amount > 0 ? String(amount) : '')
  }

  function handleSubmit() {
    const n = Number(val.replace(/,/g, ''))
    if (isNaN(n) || n < 0) return
    onSubmit(month, n)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-gray-300 shadow-xl w-[340px] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">적립 입력</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-gray-700 px-0.5">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-gray-700 tabular-nums w-9 text-center">
                {Number(month.slice(5, 7))}월
              </span>
              <button onClick={() => changeMonth(1)} className="text-gray-400 hover:text-gray-700 px-0.5">
                <ChevronRight size={14} />
              </button>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 -mt-2">{goal.name}</p>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">적립 금액</label>
          <input
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="0"
            autoFocus
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs px-4 py-2 text-gray-500 hover:bg-gray-100">취소</button>
          <button onClick={handleSubmit} className="text-xs px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 font-semibold">저장</button>
        </div>
      </div>
    </div>
  )
}
