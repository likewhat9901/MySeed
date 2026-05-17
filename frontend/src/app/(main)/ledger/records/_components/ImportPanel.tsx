// 내역 탭 오른쪽 패널 — 엑셀/노션 탭 및 소스 선택
'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import type { WorkBook } from 'xlsx'
import type { MappingEntry } from '@/features/ledger/record/rpc'
import type { ColumnMappingEntry } from '@/features/ledger/record/types'
import ExcelGrid from './ExcelGrid'

interface Props {
  workbook:       WorkBook | null
  activeSheet:    string
  mappings:       MappingEntry[]
  uploading:      boolean
  onUploadClick:  () => void
  onSheetChange:  (sheet: string) => void
  onMappingsAdd:  (entries: ColumnMappingEntry[]) => void
}

export default function ImportPanel({
  workbook, activeSheet, mappings, uploading,
  onUploadClick, onSheetChange, onMappingsAdd,
}: Props) {
  const [tab, setTab] = useState<'excel' | 'notion'>('excel')

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* 소스 탭 */}
      <div className="flex border-b border-gray-200 shrink-0 h-9">
        {(['excel', 'notion'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 text-xs font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'excel' ? '엑셀' : '노션'}
          </button>
        ))}
      </div>

      {tab === 'excel' ? (
        !workbook ? (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer select-none"
            onClick={onUploadClick}
          >
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Upload size={32} className={`text-gray-400 ${uploading ? 'animate-bounce' : ''}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {uploading ? '업로드 중...' : '엑셀 파일을 드래그하거나 클릭해서 업로드'}
              </p>
              <p className="text-xs text-gray-400 mt-1">.xlsx, .xls 파일 지원</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ExcelGrid
              workbook={workbook}
              selectedSheet={activeSheet}
              selectedAddr={null}
              mappings={mappings}
              onSheetChange={onSheetChange}
              onMappingsAdd={onMappingsAdd}
            />
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
            N
          </div>
          <p className="text-sm font-medium text-gray-500">노션 연동</p>
          <p className="text-xs text-gray-400">준비 중입니다.</p>
        </div>
      )}
    </div>
  )
}
