'use client'

import { getWidgetMeta } from '../../_widgets/registry'
import type { WidgetItem } from '@/features/editor/types'
import type { MappingEntry } from '@/features/import/api'

// ─── WidgetList ───────────────────────────────────────────────────────────────
// Import Mapper 왼쪽 패널. 현재 캔버스 위젯 목록을 보여주고 선택할 수 있게 함.

interface Props {
  widgets:         WidgetItem[]
  selectedId:      string | null
  mappings:        MappingEntry[]
  onSelect:        (id: string) => void
}

export default function WidgetList({ widgets, selectedId, mappings, onSelect }: Props) {
  const mappedIds = new Set(mappings.map(m => m.con_id))

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 tracking-widest">WIDGETS</p>
        <p className="text-[11px] text-gray-400 mt-0.5">연결할 위젯을 선택하세요</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {widgets.length === 0 && (
          <p className="text-xs text-gray-300 text-center mt-8">캔버스에 위젯이 없습니다</p>
        )}
        {widgets.map(widget => {
          const meta    = getWidgetMeta(widget.type)
          const Icon    = meta?.icon
          const mapped  = mappedIds.has(widget.id)
          const active  = selectedId === widget.id

          return (
            <button
              key={widget.id}
              onClick={() => onSelect(widget.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors w-full ${
                active
                  ? 'bg-green-50 border border-green-300'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              {Icon && (
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon size={14} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${active ? 'text-green-800' : 'text-gray-700'}`}>
                  {meta?.label ?? widget.type}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{widget.id.slice(0, 8)}…</p>
              </div>
              {mapped && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-medium shrink-0">
                  연결됨
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
