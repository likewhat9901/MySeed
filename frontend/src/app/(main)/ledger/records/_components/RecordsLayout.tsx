// 내역 탭 루트 레이아웃 — 내역 테이블 풀스크린 + 가져오기 모달 흐름
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, Download, Plus, Save, ScanSearch } from 'lucide-react'
import { useLedgerContext } from '../../_context/LedgerContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useExcelUpload, applyMappings } from '../_hooks/useExcelUpload'
import { useRecordSave } from '../_hooks/useRecordSave'
import { getRecord, getRecordList } from '@/features/ledger/record/rpc'
import { IMPORT_PRESETS } from '../_utils/importPresets'
import type { ColumnMappingEntry, LedgerRecord } from '@/features/ledger/record/types'
import RecordTable from './RecordTable'
import ImportSourceModal from './ImportSourceModal'
import CustomMappingModal from './CustomMappingModal'
import ReviewModal from './ReviewModal'

type ModalState = 'closed' | 'source' | 'custom' | 'review'

export default function RecordsLayout() {
  const { canvasId, ledgerName, records, setRecords, currentRecId, setCurrentRecId, currentRecName, setCurrentRecName, refMonth, setRefMonth, notifyRecordSaved } = useLedgerContext()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')

  const excel = useExcelUpload(user?.id)
  const save  = useRecordSave(canvasId, records, setCurrentRecId, setCurrentRecName, notifyRecordSaved)

  const [modal, setModal] = useState<ModalState>('closed')
  const [pendingSource, setPendingSource] = useState<'banksalad' | 'custom' | null>(null)

  // 월별 필터
  const availableMonths = useMemo(() => {
    const s = new Set(records.map(r => r.date.slice(0, 7)))
    return Array.from(s).sort()
  }, [records])

  // refMonth 가 없거나 데이터에 없으면 가장 최근 달로
  const activeMonth = useMemo(() => {
    if (refMonth && availableMonths.includes(refMonth)) return refMonth
    return availableMonths[availableMonths.length - 1] ?? null
  }, [refMonth, availableMonths])

  const filteredRecords = useMemo(() =>
    activeMonth ? records.filter(r => r.date.startsWith(activeMonth)) : records,
    [records, activeMonth],
  )

  function shiftMonth(dir: 1 | -1) {
    if (!activeMonth) return
    const idx = availableMonths.indexOf(activeMonth)
    const next = availableMonths[idx + dir]
    if (next) setRefMonth(next)
  }

  const canPrev = activeMonth ? availableMonths.indexOf(activeMonth) > 0 : false
  const canNext = activeMonth ? availableMonths.indexOf(activeMonth) < availableMonths.length - 1 : false

  const monthLabel = activeMonth
    ? `${activeMonth.slice(0, 4)}년 ${Number(activeMonth.slice(5, 7))}월`
    : ''

  // 다른 이름으로 저장 드롭다운
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const saveAsInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef    = useRef<HTMLDivElement>(null)

  // URL rec 파라미터로 record 로드
  useEffect(() => {
    if (!recIdFromUrl || (recIdFromUrl === currentRecId && currentRecName !== null)) return
    getRecord(recIdFromUrl).then(rec => {
      if (!rec) return
      setRecords(rec.data)
      setCurrentRecId(rec.rec_id)
      setCurrentRecName(rec.rec_name)
      const firstDate = rec.data[0]?.date
      if (firstDate) setRefMonth(firstDate.slice(0, 7))
    })
  }, [recIdFromUrl, currentRecId, setRecords, setCurrentRecId])

  function addRow() {
    const today = new Date().toISOString().slice(0, 10)
    const defaultDate = activeMonth && !today.startsWith(activeMonth)
      ? `${activeMonth}-01`
      : today
    setRecords(prev => [...prev, {
      id:            crypto.randomUUID(),
      date:          defaultDate,
      time:          null,
      type:          '지출',
      category:      '기타',
      subcategory:   null,
      description:   '',
      amount:        0,
      currency:      'KRW' as LedgerRecord['currency'],
      paymentMethod: null,
      memo:          null,
      review:        null,
      isFixed:       false,
    }])
  }

  function openSaveAs() {
    setSaveAsName(currentRecName ?? '')
    setSaveAsOpen(true)
    setTimeout(() => saveAsInputRef.current?.focus(), 0)
  }

  function confirmSaveAs() {
    const name = saveAsName.trim()
    if (!name) return
    handleSaveAs(name)
    setSaveAsOpen(false)
  }

  // 가져오기 버튼 → 소스 선택 모달 먼저
  function handleUploadClick() {
    setModal('source')
  }

  function handleSelectPreset(presetId: string) {
    setPendingSource('banksalad')
    setModal('closed')
    excel.fileInputRef.current?.click()
  }

  function handleSelectCustom() {
    setPendingSource('custom')
    setModal('closed')
    excel.fileInputRef.current?.click()
  }

  useEffect(() => {
    if (!excel.workbook || !pendingSource) return
    if (pendingSource === 'banksalad') {
      const preset = IMPORT_PRESETS.find(p => p.id === 'banksalad')
      if (preset) {
        const entries = preset.mappings(excel.activeSheet)
        setRecords(prev => applyMappings(entries, excel.workbook!, prev))
      }
      setPendingSource(null)
    } else {
      setModal('custom')
    }
  }, [excel.workbook])

  function handleCustomConfirm(entries: ColumnMappingEntry[]) {
    if (!excel.workbook) return
    setRecords(prev => applyMappings(entries, excel.workbook!, prev))
    setPendingSource(null)
    setModal('closed')
  }

  // 점검 모달 — 점검 완료 시 draft를 일괄 반영 (id 기반이라 월 필터 무관)
  function handleReviewComplete(updates: Record<string, LedgerRecord['review']>) {
    if (Object.keys(updates).length > 0) {
      setRecords(prev => prev.map(r => r.id in updates ? { ...r, review: updates[r.id] } : r))
    }
    setModal('closed')
  }

  async function handleSaveAs(name: string) {
    if (!canvasId) return
    const existing = await getRecordList(canvasId)
    const names = new Set(existing.map(r => r.rec_name))
    const base = name.replace(/ \(\d+\)$/, '')
    let finalName = base
    let i = 2
    while (names.has(finalName)) {
      finalName = `${base} (${i})`
      i++
    }
    save.confirmSaveAs(finalName)
  }

  return (
    <div
      className="flex flex-col flex-1 min-h-0 bg-white"
      onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) excel.onDrop(e) }}
      onDragOver={e => e.preventDefault()}
    >
      <input ref={excel.fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={excel.onFileChange} />

      {/* 페이지 타이틀 줄 */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
        {/* 좌: 제목 + 월 네비게이션 */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold text-gray-800 shrink-0">{ledgerName ?? '내역'}</h1>
          <p className="text-[11px] text-gray-400 truncate">
            {currentRecName
              ? `${currentRecName}${filteredRecords.length > 0 ? ` · ${filteredRecords.length}건` : ''}`
              : filteredRecords.length > 0
              ? `${filteredRecords.length}건`
              : '내역을 선택하거나 새로 만들어보세요.'}
          </p>
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button onClick={() => shiftMonth(-1)} disabled={!canPrev}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-gray-700 min-w-[80px] text-center">
                {monthLabel}
              </span>
              <button onClick={() => shiftMonth(1)} disabled={!canNext}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
          <button
            onClick={() => setModal('review')}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 px-2.5 py-1 hover:bg-gray-50 transition-colors shrink-0 ml-1"
          >
            <ScanSearch size={12} />
            점검
          </button>
        </div>

        {/* 우: 액션 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 px-2.5 py-1 hover:bg-gray-50 transition-colors"
          >
            <Plus size={12} />
            행 추가
          </button>
          <button
            onClick={handleUploadClick}
            disabled={excel.uploading}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 px-2.5 py-1 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download size={12} />
            {excel.uploading ? '업로드 중...' : '가져오기'}
          </button>
          {records.length > 0 && (
            <div className="relative flex items-center" ref={dropdownRef}>
              <button
                onClick={() => currentRecId && currentRecName
                  ? save.quickSave(currentRecId, currentRecName)
                  : save.confirmSaveAs(currentRecName ?? '내역')
                }
                disabled={save.saving}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                <Save size={11} />
                {save.savedFeedback ? '저장됨' : save.saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={openSaveAs}
                disabled={save.saving}
                className="self-stretch flex items-center justify-center px-1.5 bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors border-l border-white/20"
              >
                <ChevronDown size={11} />
              </button>
              {saveAsOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-md p-2" style={{ width: 180 }}>
                  <p className="text-[10px] text-gray-400 mb-1.5">다른 이름으로 저장</p>
                  <div className="flex items-center gap-1">
                    <input
                      ref={saveAsInputRef}
                      value={saveAsName}
                      onChange={e => setSaveAsName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmSaveAs()
                        if (e.key === 'Escape') setSaveAsOpen(false)
                      }}
                      onBlur={() => setSaveAsOpen(false)}
                      placeholder="내역 이름…"
                      className="w-0 flex-1 text-xs px-2 py-1 border border-gray-300 outline-none focus:border-gray-500"
                    />
                    <button
                      onMouseDown={e => { e.preventDefault(); confirmSaveAs() }}
                      className="shrink-0 text-xs font-bold px-2 py-1 bg-gray-800 text-white hover:bg-gray-700"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <RecordTable
        records={filteredRecords}
        selectedColumn={null}
        onChange={updated => {
          // 필터된 행만 교체하고 나머지 월 데이터는 보존
          if (activeMonth) {
            setRecords(prev => [
              ...prev.filter(r => !r.date.startsWith(activeMonth)),
              ...updated,
            ])
          } else {
            setRecords(updated)
          }
        }}
        onColumnSelect={() => {}}
      />

      {modal === 'source' && (
        <ImportSourceModal
          onSelectPreset={handleSelectPreset}
          onSelectCustom={handleSelectCustom}
          onClose={() => setModal('closed')}
        />
      )}

      {modal === 'custom' && excel.workbook && (
        <CustomMappingModal
          workbook={excel.workbook}
          activeSheet={excel.activeSheet}
          onSheetChange={excel.setActiveSheet}
          onConfirm={handleCustomConfirm}
          onClose={() => setModal('closed')}
        />
      )}

      {modal === 'review' && (
        <ReviewModal
          records={filteredRecords}
          onComplete={handleReviewComplete}
          onClose={() => setModal('closed')}
        />
      )}
    </div>
  )
}
