// ─── src/constants/index.ts ───────────────────────────────────────────────────
// 프로젝트 전역 상수 모음.
//
// 유지보수 가이드:
//   - 값을 바꿀 때 이 파일만 수정하면 됩니다.
//   - 새 상수는 관련 섹션 아래에 추가하세요.
//   - 도메인이 너무 커지면 constants/auth.ts, constants/editor.ts 등으로 분리하세요.

// ── 인증 / 라우팅 ─────────────────────────────────────────────────────────────
// 로그인이 필요한 경로 prefix 목록.
// middleware.ts 와 AuthContext.tsx 가 이 목록을 기준으로 리다이렉트합니다.
export const PROTECTED_PATHS = ['/editor', '/profile'] as const

// ── 브랜드 색상 ───────────────────────────────────────────────────────────────
// Tailwind config 의 brand-* 색상과 1:1 대응합니다.
// 인라인 style prop 이 필요할 때만 사용하고, 가능하면 Tailwind 클래스를 쓰세요.
export const BRAND_COLORS = {
  darker:  '#154a26',
  dark:    '#1a5c2e',
  DEFAULT: '#2d8c4e',
  light:   '#16a34a',
  darkest: '#164d26',
} as const

// ── 에디터 / 캔버스 ───────────────────────────────────────────────────────────
// 그리드 셀 한 칸의 픽셀 크기. 위젯 좌표(x, y, w, h)는 이 단위를 기준으로 합니다.
export const CELL_SIZE = 40

// 위젯의 기본 스타일. 새 위젯 배치 시 이 값이 초기값으로 주입됩니다.
export const DEFAULT_WIDGET_STYLE = {
  accentColor: BRAND_COLORS.light,
  borderRadius: 12,
  dropShadow: true,
} as const

// ── 홈 / 장부 썸네일 ──────────────────────────────────────────────────────────
// 장부 순서(index % length)에 따라 순환 적용되는 Tailwind 그라디언트 클래스 목록.
export const THUMB_COLORS = [
  'from-blue-900 via-blue-700 to-cyan-500',
  'from-purple-700 via-pink-600 to-rose-400',
  'from-green-800 via-emerald-600 to-teal-400',
  'from-orange-700 via-amber-600 to-yellow-400',
  'from-slate-700 via-slate-500 to-gray-400',
] as const

// ── ImportMapper / 위젯 한글 레이블 ──────────────────────────────────────────
// WidgetType → 한글 표시명 매핑. ImportMapper 하단 칩에 표시됩니다.
export const WIDGET_LABELS: Record<string, string> = {
  'savings-goal':     '저축 목표',
  'monthly-expenses': '월별 지출',
  'post-it':          '포스트잇',
  'quote':            '명언',
  'flow-analysis':    '흐름 분석',
  'portfolio-health': '포트폴리오',
  'table':            '테이블',
  'list':             '리스트',
}
