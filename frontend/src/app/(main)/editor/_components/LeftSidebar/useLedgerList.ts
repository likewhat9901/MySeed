'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMyLedgers, createLedger, renameLedger, deleteLedger } from '@/features/ledger/api'
import type { LedgerSummary } from '@/features/ledger/api'

// ─── useLedgerList ────────────────────────────────────────────────────────────
// LeftSidebar의 가계부 목록 관련 상태와 CRUD 핸들러를 담당하는 훅.

interface UseLedgerListOptions {
  userId: string | undefined
  canvasId: string | null
}

export function useLedgerList({ userId, canvasId }: UseLedgerListOptions) {
  const router = useRouter()
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([])
  const [loadingLedgers, setLoadingLedgers] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getMyLedgers(userId)
      .then(data => { if (!cancelled) setLedgers(data) })
      .finally(() => { if (!cancelled) setLoadingLedgers(false) })
    return () => { cancelled = true }
  }, [userId])

  function startCreating() {
    setIsCreating(true)
    setNewName('')
  }

  function cancelCreating() {
    setIsCreating(false)
    setNewName('')
  }

  async function handleCreate() {
    const name = newName.trim() || '내 가계부'
    cancelCreating()
    if (!userId) return
    const ledId = await createLedger(userId, name)
    if (ledId) {
      setLedgers(prev => [{ led_id: ledId, led_name: name }, ...prev])
      router.push(`/editor?led=${ledId}`)
    }
  }

  async function handleRename(ledId: string, name: string) {
    const snapshot = ledgers
    setLedgers(prev => prev.map(l => l.led_id === ledId ? { ...l, led_name: name } : l))
    const ok = await renameLedger(ledId, name)
    if (!ok) setLedgers(snapshot)
  }

  async function handleDelete(ledId: string) {
    if (!confirm('이 가계부를 삭제하시겠습니까?')) return
    const snapshot = ledgers
    setLedgers(prev => prev.filter(l => l.led_id !== ledId))
    const ok = await deleteLedger(ledId)
    if (!ok) { setLedgers(snapshot); return }
    if (canvasId === ledId) router.push('/editor')
  }

  return {
    ledgers,
    loadingLedgers,
    isCreating,
    newName,
    setNewName,
    startCreating,
    cancelCreating,
    handleCreate,
    handleRename,
    handleDelete,
  }
}
