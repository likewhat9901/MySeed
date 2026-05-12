'use client'

import { useEditorContext } from '../../../_context/EditorContext'
import { ChevronSideIcon } from '../../../_components/LeftSidebar/icons'
import PropertiesPanel from './PropertiesPanel'
import WidgetsPanel from './WidgetsPanel'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/messages/editorMessages'

type TabId = 'widgets' | 'properties'

export default function RightSidebar() {
  const {
    rightSidebarOpen: isOpen,
    rightActiveTab: activeTab,
    setRightActiveTab: onTabChange,
    handleRightToggle: onToggle,
  } = useEditorContext()
  const { locale } = useLocale()
  const t = editorMessages[locale]

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'widgets',    label: t.tabWidgets,    icon: <WidgetsTabIcon /> },
    { id: 'properties', label: t.tabProperties, icon: <PropertiesTabIcon /> },
  ]
  function handleTabIconClick(tabId: TabId) {
    if (!isOpen) {
      onTabChange(tabId)
      onToggle(tabId)
    } else if (activeTab === tabId) {
      onToggle()
    } else {
      onTabChange(tabId)
    }
  }

  return (
    <aside
      className={`h-full bg-white border-l border-gray-200 flex flex-col shrink-0 select-none transition-all duration-200 overflow-hidden ${
        isOpen ? 'w-72' : 'w-12'
      }`}
    >
      {/* ── 접힌 상태: 탭 아이콘 세로 나열 ── */}
      {!isOpen && (
        <div className="flex flex-col items-center gap-1 py-3">
          {/* 펼치기 방향 화살표 */}
          <button
            onClick={() => onToggle()}
            title="Expand panel"
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors mb-1"
          >
            <ChevronSideIcon rotated={false} />
          </button>

          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabIconClick(tab.id)}
              title={tab.label}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-green-50 text-brand-dark'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      )}

      {/* ── 펼친 상태 ── */}
      {isOpen && (
        <>
          {/* 탭 바: 접기 화살표 + 탭 버튼들 */}
          <div className="flex items-stretch border-b border-gray-200 shrink-0">
            <button
              onClick={() => onToggle()}
              title="Collapse panel"
              className="w-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <ChevronSideIcon rotated={true} />
            </button>

            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 h-10 flex items-center justify-center text-xs tracking-wider font-semibold transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-brand-dark'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* ── 본문: activeTab에 따라 패널 분기 ── */}
          {activeTab === 'properties' ? (
            <PropertiesPanel />
          ) : (
            <WidgetsPanel />
          )}
        </>
      )}
    </aside>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

// 탭 아이콘: 위젯 목록 (격자)
function WidgetsTabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

// 탭 아이콘: 속성 편집 (슬라이더)
function PropertiesTabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}
