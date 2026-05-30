// 내역 탭 루트 레이아웃 — 내역 테이블 풀스크린 + 가져오기 모달 흐름
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLedgerContext } from '../../_context/LedgerContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useExcelUpload, applyMappings } from '../_hooks/useExcelUpload'
import { useRecordSave } from '../_hooks/useRecordSave'
import { getRecord, getRecordList } from '@/features/ledger/record/rpc'
import { IMPORT_PRESETS } from '../_utils/importPresets'
import type { ColumnMappingEntry } from '@/features/ledger/record/types'
import RecordTable from './RecordTable'
import ImportSourceModal from './ImportSourceModal'
import CustomMappingModal from './CustomMappingModal'

type ModalState = 'closed' | 'source' | 'custom'

export default function RecordsLayout() {
  const { canvasId, records, setRecords, currentRecId, setCurrentRecId, currentRecName, setCurrentRecName, setRefMonth, notifyRecordSaved } = useLedgerContext()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')

  const excel = useExcelUpload(user?.id)
  const save  = useRecordSave(canvasId, records, setCurrentRecId, setCurrentRecName, notifyRecordSaved)

  const [modal, setModal] = useState<ModalState>('closed')
  const [pendingSource, setPendingSource] = useState<'banksalad' | 'custom' | null>(null)

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

  // 가져오기 버튼 → 소스 선택 모달 먼저
  function handleUploadClick() {
    setModal('source')
  }

  // 소스 선택 후 파일 input 열기
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

  // 파일 선택 완료 → pendingSource에 따라 처리
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
        onImportClick={handleUploadClick}
        importing={excel.uploading}
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
    </div>
  )
}
