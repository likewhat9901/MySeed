// 내역(record) 관련 Supabase RPC — 내역 저장·조회·삭제 및 매핑 템플릿 CRUD
'use client'

import { callRpc, callRpcVoid } from '@/lib/supabase/core/rpc'
import type { LedgerRecord } from './types'

// ─── 내역 (tb_record) ────────────────────────────────────────────────────────

export interface RecordSummary {
  rec_id:     string
  rec_name:   string
  regist_dt:  string
  update_dt:  string
}

export async function getRecordList(ledId: string): Promise<RecordSummary[]> {
  return callRpc<RecordSummary[]>('get_record_list', { p_led_id: ledId }, [])
}

export async function getRecord(recId: string): Promise<{ rec_id: string; rec_name: string; data: LedgerRecord[] } | null> {
  const rows = await callRpc<{ rec_id: string; rec_name: string; data: LedgerRecord[] }[]>(
    'get_record', { p_rec_id: recId }, [],
  )
  return rows[0] ?? null
}

export async function saveRecord(
  recId: string | null,
  ledId: string,
  fileId: string | null,
  recName: string,
  data: LedgerRecord[],
): Promise<string | null> {
  const payload: Record<string, unknown> = {
    p_led_id:   ledId,
    p_rec_name: recName,
    p_data:     data,
  }
  if (recId)  payload.p_rec_id  = recId
  if (fileId) payload.p_file_id = fileId
  const rows = await callRpc<{ rec_id: string }[]>(
    'save_record',
    { p_payload: payload },
    [],
  )
  return rows[0]?.rec_id ?? null
}

export async function deleteRecord(recId: string): Promise<boolean> {
  return callRpcVoid('delete_record', { p_rec_id: recId })
}

// ─── 매핑 템플릿 (tb_import_mappings) ────────────────────────────────────────

export interface MappingEntry {
  widget_id:   string
  widget_type: string
  sheet:       string
  address:     string
}

export interface ImportMapping {
  map_id:    string
  map_name:  string
  mappings:  MappingEntry[]
  regist_dt: string
}

export async function getImportMappings(memId: string, ledId?: string): Promise<ImportMapping[]> {
  const args: Record<string, string> = { p_mem_id: memId }
  if (ledId) args.p_led_id = ledId
  const rows = await callRpc<{ map_id: string; map_name: string; mappings: unknown; regist_dt: string }[]>(
    'get_import_mappings', args, [],
  )
  return rows.map(row => ({
    map_id:    row.map_id,
    map_name:  row.map_name,
    mappings:  row.mappings as MappingEntry[],
    regist_dt: row.regist_dt,
  }))
}

export async function saveImportMapping(
  memId: string,
  mapId: string,
  mapName: string,
  mappings: MappingEntry[],
  ledId: string,
): Promise<string | null> {
  const rows = await callRpc<{ map_id: string }[]>(
    'save_import_mapping',
    { p_mem_id: memId, p_map_id: mapId, p_map_name: mapName, p_mappings: mappings as never, p_led_id: ledId },
    [],
  )
  return rows[0]?.map_id ?? null
}

export async function deleteImportMapping(mapId: string): Promise<boolean> {
  return callRpcVoid('delete_import_mapping', { p_map_id: mapId })
}
