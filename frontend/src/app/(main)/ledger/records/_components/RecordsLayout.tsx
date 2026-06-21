// 내역 탭 루트 레이아웃 — 툴바 + 점검 배너 + 테이블 + 가져오기/점검/초기화 모달 조립
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLedgerContext } from '../../_context/LedgerContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useRecordSave } from '../_hooks/useRecordSave'
import { useColumnVisibility } from '../_hooks/useColumnVisibility'
import { useMonthFilter } from '../_hooks/useMonthFilter'
import { useImportFlow } from '../_hooks/useImportFlow'
import { getRecord, getRecordList } from '@/features/ledger/record/rpc'
import type { LedgerRecord } from '@/features/ledger/record/types'
import { useReviewSettings, reviewProgress } from '@/features/ledger/record/reviewSettings'
import RecordTable from './RecordTable'
import { EmptyRecordsState } from './EmptyRecordsState'
import { RecordsToolbar } from './RecordsToolbar'
import { ReviewBanner } from './ReviewBanner'
import { ImportToast } from './ImportToast'
import { ConfirmResetDialog } from './ConfirmResetDialog'
import { MonthManagerModal } from './MonthManagerModal'
import ImportSourceModal from './import/ImportSourceModal'
import CustomMappingModal from './import/CustomMappingModal'
import ReviewModal from './review/ReviewModal'
import RulesModal from './review/RulesModal'

export default function RecordsLayout() {
  const { canvasId, ledgerName, records, setRecords, currentRecId, setCurrentRecId, currentRecName, setCurrentRecName, refMonth, setRefMonth, notifyRecordSaved } = useLedgerContext()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')

  const save  = useRecordSave(canvasId, records, setCurrentRecId, setCurrentRecName, notifyRecordSaved)
  const { visible: visibleColumns, toggle: toggleColumn, ALL_COLUMNS } = useColumnVisibility()
  const month = useMonthFilter({ records, refMonth, setRefMonth, setRecords })
  const importFlow = useImportFlow({ userId: user?.id, records, setRecords })

  const [reviewOpen, setReviewOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState<'review' | 'records' | null>(null)
  const [monthManagerOpen, setMonthManagerOpen] = useState(false)
  const [deleteTargetMonths, setDeleteTargetMonths] = useState<string[] | null>(null)

  // 점검 진행도 — 현재 월 기준 (배지·배너용)
  const { settings: reviewSettings } = useReviewSettings()
  const progress = reviewProgress(month.filteredRecords, reviewSettings)

  // 배너 닫기 — 월별로 기억 (닫아도 점검 버튼 배지는 유지)
  const [bannerDismissed, setBannerDismissed] = useState<string | null>(null)
  const showBanner = progress.remaining > 0 && bannerDismissed !== month.activeMonth

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
    const defaultDate = month.activeMonth && !today.startsWith(month.activeMonth)
      ? `${month.activeMonth}-01`
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

  function quickSave() {
    if (currentRecId && currentRecName) save.quickSave(currentRecId, currentRecName)
    else save.confirmSaveAs(currentRecName ?? '내역')
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

  // 점검 모달 — 점검 완료 시 draft를 일괄 반영 (id 기반이라 월 필터 무관)
  function handleReviewComplete(updates: Record<string, LedgerRecord['review']>) {
    if (Object.keys(updates).length > 0) {
      setRecords(prev => prev.map(r => r.id in updates ? { ...r, review: updates[r.id] } : r))
    }
    setReviewOpen(false)
  }

  // 테이블 변경 — 필터된 행만 교체하고 나머지 월 데이터는 보존
  function handleTableChange(updated: LedgerRecord[]) {
    if (month.activeMonth) {
      const m = month.activeMonth
      setRecords(prev => [...prev.filter(r => !r.date.startsWith(m)), ...updated])
    } else {
      setRecords(updated)
    }
  }

  return (
    <div
      className="flex flex-col flex-1 min-h-0 bg-white"
      onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) importFlow.excel.onDrop(e) }}
      onDragOver={e => e.preventDefault()}
    >
      <input ref={importFlow.excel.fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importFlow.excel.onFileChange} />

      <RecordsToolbar
        ledgerName={ledgerName}
        currentRecName={currentRecName}
        filteredCount={month.filteredRecords.length}
        availableMonths={month.availableMonths}
        activeMonth={month.activeMonth}
        monthLabel={month.monthLabel}
        formatMonthLabel={month.formatMonthLabel}
        canPrev={month.canPrev}
        canNext={month.canNext}
        shiftMonth={month.shiftMonth}
        onSelectMonth={month.setRefMonth}
        onOpenMonthManager={() => setMonthManagerOpen(true)}
        reviewRemaining={progress.remaining}
        reviewTotal={progress.total}
        allColumns={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        toggleColumn={toggleColumn}
        hasRecords={records.length > 0}
        saving={save.saving}
        savedFeedback={save.savedFeedback}
        onOpenReview={() => setReviewOpen(true)}
        onOpenRules={() => setRulesOpen(true)}
        onResetReview={() => setConfirmReset('review')}
        onResetRecords={() => setConfirmReset('records')}
        onAddRow={addRow}
        onUpload={importFlow.openSourcePicker}
        uploading={importFlow.excel.uploading}
        onQuickSave={quickSave}
        onSaveAs={handleSaveAs}
      />

      {showBanner && (
        <ReviewBanner
          remaining={progress.remaining}
          reviewed={progress.reviewed}
          total={progress.total}
          onStart={() => setReviewOpen(true)}
          onDismiss={() => setBannerDismissed(month.activeMonth)}
        />
      )}

      {records.length === 0 ? (
        <EmptyRecordsState
          onUpload={importFlow.openSourcePicker}
          onAddRow={addRow}
          uploading={importFlow.excel.uploading}
        />
      ) : (
        <RecordTable
          records={month.filteredRecords}
          selectedColumn={null}
          onChange={handleTableChange}
          onColumnSelect={() => {}}
          visibleColumns={visibleColumns}
        />
      )}

      {importFlow.modal === 'source' && (
        <ImportSourceModal
          onSelectPreset={importFlow.selectPreset}
          onSelectCustom={importFlow.selectCustom}
          onClose={() => importFlow.setModal('closed')}
        />
      )}

      {importFlow.modal === 'custom' && importFlow.excel.workbook && (
        <CustomMappingModal
          workbook={importFlow.excel.workbook}
          activeSheet={importFlow.excel.activeSheet}
          onSheetChange={importFlow.excel.setActiveSheet}
          onConfirm={importFlow.confirmCustom}
          onClose={() => importFlow.setModal('closed')}
        />
      )}

      {reviewOpen && (
        <ReviewModal
          records={month.filteredRecords}
          onComplete={handleReviewComplete}
          onClose={() => setReviewOpen(false)}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}

      {rulesOpen && (
        <RulesModal onClose={() => setRulesOpen(false)} />
      )}

      {confirmReset && (
        <ConfirmResetDialog
          kind={confirmReset}
          onCancel={() => setConfirmReset(null)}
          onConfirm={() => {
            if (confirmReset === 'review') {
              setRecords(prev => prev.map(r => ({ ...r, review: null })))
            } else {
              setRecords([])
            }
            setConfirmReset(null)
          }}
        />
      )}

      {monthManagerOpen && (
        <MonthManagerModal
          availableMonths={month.availableMonths}
          monthCounts={month.monthCounts}
          monthSummary={month.monthSummary}
          activeMonth={month.activeMonth}
          formatMonthLabel={month.formatMonthLabel}
          onDelete={months => { setMonthManagerOpen(false); setDeleteTargetMonths(months) }}
          onClose={() => setMonthManagerOpen(false)}
        />
      )}

      {deleteTargetMonths && deleteTargetMonths.length > 0 && (
        <ConfirmResetDialog
          kind="month"
          monthLabels={deleteTargetMonths.map(month.formatMonthLabel)}
          monthCount={deleteTargetMonths.reduce((sum, m) => sum + (month.monthCounts[m] ?? 0), 0)}
          onCancel={() => setDeleteTargetMonths(null)}
          onConfirm={() => {
            month.deleteMonths(deleteTargetMonths)
            setDeleteTargetMonths(null)
          }}
        />
      )}

      {importFlow.importToast != null && (
        <ImportToast
          addedCount={importFlow.importToast}
          remaining={progress.remaining}
          onReview={() => { setReviewOpen(true); importFlow.setImportToast(null) }}
          onClose={() => importFlow.setImportToast(null)}
        />
      )}
    </div>
  )
}
