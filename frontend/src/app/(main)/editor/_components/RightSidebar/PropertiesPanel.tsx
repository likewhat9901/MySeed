'use client'

import { WidgetItem, WidgetStyle, DEFAULT_WIDGET_STYLE } from '@/features/editor/types'
import { useEditorContext } from '../../_context/EditorContext'
import { CELL_SIZE } from '../../constants'

// ─── PropertiesPanel ─────────────────────────────────────────────────────────
// PROPERTIES 탭 본문. 선택된 위젯의 LAYOUT / STYLING / DATA SOURCE / ADVANCED 편집.
// widget이 null이면 안내 메시지를 표시한다.

export default function PropertiesPanel() {
  const {
    widgets,
    selectedWidgetId,
    onCloseInspector: onClose,
    onUpdateInspector: onUpdate,
  } = useEditorContext()

  const widget: WidgetItem | null = selectedWidgetId
    ? (widgets.find(w => w.id === selectedWidgetId) ?? null)
    : null

  const cellSize = CELL_SIZE

  const updateStyle = (patch: Partial<WidgetStyle>) => {
    if (!widget) return
    onUpdate({ style: { ...widget.style, ...patch } })
  }

  if (!widget) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 px-4 text-center">
        <PropertiesTabIcon />
        <span className="text-sm mt-1">위젯을 더블클릭하면<br />속성을 편집할 수 있습니다</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* LAYOUT */}
        <Section label="LAYOUT">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Width"
              unit="px"
              value={widget.w * cellSize}
              onChange={v => onUpdate({ w: Math.max(1, Math.round(v / cellSize)) })}
            />
            <NumberField
              label="Height"
              unit="px"
              value={widget.h * cellSize}
              onChange={v => onUpdate({ h: Math.max(1, Math.round(v / cellSize)) })}
            />
            <NumberField
              label="Position X"
              unit="px"
              value={widget.x * cellSize}
              onChange={v => onUpdate({ x: Math.round(v / cellSize) })}
            />
            <NumberField
              label="Position Y"
              unit="px"
              value={widget.y * cellSize}
              onChange={v => onUpdate({ y: Math.round(v / cellSize) })}
            />
          </div>
        </Section>

        {/* STYLING */}
        <Section label="STYLING">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-700">Accent Color</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{widget.style.accentColor}</span>
              <label className="cursor-pointer">
                <input
                  type="color"
                  value={widget.style.accentColor}
                  onChange={e => updateStyle({ accentColor: e.target.value })}
                  className="sr-only"
                />
                <span
                  className="w-6 h-6 rounded-full block border border-gray-200 cursor-pointer"
                  style={{ backgroundColor: widget.style.accentColor }}
                />
              </label>
            </div>
          </div>

          <div className="py-1.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-700">Border Radius</span>
              <span className="text-xs font-medium text-brand-dark">{widget.style.borderRadius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              value={widget.style.borderRadius}
              onChange={e => updateStyle({ borderRadius: Number(e.target.value) })}
              className="w-full h-1 accent-brand-dark"
            />
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-700">Drop Shadow</span>
            <Toggle
              value={widget.style.dropShadow}
              onChange={v => updateStyle({ dropShadow: v })}
            />
          </div>
        </Section>

        {/* DATA SOURCE — 미구현 */}
        <Section label="DATA SOURCE">
          <div className="relative opacity-40">
            <select
              disabled
              className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 appearance-none cursor-not-allowed"
              defaultValue="bank-api"
            >
              <option value="bank-api">Bank API Connection</option>
              <option value="manual">Manual Input</option>
              <option value="csv">CSV Import</option>
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </Section>

        {/* ADVANCED — 미구현 */}
        <Section label="ADVANCED">
          <div className="flex items-start justify-between py-1.5">
            <div>
              <p className="text-sm text-gray-700">Show Smart Insights</p>
              <p className="text-xs text-gray-400 mt-0.5">Contextual tips for this widget</p>
            </div>
            <Toggle value={true} onChange={() => {}} disabled />
          </div>
          <div className="flex items-start justify-between py-1.5">
            <div>
              <p className="text-sm text-gray-700">Auto-update</p>
              <p className="text-xs text-gray-400 mt-0.5">Sync every 24 hours</p>
            </div>
            <Toggle value={false} onChange={() => {}} disabled />
          </div>
        </Section>
      </div>

      {/* 하단: 닫기 + 리셋 */}
      <div className="px-4 py-4 border-t border-gray-100 shrink-0 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="위젯 선택 해제"
        >
          CLOSE
        </button>
        <button
          onClick={() => onUpdate({ style: { ...DEFAULT_WIDGET_STYLE } })}
          className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors tracking-wide"
        >
          RESET
        </button>
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-3">{label}</p>
      {children}
    </div>
  )
}

function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string
  unit: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
        <input
          type="number"
          value={Math.round(value)}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-sm text-gray-800 bg-transparent outline-none"
        />
        <span className="px-2 text-xs text-gray-400 shrink-0">{unit}</span>
      </div>
    </div>
  )
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => !disabled && onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-green-600' : 'bg-gray-200'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

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
