'use client'

// ─── features/import/rpc.ts ───────────────────────────────────────────────────
// Supabase RPC — 엑셀 매핑 템플릿 조회·저장·삭제

import { callRpc, callRpcVoid } from '@/lib/supabase/core/rpc'
import type { WidgetType } from '@/features/editor/types'

export interface MappingEntry {
  widget_id:   string
  widget_type: WidgetType
  sheet:       string
  address:     string
}

export interface ImportMapping {
  map_id:    string
  map_name:  string
  mappings:  MappingEntry[]
  regist_dt: string
}

export async function getImportMappings(memId: string): Promise<ImportMapping[]> {
  const rows = await callRpc<{ map_id: string; map_name: string; mappings: unknown; regist_dt: string }[]>(
    'get_import_mappings',
    { p_mem_id: memId },
    [],
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
): Promise<string | null> {
  const rows = await callRpc<{ map_id: string }[]>(
    'save_import_mapping',
    { p_mem_id: memId, p_map_id: mapId, p_map_name: mapName, p_mappings: mappings as never },
    [],
  )
  return rows[0]?.map_id ?? null
}

export async function deleteImportMapping(mapId: string): Promise<boolean> {
  return callRpcVoid('delete_import_mapping', { p_map_id: mapId })
}
