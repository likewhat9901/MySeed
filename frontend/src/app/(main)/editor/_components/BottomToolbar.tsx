'use client'

import { useState } from 'react'
import { WIDGET_REGISTRY, WidgetType } from '@/app/(main)/editor/_widgets/registry'
import { useEditorContext } from '../_context/EditorContext'

// ─── BottomToolbar ────────────────────────────────────────────────────────────
// 캔버스 하단 중앙에 플로팅(absolute)으로 표시되는 툴바.
// ADD WIDGET 버튼 + 드롭다운 메뉴

export default function BottomToolbar() {
  const { addWidget: onAddWidget } = useEditorContext()
  const [showMenu, setShowMenu] = useState(false)

  // registry에서 자동 생성 — 새 위젯은 registry.ts에만 추가하면 됨
  const widgetOptions = WIDGET_REGISTRY.map(({ type, label }) => ({ type: type as WidgetType, label }))

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
      {/* ADD WIDGET 버튼: 클릭하면 위젯 타입 드롭다운 표시 */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full shadow-lg transition-colors cursor-pointer"
        >
          <PlusIcon />
          ADD WIDGET
        </button>

        {/* 드롭다운: 위젯 선택 시 onAddWidget 호출 → 고스트 모드 진입 후 메뉴 닫힘 */}
        {showMenu && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {widgetOptions.map(opt => (
              <button
                key={opt.type}
                onClick={() => { onAddWidget(opt.type); setShowMenu(false) }}
                className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap cursor-pointer"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  )
}
