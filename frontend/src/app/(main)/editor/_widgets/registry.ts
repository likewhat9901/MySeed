import type { ComponentType } from 'react'
import { PiggyBank, Receipt, StickyNote, Quote, TrendingUp, Landmark, LucideIcon } from 'lucide-react'
import type { WidgetType, WidgetDataBinding } from '@/features/editor/types'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import SavingsGoalWidget from './SavingsGoalWidget'
import MonthlyExpensesWidget from './MonthlyExpensesWidget'
import PostItNoteWidget from './PostItNoteWidget'
import QuoteWidget from './QuoteWidget'
import FlowAnalysisWidget from './FlowAnalysisWidget'
import PortfolioHealthWidget from './PortfolioHealthWidget'

// ─── Widget Registry ──────────────────────────────────────────────────────────
// 위젯을 추가할 때 이 파일에만 항목을 추가하면 됩니다.
// Canvas / BottomToolbar / useWidgets 등은 자동으로 연동됩니다.

export interface WidgetMeta {
  type: string
  label: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  icon: LucideIcon   // WidgetsPanel 카탈로그에 표시할 아이콘
  component: ComponentType<WidgetComponentProps>
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  {
    type:      'savings-goal',
    label:     'Savings Goal',
    defaultW:  5,
    defaultH:  8,
    minW:      4,
    minH:      7,
    icon:      PiggyBank,
    component: SavingsGoalWidget,
  },
  {
    type:      'monthly-expenses',
    label:     'Monthly Expenses',
    defaultW:  12,
    defaultH:  6,
    minW:      8,
    minH:      5,
    icon:      Receipt,
    component: MonthlyExpensesWidget,
  },
  {
    type:      'post-it',
    label:     'Post-it Note',
    defaultW:  5,
    defaultH:  6,
    minW:      3,
    minH:      4,
    icon:      StickyNote,
    component: PostItNoteWidget,
  },
  {
    type:      'quote',
    label:     'Inspirational Quote',
    defaultW:  6,
    defaultH:  4,
    minW:      4,
    minH:      3,
    icon:      Quote,
    component: QuoteWidget,
  },
  {
    type:      'flow-analysis',
    label:     'Flow Analysis',
    defaultW:  8,
    defaultH:  5,
    minW:      5,
    minH:      4,
    icon:      TrendingUp,
    component: FlowAnalysisWidget,
  },
  {
    type:      'portfolio-health',
    label:     'Portfolio Health',
    defaultW:  10,
    defaultH:  6,
    minW:      6,
    minH:      4,
    icon:      Landmark,
    component: PortfolioHealthWidget,
  },
]

// WidgetType은 features/editor/types.ts에서 import — registry.ts는 그 타입을 사용
export type { WidgetType }

export function getWidgetMeta(type: string): WidgetMeta | undefined {
  return WIDGET_REGISTRY.find(w => w.type === type)
}

// 위젯 배치 시 주입되는 기본 data_binding 값.
// DB 집계형(monthly-expenses, flow-analysis, portfolio-health)은 null.
export function getDefaultBinding(type: WidgetType): WidgetDataBinding {
  switch (type) {
    case 'post-it':
      return { lines: ['새 메모를 입력하세요.'] }
    case 'quote':
      return { text: '"A penny saved is a penny earned."', author: 'BENJAMIN FRANKLIN' }
    case 'savings-goal':
      return { label: '목표 이름', current: 0, target: 1000000 }
    default:
      return null
  }
}
