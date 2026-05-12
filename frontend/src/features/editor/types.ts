// ─── features/editor/types.ts ────────────────────────────────────────────────
// 에디터 공통 타입.
// 새 위젯 추가 시: registry.ts에 컴포넌트 등록 + WidgetType에 추가.

// ── WidgetType ────────────────────────────────────────────────────────────────
// registry.ts에 등록된 위젯 타입과 1:1 매핑.
// 새 위젯 추가 시 registry.ts와 함께 여기도 업데이트.
export type WidgetType =
  | 'post-it'
  | 'table'
  | 'review-list'

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface WidgetStyle {
  accentColor: string
  borderRadius: number
  dropShadow: boolean
}

// ── 위젯별 data_binding 타입 ──────────────────────────────────────────────────
// 직접 입력형 위젯이 DB에 저장하는 콘텐츠. saveCanvasWidgets에서 그대로 직렬화됨.

export interface PostItBinding {
  lines: string[]
}

export interface TableBinding {
  columns: string[]
  rows: string[][]
}

export type ReviewRating = 'good' | 'meh' | 'bad' | null

export interface ReviewItem {
  id: string
  label: string
  amount: number
  rating: ReviewRating
}

export interface ReviewListBinding {
  items: ReviewItem[]
}

export type WidgetDataBinding =
  | PostItBinding
  | TableBinding
  | ReviewListBinding
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
