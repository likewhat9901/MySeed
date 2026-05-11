'use client'

// ─── features/import/api.ts ───────────────────────────────────────────────────
// Import Data 기능 API — Supabase RPC 방식

import { callRpc, callRpcVoid } from '@/lib/supabase/core/rpc'
import { getSupabaseBrowserClient } from '@/lib/supabase/core/client'
import type { WidgetType } from '@/features/editor/types'

// ── 타입 ──────────────────────────────────────────────────────────────────────

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

// ── Storage 업로드 ─────────────────────────────────────────────────────────────

export async function uploadExcelFile(
  memId: string,
  file: File,
): Promise<{ fileId: string; filePath: string } | null> {
  const supabase = getSupabaseBrowserClient()
  const ext = file.name.lastIndexOf('.') !== -1 ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const baseName = file.name.slice(0, file.name.length - ext.length)
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${memId}/${safeName}_${Date.now()}${ext}`

  const mimeType = file.name.endsWith('.xls')
    ? 'application/vnd.ms-excel'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  const { error } = await supabase.storage
    .from('import-files')
    .upload(path, file, { upsert: true, contentType: mimeType })

  if (error) {
    console.error('[import/uploadExcelFile] storage 업로드 실패:', error.message)
    return null
  }

  const rows = await callRpc<{ file_id: string }[]>(
    'register_import_file',
    { p_mem_id: memId, p_file_name: file.name, p_file_path: path },
    [],
  )

  const fileId = rows[0]?.file_id
  if (!fileId) return null
  return { fileId, filePath: path }
}

// ── 매핑 프리셋 CRUD ──────────────────────────────────────────────────────────

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

// ── AI 자동 매핑 분석 ─────────────────────────────────────────────────────────

export interface AnalyzeRecommendation {
  con_id:       string
  widget_type:  string
  sheet:        string
  address:      string
  aggregation:  string
  display_form: string
  confidence:   number
  reason:       string
  preview:      string
}

export interface AnalyzeResult {
  recommendations: AnalyzeRecommendation[]
}

const ANALYZE_API = 'https://backend-production-c550.up.railway.app/api/import-mappings/analyze'

export async function analyzeImportMapping(
  file: File,
  widgets: { con_id: string; widget_type: string }[],
): Promise<AnalyzeResult | null> {
  const form = new FormData()
  form.append('file', file)
  form.append('widgets', JSON.stringify(widgets))
  form.append('persist_mapping', 'false')
  form.append('apply_canvas', 'false')
  form.append('map_name', '')

  const res = await fetch(ANALYZE_API, { method: 'POST', body: form })
  if (!res.ok) {
    console.error('[import/analyzeImportMapping] API 오류:', res.status, await res.text())
    return null
  }
  return res.json()
}
