// 목표 — 이번달 다짐: 행동 규칙 + 지킴/못지킴 수동 기록
'use client'

import { useMemo, useState } from 'react'
import { Check, X, Circle, Plus, Trash2 } from 'lucide-react'
import { useResolutions } from '@/features/ledger/goals/storage'
import type { ResolutionStatus } from '@/features/ledger/goals/types'

interface Props {
  ledId: string | null
  month: string   // 'YYYY-MM'
}

const NEXT_STATUS: Record<ResolutionStatus, ResolutionStatus> = {
  none: 'kept',
  kept: 'broken',
  broken: 'none',
}

export default function ResolutionSection({ ledId, month }: Props) {
  const { items, add, update, remove } = useResolutions()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const list = useMemo(
    () => items.filter(r => r.targetMonth === month && (r.ledId === ledId || r.ledId === null)),
    [items, month, ledId],
  )

  function cycleStatus(id: string, cur: ResolutionStatus, brokenCount: number) {
    const next = NEXT_STATUS[cur]
    update(id, { status: next, brokenCount: next === 'broken' ? Math.max(brokenCount, 1) : 0 })
  }

  function confirmAdd() {
    const text = draft.trim()
    if (!text) { setAdding(false); setDraft(''); return }
    add({ ledId, targetMonth: month, text })
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">이번달 다짐</p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-700"
          >
            <Plus size={11} /> 다짐 추가
          </button>
        )}
      </div>

      {list.length === 0 && !adding ? (
        <p className="text-xs text-gray-300 py-4">
          이번달 지킬 행동 규칙을 적어보세요. 예: 배달 주 2회까지만, 충동구매 24시간 보류.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {list.map(r => {
            const label = r.status === 'kept'
              ? { text: '지킴', cls: 'text-green-600' }
              : r.status === 'broken'
              ? { text: `못 지킴 · ${r.brokenCount}번`, cls: 'text-red-500' }
              : { text: '미정', cls: 'text-gray-300' }
            return (
              <div key={r.id} className="group flex items-center gap-2.5 py-2">
                <button
                  onClick={() => cycleStatus(r.id, r.status, r.brokenCount)}
                  className="shrink-0"
                  title="클릭해서 지킴 / 못 지킴 / 미정 전환"
                >
                  {r.status === 'kept' ? (
                    <Check size={15} className="text-green-600" />
                  ) : r.status === 'broken' ? (
                    <X size={15} className="text-red-500" />
                  ) : (
                    <Circle size={15} className="text-gray-300" />
                  )}
                </button>
                <span className={`flex-1 text-xs ${r.status === 'broken' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {r.text}
                </span>
                {r.status === 'broken' && (
                  <button
                    onClick={() => update(r.id, { brokenCount: r.brokenCount + 1 })}
                    className="text-[10px] text-gray-300 hover:text-red-500 px-1"
                    title="어긴 횟수 +1"
                  >+1</button>
                )}
                <span className={`text-[11px] font-medium tabular-nums shrink-0 ${label.cls}`}>{label.text}</span>
                <button
                  onClick={() => remove(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <div className="flex items-center gap-2 mt-2">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmAdd()
              if (e.key === 'Escape') { setAdding(false); setDraft('') }
            }}
            placeholder="다짐 내용…"
            className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-md outline-none focus:border-brand"
          />
          <button
            onClick={confirmAdd}
            className="shrink-0 text-xs px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700"
          >추가</button>
        </div>
      )}
    </div>
  )
}
