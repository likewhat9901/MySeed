'use client'

import { useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { WIDGET_REGISTRY, WidgetType } from '@/app/(main)/editor/canvas/_widgets/registry'
import { useEditorContext } from '../../../_context/EditorContext'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/editorMessages'

// ─── WidgetsPanel ─────────────────────────────────────────────────────────────

export default function WidgetsPanel() {
  const { addWidget: onAddWidget } = useEditorContext()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { locale } = useLocale()
  const t = editorMessages[locale]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 헤더: 뷰 모드 토글 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.widgetList}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'text-brand-dark bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            aria-label="격자형 보기"
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'text-brand-dark bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            aria-label="목록형 보기"
          >
            <List className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 위젯 목록 */}
      <div className="flex-1 overflow-y-auto p-3">
        {viewMode === 'grid' ? (
          <GridView onAddWidget={onAddWidget} locale={locale} />
        ) : (
          <ListView onAddWidget={onAddWidget} locale={locale} cellUnit={t.cellUnit} />
        )}
      </div>
    </div>
  )
}

// ─── 격자형 뷰 ────────────────────────────────────────────────────────────────

function GridView({ onAddWidget, locale }: { onAddWidget: (type: WidgetType) => void; locale: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {WIDGET_REGISTRY.map(({ type, label, labelKo, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAddWidget(type as WidgetType)}
          className="flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-brand rounded-xl p-3 text-center transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 group-hover:border-brand group-hover:bg-green-50 flex items-center justify-center text-gray-400 group-hover:text-brand transition-colors">
            <Icon className="size-4" />
          </div>
          <span className="text-[10px] font-semibold text-gray-600 group-hover:text-brand-dark leading-tight">
            {locale === 'ko' ? labelKo : label}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── 목록형 뷰 ────────────────────────────────────────────────────────────────

function ListView({ onAddWidget, locale, cellUnit }: { onAddWidget: (type: WidgetType) => void; locale: string; cellUnit: string }) {
  return (
    <div className="flex flex-col gap-1">
      {WIDGET_REGISTRY.map(({ type, label, labelKo, defaultW, defaultH, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAddWidget(type as WidgetType)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-brand transition-all group cursor-pointer text-left"
        >
          <div className="w-8 h-8 rounded-md bg-white border border-gray-200 group-hover:border-brand group-hover:bg-green-50 flex items-center justify-center text-gray-400 group-hover:text-brand transition-colors shrink-0">
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 group-hover:text-brand-dark truncate">
              {locale === 'ko' ? labelKo : label}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {defaultW} × {defaultH} {cellUnit}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
