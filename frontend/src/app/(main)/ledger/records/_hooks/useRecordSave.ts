// 내역 저장(신규/덮어쓰기) 상태 및 로직
'use client'

import { useState } from 'react'
import { saveRecord } from '@/features/ledger/record/rpc'
import type { LedgerRecord } from '@/features/ledger/record/types'

export function useRecordSave(
  canvasId: string | null,
  records: LedgerRecord[],
  setCurrentRecId: (id: string) => void,
  setCurrentRecName: (name: string | null) => void,
  notifyRecordSaved: () => void,
) {
  const [saving,        setSaving]        = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  // 현재 rec_id로 즉시 덮어쓰기
  async function quickSave(recId: string, name: string) {
    if (!canvasId || records.length === 0) return
    setSaving(true)
    const savedId = await saveRecord(recId, canvasId, null, name, records)
    setSaving(false)
    if (savedId) {
      notifyRecordSaved()
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 2000)
    }
  }

  // 이름을 받아 새 record로 저장 (다른 이름으로 저장 / 신규)
  async function confirmSaveAs(name: string) {
    if (!canvasId || records.length === 0) return
    setSaving(true)
    const recId = await saveRecord(null, canvasId, null, name, records)
    setSaving(false)
    if (recId) {
      setCurrentRecId(recId)
      setCurrentRecName(name)
      notifyRecordSaved()
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 2000)
    }
  }

  return {
    saving, savedFeedback,
    quickSave,
    confirmSaveAs,
  }
}
