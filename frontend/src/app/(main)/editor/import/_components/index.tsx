'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { X, Link2, Upload } from 'lucide-react'
import { getMappingColor } from './mappingColors'
import * as XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'
import { useEditorContext } from '../../_context/EditorContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/editorMessages'
import CanvasPreview from './CanvasPreview'
import ExcelGrid from './ExcelGrid'
import ImportToolbar from './ImportToolbar'
import {
  uploadExcelFile,
  getImportMappings,
  saveImportMapping,
  deleteImportMapping,
  type MappingEntry,
  type ImportMapping,
} from '@/features/import/api'

export default function ImportMapper() {
  const { widgets, updateWidgetData, canvasId } = useEditorContext()
  const { user } = useAuth()
  const { locale } = useLocale()
  const t = editorMessages[locale]

  // ── 파일 상태 ────────────────────────────────────────────────────────────────
  const [workbook,    setWorkbook]    = useState<WorkBook | null>(null)
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [uploading,   setUploading]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 매핑 상태 ────────────────────────────────────────────────────────────────
  const [mappings,       setMappings]       = useState<MappingEntry[]>([])
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null)
  const [selectedAddr,   setSelectedAddr]   = useState<string | null>(null)

  // ── 템플릿 상태 ──────────────────────────────────────────────────────────────
  const [presets,       setPresets]       = useState<ImportMapping[]>([])
  const [activePreset,  setActivePreset]  = useState<ImportMapping | null>(null)
  const [isDirty,       setIsDirty]       = useState(false)
  const [showPresets,   setShowPresets]   = useState(false)
  const [savingPreset,  setSavingPreset]  = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    getImportMappings(user.id).then(setPresets)
  }, [user?.id])

  // 장부 전환 시 매핑 상태 리셋
  const isFirstCanvasLoad = useRef(true)
  useEffect(() => {
    if (isFirstCanvasLoad.current) { isFirstCanvasLoad.current = false; return }
    setMappings([])
    setSelectedWidget(null)
    setSelectedAddr(null)
    setActivePreset(null)
    setIsDirty(false)
  }, [canvasId])

  // ── 파일 업로드 ──────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setUploading(true)
    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    setWorkbook(wb)
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
    if (widget.type === 'table') {
      const dataRows = parsed.rows.map(row => row.map(v => String(v ?? '')))
      const colCount = dataRows[0]?.length ?? 1
      const existingCols: string[] = (binding as { columns?: string[] })?.columns ?? []
      const columns =
        existingCols.length === colCount
          ? existingCols
          : Array.from({ length: colCount }, (_, i) => existingCols[i] ?? `열${i + 1}`)
      next = { ...next, columns, rows: dataRows }
    } else if (widget.type === 'post-it') {
      next = { ...next, lines: parsed.rows.flat().map(v => String(v ?? '')) }
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
    if (workbook) preset.mappings.forEach(applyMapping)
    setShowPresets(false)
  }

  // ── 특정 템플릿에 덮어쓰기 저장 ─────────────────────────────────────────────
  async function handleOverwritePreset(target: ImportMapping) {
    if (!user?.id || mappings.length === 0) return
    setSavingPreset(true)
    await saveImportMapping(user.id, target.map_id, target.map_name, mappings)
    const updated = { ...target, mappings }
    setActivePreset(updated)
    setPresets(prev => prev.map(p => p.map_id === updated.map_id ? updated : p))
    setIsDirty(false)
    setSavingPreset(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
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

  // ── 새 템플릿으로 저장 — true: 성공, false: 중복 ─────────────────────────────
  async function handleSaveNewPreset(name: string): Promise<boolean> {
    if (!user?.id || mappings.length === 0) return false
    if (presets.some(p => p.map_name === name)) return false
    setSavingPreset(true)
    const mapId = crypto.randomUUID()
    await saveImportMapping(user.id, mapId, name, mappings)
    const fresh = await getImportMappings(user.id)
    setPresets(fresh)
    const created = fresh.find(p => p.map_id === mapId) ?? { map_id: mapId, map_name: name, mappings, regist_dt: new Date().toISOString() }
    setActivePreset(created)
    setIsDirty(false)
    setSavingPreset(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
    return true
  }

  async function handleDeletePreset(mapId: string) {
    await deleteImportMapping(mapId)
    setPresets(prev => prev.filter(p => p.map_id !== mapId))
    if (activePreset?.map_id === mapId) {
      setActivePreset(null)
      setIsDirty(false)
    }
  }

  // 같은 타입 위젯이 여러 개일 때 구분용 번호 — y → x 순 정렬 후 타입별 카운팅
  const widgetNumberMap = useMemo(() => {
    const sorted = [...widgets].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
    const counter: Record<string, number> = {}
    const map: Record<string, number | null> = {}
    const typeCount: Record<string, number> = {}
    sorted.forEach(w => { typeCount[w.type] = (typeCount[w.type] ?? 0) + 1 })
    sorted.forEach(w => {
      if (typeCount[w.type] > 1) {
        counter[w.type] = (counter[w.type] ?? 0) + 1
        map[w.id] = counter[w.type]
      } else {
        map[w.id] = null
      }
    })
    return map
  }, [widgets])

  const canConnect = !!selectedWidget && !!selectedAddr

  return (
    <div className="flex flex-col h-full bg-white" onDrop={onDrop} onDragOver={e => e.preventDefault()}>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />

      {/* 상단 툴바 */}
      <ImportToolbar
        presets={presets}
        activePreset={activePreset}
        isDirty={isDirty}
        savingPreset={savingPreset}
        savedFeedback={savedFeedback}
        showPresets={showPresets}
        mappings={mappings}
        hasExcel={!!workbook}
        autoMapping={false}
        onTogglePresets={() => setShowPresets(v => !v)}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
        onSave={handleUpdatePreset}
        onSaveNew={handleSaveNewPreset}
        onOverwrite={handleOverwritePreset}
        onAutoMap={() => {/* TODO: AI 자동 매핑 API 연결 */}}
      />

      {/* 본문: 좌우 분할 */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-gray-200 overflow-hidden flex flex-col">
          <CanvasPreview
            widgets={widgets}
            selectedId={selectedWidget}
            mappings={mappings}
            widgetNumberMap={widgetNumberMap}
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
                  {uploading ? t.importUploading : t.importDropPrompt}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t.importDropHint}</p>
              </div>
            </div>
          ) : (
            <ExcelGrid
              workbook={workbook}
              selectedSheet={activeSheet}
              selectedAddr={selectedAddr}
              mappings={mappings}
              onSheetChange={setActiveSheet}
              onAddrSelect={addr => setSelectedAddr(addr || null)}
            />
          )}
        </div>
      </div>

      {/* 하단 바: 연결 작업 전용 */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-t border-gray-200 shrink-0 bg-gray-50/60">
        <div className="flex items-center gap-2 min-w-0">
          <SelectionChip label={t.importWidgetLabel} value={selectedWidget ? widgets.find(w => w.id === selectedWidget)?.type ?? null : null} placeholder={t.importNotSelected} />
          <span className="text-gray-300 text-sm">→</span>
          <SelectionChip label={t.importRangeLabel} value={selectedAddr} placeholder={t.importNotSelected} mono />
        </div>

        {mappings.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {mappings.map((m, idx) => {
              const widgetLabel  = getWidgetLabel(m.widget_type, t)
              const num          = widgetNumberMap[m.widget_id]
              const displayLabel = num !== null ? `${widgetLabel} #${num}` : widgetLabel
              const color        = getMappingColor(idx)
              return (
                <span
                  key={m.widget_id}
                  style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                  className="flex items-center gap-1 text-[11px] border rounded-full px-2 py-0.5"
                >
                  <span className="font-medium truncate max-w-[80px]" title={displayLabel}>{displayLabel}</span>
                  <span style={{ opacity: 0.5 }}>→</span>
                  <span className="font-mono">{m.address}</span>
                  <button
                    onClick={() => removeMapping(m.widget_id)}
                    style={{ color: color.text, opacity: 0.5 }}
                    className="hover:opacity-100 leading-none ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        <button
          onClick={connectMapping}
          disabled={!canConnect}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ml-auto ${
            canConnect
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          <Link2 size={14} />
          {t.importConnect}
        </button>
      </div>
    </div>
  )
}

// ─── 위젯 타입 → locale 레이블 ───────────────────────────────────────────────

const WIDGET_TYPE_LABEL_KEYS: Record<string, string> = {
  'savings-goal':     'labelSavingsGoal',
  'monthly-expenses': 'labelMonthlyExpenses',
  'post-it':          'labelPostIt',
  'quote':            'labelQuote',
  'flow-analysis':    'labelFlowAnalysis',
  'portfolio-health': 'labelPortfolioHealth',
  'table':            'labelTable',
  'list':             'labelList',
}

function getWidgetLabel(type: string, t: Record<string, string>): string {
  const key = WIDGET_TYPE_LABEL_KEYS[type]
  return key ? (t[key] ?? type) : type
}

// ─── 선택 상태 칩 ─────────────────────────────────────────────────────────────

function SelectionChip({ label, value, placeholder, mono }: { label: string; value: string | null; placeholder: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs min-w-0">
      <span className="text-gray-400 shrink-0">{label}:</span>
      {value ? (
        <span className={`text-gray-700 font-medium truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
      ) : (
        <span className="text-gray-300">{placeholder}</span>
      )}
    </div>
  )
}

// ─── 엑셀 주소 → 값 파싱 ────────────────────────────────────────────────────

function colIndex(colStr: string): number {
  return colStr.split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
}

function parseAddressToValues(
  data: (string | number | null)[][],
  address: string,
): { rows: (string | number | null)[][] } | null {
  const single = address.match(/^([A-Z]+)(\d+)$/)
  if (single) {
    const col = colIndex(single[1])
    const row = parseInt(single[2]) - 1
    return { rows: [[data[row]?.[col] ?? null]] }
  }
  const range = address.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
  if (range) {
    const c0 = colIndex(range[1])
    const r0 = parseInt(range[2]) - 1
    const c1 = colIndex(range[3])
    const r1 = parseInt(range[4]) - 1
    const rows: (string | number | null)[][] = []
    for (let r = r0; r <= r1; r++) {
      const row: (string | number | null)[] = []
      for (let c = c0; c <= c1; c++) row.push(data[r]?.[c] ?? null)
      rows.push(row)
    }
    return { rows }
  }
  return null
}
