// ─── Canvas 좌상단 오버레이 컴포넌트 ──────────────────────────────────────────
// UndoRedo: 실행 취소 / 다시 실행 버튼 (히스토리 기능 미구현 — UI만)
// GridToggle: 그리드 ON/OFF 토글 버튼

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
