// 내역 탭 루트 레이아웃 — 좌(내역 테이블) + 우(임포트 패널) 조합
'use client'

import { useEffect, useState } from 'react'
import { PanelRightOpen, PanelRightClose } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useLedgerContext } from '../../_context/LedgerContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useExcelUpload, applyMappings } from '../_hooks/useExcelUpload'
import { useImportMapping, toRpcMappings } from '../_hooks/useImportMapping'
import { useRecordSave } from '../_hooks/useRecordSave'
import { getRecord, getRecordList } from '@/features/ledger/record/rpc'
import type { ColumnMappingEntry, RecordColumn } from '@/features/ledger/record/types'
import RecordTable from './RecordTable'
import ImportPanel from './ImportPanel'
import MappingBar from './MappingBar'

export default function RecordsLayout() {
  const { canvasId, records, setRecords, currentRecId, setCurrentRecId, currentRecName, setCurrentRecName, setRefMonth, notifyRecordSaved } = useLedgerContext()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')

  const excel   = useExcelUpload(user?.id)
  const mapping = useImportMapping(canvasId)
  const save    = useRecordSave(canvasId, records, setCurrentRecId, setCurrentRecName, notifyRecordSaved)

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

  function handleMappingsAdd(entries: ColumnMappingEntry[]) {
    const { workbook } = excel
    if (!workbook) return
    const next = mapping.addMappings(entries)
    setRecords(prev => applyMappings(next, workbook, prev))
  }

  function handleRemoveMapping(col: RecordColumn) {
    const next = mapping.removeMapping(col)
    if (excel.workbook) setRecords(prev => applyMappings(next, excel.workbook!, prev))
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

  const [panelOpen, setPanelOpen] = useState(true)
  const gridMappings = toRpcMappings(mapping.columnMappings)

  return (
    <div
      className="flex flex-col flex-1 min-h-0 bg-white"
      onDrop={excel.onDrop}
      onDragOver={e => e.preventDefault()}
    >
      <input ref={excel.fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={excel.onFileChange} />

      {/* 본문: 좌우 분할 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 왼쪽: 내역 테이블 */}
        <div className={`${panelOpen ? 'w-1/2' : 'flex-1'} border-r border-gray-200 flex flex-col min-h-0 transition-all duration-200`}>
          <RecordTable
            records={records}
            selectedColumn={null}
            onChange={setRecords}
            onColumnSelect={() => {}}
            currentRecId={currentRecId}
            currentRecName={currentRecName}
            saving={save.saving}
            savedFeedback={save.savedFeedback}
            onSave={() => currentRecId && currentRecName
              ? save.quickSave(currentRecId, currentRecName)
              : save.confirmSaveAs(currentRecName ?? '내역')
            }
            onSaveAs={handleSaveAs}
          />
        </div>

        {/* 패널 토글 버튼 */}
        <button
          onClick={() => setPanelOpen(v => !v)}
          className="shrink-0 w-6 flex flex-col items-center justify-center gap-1 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 transition-colors"
          title={panelOpen ? '패널 닫기' : '가져오기 패널 열기'}
        >
          {panelOpen
            ? <PanelRightClose size={14} className="text-gray-400" />
            : <PanelRightOpen size={14} className="text-brand" />
          }
          {!panelOpen && (
            <span className="text-[9px] text-brand font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>
              가져오기
            </span>
          )}
        </button>

        {/* 오른쪽: 임포트 패널 */}
        {panelOpen && (
          <div className="w-1/2 flex flex-col min-h-0">
            <ImportPanel
              workbook={excel.workbook}
              activeSheet={excel.activeSheet}
              mappings={gridMappings}
              uploading={excel.uploading}
              onUploadClick={() => excel.fileInputRef.current?.click()}
              onSheetChange={excel.setActiveSheet}
              onMappingsAdd={handleMappingsAdd}
            />
          </div>
        )}
      </div>

      {/* 하단 매핑 현황 바 */}
      <MappingBar
        columnMappings={mapping.columnMappings}
        onRemove={handleRemoveMapping}
      />
    </div>
  )
}
