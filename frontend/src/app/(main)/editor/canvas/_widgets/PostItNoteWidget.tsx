'use client'

import { useState, useRef } from 'react'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import type { PostItBinding } from '@/features/editor/types'

// ─── Post-it Note Widget ──────────────────────────────────────────────────────
// 노란 포스트잇 스타일 메모 위젯.
// 텍스트 클릭 시 textarea로 전환, blur 시 onBindingChange 호출.

const DEFAULT: PostItBinding = { lines: ['새 메모를 입력하세요.'] }

export default function PostItNoteWidget({ binding, onBindingChange, onBeforeChange, isEditMode }: WidgetComponentProps) {
  const data = (binding as PostItBinding | null) ?? DEFAULT
  // lines를 단일 문자열로 편집 — 개행으로 구분
  const text = data.lines.join('\n')

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function startEdit() {
    onBeforeChange()
    setDraft(text)
    setEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function commitEdit() {
    setEditing(false)
    const lines = draft.split('\n').filter(l => l.trim() !== '')
    onBindingChange({ lines: lines.length > 0 ? lines : [''] })
  }

  return (
    <div className="flex flex-col h-full bg-[#feffc2] rounded-[inherit] overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Post-it Note</span>
      </div>

      {/* 메모 본문 */}
      <div className="flex-1 px-4 pb-3 overflow-hidden">
        {editing && isEditMode ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onPointerDown={e => e.stopPropagation()}
            className="w-full h-full resize-none bg-transparent text-sm text-[#7a6a00] leading-relaxed font-[cursive] italic outline-none"
          />
        ) : (
          <div
            className={`h-full ${isEditMode ? 'cursor-text' : 'cursor-default'}`}
            onClick={isEditMode ? startEdit : undefined}
          >
            {data.lines.map((line, i) => (
              <p
                key={i}
                className={`text-sm text-[#7a6a00] leading-relaxed font-[cursive] italic${i > 0 ? ' mt-3' : ''}`}
              >
                {line || ' '}
              </p>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
