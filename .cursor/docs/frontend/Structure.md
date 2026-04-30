# Frontend 코드 구조 상세 문서

> 기준 경로: `frontend/src/`  
> 마지막 갱신: 2026-04-24  
> 구조·역할·연결이 바뀌면 이 파일도 같이 갱신한다.

---

## 📁 전체 디렉터리 트리

```
src/
├── proxy.ts                          # Next.js 미들웨어 (보호 경로 접근 제어)
│
├── app/
│   ├── layout.tsx                    # 루트 레이아웃 (서버)
│   ├── globals.css                   # 전역 스타일 (Tailwind v4)
│   ├── loading.tsx                   # 전역 로딩 스피너
│   ├── error.tsx                     # 전역 에러 바운더리 (클라이언트)
│   ├── not-found.tsx                 # 404 페이지
│   ├── api/route.ts                  # 헬스체크 API
│   ├── error-test/page.tsx           # 에러 테스트 (개발용)
│   │
│   ├── (home)/                       # 홈 라우트 그룹 → URL: /
│   │   ├── page.tsx
│   │   ├── HeroSection.tsx
│   │   └── _components/
│   │       ├── LoggedInView.tsx
│   │       └── LoggedOutView.tsx
│   │
│   ├── (main)/editor/                # 에디터 라우트 그룹 → URL: /editor
│   │   ├── page.tsx
│   │   ├── Editor.tsx
│   │   ├── constants.ts
│   │   ├── _components/
│   │   │   ├── Canvas.tsx
│   │   │   ├── LeftSidebar.tsx
│   │   │   ├── BottomToolbar.tsx
│   │   │   ├── EditorFooter.tsx
│   │   │   └── RightSidebar/
│   │   │       ├── index.tsx
│   │   │       ├── PropertiesPanel.tsx
│   │   │       └── WidgetsPanel.tsx
│   │   ├── _context/
│   │   │   ├── EditorContext.tsx
│   │   │   ├── useUIState.ts
│   │   │   ├── useViewportState.ts
│   │   │   └── useWidgetState.ts
│   │   ├── _hooks/
│   │   │   ├── useCanvasPersist.ts
│   │   │   ├── useDragWidget.ts
│   │   │   ├── useEditorViewport.ts
│   │   │   ├── useResizeWidget.ts
│   │   │   └── useWidgets.ts
│   │   └── _widgets/
│   │       ├── registry.ts
│   │       ├── ExpenseMemoWidget.tsx
│   │       ├── FlowAnalysisWidget.tsx
│   │       ├── MonthlyExpensesWidget.tsx
│   │       ├── PortfolioHealthWidget.tsx
│   │       ├── PostItNoteWidget.tsx
│   │       ├── QuoteWidget.tsx
│   │       └── SavingsGoalWidget.tsx
│   │
│   ├── auth/
│   │   ├── callback/route.ts         # OAuth 콜백 처리
│   │   ├── login/page.tsx            # /로 리다이렉트 (임시)
│   │   └── signup/
│   │       ├── page.tsx
│   │       ├── _components/
│   │       │   ├── SignupPanel.tsx
│   │       │   └── ui/
│   │       │       ├── PasswordInput.tsx
│   │       │       └── SocialButtons.tsx
│   │       └── _hooks/
│   │           └── useSignup.ts
│   │
│   └── profile/
│       ├── mypage/page.tsx           # 계정 설정
│       └── settings/page.tsx        # (플레이스홀더)
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx                # 서버 컴포넌트 헤더
│   │   ├── HeaderClient.tsx          # 클라이언트 헤더 인터랙션
│   │   └── Footer.tsx
│   ├── header/
│   │   ├── LocaleSwitcher.tsx
│   │   ├── NotificationPopover.tsx
│   │   └── UserDropdown.tsx
│   └── toast/
│       └── Toaster.tsx
│
├── hooks/
│   └── useAuth.ts                    # AuthContext 공개 래퍼
│
├── lib/
│   ├── auth/
│   │   └── AuthContext.tsx           # 전역 인증 Context + Provider
│   ├── i18n/
│   │   ├── LocaleContext.tsx
│   │   ├── LocaleProvider.tsx
│   │   └── headerMessages.ts
│   ├── toast/
│   │   └── ToastContext.tsx
│   └── supabase/
│       ├── RPC_SPEC.md               # DB 담당자 전달용 RPC 등록 명세
│       ├── supabase_guide.md         # gen:types 가이드
│       ├── core/
│       │   ├── client.ts             # 브라우저 클라이언트 싱글톤
│       │   └── server.ts             # 서버/미들웨어 클라이언트
│       ├── rpc/
│       │   ├── auth.ts               # Auth 함수 전체
│       │   ├── canvas.ts             # 위젯 배치 RPC
│       │   ├── ledger.ts             # ledger RPC
│       │   └── functions.ts         # RPC 타입 계약 (문서용)
│       └── types/
│           ├── database.types.ts     # Supabase CLI 자동 생성 스키마
│           └── schema.ts             # 프론트용 DB 타입 (Pick 기반)
│
└── types/
    └── editor.ts                     # 에디터 도메인 공통 타입
```

---

## 📄 파일별 상세

### `src/proxy.ts`

| 항목 | 내용 |
|------|------|
| **역할** | Next.js 미들웨어. `/editor`, `/profile` 접근 시 로그인 여부 검사 |
| **동작** | `createSupabaseMiddlewareClient` → `getUser()` → 미로그인이면 `/?redirect=경로&reason=auth` 리다이렉트 |
| **export** | `proxy` (미들웨어 함수), `config` (matcher) |
| **주의** | 파일명이 `proxy.ts`라 `next.config.ts`에서 `middleware`로 연결 필요 |

---

## `app/` 루트

### `app/layout.tsx` — 서버 컴포넌트

| 항목 | 내용 |
|------|------|
| **역할** | 앱 루트 레이아웃. 폰트·Providers·Header 조립 |
| **동작** | `cookies()`로 locale 읽기 → `I18nProvider(locale)` + `AuthProvider(initialLoggedIn)` 래핑 |
| **SSR** | `getServerUser()` 호출 → `initialLoggedIn` 계산 후 클라이언트 Provider에 전달 (깜빡임 방지) |
| **export** | `default`(RootLayout), `metadata` |

### `app/globals.css`

Tailwind v4 `@import` + CSS 변수 정의. `--brand`, `--brand-dark` 색상 토큰 포함.

### `app/loading.tsx` / `app/error.tsx` / `app/not-found.tsx`

| 파일 | 역할 |
|------|------|
| `loading.tsx` | 전역 로딩 스피너 (Suspense fallback) |
| `error.tsx` | 전역 에러 UI + `reset()` 버튼. `'use client'` 필수 |
| `not-found.tsx` | 404 페이지 + 홈 링크 |

### `app/api/route.ts`

`GET /api` → `{ status: 'ok' }` 헬스체크 엔드포인트.

### `app/error-test/page.tsx`

서버에서 `throw new Error` — `error.tsx` 동작 테스트용. **프로덕션 배포 시 제거 또는 접근 제한 필요.**

---

## `app/(home)/` — 홈

### `app/(home)/page.tsx`

`HeroSection` + `Footer` 조립. 서버 컴포넌트.

### `app/(home)/HeroSection.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 로그인 상태에 따라 `LoggedInView` / `LoggedOutView` 분기 |
| **읽는 상태** | `useAuth()` → `loggedIn` |
| **export** | `default` |

### `app/(home)/_components/LoggedInView.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 로그인 홈. 유저의 ledger 목록(그리드/리스트 토글) + "My Blueprint" 섹션 |
| **데이터** | `getMyLedgers(user.id)` 호출 → `useEffect`로 마운트 시 로드 |
| **상태** | `view: 'grid' \| 'list'`, `ledgers`, `loading` |
| **import** | `useAuth`, `rpc/ledger` |
| **export** | `default` |

### `app/(home)/_components/LoggedOutView.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 비로그인 홈. 랜딩 텍스트 + 이메일/비밀번호 로그인 폼 + Google OAuth 버튼 |
| **데이터** | `useAuth().login()` (이메일), `signInWithGoogle()` (OAuth) |
| **URL 파라미터** | `reason=auth` 시 경고 토스트 표시 후 파라미터 제거 |
| **import** | `useAuth`, `rpc/auth`, `ToastContext`, `next/navigation` |
| **export** | `default` |

---

## `app/(main)/editor/` — 에디터

### `app/(main)/editor/page.tsx`

`<Editor />` 마운트만. 서버 컴포넌트(자식이 클라이언트).

### `app/(main)/editor/Editor.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | `EditorProvider` 최상단 래핑. Ctrl+S 키 이벤트 바인딩. 3단(좌/캔버스/우) 레이아웃 렌더링 |
| **구성** | `EditorProvider` > `LeftSidebar` + `Canvas` + `RightSidebar` + `EditorFooter` |
| **키보드** | `Ctrl+S` → `saveCanvas()` |
| **export** | `default` |

### `app/(main)/editor/constants.ts`

```ts
CELL_SIZE = 48   // 그리드 한 칸 px
GRID_ROWS = 20   // 그리드 행 수
```

### `app/(main)/editor/_components/Canvas.tsx`

| 항목 | 내용 |
|------|------|
| **역할** | 실제 캔버스 렌더. 위젯 배치, 고스트 미리보기, 줌/Undo UI |
| **읽는 Context** | `useEditorContext()` — widgets, viewport, drag/resize, addWidget 등 |
| **내부 컴포넌트** | `WidgetRenderer`(타입별 위젯 분기), `WidgetWrapper`(드래그·리사이즈 핸들), `ZoomControl`, `GridToggle`, `UndoRedo`(스텁) |
| **`'use client'`** | 없음 (부모 Editor가 클라이언트라 자동 포함) |

### `app/(main)/editor/_components/LeftSidebar.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 좌측 파일 탐색기(목업), 툴 아이콘, Save Draft 버튼 |
| **데이터** | `FOLDERS` 하드코딩. 실제 ledger 연동 미구현 |
| **읽는 Context** | `useEditorContext()` → `activeTool`, `setActiveTool` |

### `app/(main)/editor/_components/BottomToolbar.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 하단 도구 모음. ADD WIDGET 드롭다운 (registry 연동 자동 목록) |
| **읽는 Context** | `useEditorContext()` → `addWidget`, `activeTool`, `setActiveTool` |

### `app/(main)/editor/_components/EditorFooter.tsx`

버전·링크 한 줄 정적 푸터.

### `app/(main)/editor/_components/RightSidebar/index.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | WIDGETS / PROPERTIES 탭 토글. 사이드바 접힘(w-72 ↔ w-12) |
| **읽는 Context** | `useEditorContext()` → `activeTab`, `setActiveTab`, `isSidebarOpen`, `toggleSidebar` |
| **자식** | `WidgetsPanel`, `PropertiesPanel` |

### `app/(main)/editor/_components/RightSidebar/PropertiesPanel.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 선택된 위젯의 x/y/w/h, bgColor, borderRadius, shadow, opacity 편집 |
| **읽는 Context** | `selectedWidget`, `updateWidget` |
| **상태** | DATA·ADVANCED 탭은 UI만 있고 기능 미구현 |

### `app/(main)/editor/_components/RightSidebar/WidgetsPanel.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 위젯 카탈로그. 격자/리스트 토글. 클릭 시 고스트 배치 모드 진입 |
| **데이터** | `WIDGET_REGISTRY` 자동 연동 |
| **읽는 Context** | `useEditorContext()` → `startGhostPlacement` |

---

## `app/(main)/editor/_context/`

### `EditorContext.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 에디터 전체 상태를 하나의 Context로 공급. 컴포넌트 간 prop drilling 제거 |
| **조합** | `useViewportState` + `useWidgetState` + `useUIState` + `useCanvasPersist` |
| **추가 로직** | 위젯 더블클릭 시 PROPERTIES 탭 + 사이드바 자동 오픈 |
| **export** | `EditorProvider`, `useEditorContext`, `CELL_SIZE`, `GRID_ROWS` (re-export) |

### `useUIState.ts` — `'use client'`

| 상태 | 타입 | 초기값 |
|------|------|--------|
| `activeTool` | `ActiveTool` | `'select'` |
| `activeTab` | `'WIDGETS' \| 'PROPERTIES'` | `'WIDGETS'` |
| `isSidebarOpen` | `boolean` | `true` |
| `isGridVisible` | `boolean` | `true` |
| `undo` / `redo` | 함수 | 빈 함수(스텁) |

### `useViewportState.ts` — `'use client'`

`useEditorViewport`를 래핑. `canvasRef`, `viewport(scale/offsetX/offsetY)`, `zoomIn/zoomOut` 노출.

### `useWidgetState.ts` — `'use client'`

`useWidgets` + `useDragWidget` + `useResizeWidget` 세 훅을 조합. 위젯 CRUD·드래그·리사이즈 상태 통합 노출.

---

## `app/(main)/editor/_hooks/`

### `useCanvasPersist.ts` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 에디터 마운트 시 ledger/위젯 로드. 수동 저장 트리거 |
| **마운트 플로우** | `getCurrentUser()` → `getOrCreateLedger(user.id)` → `getCanvasWidgets(led_id)` |
| **저장** | `saveCanvas()` → `saveCanvasWidgets(canvasId, widgets)` |
| **상태** | `canvasId`, `saveStatus('idle\|saving\|saved\|error')`, `lastSavedAt`, `initialWidgets` |
| **import** | `rpc/auth`, `rpc/ledger`, `rpc/canvas` |

### `useDragWidget.ts`

| 항목 | 내용 |
|------|------|
| **역할** | 위젯 드래그. AABB 충돌 감지 |
| **기법** | `setPointerCapture`로 마우스 캡처, 그리드 단위 스냅 |
| **반환** | `startDrag`, `isDragging` |

### `useEditorViewport.ts`

| 항목 | 내용 |
|------|------|
| **역할** | 마우스 휠 줌, 가운데 버튼 팬, 줌 버튼 |
| **반환** | `viewport(scale/offsetX/offsetY)`, `canvasRef`, `zoomIn/Out/Reset` |
| **주의** | `passive: false` 휠 이벤트 (스크롤 방지) |

### `useResizeWidget.ts`

8방향 리사이즈 핸들. 충돌 감지 포함. `startResize`, `isResizing` 반환.

### `useWidgets.ts`

| 항목 | 내용 |
|------|------|
| **역할** | 위젯 목록 CRUD, 선택, 고스트(미리보기) 배치 |
| **초기화** | `initialWidgets` prop이 null → 로딩 중, 배열 오면 `useEffect`로 세팅 |
| **위젯 id** | `Date.now()` 기반 문자열 (DB 저장 후 con_id로 교체 필요) |
| **반환** | `widgets`, `selectedId`, `selectWidget`, `addWidget`, `updateWidget`, `deleteWidget`, `startGhostPlacement`, `widgetsRef` |

---

## `app/(main)/editor/_widgets/`

### `registry.ts`

| 항목 | 내용 |
|------|------|
| **역할** | 위젯 타입·라벨·기본 크기·컴포넌트를 단일 파일로 관리 (SSOT) |
| **export** | `WIDGET_REGISTRY`, `WidgetType`(유니온), `WidgetMeta`, `getWidgetMeta` |
| **연동** | `Canvas`, `BottomToolbar`, `WidgetsPanel`, `useWidgets`가 모두 이 registry를 참조 |

### 위젯 컴포넌트 7개 (모두 `'use client'`, 목업 데이터)

| 파일 | 표시명 | 기본 크기 |
|------|--------|-----------|
| `ExpenseMemoWidget.tsx` | 지출 메모 | 4×3 |
| `PostItNoteWidget.tsx` | 포스트잇 | 3×3 |
| `QuoteWidget.tsx` | 명언 | 4×2 |
| `FlowAnalysisWidget.tsx` | 수입/지출 흐름 | 5×4 |
| `PortfolioHealthWidget.tsx` | 포트폴리오 건강도 | 4×4 |
| `MonthlyExpensesWidget.tsx` | 월별 지출 | 4×3 |
| `SavingsGoalWidget.tsx` | 저축 목표 | 3×4 |

---

## `app/auth/`

### `auth/callback/route.ts` — Route Handler (서버)

| 항목 | 내용 |
|------|------|
| **역할** | Google OAuth `code` → Supabase `exchangeCodeForSession` → `next` 파라미터로 리다이렉트 |
| **실패 시** | `/auth/login?error=oauth` 리다이렉트 |
| **import** | `createSupabaseServerClient`, `next/headers` |

### `auth/login/page.tsx`

`/` 로 `redirect()`. 홈에서 로그인 폼을 직접 보여주므로 현재는 임시 처리.

### `auth/signup/page.tsx`

회원가입 레이아웃 + `metadata`. 서버 컴포넌트. `<SignupPanel />`을 자식으로.

### `auth/signup/_components/SignupPanel.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 회원가입 폼 전체 UI. `useSignup` 훅의 상태·핸들러를 받아 렌더만 담당 |
| **구성** | 이메일 입력 + 인증코드 발송 → 코드 검증 → 비밀번호 설정 3단계 |
| **import** | `useSignup`, `PasswordInput`, `SocialButtons` |

### `auth/signup/_components/ui/PasswordInput.tsx` — `'use client'`

Eye/EyeOff 토글 비밀번호 인풋 재사용 컴포넌트.

### `auth/signup/_components/ui/SocialButtons.tsx`

Google / Kakao 버튼 UI. 현재 핸들러 없음 (플레이스홀더).

### `auth/signup/_hooks/useSignup.ts` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 회원가입 플로우 상태·핸들러 관리 |
| **플로우** | 이메일 입력 → `sendSignupOtp` → `verifySignupOtp` → `updatePassword` |
| **상태** | `codeSendState`, `verifyState`, `signupState` + 각 에러 메시지 |
| **import** | `rpc/auth` |
| **export** | `useSignup`, `VerifyState`, `CodeSendState`, `SignupState` |

---

## `app/profile/`

### `profile/mypage/page.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | Account Settings UI. Personal·Security·Financial·Notification 4개 섹션 |
| **내부 컴포넌트** | `Toggle`, `InfoField`, `Section` (파일 내 인라인 정의) |
| **import** | `useAuth`, lucide |

### `profile/settings/page.tsx`

"Settings" 텍스트 한 줄. 플레이스홀더.

---

## `components/`

### `components/layout/Header.tsx` — 서버 컴포넌트

| 항목 | 내용 |
|------|------|
| **역할** | 고정 nav 껍데기. 로고 + `HeaderClient` 렌더 |
| **주의** | `getServerUser()` 호출은 있으나 결과를 `HeaderClient`에 전달하지 않음. 클라이언트는 `AuthContext`로 직접 인증 상태 읽음 |

### `components/layout/HeaderClient.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 헤더의 클라이언트 인터랙션 전체: 로그인/비로그인 분기, 검색창, 언어 전환, 알림, 아바타 |
| **import** | `useAuth`, `LocaleSwitcher`, `NotificationPopover`, `UserDropdown`, `headerMessages` |

### `components/layout/Footer.tsx`

정적 푸터. 링크·저작권 표시.

### `components/header/LocaleSwitcher.tsx` — `'use client'`

en/ko 드롭다운. 선택 시 `LocaleContext` 업데이트 + 쿠키 저장. 외부 클릭 감지로 닫힘.

### `components/header/NotificationPopover.tsx` — `'use client'`

알림 벨 팝오버. 읽음/전체읽음. 목업 데이터. `headerMessages` 다국어.

### `components/header/UserDropdown.tsx` — `'use client'`

아바타 클릭 드롭다운. 마이페이지·설정 링크 + `logout()`. `user.email` 첫 글자 아바타.

### `components/toast/Toaster.tsx` — `'use client'`

`ToastContext`의 `toasts` 배열을 렌더링. 화면 상단 중앙. `aria-live="polite"`.

---

## `hooks/`

### `hooks/useAuth.ts` — `'use client'`

`useAuthContext()`를 그대로 반환하는 공개 래퍼.  
`AuthContext`를 직접 import하지 않아도 되는 편의 훅.

```ts
// 반환값
{ loggedIn: boolean, user: User | null, login, logout }
```

---

## `lib/`

### `lib/auth/AuthContext.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 앱 전체 인증 상태 공급 Provider |
| **초기화** | `initialLoggedIn`(SSR) + 마운트 시 `getAuthSession()` 실제 확인 |
| **구독** | `subscribeAuthState()` → 로그인/로그아웃/토큰갱신 자동 반영 |
| **export** | `AuthProvider`, `useAuthContext` |
| **import** | `rpc/auth` (4개: `getAuthSession`, `signIn`, `signOut`, `subscribeAuthState`) |

### `lib/i18n/LocaleContext.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 전역 locale 상태 (en/ko) |
| **영속화** | 변경 시 `document.cookie`에 `locale` 저장 (SSR hydration 깜빡임 방지) |
| **export** | `LocaleProvider`, `useLocale`, `Locale` |

### `lib/i18n/LocaleProvider.tsx` — `'use client'`

`LocaleProvider` + `ToastProvider`를 합친 `I18nProvider`. `layout.tsx`에서 사용.

### `lib/i18n/headerMessages.ts`

헤더 영역 en/ko 번역 텍스트 상수.  
`navMessages`, `userDropdownMessages`, `notificationMessages` 3개 export.

### `lib/toast/ToastContext.tsx` — `'use client'`

| 항목 | 내용 |
|------|------|
| **역할** | 토스트 알림 전역 관리 |
| **동작** | `toast(message, variant)` 호출 → `Toaster`가 렌더 → 4초 자동 소멸 |
| **export** | `ToastProvider`, `useToast`, `ToastVariant`, `ToastItem` |

---

## `lib/supabase/`

### `core/client.ts`

```ts
getSupabaseBrowserClient()  // 브라우저 Supabase 싱글톤
// 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### `core/server.ts`

```ts
createSupabaseMiddlewareClient(req, res)  // proxy.ts용
createSupabaseServerClient()              // Route Handler / RSC용
getServerUser()                           // 서버에서 현재 유저 반환
```

### `rpc/auth.ts` — `'use client'`

| 함수 | 동작 |
|------|------|
| `sendSignupOtp(email)` | `auth.signUp()` → OTP 이메일 발송 |
| `verifySignupOtp(email, token)` | `auth.verifyOtp()` → signup 타입 |
| `updatePassword(password)` | `auth.updateUser({ password })` |
| `signInWithGoogle(redirectTo?)` | `auth.signInWithOAuth({ provider: 'google' })` |
| `signIn(email, password)` | `auth.signInWithPassword()` |
| `signOut()` | `auth.signOut()` |
| `getCurrentUser()` | `auth.getUser()` → User |
| `getAuthSession()` | `auth.getSession()` → Session |
| `subscribeAuthState(callback)` | `auth.onAuthStateChange()` → unsubscribe 반환 |

### `rpc/ledger.ts` — `'use client'`

| 함수 | RPC 이름 | 설명 |
|------|----------|------|
| `getOrCreateLedger(memId)` | `get_or_create_ledger` | 최신 ledger 조회 또는 자동 생성 |
| `getMyLedgers(memId)` | `get_my_ledgers` | 전체 ledger 목록 |
| `createLedger(memId, name?)` | `create_ledger` | 새 ledger 명시적 생성 |

타입: `LedgerSummary { led_id, led_name, regist_dt? }`

### `rpc/canvas.ts` — `'use client'`

| 함수 | RPC 이름 | 설명 |
|------|----------|------|
| `getCanvasWidgets(ledId)` | `get_canvas_widgets` | 위젯 배치 목록 조회 |
| `saveCanvasWidgets(ledId, widgets)` | `replace_canvas_widgets` | 위젯 배치 전체 교체 (트랜잭션) |

### `rpc/functions.ts`

RPC 인자/반환 타입 계약 문서. `database.types.ts`와 정합성 체크용.  
현재 `test_rpc`만 활성화. ledger/canvas 체크 코드는 주석 처리됨.

### `types/database.types.ts`

`npm run gen:types` 로 자동 생성. **직접 수정하지 않는다.**  
현재 `Functions`에 `test_rpc`만 정의됨 (ledger/canvas RPC 타입 미등록 상태).

### `types/schema.ts`

| 타입 | 대응 테이블 |
|------|------------|
| `WidgetPosition` | `tb_widget_config.position` jsonb 구조 |
| `DbMember` | `tb_member` |
| `DbLedger` | `tb_ledger` |
| `DbWidget` | `tb_widget` (위젯 카탈로그) |
| `DbWidgetConfig` | `tb_widget_config` |
| `DbRecord` | `tb_record` (미구현) |
| `DbTemplate` | `tb_template` (미구현) |
| `DbCategory` | `tb_category` (미구현) |
| `DbFile` | `tb_file` (미구현) |

---

## `types/`

### `types/editor.ts`

| export | 설명 |
|--------|------|
| `WidgetType` | registry에서 re-export한 위젯 타입 유니온 |
| `WidgetItem` | `{ id, type, x, y, w, h, style }` — 캔버스 위젯 인스턴스 |
| `WidgetStyle` | `{ borderRadius, shadow, opacity, bgColor, textColor }` |
| `DEFAULT_WIDGET_STYLE` | 기본 스타일 상수 |
| `BRAND_COLORS` | 브랜드 색상 팔레트 상수 |
| `ActiveTool` | `'select' \| 'hand' \| 'text' \| ...` |
| `ResizeHandle` | `'n' \| 'ne' \| 'e' \| ...` 8방향 |
| `PendingWidget` | 고스트 배치 중 임시 위젯 |
| `GRID_COLS` | 그리드 열 수 상수 |

---

## 🔗 주요 데이터 흐름

### 인증 흐름

```
layout.tsx (서버)
  └─ getServerUser() → initialLoggedIn
        └─ AuthProvider(initialLoggedIn)
              └─ getAuthSession() + subscribeAuthState() [마운트 시]
                    └─ { loggedIn, user } → useAuth() → 각 컴포넌트
```

### 에디터 데이터 흐름

```
Editor.tsx
  └─ EditorProvider
        ├─ useCanvasPersist
        │     ├─ getCurrentUser() [rpc/auth]
        │     ├─ getOrCreateLedger(user.id) [rpc/ledger]
        │     └─ getCanvasWidgets(led_id) [rpc/canvas] → initialWidgets
        │
        ├─ useWidgets(initialWidgets) → widgets[], selectWidget, addWidget ...
        ├─ useViewportState → scale, offset, canvasRef
        └─ useUIState → activeTool, activeTab, isGridVisible
```

### 위젯 저장 흐름

```
Ctrl+S / 저장 버튼
  └─ saveCanvas() [useCanvasPersist]
        └─ saveCanvasWidgets(canvasId, widgetsRef.current) [rpc/canvas]
              └─ supabase.rpc('replace_canvas_widgets', ...)
```

---

## ⚠️ 현재 알려진 이슈 / TODO

| 항목 | 위치 | 내용 |
|------|------|------|
| RPC 미등록 | Supabase 대시보드 | `get_or_create_ledger` 등 5개 RPC 아직 등록 안 됨 → `RPC_SPEC.md` 참고 |
| 위젯 id | `useWidgets.ts` | `Date.now()` 기반 → DB 저장 후 충돌 가능, `crypto.randomUUID()` 교체 검토 |
| `Header.tsx` | `components/layout/Header.tsx` | `getServerUser()` 결과를 `HeaderClient`에 넘기지 않음 (미사용 변수) |
| `SocialButtons.tsx` | `auth/signup/_components/ui/` | Google/Kakao 버튼에 핸들러 없음 (플레이스홀더) |
| `rpc/functions.ts` | `lib/supabase/rpc/` | ledger/canvas RPC 타입 체크 주석 처리 상태 |
| `database.types.ts` | `lib/supabase/types/` | `Functions`에 실제 RPC 타입 미포함 → RPC 등록 후 `gen:types` 실행 필요 |
| `error-test/page.tsx` | `app/error-test/` | 프로덕션 배포 시 제거 또는 접근 제한 필요 |
| Undo/Redo | `useUIState.ts` | 빈 함수 스텁, 미구현 |
| `LeftSidebar` 탐색기 | `_components/LeftSidebar.tsx` | `FOLDERS` 하드코딩, ledger 연동 미구현 |
