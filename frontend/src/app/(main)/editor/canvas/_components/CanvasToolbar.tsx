// Canvas 페이지 전용 상단 툴바 — 장부 이름 표시 및 저장/다른 이름으로 저장 버튼
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Save, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/messages/editorMessages'
import { useEditorContext } from '../../_context/EditorContext'

export default function CanvasToolbar() {
  const { ledgerName, saveCanvas, saveAsNewLedger, saveStatus, isDirty } = useEditorContext()
  const { locale } = useLocale()
  const t = editorMessages[locale]
  const router = useRouter()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaveAs, setIsSaveAs] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const saveAsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSaving = saveStatus === 'saving'
  const isSaved  = saveStatus === 'saved'
  const isProcessing = isSaving || isSaveAs

  // 드롭다운 / 팝오버 외부 클릭 시 닫기
  useEffect(() => {
    if (!dropdownOpen && !saveAsOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (saveAsRef.current && !saveAsRef.current.contains(e.target as Node)) {
        setSaveAsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen, saveAsOpen])

  // 팝오버 열릴 때 포커스 + 현재 장부 이름 채우기
  useEffect(() => {
    if (saveAsOpen) {
      setNewName(ledgerName ?? '')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [saveAsOpen, ledgerName])

  const handleSaveAsClick = useCallback(() => {
    setDropdownOpen(false)
    setSaveAsOpen(true)
  }, [])

  const handleSaveAsConfirm = useCallback(async () => {
    const trimmed = newName.trim()
    if (!trimmed) return

    setIsSaveAs(true)
    setSaveAsOpen(false)

    try {
      const newLedId = await saveAsNewLedger(trimmed)
      if (newLedId) router.push(`/editor/canvas?led=${newLedId}`)
    } finally {
      setIsSaveAs(false)
    }
  }, [newName, saveAsNewLedger, router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveAsConfirm()
    if (e.key === 'Escape') setSaveAsOpen(false)
  }, [handleSaveAsConfirm])

  // 컨테이너: border + 배경색 통합 (버튼 개별 border 없음)
  const wrapColor = isProcessing
    ? 'border-gray-200 opacity-60'
    : isSaved
    ? 'border-brand-dark/30'
    : isDirty
    ? 'border-brand'
    : 'border-gray-200'

  const btnColor = isProcessing
    ? 'bg-gray-100 text-gray-400'
    : isSaved
    ? 'bg-brand-dark/10 text-brand-dark'
    : isDirty
    ? 'bg-brand text-white hover:bg-brand-dark'
    : 'bg-white text-gray-400 hover:bg-gray-50'

  const chevronColor = isProcessing
    ? 'bg-gray-100 text-gray-400 border-gray-200'
    : isSaved
    ? 'bg-brand-dark/10 text-brand-dark hover:bg-brand-dark/20 border-brand-dark/20'
    : isDirty
    ? 'bg-brand text-white hover:bg-brand-dark border-brand-light'
    : 'bg-white text-gray-300 hover:bg-gray-50 border-gray-200'

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
      {/* 장부 이름 */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-400">📒</span>
        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
          {ledgerName ?? '…'}
        </span>
        {isDirty && !isProcessing && (
          <span className="text-[10px] text-orange-400 font-semibold shrink-0">
            {t.importTemplateModified}
          </span>
        )}
      </div>

      {/* 저장 스플릿 버튼 */}
      <div ref={dropdownRef} className="relative flex items-center ml-4 shrink-0">
        <div className={`flex items-stretch h-7 rounded-lg overflow-hidden border ${wrapColor}`}>
          <button
            onClick={saveCanvas}
            disabled={isProcessing || (!isDirty && !isSaved)}
            title="저장 (Ctrl+S)"
            className={`flex items-center gap-1.5 text-xs px-3 font-medium transition-all disabled:cursor-not-allowed ${btnColor}`}
          >
            <Save size={12} />
            {isSaveAs ? t.saving : isSaving ? t.saving : isSaved ? t.saved : t.saveDraft}
          </button>

          <button
            onClick={() => setDropdownOpen(v => !v)}
            disabled={isProcessing}
            className={`flex items-center justify-center px-1.5 border-l font-medium transition-all disabled:cursor-not-allowed ${chevronColor}`}
          >
            <ChevronDown size={11} />
          </button>
        </div>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-md z-50 py-1">
            <button
              onClick={handleSaveAsClick}
              className="w-full text-left text-xs px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Save size={11} className="text-gray-400" />
              {t.importSaveAs}
            </button>
          </div>
        )}

        {/* 다른 이름으로 저장 팝오버 */}
        {saveAsOpen && (
          <div
            ref={saveAsRef}
            className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 flex flex-col gap-3"
          >
            <p className="text-xs font-semibold text-gray-600">{t.importSaveAs}</p>
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.importTemplateName}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSaveAsOpen(false)}
                className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {t.closeBtn}
              </button>
              <button
                onClick={handleSaveAsConfirm}
                disabled={!newName.trim()}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t.importSave}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
