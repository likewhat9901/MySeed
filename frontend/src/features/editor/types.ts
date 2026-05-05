// ─── features/editor/types.ts ────────────────────────────────────────────────
// 에디터 공통 타입.
// 새 위젯 추가 시: registry.ts에 컴포넌트 등록 + WidgetType에 추가.

// ── WidgetType ────────────────────────────────────────────────────────────────
// registry.ts에 등록된 위젯 타입과 1:1 매핑.
// 새 위젯 추가 시 registry.ts와 함께 여기도 업데이트.
export type WidgetType =
  | 'savings-goal'
  | 'monthly-expenses'
  | 'post-it'
  | 'quote'
  | 'flow-analysis'
  | 'portfolio-health'
  | 'table'
  | 'check-list'

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface WidgetStyle {
  accentColor: string
  borderRadius: number
  dropShadow: boolean
}

export const BRAND_COLORS = {
  darker:  '#154a26',
  dark:    '#1a5c2e',
  DEFAULT: '#2d8c4e',
  light:   '#16a34a',
  darkest: '#164d26',
} as const

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  accentColor: BRAND_COLORS.light,
  borderRadius: 12,
  dropShadow: true,
}

// ── 위젯별 data_binding 타입 ──────────────────────────────────────────────────
// 직접 입력형 위젯이 DB에 저장하는 콘텐츠. saveCanvasWidgets에서 그대로 직렬화됨.

export interface PostItBinding {
  lines: string[]
}

export interface QuoteBinding {
  text: string
  author: string
}

export interface SavingsGoalBinding {
  label: string
  current: number
  target: number
}

export interface TableBinding {
  columns: string[]
  rows: string[][]
}

export interface CheckListBinding {
  title: string
  items: { text: string; checked: boolean }[]
}

// DB 집계형 위젯은 data_binding 없음 — null
export type WidgetDataBinding =
  | PostItBinding
  | QuoteBinding
  | SavingsGoalBinding
  | TableBinding
  | CheckListBinding
  | null

export interface WidgetItem {
  id: string
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
  style: WidgetStyle
  data_binding: WidgetDataBinding
}

export interface PendingWidget {
  type: WidgetType
  w: number
  h: number
  ghostX: number | null  // null이면 아직 마우스가 캔버스에 진입 안 함
  ghostY: number | null
  isColliding: boolean
}
