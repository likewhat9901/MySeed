'use client'

// ─── _components/LeftSidebar/useLedgerList.ts ────────────────────────────────
// LeftSidebar 의 장부 목록 상태와 CRUD 핸들러를 담당하는 훅.
// 새 장부 생성 시 해당 ledger 페이지로 라우팅합니다.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getMyLedgers, createLedger, renameLedger, deleteLedger } from '@/features/ledger/api'
import type { LedgerSummary } from '@/features/ledger/api'

interface UseLedgerListOptions {
  userId: string | undefined
  canvasId: string | null
}

export function useLedgerList({ userId, canvasId }: UseLedgerListOptions) {
  const router = useRouter()
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([])
  const [loadingLedgers, setLoadingLedgers] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const fetchLedgers = useCallback(() => {
    if (!userId) return
    setLoadingLedgers(true)
    getMyLedgers(userId)
      .then(data => setLedgers(data))
      .finally(() => setLoadingLedgers(false))
  }, [userId])

  // userId가 생기거나 바뀔 때 목록 로드
  useEffect(() => {
    fetchLedgers()
  }, [fetchLedgers])

  // 에디터가 자동 생성한 ledger가 canvasId로 세팅되면 목록을 재fetch해 동기화
  const prevCanvasIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!canvasId) return
    if (prevCanvasIdRef.current === canvasId) return
    prevCanvasIdRef.current = canvasId
    // 이미 목록에 있으면 skip, 없을 때만 재fetch (자동 생성 케이스)
    setLedgers(prev => {
      const alreadyIn = prev.some(l => l.led_id === canvasId)
      if (!alreadyIn) fetchLedgers()
      return prev
    })
  }, [canvasId, fetchLedgers])

  // Next.js router cache로 컴포넌트가 remount되지 않고 복원될 때를 대비.
  // 에디터 탭이 다시 visible 되거나 브라우저 bfcache에서 복원되면 재로드.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') fetchLedgers()
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) fetchLedgers()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [fetchLedgers])

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
      setLedgers(prev => [{ led_id: ledId, led_name: name, regist_dt: new Date().toISOString(), cover_url: null }, ...prev])
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
