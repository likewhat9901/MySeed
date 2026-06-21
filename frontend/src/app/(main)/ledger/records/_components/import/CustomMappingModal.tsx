// 커스텀 엑셀 매핑 모달 — ExcelGrid로 컬럼을 직접 지정하고 확인
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { WorkBook } from 'xlsx'
import type { MappingEntry } from '@/features/ledger/record/rpc'
import type { ColumnMappingEntry } from '@/features/ledger/record/types'
import ExcelGrid from './ExcelGrid'

interface Props {
  workbook:      WorkBook
  activeSheet:   string
  onSheetChange: (sheet: string) => void
  onConfirm:     (entries: ColumnMappingEntry[]) => void
  onClose:       () => void
}

export default function CustomMappingModal({
  workbook, activeSheet, onSheetChange, onConfirm, onClose,
}: Props) {
  const [mappings, setMappings] = useState<ColumnMappingEntry[]>([])

  const rpcMappings: MappingEntry[] = mappings.map(e => ({
    widget_id:   e.column,
    widget_type: 'table' as const,
    sheet:       e.sheet,
    address:     e.address,
  }))

  function handleMappingsAdd(entries: ColumnMappingEntry[]) {
    setMappings(prev => {
      let next = prev
      for (const entry of entries) next = [...next.filter(m => m.column !== entry.column), entry]
      console.log('[CustomMappingModal] mappings updated:', next)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-gray-300 shadow-xl flex flex-col" style={{ width: '80vw', height: '80vh' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300 shrink-0">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-600">컬럼 매핑</p>
            <p className="text-[11px] text-gray-400 mt-0.5">엑셀에서 범위를 드래그해 내역 필드와 연결하세요.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={15} />
          </button>
        </div>

        {/* ExcelGrid */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ExcelGrid
            workbook={workbook}
            selectedSheet={activeSheet}
            selectedAddr={null}
            mappings={rpcMappings}
            onSheetChange={onSheetChange}
            onMappingsAdd={handleMappingsAdd}
          />
        </div>

        {/* 푸터 — 매핑 현황 + 확인 버튼 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-300 shrink-0 bg-gray-50">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {mappings.length === 0 ? (
              <span className="text-[11px] text-gray-300">아직 매핑된 컬럼이 없습니다.</span>
            ) : (
              mappings.map(m => (
                <span
                  key={m.column}
                  className="flex items-center gap-1 text-[11px] border border-gray-300 bg-white text-gray-700 px-2 py-0.5"
                >
                  <span className="font-semibold">{m.column}</span>
                  <span className="text-gray-300">→</span>
                  <span className="font-mono text-gray-500">{m.address}</span>
                  <button
                    onClick={() => setMappings(prev => prev.filter(p => p.column !== m.column))}
                    className="text-gray-300 hover:text-red-400 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex gap-2 ml-4 shrink-0">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-gray-500 border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => { if (mappings.length > 0) onConfirm(mappings) }}
              disabled={mappings.length === 0}
              className={`text-xs font-bold px-4 py-1.5 transition-colors ${
                mappings.length > 0
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              내역에 반영
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
