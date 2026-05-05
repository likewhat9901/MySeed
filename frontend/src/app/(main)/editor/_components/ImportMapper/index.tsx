'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Link2, Trash2, Save, ChevronDown, Upload, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'
import { useEditorContext } from '../../_context/EditorContext'
import { useAuth } from '@/features/auth/AuthContext'
import CanvasPreview from './CanvasPreview'
import ExcelGrid from './ExcelGrid'
import {
  uploadExcelFile,
  getImportMappings,
  saveImportMapping,
  deleteImportMapping,
  type MappingEntry,
  type ImportMapping,
} from '@/features/import/api'
import { WIDGET_LABELS } from '@/constants'

interface Props {
  onClose: () => void
}

export default function ImportMapper({ onClose }: Props) {
  const { widgets, updateWidgetData } = useEditorContext()
  const { user } = useAuth()

  // ── 파일 상태 ────────────────────────────────────────────────────────────────
  const [workbook,    setWorkbook]    = useState<WorkBook | null>(null)
  const [fileName,    setFileName]    = useState<string>('')
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [uploading,   setUploading]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 매핑 상태 ────────────────────────────────────────────────────────────────
  const [mappings,       setMappings]       = useState<MappingEntry[]>([])
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null)
  const [selectedAddr,   setSelectedAddr]   = useState<string | null>(null)

  // ── 템플릿 상태 ──────────────────────────────────────────────────────────────
  const [presets,        setPresets]        = useState<ImportMapping[]>([])
  const [activePreset,   setActivePreset]   = useState<ImportMapping | null>(null)  // 현재 로드된 템플릿
  const [isDirty,        setIsDirty]        = useState(false)                        // 템플릿 대비 변경 여부
  const [showPresets,    setShowPresets]    = useState(false)
  const [newPresetName,  setNewPresetName]  = useState('')
  const [showNameInput,  setShowNameInput]  = useState(false)   // 새 템플릿 이름 입력 모드
  const [savingPreset,   setSavingPreset]   = useState(false)
  const [savedFeedback,  setSavedFeedback]  = useState(false)
  const [duplicateName,  setDuplicateName]  = useState(false)
  const [closing,        setClosing]        = useState(false)

  useEffect(() => {
    if (!user?.id) return
    getImportMappings(user.id).then(setPresets)
  }, [user?.id])

  // ── 파일 업로드 ──────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setUploading(true)
    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    setWorkbook(wb)
    setFileName(file.name)
    setActiveSheet(wb.SheetNames[0] ?? '')
    setUploading(false)
    if (user?.id) uploadExcelFile(user.id, file)
  }, [user?.id])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // ── 매핑 연결 ────────────────────────────────────────────────────────────────
  function connectMapping() {
    if (!selectedWidget || !selectedAddr || !activeSheet) return
    const widget = widgets.find(w => w.id === selectedWidget)
    if (!widget) return

    const entry: MappingEntry = {
      widget_id:   selectedWidget,
      widget_type: widget.type,
      sheet:       activeSheet,
      address:     selectedAddr,
    }
    setMappings(prev => {
      const next = [...prev.filter(m => m.widget_id !== selectedWidget), entry]
      setIsDirty(true)
      return next
    })
    applyMapping(entry)
    setSelectedWidget(null)
    setSelectedAddr(null)
  }

  function applyMapping(entry: MappingEntry) {
    if (!workbook) return
    const sheet = workbook.Sheets[entry.sheet]
    if (!sheet) return
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
    const widget = widgets.find(w => w.id === entry.widget_id)
    if (!widget) return
    const parsed = parseAddressToValues(data, entry.address)
    if (!parsed) return

    const binding = widget.data_binding
    let next = binding ? { ...binding } : {}
    if (widget.type === 'savings-goal') {
      const raw = parsed.values[0]
      const val = raw != null ? Number(raw) : NaN
      if (!isNaN(val)) next = { ...next, current: val }
    } else if (widget.type === 'table') {
      next = { ...next, rows: parsed.values.map(v => [String(v ?? '')]) }
    } else if (widget.type === 'check-list') {
      next = { ...next, items: parsed.values.map(v => ({ text: String(v ?? ''), checked: false })) }
    } else if (widget.type === 'quote') {
      next = { ...next, text: String(parsed.values[0] ?? '') }
    } else if (widget.type === 'post-it') {
      next = { ...next, lines: parsed.values.map(v => String(v ?? '')) }
    }
    updateWidgetData(entry.widget_id, next as typeof binding)
  }

  function removeMapping(widgetId: string) {
    setMappings(prev => prev.filter(m => m.widget_id !== widgetId))
    setIsDirty(true)
  }

  // ── 템플릿 로드 ──────────────────────────────────────────────────────────────
  function handleLoadPreset(preset: ImportMapping) {
    setMappings(preset.mappings)
    setActivePreset(preset)
    setIsDirty(false)
    setShowNameInput(false)
    setNewPresetName('')
    if (workbook) preset.mappings.forEach(applyMapping)
    setShowPresets(false)
  }

  // ── 현재 템플릿 덮어쓰기 저장 ────────────────────────────────────────────────
  async function handleUpdatePreset() {
    if (!user?.id || !activePreset || mappings.length === 0) return
    setSavingPreset(true)
    await saveImportMapping(user.id, activePreset.map_id, activePreset.map_name, mappings)
    const updated = { ...activePreset, mappings }
    setActivePreset(updated)
    setPresets(prev => prev.map(p => p.map_id === updated.map_id ? updated : p))
    setIsDirty(false)
    setSavingPreset(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  // ── 새 템플릿으로 저장 ────────────────────────────────────────────────────────
  async function handleSaveNewPreset() {
    if (!user?.id || !newPresetName.trim() || mappings.length === 0) return
    const trimmed = newPresetName.trim()
    if (presets.some(p => p.map_name === trimmed)) {
      setDuplicateName(true)
      setTimeout(() => setDuplicateName(false), 2000)
      return
    }
    setSavingPreset(true)
    const mapId = crypto.randomUUID()
    await saveImportMapping(user.id, mapId, trimmed, mappings)
    const fresh = await getImportMappings(user.id)
    setPresets(fresh)
    const created = fresh.find(p => p.map_id === mapId) ?? { map_id: mapId, map_name: trimmed, mappings, regist_dt: new Date().toISOString() }
    setActivePreset(created)
    setIsDirty(false)
    setNewPresetName('')
    setShowNameInput(false)
    setSavingPreset(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  async function handleDeletePreset(mapId: string) {
    await deleteImportMapping(mapId)
    setPresets(prev => prev.filter(p => p.map_id !== mapId))
    if (activePreset?.map_id === mapId) {
      setActivePreset(null)
      setIsDirty(false)
    }
  }

  const canConnect = !!selectedWidget && !!selectedAddr

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" onDrop={onDrop} onDragOver={e => e.preventDefault()}>

      {/* 상단 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-800">Import Data</h2>

          {/* 현재 활성 템플릿 표시 */}
          {activePreset ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                {activePreset.map_name}
              </span>
              {isDirty && (
                <span className="text-[10px] text-orange-500 font-medium">수정됨</span>
              )}
            </div>
          ) : (
            mappings.length > 0 && (
              <span className="text-[10px] text-gray-400">미저장 템플릿</span>
            )
          )}

          {fileName && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{fileName}</span>
          )}
          {workbook && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              파일 교체
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
        </div>

        <div className="flex items-center gap-2">
          {/* 템플릿 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(v => !v)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              템플릿
              <ChevronDown size={12} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {presets.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">저장된 템플릿 없음</p>
                ) : presets.map(p => (
                  <div
                    key={p.map_id}
                    className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0 ${
                      activePreset?.map_id === p.map_id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button className="flex-1 text-left" onClick={() => handleLoadPreset(p)}>
                      <span className={`text-xs font-medium ${activePreset?.map_id === p.map_id ? 'text-blue-600' : 'text-gray-700'}`}>
                        {p.map_name}
                      </span>
                      <span className="text-gray-400 font-normal text-xs ml-1.5">({p.mappings.length}개)</span>
                    </button>
                    {activePreset?.map_id === p.map_id && (
                      <span className="text-[10px] text-blue-400 shrink-0">사용 중</span>
                    )}
                    <button onClick={() => handleDeletePreset(p.map_id)} className="text-gray-300 hover:text-red-400 shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 본문: 좌우 분할 */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-gray-200 overflow-hidden flex flex-col">
          <CanvasPreview
            widgets={widgets}
            selectedId={selectedWidget}
            mappings={mappings}
            onSelect={id => setSelectedWidget(prev => prev === id ? null : id)}
          />
        </div>

        <div className="w-1/2 overflow-hidden flex flex-col">
          {!workbook ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer select-none"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Upload size={32} className={`text-gray-400 ${uploading ? 'animate-bounce' : ''}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  {uploading ? '파일 읽는 중...' : '엑셀 파일을 올려주세요'}
                </p>
                <p className="text-xs text-gray-400 mt-1">.xlsx · .xls · 드래그하거나 클릭</p>
              </div>
            </div>
          ) : (
            <ExcelGrid
              workbook={workbook}
              selectedSheet={activeSheet}
              selectedAddr={selectedAddr}
              onSheetChange={setActiveSheet}
              onAddrSelect={addr => setSelectedAddr(addr || null)}
            />
          )}
        </div>
      </div>

      {/* 하단 바 */}
      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-200 shrink-0 bg-gray-50/60">

        {/* 선택 상태 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SelectionChip label="위젯" value={selectedWidget ? widgets.find(w => w.id === selectedWidget)?.type ?? null : null} />
          <span className="text-gray-300 text-sm">→</span>
          <SelectionChip label="범위" value={selectedAddr} mono />
        </div>

        {/* 연결 버튼 */}
        <button
          onClick={connectMapping}
          disabled={!canConnect}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            canConnect
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          <Link2 size={15} />
          연결
        </button>

        {/* 연결된 매핑 칩 */}
        {mappings.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {mappings.map(m => {
              const widgetLabel = WIDGET_LABELS[m.widget_type] ?? m.widget_type
              return (
                <span key={m.widget_id} className="flex items-center gap-1 text-[11px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                  <span className="font-medium truncate max-w-[80px]" title={widgetLabel}>{widgetLabel}</span>
                  <span className="text-green-400">→</span>
                  <span className="font-mono">{m.address}</span>
                  <button onClick={() => removeMapping(m.widget_id)} className="text-green-400 hover:text-red-400 leading-none ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* 템플릿 저장 영역 */}
        {mappings.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 케이스 1: 활성 템플릿 있고 수정됨 → 덮어쓰기 버튼 */}
            {activePreset && isDirty && !showNameInput && (
              <>
                <button
                  onClick={handleUpdatePreset}
                  disabled={savingPreset}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all disabled:opacity-40 ${
                    savedFeedback
                      ? 'bg-blue-50 border-blue-300 text-blue-600'
                      : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Save size={12} />
                  {savedFeedback ? '저장됨 ✓' : savingPreset ? '저장 중...' : `"${activePreset.map_name}" 저장`}
                </button>
                <button
                  onClick={() => setShowNameInput(true)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                  title="새 템플릿으로 저장"
                >
                  <Plus size={12} />
                  새로 저장
                </button>
              </>
            )}

            {/* 케이스 2: 활성 템플릿 있고 수정 안 됨 → 저장됨 상태 표시 */}
            {activePreset && !isDirty && !showNameInput && (
              <span className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                savedFeedback
                  ? 'bg-green-50 border-green-300 text-green-600'
                  : 'border-gray-100 text-gray-300'
              }`}>
                {savedFeedback ? '저장됨 ✓' : '변경 없음'}
              </span>
            )}

            {/* 케이스 3: 활성 템플릿 없음 → 새 이름으로 저장 버튼 */}
            {!activePreset && !showNameInput && (
              <button
                onClick={() => setShowNameInput(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
              >
                <Save size={12} />
                템플릿으로 저장
              </button>
            )}

            {/* 이름 입력 폼 */}
            {showNameInput && (
              <div className="flex items-center gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <input
                    autoFocus
                    className={`text-xs border rounded-lg px-3 py-1.5 outline-none w-36 bg-white transition-colors ${
                      duplicateName ? 'border-red-400' : 'border-gray-200 focus:border-blue-400'
                    }`}
                    placeholder="템플릿 이름"
                    value={newPresetName}
                    onChange={e => { setNewPresetName(e.target.value); setDuplicateName(false) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveNewPreset()
                      if (e.key === 'Escape') { setShowNameInput(false); setNewPresetName('') }
                    }}
                  />
                  {duplicateName && (
                    <span className="text-[10px] text-red-500 px-1">이미 있는 이름이에요</span>
                  )}
                </div>
                <button
                  onClick={handleSaveNewPreset}
                  disabled={savingPreset || !newPresetName.trim()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-400 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={12} />
                  {savingPreset ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => { setShowNameInput(false); setNewPresetName('') }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => { setClosing(true); setTimeout(onClose, 150) }}
          className={`text-xs px-4 py-2 rounded-lg font-medium shrink-0 transition-all ${
            closing ? 'bg-gray-400 text-white scale-95' : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          {closing ? '닫는 중...' : '완료'}
        </button>
      </div>
    </div>
  )
}

// ─── 선택 상태 칩 ─────────────────────────────────────────────────────────────

function SelectionChip({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs min-w-0">
      <span className="text-gray-400 shrink-0">{label}:</span>
      {value ? (
        <span className={`text-gray-700 font-medium truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
      ) : (
        <span className="text-gray-300">선택 전</span>
      )}
    </div>
  )
}

// ─── 엑셀 주소 → 값 파싱 ────────────────────────────────────────────────────

function parseAddressToValues(
  data: (string | number | null)[][],
  address: string,
): { values: (string | number | null)[] } | null {
  const single = address.match(/^([A-Z]+)(\d+)$/)
  if (single) {
    const col = single[1].split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
    const row = parseInt(single[2]) - 1
    return { values: [data[row]?.[col] ?? null] }
  }
  const range = address.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
  if (range) {
    const c0 = range[1].split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
    const r0 = parseInt(range[2]) - 1
    const c1 = range[3].split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
    const r1 = parseInt(range[4]) - 1
    const values: (string | number | null)[] = []
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        values.push(data[r]?.[c] ?? null)
    return { values }
  }
  return null
}
