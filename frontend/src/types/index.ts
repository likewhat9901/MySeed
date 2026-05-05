// ─── src/types/index.ts ───────────────────────────────────────────────────────
// 프로젝트 전역 공통 타입 모음.
//
// 유지보수 가이드:
//   - 특정 도메인에만 쓰이는 타입은 해당 features/ 또는 _hooks/ 파일에 두세요.
//   - 2개 이상의 도메인에서 공유되는 타입만 여기에 올립니다.
//   - 도메인별 타입이 많아지면 types/auth.ts, types/editor.ts 등으로 분리하세요.

// ── 언어(로케일) ──────────────────────────────────────────────────────────────
// 지원 언어 목록. LocaleContext, LocaleSwitcher, headerMessages 가 이 타입을 씁니다.
export type Locale = 'en' | 'ko'

// ── 토스트 알림 ───────────────────────────────────────────────────────────────
// 토스트 알림 종류. ToastContext 와 Toaster 컴포넌트가 이 타입을 씁니다.
export type ToastVariant = 'info' | 'warning' | 'success' | 'error'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

// ── 캔버스 저장 상태 ──────────────────────────────────────────────────────────
// useCanvasPersist 와 LeftSidebar 저장 버튼이 이 타입을 씁니다.
// idle → saving → saved | error → idle
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
