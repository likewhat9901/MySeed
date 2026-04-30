'use client'

import { useRef } from 'react'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import type { QuoteBinding } from '@/features/editor/types'

// ─── Inspirational Quote Widget ───────────────────────────────────────────────
// 명언 + 출처. 클릭하면 인라인 편집, blur 시 저장.

const DEFAULT: QuoteBinding = {
  text: '"A penny saved is a penny earned."',
  author: 'BENJAMIN FRANKLIN',
}

export default function QuoteWidget({ binding, onBindingChange, onBeforeChange }: WidgetComponentProps) {
  const data = (binding as QuoteBinding | null) ?? DEFAULT

  const textRef = useRef<HTMLParagraphElement>(null)
  const authorRef = useRef<HTMLParagraphElement>(null)

  function handleBlur(field: 'text' | 'author', el: HTMLElement) {
    onBindingChange({ ...data, [field]: el.innerText.trim() || data[field] })
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-5 border-2 border-brand rounded-[inherit]">
      {/* 따옴표 장식 */}
      <div className="flex w-full justify-between mb-2 text-gray-300 text-2xl font-serif leading-none select-none">
        <span>❝</span>
        <span>❞</span>
      </div>

      {/* 명언 본문 — contentEditable */}
      <p
        ref={textRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={onBeforeChange}
        onBlur={() => textRef.current && handleBlur('text', textRef.current)}
        onPointerDown={e => e.stopPropagation()}
        className="text-sm font-semibold text-gray-900 text-center leading-snug outline-none cursor-text focus:bg-gray-50 rounded px-1 w-full"
      >
        {data.text}
      </p>

      {/* 출처 — contentEditable */}
      <p
        ref={authorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={onBeforeChange}
        onBlur={() => authorRef.current && handleBlur('author', authorRef.current)}
        onPointerDown={e => e.stopPropagation()}
        className="mt-3 text-[10px] font-bold text-brand tracking-widest uppercase outline-none cursor-text focus:bg-gray-50 rounded px-1 w-full text-center"
      >
        {data.author}
      </p>
    </div>
  )
}
