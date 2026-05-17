// ─── lib/i18n/messages/headerMessages.ts ───────────────────────────────────────────────
// 헤더 관련 다국어 메시지 모음 (EN / KO).
//
// 구성:
//   - navMessages: HeaderClient의 NavLink 텍스트 / 검색창 placeholder / 버튼 레이블
//   - userDropdownMessages: UserDropdown 메뉴 텍스트
//   - notificationMessages: NotificationPopover 제목/본문/시간 표시
//
// 사용 방법: const t = navMessages[locale]  →  t.navLedger 등으로 접근

// ─── Header 네비게이션 / 검색 / 비로그인 버튼 ────────────────────────────────

export const navMessages = {
  en: {
    navLedger:         "Ledger",
    navCard:           "Card",
    navInvest:         "Invest",
    navErrorTest:      "Error Test",
    navNotFound:       "Not Found",
    searchPlaceholder: "Search accounts...",
    searchLabel:       "Search accounts",
    inquiryLink:       "Contact",
    signupLink:        "Sign Up",
  },
  ko: {
    navLedger:         "가계부",
    navCard:           "카드",
    navInvest:         "투자",
    navErrorTest:      "에러 테스트",
    navNotFound:       "찾을 수 없음",
    searchPlaceholder: "계좌 검색...",
    searchLabel:       "계좌 검색",
    inquiryLink:       "문의",
    signupLink:        "회원가입",
  },
} as const;

// ─── UserDropdown ─────────────────────────────────────────────────────────────

export const userDropdownMessages = {
  en: {
    accountSettings: "Account Settings",
    preferences:     "Preferences",
    logout:          "Logout",
  },
  ko: {
    accountSettings: "계정 설정",
    preferences:     "환경 설정",
    logout:          "로그아웃",
  },
} as const;

// ─── NotificationPopover ──────────────────────────────────────────────────────

export const notificationMessages = {
  en: {
    notifications: "Notifications",
    markAllRead:   "Mark all read",
    viewAll:       "View all notifications",
    notif1Title:   "Budget exceeded",
    notif1Body:    "Crypto Harvest is 12% over this month's budget.",
    notif2Title:   "Ledger shared",
    notif2Body:    "2024 Core Investments was shared with 2 members.",
    notif3Title:   "Weekly summary ready",
    notif3Body:    "Your portfolio report for last week is available.",
    timeAgo5min:   "5 min ago",
    timeAgo2hrs:   "2 hrs ago",
    timeAgo1day:   "1 day ago",
  },
  ko: {
    notifications: "알림",
    markAllRead:   "모두 읽음",
    viewAll:       "모든 알림 보기",
    notif1Title:   "예산 초과",
    notif1Body:    "Crypto Harvest가 이번 달 예산의 12%를 초과했습니다.",
    notif2Title:   "장부 공유됨",
    notif2Body:    "2024 Core Investments가 2명의 멤버와 공유됐습니다.",
    notif3Title:   "주간 요약 준비됨",
    notif3Body:    "지난 주 포트폴리오 리포트를 확인할 수 있습니다.",
    timeAgo5min:   "5분 전",
    timeAgo2hrs:   "2시간 전",
    timeAgo1day:   "1일 전",
  },
} as const;

export type NotificationMessages = typeof notificationMessages.en;
