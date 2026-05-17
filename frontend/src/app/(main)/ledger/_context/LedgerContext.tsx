// 가계부 전역 상태(가계부 ID, 내역, 사이드바)를 하위 컴포넌트에 공급하는 Context
'use client'

import { createContext, useContext, useState } from 'react'
import { useLedgerPersist } from '../overview/_hooks/useLedgerPersist'
import type { LedgerRecord } from '@/features/ledger/record/types'

interface LedgerContextValue {
  canvasId: string | null
  ledgerName: string | null
  records: LedgerRecord[]
  setRecords: React.Dispatch<React.SetStateAction<LedgerRecord[]>>
  currentRecId: string | null
  setCurrentRecId: React.Dispatch<React.SetStateAction<string | null>>
  currentRecName: string | null
  setCurrentRecName: React.Dispatch<React.SetStateAction<string | null>>
  refMonth: string | null
  setRefMonth: React.Dispatch<React.SetStateAction<string | null>>
  loadLedger: (ledId: string) => Promise<void>
  saveAsNewLedger: (name: string) => Promise<string | null>
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  recordSavedAt: number
  notifyRecordSaved: () => void
}

const LedgerContext = createContext<LedgerContextValue | null>(null)

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const {
    canvasId, ledgerName,
    records, setRecords,
    currentRecId, setCurrentRecId,
    loadLedger,
    saveAsNewLedger,
  } = useLedgerPersist()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [recordSavedAt, setRecordSavedAt] = useState(0)
  const [currentRecName, setCurrentRecName] = useState<string | null>(null)
  const [refMonth, setRefMonth] = useState<string | null>(null)

  return (
    <LedgerContext.Provider value={{
      canvasId, ledgerName,
      records, setRecords,
      currentRecId, setCurrentRecId,
      currentRecName, setCurrentRecName,
      refMonth, setRefMonth,
      loadLedger,
      saveAsNewLedger,
      sidebarOpen, setSidebarOpen,
      recordSavedAt,
      notifyRecordSaved: () => setRecordSavedAt(Date.now()),
    }}>
      {children}
    </LedgerContext.Provider>
  )
}

export function useLedgerContext(): LedgerContextValue {
  const ctx = useContext(LedgerContext)
  if (!ctx) throw new Error('useLedgerContext는 LedgerProvider 하위에서 사용해야 합니다.')
  return ctx
}
