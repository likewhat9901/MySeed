// 내역 탭 AI 매핑 추천 — FastAPI 연동
'use client'

import { fastapiPost } from '@/lib/fastapi/client'

export interface AnalyzeRecommendation {
  column:      string   // RecordColumn (date, description, amount, category, type)
  sheet:       string
  address:     string
  confidence:  number
  reason:      string
  preview:     string
}

export interface AnalyzeResult {
  recommendations: AnalyzeRecommendation[]
}

export async function analyzeRecordMapping(file: File): Promise<AnalyzeResult | null> {
  const form = new FormData()
  form.append('file', file)
  return fastapiPost<AnalyzeResult>('/api/record-mappings/analyze', form)
}
