// ─── lib/i18n/messages/homeMessages.ts ──────────────────────────────────────────────────
// 홈 화면 다국어 메시지 (EN / KO).
// LoggedInView / LoggedOutView / LedgerCard / LedgerRow 등에서 사용.

export const homeMessages = {
  en: {
    // LoggedInView
    gardenTitle:        'My Templates',
    gardenSub:          '',
    savedLedgers:       'Saved Ledgers',
    startNewLedger:     'New Ledger',
    newLedgerSub:       '',
    tabMyCanvas:        'Canvas',
    tabSavedMappings:   'Excel Sync',
    savedMappings:      'Excel Sync',
    noMappings:         'No saved templates',
    mappingCountUnit:   ' mappings',

    // LedgerCard / LedgerRow context menu
    rename:      'Rename',
    changeCover: 'Change Cover',
    removeCover: 'Remove Cover',
    delete:      'Delete',

    // LoggedOutView
    heroTag:        '● MySeed',
    heroTitle1:     'Ever given up',
    heroTitle2:     'on a',
    heroTitle3:     '',
    heroTitleAccent:'budget?',
    heroTitle4:     '',
    heroSub:        'Build it once, reuse it every month. This time, it\'s different.',
    ctaSeeHow:      'Get Started',
    ctaTry:         'Try it out',
    loginWelcome:   'Welcome Back',
    loginSub:       'Start today\'s record.',
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
    gardenTitle:        '내 템플릿',
    gardenSub:          '',
    savedLedgers:       '저장된 장부',
    startNewLedger:     '새 가계부 만들기',
    newLedgerSub:       '',
    tabMyCanvas:        '캔버스',
    tabSavedMappings:   '엑셀 연동',
    savedMappings:      '엑셀 연동',
    noMappings:         '저장된 템플릿 없음',
    mappingCountUnit:   '개',

    // LedgerCard / LedgerRow context menu
    rename:      '이름 변경',
    changeCover: '커버 변경',
    removeCover: '커버 제거',
    delete:      '삭제',

    // LoggedOutView
    heroTag:        '● MySeed',
    heroTitle1:     '가계부 쓰다',
    heroTitle2:     '포기한 적',
    heroTitle3:     '',
    heroTitleAccent:'있으시죠?',
    heroTitle4:     '',
    heroSub:        '한 번만 만들면 매달 그대로. 이번엔 다릅니다.',
    ctaSeeHow:      '시작하기',
    ctaTry:         '체험해보기',
    loginWelcome:   '다시 오셨군요',
    loginSub:       '오늘의 기록을 시작하세요',
    labelEmail:     '이메일 주소',
    labelPassword:  '비밀번호',
    forgotPassword: '비밀번호 찾기',
    signIn:         '로그인',
    orContinueWith: '또는 다음으로 계속',
    noAccount:      '계정이 없으신가요?',
    createSeed:     '회원가입',
  },
} as const
