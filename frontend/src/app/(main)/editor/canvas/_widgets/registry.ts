import type { ComponentType } from 'react'
import { StickyNote, Table2, ListChecks, LucideIcon } from 'lucide-react'
import type { WidgetType, WidgetDataBinding } from '@/features/editor/types'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import PostItNoteWidget from './PostItNoteWidget'
import TableWidget from './TableWidget'
import ReviewListWidget from './ReviewListWidget'

// ─── Widget Registry ──────────────────────────────────────────────────────────
// 위젯을 추가할 때 이 파일에만 항목을 추가하면 됩니다.

export interface WidgetMeta {
  type: string
  label: string
  labelKo: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  icon: LucideIcon
  component: ComponentType<WidgetComponentProps>
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  {
    type:      'post-it',
    label:     'Post-it Note',
    labelKo:   '포스트잇',
    defaultW:  5,
    defaultH:  6,
    minW:      3,
    minH:      4,
    icon:      StickyNote,
    component: PostItNoteWidget,
  },
  {
    type:      'table',
    label:     'Table',
    labelKo:   '테이블',
    defaultW:  10,
    defaultH:  7,
    minW:      6,
    minH:      5,
    icon:      Table2,
    component: TableWidget,
  },
  {
    type:      'review-list',
    label:     'Spending Review',
    labelKo:   '지출 리뷰',
    defaultW:  8,
    defaultH:  8,
    minW:      5,
    minH:      5,
    icon:      ListChecks,
    component: ReviewListWidget,
  },
]

export type { WidgetType }

export function getWidgetMeta(type: string): WidgetMeta | undefined {
  return WIDGET_REGISTRY.find(w => w.type === type)
}

export function getDefaultBinding(type: WidgetType): WidgetDataBinding {
  switch (type) {
    case 'post-it':
      return { lines: ['새 메모를 입력하세요.'] }
    case 'table':
      return { columns: ['헤더1', '헤더2', '헤더3'], rows: [['', '', ''], ['', '', '']] }
    case 'review-list':
      return { items: [] }
    default:
      return null
  }
}
