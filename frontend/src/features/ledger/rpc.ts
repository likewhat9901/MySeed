// 가계부(ledger) CRUD Supabase RPC
'use client'

import { callRpc, callRpcVoid } from '@/lib/supabase/core/rpc'

export interface LedgerSummary {
  led_id:    string
  led_name:  string
  regist_dt: string
  cover_url: string | null
}

export async function getOrCreateLedger(memId: string): Promise<LedgerSummary | null> {
  const data = await callRpc<LedgerSummary[] | LedgerSummary | null>(
    'get_or_create_ledger', { p_mem_id: memId }, null,
  )
  if (!data) return null
  const row = Array.isArray(data) ? data[0] : data
  return row ?? null
}

export async function getMyLedgers(memId: string): Promise<LedgerSummary[]> {
  return callRpc<LedgerSummary[]>('get_my_ledgers', { p_mem_id: memId }, [])
}

export async function createLedger(memId: string, name = '내 가계부'): Promise<string | null> {
  const data = await callRpc<{ led_id: string }[] | { led_id: string } | null>(
    'create_ledger', { p_mem_id: memId, p_led_name: name }, null,
  )
  if (!data) return null
  const row = Array.isArray(data) ? data[0] : data
  return row?.led_id ?? null
}

export async function renameLedger(ledId: string, name: string): Promise<boolean> {
  return callRpcVoid('rename_ledger', { p_led_id: ledId, p_led_name: name })
}

export async function deleteLedger(ledId: string): Promise<boolean> {
  return callRpcVoid('delete_ledger', { p_led_id: ledId })
}

export async function updateLedgerCover(ledId: string, coverUrl: string | null): Promise<boolean> {
  return callRpcVoid('update_ledger_cover', { p_led_id: ledId, p_cover_url: coverUrl })
}
