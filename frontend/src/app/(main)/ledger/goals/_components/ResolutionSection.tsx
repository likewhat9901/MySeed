// 목표 — 다짐: 지난달 결과 비교 + 이번달 다짐(분석에서 가져오기)
'use client'

import { useMemo, useState } from 'react'
import { Check, X, Circle, Plus, Trash2 } from 'lucide-react'
import { useResolutions } from '@/features/ledger/goals/storage'
import type { ResolutionStatus } from '@/features/ledger/goals/types'
import type { LedgerRecord } from '@/features/ledger/record/types'

interface RegretCat { category: string; emoji?: string; amount: number }

interface Props {
  ledId: string | null
  month: string                // 'YYYY-MM' (이번달)
  prevMonth: string            // 'YYYY-MM' (지난달)
  records?: LedgerRecord[]     // 카테고리별 지출 집계용
  regretCategories?: RegretCat[] // 분석에서 가져오기 칩
}

const NEXT_STATUS: Record<ResolutionStatus, ResolutionStatus> = {
  none: 'kept',
  kept: 'broken',
  broken: 'none',
}

function fmtMan(n: number) {
  return n >= 10_000 ? `${Math.round(n / 10_000)}만` : `${Math.round(n / 1000)}천`
}

export default function ResolutionSection({ ledId, month, prevMonth, records = [], regretCategories = [] }: Props) {
  const { items, add, update, remove } = useResolutions()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const list = useMemo(
    () => items.filter(r => r.targetMonth === month && (r.ledId === ledId || r.ledId === null)),
    [items, month, ledId],
  )

  // 지난달 다짐들
  const prevList = useMemo(
    () => items.filter(r => r.targetMonth === prevMonth && (r.ledId === ledId || r.ledId === null)),
    [items, prevMonth, ledId],
  )

  // 카테고리별 이번달 지출 (지난달 다짐 결과 비교용)
  const catSpentThisMonth = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0 || !r.date.startsWith(month)) continue
      const k = r.category || '기타'
      m.set(k, (m.get(k) ?? 0) + r.amount)
    }
    return m
  }, [records, month])

  // 이미 이번달 다짐에 추가된 카테고리 (칩 중복 방지)
  const usedCategories = useMemo(
    () => new Set(list.map(r => r.category).filter(Boolean)),
    [list],
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

  function addFromRegret(rc: RegretCat) {
    add({
      ledId, targetMonth: month,
      text: `${rc.category} 줄여보기`,
      emoji: rc.emoji,
      category: rc.category,
      baselineAmount: rc.amount,
    })
  }

  const monthNum = Number(month.slice(5, 7))
  const prevMonthNum = Number(prevMonth.slice(5, 7))
  const keptCount = prevList.filter(r => r.status === 'kept').length

  const availableRegret = regretCategories.filter(rc => !usedCategories.has(rc.category))

  // 점검 우선순위: 미정 → 못지킴 → 지킴 (신경 써야 할 항목이 위로)
  const STATUS_ORDER: Record<ResolutionStatus, number> = { none: 0, broken: 1, kept: 2 }
  const sortedList = useMemo(
    () => [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [list],
  )
  const keptThisMonth = list.filter(r => r.status === 'kept').length

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
        {/* 지난달 다짐 (읽기 전용) */}
        <div className="bg-white border border-gray-300 flex flex-col">
          <div className="h-9 px-4 border-b border-gray-200 flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500 shrink-0">지난달 다짐 ({prevMonthNum}월)</p>
            {prevList.length > 0 && (
              <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{keptCount}/{prevList.length} 개선</span>
            )}
          </div>
          <div className="px-4 py-3 flex-1">
            {prevList.length === 0 ? (
              <p className="text-xs text-gray-300 py-2">지난달엔 등록된 다짐이 없어요.</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {prevList.map(r => {
                  const spent = r.category ? (catSpentThisMonth.get(r.category) ?? 0) : null
                  const base  = r.baselineAmount ?? null
                  const diff  = base != null && spent != null ? spent - base : null
                  return (
                    <div key={r.id} className="py-2">
                      <div className="flex items-center gap-2.5">
                        {r.status === 'kept' ? (
                          <Check size={15} className="text-green-600 shrink-0" />
                        ) : r.status === 'broken' ? (
                          <X size={15} className="text-red-500 shrink-0" />
                        ) : (
                          <Circle size={15} className="text-gray-300 shrink-0" />
                        )}
                        <span className="flex-1 text-xs flex items-center gap-1.5 text-gray-700 min-w-0">
                          {r.emoji && <span>{r.emoji}</span>}
                          <span className="truncate">{r.text}</span>
                        </span>
                      </div>
                      {(base != null && spent != null) && (
                        <p className="text-[11px] text-gray-400 mt-1 pl-[26px] tabular-nums">
                          {fmtMan(base)} → {fmtMan(spent)}
                          {diff != null && (
                            <span className={`ml-1 font-semibold ${diff <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {diff <= 0 ? '▼' : '▲'}{fmtMan(Math.abs(diff))}
                            </span>
                          )}
                        </p>
                      )}
                      {r.note && (
                        <p className="text-[11px] text-gray-400 mt-1 pl-[26px]">┗ {r.note}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 이번달 다짐 */}
        <div className="bg-white border border-gray-300 flex flex-col">
          <div className="h-9 px-4 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500 shrink-0">이번달 다짐 ({monthNum}월)</p>
              {list.length > 0 && (
                <>
                  <div className="flex-1 h-1.5 bg-gray-100 overflow-hidden min-w-[60px] max-w-[120px]">
                    <div
                      className="h-full bg-gray-800 transition-all"
                      style={{ width: `${Math.round((keptThisMonth / list.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{keptThisMonth}/{list.length} 지킴</span>
                </>
              )}
            </div>
            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-gray-900 text-white hover:bg-gray-700 transition-colors shrink-0"
              >
                <Plus size={10} /> 다짐 추가
              </button>
            )}
          </div>

          <div className="px-4 py-3 flex-1">
            {/* 분석에서 가져오기 */}
            {availableRegret.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pb-2.5 mb-2.5 border-b border-gray-100">
                <span className="text-[10px] text-gray-400 mr-1">분석에서 가져오기</span>
                {availableRegret.map(rc => (
                  <button
                    key={rc.category}
                    onClick={() => addFromRegret(rc)}
                    className="text-[11px] font-medium px-2 py-0.5 border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    + {rc.emoji ? `${rc.emoji} ` : ''}{rc.category}
                  </button>
                ))}
              </div>
            )}

            {list.length === 0 && !adding ? (
              <p className="text-xs text-gray-300 py-2">
                이번달 지킬 행동 규칙을 적어보세요. 예: 배달 주 2회까지만, 충동구매 24시간 보류.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {sortedList.map(r => {
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
                      <span className={`flex-1 text-xs flex items-center gap-1.5 ${r.status === 'broken' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {r.emoji && <span>{r.emoji}</span>}
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
                  className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 outline-none focus:border-brand"
                />
                <button
                  onClick={confirmAdd}
                  className="shrink-0 text-xs px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-700"
                >추가</button>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
