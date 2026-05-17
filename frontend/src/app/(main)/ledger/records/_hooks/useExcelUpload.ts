// 엑셀 파일 업로드 및 컬럼→셀 매핑 적용 로직
'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'
import { uploadExcelFile } from '@/features/ledger/record/storage'
import { CATEGORIES } from '@/constants/categories'
import type { LedgerRecord, RecordColumn, ColumnMappingEntry } from '@/features/ledger/record/types'

export function applyMappings(
  mappings: ColumnMappingEntry[],
  wb: WorkBook,
  prev: LedgerRecord[] = [],
): LedgerRecord[] {
  const colData: Partial<Record<RecordColumn, (string | number | null)[]>> = {}
  for (const entry of mappings) {
    const sheet = wb.Sheets[entry.sheet]
    if (!sheet) continue
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
    const values = extractColumn(data, entry.address)
    if (values) colData[entry.column] = values
  }
  if (Object.keys(colData).length === 0) return prev

  const rowCount = Math.max(0, ...Object.values(colData).map(v => v?.length ?? 0))
  if (rowCount === 0) return prev

  return Array.from({ length: rowCount }, (_, i) => {
    const existing = prev[i]
    const patch: Partial<LedgerRecord> = {}

    if (colData.date)        patch.date        = formatDate(colData.date[i])
    if (colData.description) patch.description = String(colData.description[i] ?? '')
    if (colData.amount) {
      const raw = colData.amount[i]
      const num = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(/[^0-9.-]/g, '')) || 0
      patch.amount = Math.abs(num)
      if (!colData.type) patch.type = num >= 0 ? '수입' : '지출'
    }
    if (colData.category) {
      const raw = String(colData.category[i] ?? '')
      patch.category = (CATEGORIES as readonly string[]).includes(raw) ? raw as LedgerRecord['category'] : '기타'
    }
    if (colData.type) {
      const raw = String(colData.type[i] ?? '')
      patch.type = raw.includes('입') ? '수입' : '지출'
    }

    if (existing) return { ...existing, ...patch }
    return {
      id:            crypto.randomUUID(),
      date:          patch.date        ?? new Date().toISOString().slice(0, 10),
      time:          null,
      type:          patch.type        ?? '지출',
      category:      patch.category    ?? '기타',
      subcategory:   null,
      description:   patch.description ?? '',
      amount:        patch.amount      ?? 0,
      currency:      'KRW' as const,
      paymentMethod: null,
      memo:          null,
      review:        null,
    }
  })
}

export function useExcelUpload(userId: string | undefined) {
  const [workbook,    setWorkbook]    = useState<WorkBook | null>(null)
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [uploading,   setUploading]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setUploading(true)
    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    setWorkbook(wb)
    setActiveSheet(wb.SheetNames[0] ?? '')
    setUploading(false)
    if (userId) uploadExcelFile(userId, file)
  }, [userId])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return { workbook, activeSheet, setActiveSheet, uploading, fileInputRef, onFileChange, onDrop }
}

function colIndex(colStr: string): number {
  return colStr.split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
}

function extractColumn(
  data: (string | number | null)[][],
  address: string,
): (string | number | null)[] | null {
  const single = address.match(/^([A-Z]+)(\d+)$/)
  if (single) {
    const col = colIndex(single[1])
    const row = parseInt(single[2]) - 1
    return [data[row]?.[col] ?? null]
  }
  const range = address.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
  if (range) {
    const c0 = colIndex(range[1])
    const r0 = parseInt(range[2]) - 1
    const r1 = parseInt(range[4]) - 1
    const result: (string | number | null)[] = []
    for (let r = r0; r <= r1; r++) result.push(data[r]?.[c0] ?? null)
    return result
  }
  return null
}

function formatDate(raw: string | number | null | undefined): string {
  if (raw == null) return new Date().toISOString().slice(0, 10)
  if (typeof raw === 'number') {
    const date = new Date((raw - 25569) * 86400 * 1000)
    return date.toISOString().slice(0, 10)
  }
  const s = String(raw)
  const m = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return new Date().toISOString().slice(0, 10)
}
