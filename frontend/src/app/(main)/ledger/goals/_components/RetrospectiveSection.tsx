// 목표 — 월말 회고: 지난달 회고 표시 + 이번달 기분 + 한마디
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRetrospectives } from '@/features/ledger/goals/storage'
import type { RetroMood } from '@/features/ledger/goals/types'

interface Props {
  ledId: string | null
  month: string       // 'YYYY-MM' (이번달)
  prevMonth: string   // 'YYYY-MM' (지난달)
}

const MOODS: { key: RetroMood; emoji: string; label: string }[] = [
  { key: 'tight', emoji: '😣', label: '빠듯' },
  { key: 'soso',  emoji: '😐', label: '그럭저럭' },
  { key: 'okay',  emoji: '😌', label: '괜찮음' },
  { key: 'proud', emoji: '🙂', label: '뿌듯' },
]

function activation(month: string): { active: boolean; hint: string } {
  const now = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (month < curMonth) return { active: true, hint: '' }
  if (month > curMonth) return { active: false, hint: '아직 시작하지 않은 달이에요.' }
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const daysLeft = lastDay - now.getDate()
  if (daysLeft <= 7) return { active: true, hint: '' }
  return { active: false, hint: `월말이 가까워지면 작성할 수 있어요. (${daysLeft - 7}일 후 활성화)` }
}

// 지난 회고의 한마디 — note 우선, 없으면 기존 good/bad/next 합침 (구버전 호환)
function retroText(r: { note?: string; good?: string; bad?: string; next?: string } | undefined): string {
  if (!r) return ''
  if (r.note) return r.note
  return [r.good, r.bad, r.next].filter(Boolean).join(' / ')
}

export default function RetrospectiveSection({ ledId, month, prevMonth }: Props) {
  const { items, upsert } = useRetrospectives()

  const saved = useMemo(
    () => items.find(r => r.month === month && (r.ledId === ledId || r.ledId === null)),
    [items, month, ledId],
  )
  const prevSaved = useMemo(
    () => items.find(r => r.month === prevMonth && (r.ledId === ledId || r.ledId === null)),
    [items, prevMonth, ledId],
  )

  const [mood, setMood] = useState<RetroMood | undefined>(undefined)
  const [note, setNote] = useState('')

  useEffect(() => {
    setMood(saved?.mood)
    setNote(saved?.note ?? '')
  }, [saved?.id, month])

  const { active, hint } = activation(month)
  const monthNum = Number(month.slice(5, 7))
  const prevMonthNum = Number(prevMonth.slice(5, 7))
  const prevText = retroText(prevSaved)

  function pickMood(m: RetroMood) {
    const next = mood === m ? undefined : m
    setMood(next)
    upsert(ledId, month, { mood: next })
  }

  return (
      <div className="bg-white border border-gray-300 h-full">
        <div className="h-9 px-4 border-b border-gray-200 flex items-center">
          <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">월말 회고 ({monthNum}월)</p>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3">
          {/* 지난달 회고 */}
          {prevText && (
            <div className="bg-gray-50 border border-gray-200 px-3 py-2.5">
              <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">지난달 회고 ({prevMonthNum}월)</p>
              <p className="text-[12px] text-gray-600 leading-relaxed">{prevText}</p>
            </div>
          )}

          {!active ? (
            <p className="text-xs text-gray-300 py-6 text-center">{hint}</p>
          ) : (
            <>
              {/* 기분 선택 */}
              <div>
                <p className="text-[11px] text-gray-500 mb-1.5">이번달 돈 관리, 한마디로</p>
                <div className="flex gap-1.5">
                  {MOODS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => pickMood(m.key)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium border transition-colors ${
                        mood === m.key ? 'border-gray-800 bg-gray-100 text-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 한마디 */}
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                onBlur={() => upsert(ledId, month, { note })}
                placeholder="이번달 돈 관리를 돌아보며 한마디 남겨보세요."
                rows={3}
                className="w-full text-xs px-2.5 py-2 border border-gray-300 outline-none focus:border-brand resize-none text-gray-700 placeholder:text-gray-300"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => upsert(ledId, month, { note, mood })}
                  className="text-xs font-bold px-4 py-1.5 bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </>
          )}
        </div>
    </div>
  )
}
