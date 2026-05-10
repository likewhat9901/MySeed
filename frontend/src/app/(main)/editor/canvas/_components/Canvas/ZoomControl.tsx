'use client'

import { useState, useRef } from 'react'
import { ZoomOutIcon, ZoomInIcon } from './icons'

// ─── ZoomControl ──────────────────────────────────────────────────────────────
// 우상단 오버레이. % 버튼 클릭 시 직접 입력 가능 (10~300% 범위 클램프).

interface ZoomControlProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomTo: (scale: number) => void
}

export default function ZoomControl({ scale, onZoomIn, onZoomOut, onZoomTo }: ZoomControlProps) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setInputVal(String(Math.round(scale * 100)))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = () => {
    const parsed = parseInt(inputVal, 10)
    if (!isNaN(parsed)) {
      const clamped = Math.min(300, Math.max(10, parsed))
      onZoomTo(clamped / 100)
    }
    setEditing(false)
  }

  return (
    <div className="absolute top-3 right-3 z-10 flex items-center bg-white rounded-lg shadow-sm border border-gray-200 pointer-events-auto">
      <button
        title="축소"
        onClick={onZoomOut}
        className="w-8 h-8 flex items-center justify-center rounded-l-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      >
        <ZoomOutIcon />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={10}
          max={300}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-14 text-xs font-medium text-gray-700 text-center border-x border-gray-200 py-1.5 outline-none bg-gray-50"
          style={{ MozAppearance: 'textfield' }}
        />
      ) : (
        <button
          title="클릭하여 배율 입력"
          onClick={startEdit}
          className="w-14 text-xs font-medium text-gray-700 text-center border-x border-gray-200 py-1.5 hover:bg-gray-50 transition-colors"
        >
          {Math.round(scale * 100)}%
        </button>
      )}

      <button
        title="확대"
        onClick={onZoomIn}
        className="w-8 h-8 flex items-center justify-center rounded-r-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      >
        <ZoomInIcon />
      </button>
    </div>
  )
}
