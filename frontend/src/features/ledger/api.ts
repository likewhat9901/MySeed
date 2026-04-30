"use client";

// ─── features/ledger/api.ts ───────────────────────────────────────────────────
// 가계부(ledger) API
//
// 구성요소
// - getOrCreateLedger: 유저의 기본 ledger 조회, 없으면 생성
// - getMyLedgers: 유저의 ledger 목록 조회
// - createLedger: 새 ledger 생성 후 led_id 반환
// - renameLedger: ledger 이름 변경
// - deleteLedger: ledger 삭제
// - updateLedgerCover: ledger 커버 이미지 URL 변경

import { callRpc, callRpcVoid } from "@/lib/supabase/core/rpc";

export interface LedgerSummary {
  led_id:    string
  led_name:  string
  regist_dt: string
  cover_url: string | null
}

/**
 * 유저의 최신 ledger를 가져옵니다. 없으면 자동 생성.
 * @returns LedgerSummary 또는 실패 시 null
 */
export async function getOrCreateLedger(memId: string): Promise<LedgerSummary | null> {
  const data = await callRpc<LedgerSummary[] | LedgerSummary | null>(
    'get_or_create_ledger',
    { p_mem_id: memId },
    null,
  )
  if (!data) return null
  const row = Array.isArray(data) ? data[0] : data
  return row ?? null
}

/**
 * 유저의 ledger 목록을 가져옵니다.
 * @returns LedgerSummary 배열 (실패 시 빈 배열)
 */
export async function getMyLedgers(memId: string): Promise<LedgerSummary[]> {
  return callRpc<LedgerSummary[]>('get_my_ledgers', { p_mem_id: memId }, [])
}

/**
 * 새 ledger를 생성합니다.
 * @returns 생성된 led_id 또는 실패 시 null
 */
export async function createLedger(memId: string, name = '내 가계부'): Promise<string | null> {
  const data = await callRpc<{ led_id: string }[] | { led_id: string } | null>(
    'create_ledger',
    { p_mem_id: memId, p_led_name: name },
    null,
  )
  if (!data) return null
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return row.led_id
}

/**
 * ledger 이름을 변경합니다.
 * @returns 성공 시 true, 실패 시 false
 */
export async function renameLedger(ledId: string, name: string): Promise<boolean> {
  return callRpcVoid('rename_ledger', { p_led_id: ledId, p_led_name: name })
}

/**
 * ledger를 삭제합니다.
 * @returns 성공 시 true, 실패 시 false
 */
export async function deleteLedger(ledId: string): Promise<boolean> {
  return callRpcVoid('delete_ledger', { p_led_id: ledId })
}

/**
 * ledger 커버 이미지 URL을 업데이트합니다.
 * @returns 성공 시 true, 실패 시 false
 */
export async function updateLedgerCover(ledId: string, coverUrl: string | null): Promise<boolean> {
  return callRpcVoid('update_ledger_cover', { p_led_id: ledId, p_cover_url: coverUrl })
}
