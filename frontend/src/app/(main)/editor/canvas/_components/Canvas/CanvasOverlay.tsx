// ─── Canvas 좌상단 오버레이 컴포넌트 ──────────────────────────────────────────
// UndoRedo: 실행 취소 / 다시 실행 버튼
// GridToggle: 그리드 ON/OFF 토글 버튼
// EditModeToggle: 보기/편집 모드 전환 버튼

import { UndoIcon, RedoIcon, GridIcon } from './icons'

export function UndoRedo({ onUndo, onRedo, canUndo, canRedo }: {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}) {
  return (
    <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 h-8 px-1">
      <button
        title="실행 취소 (Ctrl+Z)"
        onClick={onUndo}
        disabled={!canUndo}
        className="w-7 h-full flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <UndoIcon />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-0.5" />
      <button
        title="다시 실행 (Ctrl+Y)"
        onClick={onRedo}
        disabled={!canRedo}
        className="w-7 h-full flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <RedoIcon />
      </button>
    </div>
  )
}

export function GridToggle({ showGrid, onToggle }: { showGrid: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold shadow-sm border transition-colors ${
        showGrid
          ? 'bg-brand-dark border-brand-dark text-white hover:bg-brand-darkest'
          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
      }`}
    >
      <GridIcon />
      {showGrid ? 'GRID ON' : 'GRID OFF'}
    </button>
  )
}

export function EditModeToggle({ isEditMode, onToggle }: { isEditMode: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center h-8 rounded-lg shadow-sm border bg-white border-gray-200 overflow-hidden select-none"
    >
      <span className={`flex items-center gap-1 px-2.5 h-full text-xs font-medium transition-colors ${
        !isEditMode ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-600'
      }`}>
        <EyeIcon />
        보기
      </span>
      <span className="w-px h-4 bg-gray-200 shrink-0" />
      <span className={`flex items-center gap-1 px-2.5 h-full text-xs font-medium transition-colors ${
        isEditMode ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-600'
      }`}>
        <PencilIcon />
        편집
      </span>
    </button>
  )
}

export function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
