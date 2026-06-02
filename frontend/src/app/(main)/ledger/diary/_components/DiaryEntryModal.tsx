// 일기 작성/수정 모달 — 날짜·무드·텍스트
'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { DiaryEntry, DiaryMood } from '@/features/ledger/diary/types'

interface Props {
  date:          string
  existingEntry: DiaryEntry | undefined
  onSave:        (mood: DiaryMood, text: string) => void
  onDelete:      (() => void) | undefined
  onClose:       () => void
}

const MOODS: { value: DiaryMood; emoji: string; label: string }[] = [
  { value: 'good',    emoji: '😊', label: '만족' },
  { value: 'neutral', emoji: '😐', label: '보통' },
  { value: 'bad',     emoji: '😞', label: '후회 있음' },
]

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(dateStr).getDay()]
  return `${y}년 ${Number(m)}월 ${Number(d)}일 (${dow})`
}

export default function DiaryEntryModal({ date, existingEntry, onSave, onDelete, onClose }: Props) {
  const [mood, setMood] = useState<DiaryMood>(existingEntry?.mood ?? 'neutral')
  const [text, setText] = useState(existingEntry?.text ?? '')

  function handleSave() {
    onSave(mood, text.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-[480px] p-6 flex flex-col gap-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{fmtDate(date)}</p>
            <h2 className="text-sm font-semibold text-gray-800 mt-0.5">
              {existingEntry ? '일기 수정' : '일기 쓰기'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* 무드 선택 */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2">오늘 하루는?</p>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                  mood === m.value
                    ? 'border-gray-800 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className={`text-[11px] font-medium ${mood === m.value ? 'text-gray-800' : 'text-gray-400'}`}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 텍스트 */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2">오늘 있었던 일</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="오늘 어떤 소비를 했나요? 후회되는 건 없었나요?"
            rows={6}
            autoFocus
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-brand resize-none text-gray-700 placeholder:text-gray-300"
          />
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-between pt-1">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} /> 삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >취소</button>
            <button
              onClick={handleSave}
              className="text-xs px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 font-semibold transition-colors"
            >저장</button>
          </div>
        </div>
      </div>
    </div>
  )
}
