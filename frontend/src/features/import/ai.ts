'use client'

// ─── features/import/ai.ts ────────────────────────────────────────────────────
// FastAPI — 엑셀 파일 AI 분석 및 위젯 매핑 추천

import { fastapiPost } from '@/lib/fastapi/client'

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

  return fastapiPost<AnalyzeResult>('/api/import-mappings/analyze', form)
}
