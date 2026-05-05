// ─── lib/i18n/homeMessages.ts ──────────────────────────────────────────────────
// 홈 화면 다국어 메시지 (EN / KO).
// LoggedInView / LoggedOutView / LedgerCard / LedgerRow 등에서 사용.

export const homeMessages = {
  en: {
    // LoggedInView
    gardenTitle:        'My Garden',
    gardenSub:          'Nurture your wealth through editorial precision. Your financial landscape, curated and growing.',
    savedLedgers:       'Saved Ledgers',
    startNewLedger:     'Start New Ledger',
    newLedgerSub:       'Excel or Notion import',
    startFromBlueprint: 'Start from Blueprint',

    // Blueprint labels
    blueprintExcel:    'Standard Excel',
    blueprintExcelSub: 'LEGACY MIGRATION',
    blueprintNotion:   'Notion Canvas',
    blueprintNotionSub:'MODULAR DATABASE',
    blueprintPortfolio:'Portfolio Audit',
    blueprintPortfolioSub:'ASSET ALLOCATION',

    // LedgerCard / LedgerRow context menu
    rename:      'Rename',
    changeCover: 'Change Cover',
    removeCover: 'Remove Cover',
    delete:      'Delete',

    // LoggedOutView
    heroTag:        '● Smart Custom Ledger Service',
    heroTitle1:     'Create your own',
    heroTitle2:     'wealth with',
    heroTitle3:     'our ',
    heroTitleAccent:'own custom',
    heroTitle4:     'ledger.',
    heroSub:        'Stop fighting rigid spreadsheets. MySeed adapts to your financial life...',
    ctaSeeHow:      'See How It Works',
    ctaTemplate:    'View Our Template',
    loginWelcome:   'Welcome Back',
    loginSub:       'Access your account',
    labelEmail:     'Email Address',
    labelPassword:  'Password',
    forgotPassword: 'Forgot?',
    signIn:         'Sign In',
    orContinueWith: 'OR CONTINUE WITH',
    noAccount:      "Don't have an account?",
    createSeed:     'Create Seed',
  },
  ko: {
    // LoggedInView
    gardenTitle:        '내 정원',
    gardenSub:          '편집의 정밀함으로 자산을 키워보세요. 나만의 재무 풍경을 완성하세요.',
    savedLedgers:       '저장된 장부',
    startNewLedger:     '새 장부 만들기',
    newLedgerSub:       'Excel 또는 Notion 가져오기',
    startFromBlueprint: '템플릿으로 시작하기',

    // Blueprint labels
    blueprintExcel:    'Excel 표준형',
    blueprintExcelSub: '레거시 이관',
    blueprintNotion:   'Notion 캔버스',
    blueprintNotionSub:'모듈형 데이터베이스',
    blueprintPortfolio:'포트폴리오 감사',
    blueprintPortfolioSub:'자산 배분',

    // LedgerCard / LedgerRow context menu
    rename:      '이름 변경',
    changeCover: '커버 변경',
    removeCover: '커버 제거',
    delete:      '삭제',

    // LoggedOutView
    heroTag:        '● 스마트 맞춤형 가계부 서비스',
    heroTitle1:     '나만의',
    heroTitle2:     '자산 관리,',
    heroTitle3:     '맞춤형 ',
    heroTitleAccent:'커스텀',
    heroTitle4:     '장부로 시작하세요.',
    heroSub:        '딱딱한 스프레드시트는 이제 그만. MySeed는 당신의 재무 생활에 맞게 적응합니다.',
    ctaSeeHow:      '어떻게 작동하나요?',
    ctaTemplate:    '템플릿 보기',
    loginWelcome:   '다시 오셨군요',
    loginSub:       '계정에 로그인하세요',
    labelEmail:     '이메일 주소',
    labelPassword:  '비밀번호',
    forgotPassword: '비밀번호 찾기',
    signIn:         '로그인',
    orContinueWith: '또는 다음으로 계속',
    noAccount:      '계정이 없으신가요?',
    createSeed:     '회원가입',
  },
} as const
