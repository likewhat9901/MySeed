'use client'

import { useState, useEffect, useRef } from 'react'
import type { LedgerSummary } from '@/features/ledger/api'
import { SheetIcon, DotsIcon } from './icons'

// ─── LedgerRow ────────────────────────────────────────────────────────────────
// 개별 가계부 항목.
// hover 시 ··· 버튼 표시 → 클릭 시 이름 변경 / 삭제 드롭다운.
// 이름 변경 선택 시 인라인 input으로 전환.

interface LedgerRowProps {
  ledger: LedgerSummary
  isActive: boolean
  onClick: () => void
  onRename: (name: string) => void
  onDelete: () => void
}

export default function LedgerRow({ ledger, isActive, onClick, onRename, onDelete }: LedgerRowProps) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(ledger.led_name)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // 이름 변경 모드 진입 시 input에 포커스 + 전체 선택
  useEffect(() => {
    if (renaming) {
      setRenameValue(ledger.led_name)
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [renaming, ledger.led_name])

  function confirmRename() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== ledger.led_name) onRename(trimmed)
    setRenaming(false)
  }

  // 이름 변경 모드
  if (renaming) {
    return (
      <div className="px-1.5 py-0.5">
        <input
          ref={inputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); confirmRename() }
            if (e.key === 'Escape') setRenaming(false)
          }}
          onBlur={confirmRename}
          className="w-full text-sm px-2 py-1 border border-green-400 rounded-md outline-none bg-white"
        />
      </div>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="button"
        onClick={onClick}
        className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
          isActive ? 'bg-green-50 text-brand-dark font-medium' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <SheetIcon isActive={isActive} />
        <span className="truncate flex-1">{ledger.led_name}</span>
        {(hovered || menuOpen) && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200"
          >
            <DotsIcon />
          </span>
        )}
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-1 top-full mt-0.5 z-50 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-32"
        >
          <button
            onClick={() => { setMenuOpen(false); setRenaming(true) }}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            이름 변경
          </button>
          <button
            onClick={() => { setMenuOpen(false); onDelete() }}
            className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  )
}
