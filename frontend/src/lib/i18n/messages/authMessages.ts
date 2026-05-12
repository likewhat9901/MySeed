// ─── lib/i18n/messages/authMessages.ts ──────────────────────────────────────────────────
// 인증 / 계정 화면 다국어 메시지 (EN / KO).
// SignupPanel, mypage/page 등에서 사용.

export const signupMessages = {
  en: {
    // SignupPanel — header
    title:       'Create Your Seed',
    subtitle:    'Start your journey toward financial editorial elegance.',

    // SignupPanel — email step
    labelEmail:        'Email Address',
    sendCode:          'Send Code',
    resendCode:        'Resend',
    sending:           'Sending...',
    codeSent:          'Verification code has been sent to your email.',

    // SignupPanel — verification step
    labelCode:         'Verification Code',
    codePlaceholder:   '8-digit code',
    verify:            'Verify',
    verifying:         'Verifying...',
    verified:          'Verified',

    // SignupPanel — password step
    labelPassword:        'Password',
    labelConfirmPassword: 'Confirm Password',

    // SignupPanel — submit
    signUp:          'Sign Up',
    creatingAccount: 'Creating account...',

    // SignupPanel — divider / footer
    orContinueWith: 'OR CONTINUE WITH',
    alreadyHaveAccount: 'Already have an account?',
    logIn:          'Log In',

    // SignupPanel — success screen
    successTitle: 'Welcome aboard!',
    successBody:  'has been registered.',
    goToLogin:    'Go to Login',

    // signup/page.tsx — brand panel
    brandTitle1:   'Cultivate your',
    brandTitle2:   'financial future.',
    brandBody:     'Every great fortune begins as a small seed. MySeed provides the digital greenhouse to nurture your assets, track growth, and bloom into lasting wealth.',
    brandSocial:   'Join 12,000+ curators managing their digital gardens.',
  },
  ko: {
    // SignupPanel — header
    title:       '씨앗을 심어보세요',
    subtitle:    '재무 편집의 정밀함을 향한 여정을 시작하세요.',

    // SignupPanel — email step
    labelEmail:        '이메일 주소',
    sendCode:          '인증번호 보내기',
    resendCode:        '재발송',
    sending:           '발송 중...',
    codeSent:          '인증번호가 이메일로 발송되었습니다.',

    // SignupPanel — verification step
    labelCode:         '인증번호',
    codePlaceholder:   '8자리 코드 입력',
    verify:            '인증하기',
    verifying:         '확인 중...',
    verified:          '인증 완료',

    // SignupPanel — password step
    labelPassword:        '비밀번호',
    labelConfirmPassword: '비밀번호 확인',

    // SignupPanel — submit
    signUp:          '회원가입',
    creatingAccount: '계정 생성 중...',

    // SignupPanel — divider / footer
    orContinueWith:     '또는 다음으로 계속',
    alreadyHaveAccount: '이미 계정이 있으신가요?',
    logIn:              '로그인',

    // SignupPanel — success screen
    successTitle: '가입 완료!',
    successBody:  '로 가입이 완료되었습니다.',
    goToLogin:    '로그인 페이지로 이동',

    // signup/page.tsx — brand panel
    brandTitle1:   '나만의 재무 미래를',
    brandTitle2:   '가꿔보세요.',
    brandBody:     '모든 큰 자산은 작은 씨앗에서 시작됩니다. MySeed는 자산을 육성하고 성장을 추적하며 지속적인 부로 꽃피울 디지털 온실을 제공합니다.',
    brandSocial:   '1만 2천 명 이상의 큐레이터들이 자신의 디지털 정원을 관리하고 있어요.',
  },
} as const

export const mypageMessages = {
  en: {
    // Page title
    pageTitle: 'Account Settings',
    pageSubtitle: 'Manage your personal information and financial preferences.',

    // Nav items
    navPersonal:  'Personal Info',
    navSecurity:  'Security',
    navFinance:   'Financial Preferences',
    navNotif:     'Notifications',

    // Personal Info section
    sectionPersonal:    'Personal Information',
    editAll:            'Edit All',
    fieldFullName:      'FULL NAME',
    fieldEmail:         'EMAIL ADDRESS',
    fieldPhone:         'PHONE NUMBER',
    fieldMemberSince:   'MEMBER SINCE',
    fieldAddress:       'PHYSICAL ADDRESS',

    // Security section
    sectionSecurity:    'Security & Privacy',
    changePassword:     'Change Password',
    twoFactor:          'Two-Factor Authentication',
    twoFactorSub:       'Recommended for security',
    biometric:          'Biometric Login',

    // Financial Preferences section
    sectionFinance:     'Financial Preferences',
    defaultCurrency:    'Default Currency',
    riskTolerance:      'Risk Tolerance',
    linkedAccounts:     'Linked Accounts',
    riskLow:            'Low',
    riskModerate:       'Moderate',
    riskHigh:           'High',

    // Notification section
    sectionNotif:           'Notification Settings',
    emailNotif:             'Email Notifications',
    emailNotifSub:          'Stay updated on account activity and market trends.',
    pushNotif:              'Push Notifications',
    pushNotifSub:           'Real-time alerts for price changes and goal completions.',
    weeklyReport:           'Weekly Financial Reports',
    weeklyReportSub:        'Summarized digest of your investment growth every Monday.',

    // Footer buttons
    discardChanges: 'Discard Changes',
    saveChanges:    'Save Changes',
  },
  ko: {
    // Page title
    pageTitle: '계정 설정',
    pageSubtitle: '개인 정보 및 재무 환경 설정을 관리하세요.',

    // Nav items
    navPersonal:  '개인 정보',
    navSecurity:  '보안',
    navFinance:   '재무 환경 설정',
    navNotif:     '알림',

    // Personal Info section
    sectionPersonal:    '개인 정보',
    editAll:            '전체 수정',
    fieldFullName:      '이름',
    fieldEmail:         '이메일 주소',
    fieldPhone:         '전화번호',
    fieldMemberSince:   '가입일',
    fieldAddress:       '주소',

    // Security section
    sectionSecurity:    '보안 및 개인정보',
    changePassword:     '비밀번호 변경',
    twoFactor:          '2단계 인증',
    twoFactorSub:       '보안 강화를 위해 권장합니다',
    biometric:          '생체 인증 로그인',

    // Financial Preferences section
    sectionFinance:     '재무 환경 설정',
    defaultCurrency:    '기본 통화',
    riskTolerance:      '위험 감수 수준',
    linkedAccounts:     '연결된 계좌',
    riskLow:            '낮음',
    riskModerate:       '보통',
    riskHigh:           '높음',

    // Notification section
    sectionNotif:           '알림 설정',
    emailNotif:             '이메일 알림',
    emailNotifSub:          '계정 활동 및 시장 동향을 최신 상태로 유지하세요.',
    pushNotif:              '푸시 알림',
    pushNotifSub:           '가격 변동 및 목표 달성 시 실시간 알림을 받으세요.',
    weeklyReport:           '주간 재무 리포트',
    weeklyReportSub:        '매주 월요일 투자 성장 요약을 받아보세요.',

    // Footer buttons
    discardChanges: '변경 취소',
    saveChanges:    '변경 저장',
  },
} as const
