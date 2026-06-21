// 내역 탭 — 엑셀 가져오기 흐름 (소스 선택 → 매핑 적용 → 추가 건수 토스트)
'use client'

import { useEffect, useState } from 'react'
import { useExcelUpload, applyMappings } from './useExcelUpload'
import { IMPORT_PRESETS } from '../_utils/importPresets'
import type { ColumnMappingEntry, LedgerRecord } from '@/features/ledger/record/types'

export type ImportModal = 'closed' | 'source' | 'custom'

interface Params {
  userId:     string | undefined
  records:    LedgerRecord[]
  setRecords: (next: LedgerRecord[]) => void
}

export function useImportFlow({ userId, records, setRecords }: Params) {
  const excel = useExcelUpload(userId)

  const [modal, setModal] = useState<ImportModal>('closed')
  const [pendingSource, setPendingSource] = useState<'banksalad' | 'custom' | null>(null)
  const [importToast, setImportToast] = useState<number | null>(null)

  // 업로드 직후 토스트 자동 소멸
  useEffect(() => {
    if (importToast == null) return
    const t = setTimeout(() => setImportToast(null), 6000)
    return () => clearTimeout(t)
  }, [importToast])

  function openSourcePicker() {
    setModal('source')
  }

  function selectPreset() {
    setPendingSource('banksalad')
    setModal('closed')
    excel.fileInputRef.current?.click()
  }

  function selectCustom() {
    setPendingSource('custom')
    setModal('closed')
    excel.fileInputRef.current?.click()
  }

  // 파일 로드 완료 → preset이면 즉시 매핑, 커스텀이면 매핑 모달
  useEffect(() => {
    if (!excel.workbook || !pendingSource) return
    if (pendingSource === 'banksalad') {
      const preset = IMPORT_PRESETS.find(p => p.id === 'banksalad')
      if (preset) {
        const entries = preset.mappings(excel.activeSheet)
        const next = applyMappings(entries, excel.workbook, records)
        setImportToast(Math.max(next.length - records.length, 0))
        setRecords(next)
      }
      setPendingSource(null)
    } else {
      setModal('custom')
    }
  }, [excel.workbook])

  function confirmCustom(entries: ColumnMappingEntry[]) {
    if (!excel.workbook) return
    const next = applyMappings(entries, excel.workbook, records)
    setImportToast(Math.max(next.length - records.length, 0))
    setRecords(next)
    setPendingSource(null)
    setModal('closed')
  }

  return {
    excel,
    modal, setModal,
    importToast, setImportToast,
    openSourcePicker, selectPreset, selectCustom, confirmCustom,
  }
}
