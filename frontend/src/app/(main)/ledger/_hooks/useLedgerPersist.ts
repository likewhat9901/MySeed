// 가계부 ID 로드·생성 및 record 자동 로드를 관리하는 훅
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth'
import { getOrCreateLedger, getMyLedgers, createLedger } from '@/features/ledger/rpc'
import { getRecordList, getRecord } from '@/features/ledger/record/rpc'
import type { LedgerRecord } from '@/features/ledger/record/types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseLedgerPersistReturn {
  canvasId: string | null
  ledgerName: string | null
  records: LedgerRecord[]
  setRecords: React.Dispatch<React.SetStateAction<LedgerRecord[]>>
  currentRecId: string | null
  setCurrentRecId: React.Dispatch<React.SetStateAction<string | null>>
  loadLedger: (ledId: string) => Promise<void>
  saveAsNewLedger: (name: string) => Promise<string | null>
}

export function useLedgerPersist(): UseLedgerPersistReturn {
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')

  const [canvasId, setCanvasId] = useState<string | null>(null)
  const [ledgerName, setLedgerName] = useState<string | null>(null)
  const [records, setRecords] = useState<LedgerRecord[]>([])
  const [currentRecId, setCurrentRecId] = useState<string | null>(null)

  // 특정 가계부 로드 (사이드바 클릭 또는 URL 파라미터로 호출)
  const loadLedger = useCallback(async (ledId: string) => {
    const ledgers = await getMyLedgers((await getCurrentUser())?.id ?? '')
    const name = ledgers.find(l => l.led_id === ledId)?.led_name ?? null
    setCanvasId(ledId)
    setLedgerName(name)
    setRecords([])
    setCurrentRecId(null)

    const recList = await getRecordList(ledId)
    if (recList.length > 0) {
      const latest = recList.sort((a, b) =>
        new Date(b.update_dt).getTime() - new Date(a.update_dt).getTime()
      )[0]
      const rec = await getRecord(latest.rec_id)
      if (rec) {
        setRecords(rec.data ?? [])
        setCurrentRecId(rec.rec_id)
      }
    }
  }, [])

  // URL rec 파라미터 변경 시 해당 내역 로드
  useEffect(() => {
    if (!recIdFromUrl || recIdFromUrl === currentRecId) return
    getRecord(recIdFromUrl).then(rec => {
      if (!rec) return
      setRecords(rec.data ?? [])
      setCurrentRecId(rec.rec_id)
    })
  }, [recIdFromUrl, currentRecId])

  // 초기 로드 — URL 없으면 기본 가계부 생성/조회
  useEffect(() => {
    async function init() {
      const user = await getCurrentUser()
      if (!user) return

      // URL에 led 파라미터가 있으면 그걸로, 없으면 기본 가계부
      const params = new URLSearchParams(window.location.search)
      const ledId = params.get('led')

      if (ledId) {
        await loadLedger(ledId)
      } else {
        const ledger = await getOrCreateLedger(user.id)
        if (ledger) await loadLedger(ledger.led_id)
      }
    }
    init()
  }, [loadLedger])

  const saveAsNewLedger = useCallback(async (name: string): Promise<string | null> => {
    const user = await getCurrentUser()
    if (!user) return null
    return createLedger(user.id, name)
  }, [])

  return {
    canvasId, ledgerName,
    records, setRecords,
    currentRecId, setCurrentRecId,
    loadLedger,
    saveAsNewLedger,
  }
}
