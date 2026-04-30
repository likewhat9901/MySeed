# Frontend Changelog

> 날짜 섹션(`## [YYYY-MM-DD]`) 아래 `### Added` / `### Changed` / `### Fixed` / `### Removed`에 한 줄 요약.  
> 상세 파일·라인은 괄호에 표기. 같은 날짜는 하나의 섹션으로 합산.

---

## [2026-04-27]

### Added

- **캔버스 위젯 Undo/Redo**: 스냅샷 스택(`useWidgetHistory`), 드래그·리사이즈 시작·CRUD·고스트 배치 직전 커밋, `canvasId` 변경 시 히스토리 리셋, Ctrl+Z / Ctrl+Y·Shift+Z 단축키

### Fixed

- **Undo 스텝 뭉침**: 드래그·리사이즈는 그리드 값이 처음 바뀔 때만 1회 커밋, 속성 패널(`updateWidget`)은 400ms idle 안에서는 커밋 1회만 (`useDragWidget`, `useResizeWidget`, `useWidgets`)

### Removed

- **불필요 파일 정리**: `supabase_guide.md`·`RPC_SPEC.md`(중복)·`api/route.ts` 삭제, `Header.tsx` 불필요 `getServerUser` 호출 제거
- **미사용 export 제거**: `GRID_COLS`(types.ts), `GRID_ROWS`(constants.ts), `EXPENSE_MEMO_CATEGORIES`(widgetData.ts), `NavMessages`·`UserDropdownMessages`(headerMessages.ts)
- **중복 코드 통합**: `ChevronSideIcon` 단일 컴포넌트로 통합(LeftSidebar/icons.tsx), 바깥 클릭 로직 `useOutsideClick` 훅으로 교체(LocaleSwitcher·UserDropdown·NotificationPopover)

### Changed

- **API 파일 주석·타입 정리**: `auth`·`ledger`·`editor` API 상단 구성요소 목록 추가, 함수별 row/payload 타입 분리 (`features/*/api.ts`)
- **RPC 계약·RLS 검증 체계 분리**: `RPC_SPEC.md`를 인덱스로 축소, RPC별 계약 문서 추가, 개발 환경 RPC 실패 throw 처리 (`lib/supabase/RPC_SPEC.md`, `rpc-specs`, `core/rpc.ts`)
- **RPC 계약 문서·헬퍼 간소화**: 함수별 계약 문서 핵심 항목만 유지, RPC 실패 메시지 생성 로직 축소 (`rpc-specs`, `core/rpc.ts`)

---

## [2026-04-24]

### Added

- **`rpc/auth.ts` 신규**: Auth 함수 9종 전체 통합 (`sendSignupOtp`, `verifySignupOtp`, `updatePassword`, `signInWithGoogle`, `signIn`, `signOut`, `getCurrentUser`, `getAuthSession`, `subscribeAuthState`) (`lib/supabase/rpc/auth.ts`)
- **`create_ledger` RPC 추가**: `rpc/ledger.ts`에 새 ledger 명시적 생성 함수 추가
- **RPC 명세서 작성**: 친구(DB 담당) 전달용 RPC 등록 스펙 문서 (`lib/supabase/RPC_SPEC.md`)

### Changed

- **`Structure.md` 전면 재작성**: 파일별 역할·export·import·데이터 흐름·이슈 상세 문서화 (`.cursor/docs/frontend/Structure.md`)
- **`queries/` 폴더 제거**: `auth.ts`, `ledger.ts`, `widgetConfig.ts` 삭제 — 모든 Supabase 접근을 `rpc/`로 일원화
- **`USE_MOCK` 전면 제거**: `rpc/ledger.ts`, `rpc/canvas.ts`, `rpc/auth.ts` 모두 실 Supabase 호출로 전환
- **`AuthContext.tsx` import 경로 전환**: `queries/auth` → `rpc/auth`
- **Auth import 경로 전환**: `queries/auth` → `rpc/auth` (`useSignup.ts`, `LoggedOutView.tsx`, `useCanvasPersist.ts`)

---

## [2026-04-19]

### Added

- **RPC 레이어 구현**: `rpc/ledger.ts` (get_or_create_ledger, get_my_ledgers), `rpc/canvas.ts` (get_canvas_widgets, replace_canvas_widgets) Mock 포함 구현, `USE_MOCK=false`로 즉시 전환 가능
- **홈 ledger 목록 실데이터 연결**: `LoggedInView.tsx` MOCK → `getMyLedgers` RPC, 로딩 스켈레톤·상대 시간 포맷 추가
- **Supabase 자동 타입 생성 도입**: `database.types.ts` 자동 생성, `schema.ts`가 이를 참조 (`lib/supabase/database.types.ts`, `schema.ts`, `npm run gen:types`)
- **캔버스 수동 저장**: Ctrl+S / 저장 버튼으로 위젯 상태를 Supabase에 저장, 저장 상태(`saving/saved/error`) 푸터 표시 (`EditorFooter.tsx`, `_hooks/useCanvasPersist.ts`)
- **위젯 영속화**: 에디터 진입 시 DB에서 위젯 목록 자동 로드, 신규 유저는 빈 캔버스 자동 생성 (`useCanvasPersist.ts`, `useWidgets.ts`)
- **전역 인증 Context 도입**: `AuthProvider` / `useAuthContext` 구현, 모든 컴포넌트가 단일 인증 상태 공유 (`lib/auth/AuthContext.tsx`)
- **`AuthProvider` 레이아웃 탑재**: SSR 초기값(`initialLoggedIn`) 포함 Provider를 앱 루트에 주입 (`app/layout.tsx`)
- **`useSignup` 훅 분리**: 회원가입 상태·핸들러 로직을 SignupPanel에서 분리, SRP 적용 (`hooks/useSignup.ts` → `app/auth/signup/_hooks/useSignup.ts`)
- **`EditorContext` 도입**: 에디터 전체 상태·핸들러를 Context로 공급, Canvas props 31개 → 0개 제거 (`editor/_context/EditorContext.tsx`)

### Changed

- **`useCanvasPersist` RPC 전환**: `queries/ledger, widgetConfig` → `rpc/ledger, rpc/canvas` 로 import 교체 (`_hooks/useCanvasPersist.ts`)
- **`EditorContext` persist 연결**: `useCanvasPersist` 추가, `widgetsRef`로 항상 최신 위젯 저장, `canvasId/saveStatus/saveCanvas` Context 노출 (`EditorContext.tsx`)
- **`middleware.ts` → `proxy.ts` 마이그레이션**: Next.js 16 파일명·함수명 규칙 변경, deprecated 경고 제거 (`src/proxy.ts`)
- **에디터 상수 분리**: `CELL_SIZE` / `GRID_ROWS`를 `EditorContext`에서 `editor/constants.ts`로 이동, 순환 참조 제거
- **Supabase 인증 연동 — Mock 전면 제거**: `useAuth` Mock 로그인/로그아웃 → `signInWithPassword` / `signOut` 교체, `user` 상태 추가 (`hooks/useAuth.ts`)
- **미들웨어 보안 강화**: `getSession()` → `getUser()` 교체, `cw_authenticated` Mock 우회 분기 제거 (`middleware.ts`)
- **서버 컴포넌트 인증**: `cw_authenticated` 쿠키 판단 → `getServerUser()` 헬퍼로 교체 (`Header.tsx`, `HeroSection.tsx`)
- **`getServerUser()` 헬퍼 추가**: Server Component용 유저 조회 공통 함수 (`lib/supabase/server.ts`)
- **회원가입 Mock 분기 제거**: `IS_DEV_MOCK` / `DEV_MOCK_CODE` 상수 및 분기 3곳 삭제 (`auth/signup/_components/SignupPanel.tsx`)
- **UserDropdown 실유저 정보**: 하드코딩 이름·이메일 → `useAuth`의 `user` 객체로 교체, 아바타 첫 글자 동적 표시 (`components/header/UserDropdown.tsx`)
- **환경변수 키 이름 통일**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`lib/supabase/server.ts`, `lib/supabase/client.ts`)

---

## [2026-04-12]

### Added

- **Toast 알림 시스템**: `ToastProvider` + `useToast` 훅 추가, 화면 상단 중앙 토스트 UI (`lib/toast/ToastContext.tsx`)
- **그리드/리스트 뷰 전환**: `LedgerRow` 컴포넌트 추가, 뷰 모드에 따라 실제 렌더링 분기 (`LoggedInView.tsx`)
- **NotificationPopover**: 알림 벨 팝오버 — 읽음/전체읽음, 타입별 컬러 도트 (`components/header/NotificationPopover.tsx`)
- **LocaleSwitcher**: 헤더 언어 선택 드롭다운 — EN/KO, 현재 언어 체크 표시 (`components/header/LocaleSwitcher.tsx`)
- **i18n 기반 헤더 다국어**: `LocaleContext` + `useLocale` 훅, `navMessages` / `userDropdownMessages` / `notificationMessages` 분리 (`lib/i18n/`)
- **Providers 컴포넌트**: `layout.tsx` Server Component에서 Client Provider 래핑용 (`app/Providers.tsx`)

### Changed

- **인증 차단 알림 방식 변경**: amber 인라인 배너 제거 → `useToast("warning")` 토스트로 교체 (`LoggedOutView.tsx`)
- **헤더 위젯 경로 이동**: `(home)/_widgets/` → `components/header/` (`UserDropdown.tsx`, `NotificationPopover.tsx`)
- **Header 다국어 적용**: nav·검색·버튼 텍스트 번역 연동, 인라인 토글 → `LocaleSwitcher` 교체 (`components/layout/Header.tsx`)
- **언어 설정 쿠키 영속화**: 서버 쿠키 기반으로 SSR hydration 깜빡임 없이 유지 (`lib/i18n/LocaleContext.tsx`, `app/layout.tsx`)

---

## [2026-04-10]

### Added

- **Account Settings 페이지**: `/profile/mypage` — 4개 섹션(Personal·Security·Financial·Notification), 좌측 네비 사이드바 (`profile/mypage/page.tsx`)
- **WidgetsPanel 위젯 카탈로그**: WIDGETS 탭에 registry 연동 목록 — 격자/목록 토글, 클릭 시 고스트 배치 모드 진입 (`RightSidebar/WidgetsPanel.tsx`)
- **Widget Registry**: 위젯 타입·라벨·기본 크기·컴포넌트를 단일 파일 관리, Canvas/BottomToolbar/useWidgets 자동 연동 (`_widgets/registry.ts`)
- **위젯 5종 신규**: `ExpenseMemoWidget` / `PostItNoteWidget` / `QuoteWidget` / `FlowAnalysisWidget` / `PortfolioHealthWidget` (`_widgets/`)
- **LoggedInView**: 로그인 홈 My Garden 뷰 — Saved Ledgers 그리드 + Blueprint 섹션 (`(home)/_components/LoggedInView.tsx`)
- **LoggedOutView**: 비로그인 홈 분리 — 히어로 + 로그인 폼 (`(home)/_components/LoggedOutView.tsx`)
- **UserDropdown 팝오버**: 아바타 클릭 시 계정 메뉴·로그아웃 팝오버 (`(home)/_widgets/UserDropdown.tsx`)

### Changed

- **UserDropdown 링크 수정**: Account Settings `/profile/settings` → `/profile/mypage` (`UserDropdown.tsx`)
- **RightSidebar `onAddWidget` 연결**: `Editor → RightSidebar → WidgetsPanel` prop 전달 (`RightSidebar/index.tsx`, `Editor.tsx`)
- **Widget Registry static import 전환**: `lazy` / `Suspense` 제거 → static import, 첫 배치 딜레이 제거 (`registry.ts`, `Canvas.tsx`, `Editor.tsx`)
- **WidgetType 자동 추출**: 수동 유니온 → registry re-export로 교체 (`types/editor.ts:3~4`)
- **Canvas 렌더링 단순화**: 위젯별 분기 7줄 → `WidgetRenderer` 1개로 교체 (`Canvas.tsx`)
- **BottomToolbar 자동 목록**: 하드코딩 배열 → `WIDGET_REGISTRY.map()` 자동 생성 (`BottomToolbar.tsx`)
- **useWidgets 기본 크기 자동화**: 하드코딩 분기 → `getWidgetMeta(type).defaultW/H` (`useWidgets.ts`)
- **HeroSection 위치 이동**: `_components/` → `(home)/` (`HeroSection.tsx`, `page.tsx`)

---

## [2026-04-08]

### Added

- **RightSidebar WIDGETS/PROPERTIES 탭 UI**: 탭 바·X 버튼, 접기/펼치기(`w-72 ↔ w-12`), 위젯 더블클릭 시 PROPERTIES 탭 자동 전환 (`RightSidebar/index.tsx`, `Editor.tsx:26,98~175`)
- **RightSidebar 폴더 분리**: 단일 파일 → `index.tsx` / `PropertiesPanel.tsx` / `WidgetsPanel.tsx` 3파일로 분리

### Changed

- **Brand 색상 토큰화**: hex 하드코딩 → Tailwind `brand-*` 클래스 + `BRAND_COLORS` 상수 일괄 교체 (12개 파일, 30곳+)

---

## [2026-04-07]

### Added

- **회원가입 플로우**: `app/auth/signup/` — 2열 레이아웃, `SignupPanel`(이메일 OTP·Supabase `auth.signUp`), `PasswordInput`, `SocialButtons` (`auth/signup/`)
- **Supabase 클라이언트**: 브라우저 싱글톤 (`lib/supabase/client.ts`)
- **문서**: `FlowChart.md`, `UseCase-Diagram.md` (Mermaid)
- **규칙**: `10-frontend-core.mdc` — CHANGELOG·Structure·Blueprint 기록 절차

### Changed

- **HeroSection**: 로그인/비로그인 UI 전환, 소셜 아이콘, 비밀번호 Eye 토글 등 UI 정리 (`HeroSection.tsx`)
- **Header**: 로그인 상태별 검색·알림·아바타 / 문의·회원가입 분기, `useAuth` 연동 (`Header.tsx`)
- **useAuth 훅 분리**: 인증 상태·스토리지 로직 → `hooks/useAuth.ts` 통합
- **Editor 훅 분리**: 467줄 → `useEditorViewport` / `useDragWidget` / `useResizeWidget` / `useWidgets` 4개로 분리 (`editor/_hooks/`)
- **위젯 폴더 이동**: `_components/widgets/` → `editor/_widgets/` (`Canvas.tsx:2~3`)
- **브랜드명 통일**: `CreateWealth` → `MySeed` (`layout.tsx`, `Header.tsx`, `Footer.tsx`, `signup/page.tsx`)
- **인증 URL 정비**: `/auth/login`, `/auth/signup` 경로 정합

### Removed

- `PhoneInput.tsx` 및 전화 인증 흐름
- `.env.local` `NEXT_PUBLIC_SUPABASE_*` (값 커밋 안 함)

---

## [2026-04-06]

### Added

- **Editor 핵심 기능**: 위젯 드래그·리사이즈(AABB 충돌), 마우스 기준 휠 줌, 고스트 미리보기 (`Editor.tsx`, `Canvas.tsx`)

---

## [2026-04-05]

### Added

- 초기 프로젝트 셋업

