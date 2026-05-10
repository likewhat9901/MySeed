// Import 페이지 전용 상단 툴바 — 템플릿 선택 및 저장 버튼
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { ChevronDown, Save, Trash2, Sparkles } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/editorMessages'
import type { ImportMapping, MappingEntry } from '@/features/import/api'

interface ImportToolbarProps {
  presets:       ImportMapping[]
  activePreset:  ImportMapping | null
  isDirty:       boolean
  savingPreset:  boolean
  savedFeedback: boolean
  showPresets:   boolean
  mappings:      MappingEntry[]
  onTogglePresets:  () => void
  onLoadPreset:     (p: ImportMapping) => void
  onDeletePreset:   (mapId: string) => void
  onSave:           () => void
  onSaveNew:        (name: string) => Promise<boolean>  // true = 성공, false = 중복
  onOverwrite:      (preset: ImportMapping) => void
  onAutoMap:        () => void
  autoMapping:      boolean
  hasExcel:         boolean
}

export default function ImportToolbar({
  presets, activePreset, isDirty, savingPreset, savedFeedback,
  showPresets, mappings, hasExcel, autoMapping,
  onTogglePresets, onLoadPreset, onDeletePreset, onSave, onSaveNew, onOverwrite, onAutoMap,
}: ImportToolbarProps) {
  const { locale } = useLocale()
  const t = editorMessages[locale]

  const saveDropdownRef = useRef<HTMLDivElement>(null)
  const saveAsRef       = useRef<HTMLDivElement>(null)
  const nameInputRef    = useRef<HTMLInputElement>(null)

  const [saveDropdownOpen,   setSaveDropdownOpen]   = useState(false)
  const [saveAsOpen,         setSaveAsOpen]         = useState(false)
  const [overwriteOpen,      setOverwriteOpen]      = useState(false)
  const [overwriteTarget,    setOverwriteTarget]    = useState<ImportMapping | null>(null)
  const [newName,            setNewName]            = useState('')
  const [duplicateName,      setDuplicateName]      = useState(false)

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!saveDropdownOpen && !saveAsOpen) return
    function handleClick(e: MouseEvent) {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) {
        setSaveDropdownOpen(false)
        setOverwriteOpen(false)
      }
      if (saveAsRef.current && !saveAsRef.current.contains(e.target as Node))
        setSaveAsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [saveDropdownOpen, saveAsOpen])

  // 팝오버 열릴 때 포커스
  useEffect(() => {
    if (saveAsOpen) {
      setNewName('')
      setDuplicateName(false)
      setTimeout(() => nameInputRef.current?.focus(), 0)
    }
  }, [saveAsOpen])

  const handleSaveClick = useCallback(() => {
    if (!activePreset) {
      setSaveDropdownOpen(false)
      setSaveAsOpen(true)
    } else {
      onSave()
    }
  }, [activePreset, onSave])

  const handleSaveAsClick = useCallback(() => {
    setSaveDropdownOpen(false)
    setSaveAsOpen(true)
  }, [])

  const handleSaveAsConfirm = useCallback(async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const ok = await onSaveNew(trimmed)
    if (!ok) {
      setDuplicateName(true)
      setTimeout(() => setDuplicateName(false), 2000)
    } else {
      setSaveAsOpen(false)
    }
  }, [newName, onSaveNew])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveAsConfirm()
    if (e.key === 'Escape') setSaveAsOpen(false)
  }, [handleSaveAsConfirm])

  const canSave      = mappings.length > 0
  const isProcessing = savingPreset

  const wrapColor = isProcessing
    ? 'border-gray-200 opacity-60'
    : savedFeedback
    ? 'border-brand-dark/30'
    : isDirty
    ? 'border-brand'
    : 'border-gray-200'

  const btnColor = isProcessing
    ? 'bg-gray-100 text-gray-400'
    : savedFeedback
    ? 'bg-brand-dark/10 text-brand-dark'
    : isDirty
    ? 'bg-brand text-white hover:bg-brand-dark'
    : 'bg-white text-gray-400 hover:bg-gray-50'

  const chevronColor = isProcessing
    ? 'bg-gray-100 text-gray-400 border-gray-200'
    : savedFeedback
    ? 'bg-brand-dark/10 text-brand-dark hover:bg-brand-dark/20 border-brand-dark/20'
    : isDirty
    ? 'bg-brand text-white hover:bg-brand-dark border-brand-light'
    : 'bg-white text-gray-300 hover:bg-gray-50 border-gray-200'

  const mainBtnLabel = savingPreset ? t.importSaving : savedFeedback ? t.importSaved : t.importSave

  return (
    <>
    <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shrink-0">

      {/* 템플릿 드롭다운 */}
      <div className="relative">
        <button
          onClick={onTogglePresets}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            activePreset
              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="text-gray-400">📋</span>
          <span className="font-medium max-w-[140px] truncate">
            {activePreset ? activePreset.map_name : t.importTemplateSelect}
          </span>
          {isDirty && activePreset && (
            <span className="text-orange-400 text-[10px] font-semibold">{t.importTemplateModified}</span>
          )}
          <ChevronDown size={11} className={`shrink-0 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
        </button>

        {showPresets && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {presets.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">{t.importNoTemplates}</p>
            ) : presets.map(p => (
              <div
                key={p.map_id}
                className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0 ${
                  activePreset?.map_id === p.map_id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <button className="flex-1 text-left" onClick={() => onLoadPreset(p)}>
                  <span className={`text-xs font-medium ${activePreset?.map_id === p.map_id ? 'text-blue-600' : 'text-gray-700'}`}>
                    {p.map_name}
                  </span>
                  <span className="text-gray-400 text-xs ml-1.5">({p.mappings.length}{t.importMappingCount})</span>
                </button>
                {activePreset?.map_id === p.map_id && (
                  <span className="text-[10px] text-blue-400 shrink-0">{t.importTemplateInUse}</span>
                )}
                <button onClick={() => onDeletePreset(p.map_id)} className="text-gray-300 hover:text-red-400 shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 저장 스플릿 버튼 — CanvasToolbar와 동일한 구조 */}
      <div ref={saveDropdownRef} className="relative flex items-center shrink-0">
        <div className={`flex items-stretch h-7 rounded-lg overflow-hidden border ${wrapColor}`}>
          <button
            onClick={handleSaveClick}
            disabled={isProcessing || !canSave}
            title={activePreset ? t.importSave : t.importSaveAs}
            className={`flex items-center gap-1.5 text-xs px-3 font-medium transition-all disabled:cursor-not-allowed ${btnColor}`}
          >
            <Save size={12} />
            {mainBtnLabel}
          </button>
          <button
            onClick={() => setSaveDropdownOpen(v => !v)}
            disabled={isProcessing || !canSave}
            className={`flex items-center justify-center px-1.5 border-l font-medium transition-all disabled:cursor-not-allowed ${chevronColor}`}
          >
            <ChevronDown size={11} />
          </button>
        </div>

        {saveDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-md z-50 py-1">
            <button
              onClick={handleSaveAsClick}
              className="w-full text-left text-xs px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Save size={11} className="text-gray-400" />
              {t.importSaveAs}
            </button>
            {presets.length > 0 && (
              <button
                onClick={() => setOverwriteOpen(v => !v)}
                className="w-full text-left text-xs px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <Save size={11} className="text-orange-400" />
                  {t.importOverwrite}
                </span>
                <ChevronDown size={11} className={`text-gray-400 transition-transform ${overwriteOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {overwriteOpen && (
              <div className="border-t border-gray-100 max-h-48 overflow-y-auto">
                {presets.map(p => (
                  <button
                    key={p.map_id}
                    onClick={() => {
                      setOverwriteTarget(p)
                      setSaveDropdownOpen(false)
                      setOverwriteOpen(false)
                    }}
                    className="w-full text-left text-xs px-4 py-2 text-gray-600 hover:bg-orange-50 hover:text-orange-700 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{p.map_name}</span>
                    <span className="text-gray-300 shrink-0">({p.mappings.length}{t.importMappingCount})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 다른 이름으로 저장 팝오버 — CanvasToolbar와 동일한 구조 */}
        {saveAsOpen && (
          <div
            ref={saveAsRef}
            className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 flex flex-col gap-3"
          >
            <p className="text-xs font-semibold text-gray-600">{t.importSaveAs}</p>
            <div className="flex flex-col gap-1">
              <input
                ref={nameInputRef}
                value={newName}
                onChange={e => { setNewName(e.target.value); setDuplicateName(false) }}
                onKeyDown={handleKeyDown}
                placeholder={t.importTemplateName}
                className={`text-xs border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-brand transition-colors ${
                  duplicateName ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {duplicateName && (
                <span className="text-[10px] text-red-500 px-1">{t.importDuplicateName}</span>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSaveAsOpen(false)}
                className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {t.closeBtn}
              </button>
              <button
                onClick={handleSaveAsConfirm}
                disabled={!newName.trim() || savingPreset}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t.importSave}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI 자동 매핑 버튼 */}
      <button
        onClick={onAutoMap}
        disabled={!hasExcel || autoMapping}
        className={`flex items-center gap-1.5 text-xs px-3 h-7 rounded-lg border font-medium transition-all disabled:cursor-not-allowed ${
          autoMapping
            ? 'border-indigo-200 bg-indigo-50 text-indigo-400 opacity-70'
            : hasExcel
            ? 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            : 'border-gray-200 bg-white text-gray-300'
        }`}
      >
        <Sparkles size={12} className={autoMapping ? 'animate-pulse' : ''} />
        {autoMapping ? t.importAutoMapping : t.importAutoMap}
      </button>

    </div>

    {/* 덮어쓰기 확인 모달 */}
    {overwriteTarget && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={() => setOverwriteTarget(null)} />
        <div className="relative bg-white rounded-2xl shadow-xl w-80 p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-gray-800">{t.importOverwriteConfirmTitle}</p>
            <p className="text-xs text-gray-500">
              {t.importOverwriteConfirmDesc.replace('{name}', overwriteTarget.map_name)}
            </p>
          </div>
          <p className="text-[11px] text-orange-500 bg-orange-50 rounded-lg px-3 py-2">
            {t.importOverwriteWarning}
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setOverwriteTarget(null)}
              className="text-xs px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {t.closeBtn}
            </button>
            <button
              onClick={() => {
                onOverwrite(overwriteTarget)
                setOverwriteTarget(null)
              }}
              className="text-xs px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              {t.importOverwriteConfirm}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
