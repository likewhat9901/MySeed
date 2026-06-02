// 목표 — 월말 회고: 잘한 것 / 아쉬운 것 / 다음달엔 (월별 1개)
'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useResolutions, useRetrospectives } from '@/features/ledger/goals/storage'

interface Props {
  ledId: string | null
  month: string       // 'YYYY-MM'
  nextMonth: string   // 'YYYY-MM'
}

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

export default function RetrospectiveSection({ ledId, month, nextMonth }: Props) {
  const { items, upsert } = useRetrospectives()
  const { add: addResolution } = useResolutions()
  const [carried, setCarried] = useState(false)

  const saved = useMemo(
    () => items.find(r => r.month === month && (r.ledId === ledId || r.ledId === null)),
    [items, month, ledId],
  )

  const [good, setGood] = useState('')
  const [bad, setBad] = useState('')
  const [next, setNext] = useState('')

  // 월/저장본이 바뀌면 폼 동기화
  useEffect(() => {
    setGood(saved?.good ?? '')
    setBad(saved?.bad ?? '')
    setNext(saved?.next ?? '')
    setCarried(false)
  }, [saved?.id, month])

  const { active, hint } = activation(month)

  function carryOver() {
    const lines = next.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    for (const text of lines) addResolution({ ledId, targetMonth: nextMonth, text })
    setCarried(true)
  }

  const fields: { key: 'good' | 'bad' | 'next'; label: string; value: string; set: (v: string) => void; placeholder: string }[] = [
    { key: 'good', label: '잘한 것',   value: good, set: setGood, placeholder: '이번달 잘한 점' },
    { key: 'bad',  label: '아쉬운 것', value: bad,  set: setBad,  placeholder: '아쉬웠던 점' },
    { key: 'next', label: '다음달엔',  value: next, set: setNext, placeholder: '다음달 바꿔볼 것 (한 줄에 하나씩)' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-800">월말 회고</p>
        <p className="text-[11px] text-gray-400">말일이 가까워지면 활성화돼요</p>
      </div>

      {!active ? (
        <p className="text-xs text-gray-300 py-6 text-center">{hint}</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">이번달 어땠나요?</p>
          <div className="grid grid-cols-3 gap-3">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider block mb-1">{f.label}</label>
                <textarea
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  onBlur={() => upsert(ledId, month, { [f.key]: f.value })}
                  placeholder={f.placeholder}
                  rows={4}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg outline-none focus:border-brand resize-none text-gray-700 placeholder:text-gray-300"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={carryOver}
              disabled={!next.trim() || carried}
              className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-brand disabled:text-gray-300 disabled:cursor-default transition-colors"
            >
              {carried ? '다음달 다짐으로 옮겼어요' : <>다음달 다짐으로 이어가기 <ArrowRight size={12} /></>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
