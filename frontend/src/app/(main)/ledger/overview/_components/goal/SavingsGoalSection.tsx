// 목표 — 모으기 목표 (이번달 목표 2fr + 적립 현황 1fr 레이아웃)
'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useSavingsGoals } from '@/features/ledger/goals/storage'
import type { SavingsGoal } from '@/features/ledger/goals/types'

interface Props {
  refMonth: string
  ledId: string | null
}

function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null
  const target = deadline.length === 7 ? new Date(`${deadline}-01`) : new Date(deadline)
  const ms = target.getTime() - new Date().getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function SavingsGoalSection({ refMonth, ledId }: Props) {
  const { goals, deposits, addGoal, removeGoal, setDeposit } = useSavingsGoals()
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)

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

  function getRecent(goal: SavingsGoal, n = 6): { month: string; amount: number }[] {
    return Array.from({ length: n }, (_, i) => {
      const ym = shiftMonth(refMonth, -i)
      return {
        month: ym,
        amount: deposits
          .filter(d => d.goalId === goal.id && d.targetMonth === ym)
          .reduce((s, d) => s + d.amount, 0),
      }
    }).reverse()
  }

  const depositGoal = depositGoalId ? visibleGoals.find(g => g.id === depositGoalId) ?? null : null
  const monthNum = Number(refMonth.slice(5, 7))

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">모으기 목표</p>
        <button
          onClick={() => setGoalModalOpen(true)}
          className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-700"
        >+ 목표 추가</button>
      </div>

      {visibleGoals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-10 text-center">
          <p className="text-xs text-gray-400 mb-1">모으기 목표를 추가해보세요</p>
          <p className="text-[11px] text-gray-300">비상금, 여행, 노트북 등 매달 얼마씩 모을지 기록할 수 있어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleGoals.map(goal => {
            const current    = getCurrent(goal)
            const totalPct   = goal.targetAmount > 0 ? Math.min((current / goal.targetAmount) * 100, 100) : 0
            const thisMonth  = getThisMonth(goal)
            const recent     = getRecent(goal)
            const dLeft      = daysUntil(goal.deadline)
            const hasRecent  = recent.some(r => r.amount > 0)
            const monthlyPct = goal.monthlyTarget > 0
              ? Math.min((thisMonth / goal.monthlyTarget) * 100, 100)
              : 0

            return (
              <div key={goal.id} className="grid grid-cols-[2fr_1fr] gap-4">
                {/* 좌: 이번달 목표 */}
                <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-0.5">이번달 목표</p>
                      <p className="text-sm font-semibold text-gray-800">{goal.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {dLeft !== null && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          dLeft < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {dLeft < 0 ? `D+${Math.abs(dLeft)}` : `D-${dLeft}`}
                        </span>
                      )}
                      <button
                        onClick={() => removeGoal(goal.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* 전체 진행 바 */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-gray-800 rounded-full transition-all" style={{ width: `${totalPct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] tabular-nums mb-3">
                    <span className="text-gray-500">{fmtW(current)} / {fmtW(goal.targetAmount)}</span>
                    <span className="font-semibold text-gray-700">{Math.round(totalPct)}%</span>
                  </div>

                  {/* 최근 6개월 */}
                  {hasRecent && (
                    <div className="border-t border-gray-100 pt-2.5">
                      <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-1.5">최근 6개월</p>
                      <p className="text-[11px] text-gray-500 tabular-nums leading-relaxed">
                        {recent
                          .filter(r => r.amount > 0)
                          .map(r => `${Number(r.month.slice(5, 7))}월 +${Math.round(r.amount / 10000)}만`)
                          .join(' · ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* 우: 적립 현황 */}
                <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex flex-col">
                  <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-3">적립 현황</p>

                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 mb-0.5">{monthNum}월 적립</p>
                    <p className="text-2xl font-extrabold text-gray-800 tabular-nums leading-tight mb-1">
                      {fmtW(thisMonth)}
                    </p>
                    {goal.monthlyTarget > 0 && (
                      <p className="text-[11px] text-gray-400 tabular-nums mb-2">
                        목표 {fmtW(goal.monthlyTarget)}
                      </p>
                    )}

                    {goal.monthlyTarget > 0 && (
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div
                          className={`h-full rounded-full transition-all ${monthlyPct >= 100 ? 'bg-green-400' : 'bg-gray-700'}`}
                          style={{ width: `${monthlyPct}%` }}
                        />
                      </div>
                    )}
                    {goal.monthlyTarget > 0 && (
                      <p className="text-[10px] text-gray-400 tabular-nums mb-3">
                        {Math.round(monthlyPct)}%
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setDepositGoalId(goal.id)}
                    className="mt-auto w-full text-xs font-semibold py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {thisMonth > 0 ? '수정' : '입력하기'}
                  </button>
                </div>
              </div>
            )
          })}
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
          targetMonth={refMonth}
          currentAmount={getThisMonth(depositGoal)}
          onClose={() => setDepositGoalId(null)}
          onSubmit={amount => { setDeposit(depositGoal.id, refMonth, amount); setDepositGoalId(null) }}
        />
      )}
    </>
  )
}

function SavingsGoalModal({
  onClose, onSubmit,
}: {
  onClose: () => void
  onSubmit: (form: { name: string; targetAmount: number; monthlyTarget: number; deadline: string | null; startAmount: number }) => void
}) {
  const [name, setName] = useState('')
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
      targetAmount: targetN,
      monthlyTarget: isNaN(monthlyN) ? 0 : monthlyN,
      deadline: deadline || null,
      startAmount: isNaN(startN) ? 0 : startN,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-[380px] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">모으기 목표 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">기한 (선택)</label>
          <input
            type="month"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">시작 금액 (선택)</label>
          <input
            type="number"
            value={start}
            onChange={e => setStart(e.target.value)}
            placeholder="이미 모은 금액"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100">취소</button>
          <button onClick={handleSubmit} className="text-xs px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 font-semibold">추가</button>
        </div>
      </div>
    </div>
  )
}

function DepositModal({
  goal, targetMonth, currentAmount, onClose, onSubmit,
}: {
  goal: SavingsGoal
  targetMonth: string
  currentAmount: number
  onClose: () => void
  onSubmit: (amount: number) => void
}) {
  const [val, setVal] = useState(currentAmount > 0 ? String(currentAmount) : '')

  function handleSubmit() {
    const n = Number(val.replace(/,/g, ''))
    if (isNaN(n) || n < 0) return
    onSubmit(n)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-[340px] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">{Number(targetMonth.slice(5, 7))}월 적립 입력</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{goal.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">적립 금액</label>
          <input
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="0"
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100">취소</button>
          <button onClick={handleSubmit} className="text-xs px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 font-semibold">저장</button>
        </div>
      </div>
    </div>
  )
}
