// constants/editor.ts — 에디터·캔버스 상수

import { BRAND_COLORS } from './brand'
import type { WidgetStyle } from '@/features/editor/types'

// 그리드 셀 한 칸의 픽셀 크기. 위젯 좌표(x, y, w, h)는 이 단위를 기준으로 합니다.
export const CELL_SIZE = 40

// 새 위젯 배치 시 초기값으로 주입되는 기본 스타일.
export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  accentColor:  BRAND_COLORS.light,
  borderRadius: 12,
  dropShadow:   true,
}
