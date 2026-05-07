// ─── lib/i18n/editorMessages.ts ────────────────────────────────────────────────
// 에디터 UI 다국어 메시지 (EN / KO).
// LeftSidebar / RightSidebar(PropertiesPanel, WidgetsPanel) / Editor footer

export const editorMessages = {
  en: {
    // LeftSidebar
    myLedgers:       'MY LEDGERS',
    quickActions:    'QUICK ACTIONS',
    saving:          'Saving…',
    saved:           'Saved ✓',
    saveDraft:       'Save Draft',
    importData:      'Import Data',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar:   'Expand sidebar',
    myLedgersTitle:  'My Ledgers',
    noLedgers:       'No ledgers',
    loading:         'Loading…',

    // RightSidebar tabs
    tabWidgets:    'WIDGETS',
    tabProperties: 'PROPERTIES',

    // WidgetsPanel
    widgetList: '위젯 목록',
    cellUnit:   'cells',

    // PropertiesPanel
    selectWidget:   'Double-click a widget to edit its properties',
    sectionLayout:  'LAYOUT',
    sectionStyling: 'STYLING',
    fieldWidth:     'Width',
    fieldHeight:    'Height',
    fieldPositionX: 'Position X',
    fieldPositionY: 'Position Y',
    accentColor:    'Accent Color',
    borderRadius:   'Border Radius',
    dropShadow:     'Drop Shadow',
    closeBtn:       'CLOSE',
    resetBtn:       'RESET',

    // Editor footer
    footerTerms:   'Terms',
    footerPrivacy: 'Privacy',
    footerCopy:    '© 2026 MySeed. All rights reserved.',

    // Widget registry labels
    labelSavingsGoal:     'Savings Goal',
    labelMonthlyExpenses: 'Monthly Expenses',
    labelPostIt:          'Post-it Note',
    labelQuote:           'Inspirational Quote',
    labelFlowAnalysis:    'Flow Analysis',
    labelPortfolioHealth: 'Portfolio Health',
    labelTable:           'Table',
    labelList:            'List',
  },
  ko: {
    // LeftSidebar
    myLedgers:       '내 장부',
    quickActions:    '빠른 실행',
    saving:          '저장 중…',
    saved:           '저장됨 ✓',
    saveDraft:       '저장',
    importData:      '데이터 가져오기',
    collapseSidebar: '사이드바 접기',
    expandSidebar:   '사이드바 펼치기',
    myLedgersTitle:  '내 장부',
    noLedgers:       '가계부 없음',
    loading:         '불러오는 중…',

    // RightSidebar tabs
    tabWidgets:    '위젯',
    tabProperties: '속성',

    // WidgetsPanel
    widgetList: '위젯 목록',
    cellUnit:   '셀',

    // PropertiesPanel
    selectWidget:   '위젯을 더블클릭하면\n속성을 편집할 수 있습니다',
    sectionLayout:  '레이아웃',
    sectionStyling: '스타일',
    fieldWidth:     '너비',
    fieldHeight:    '높이',
    fieldPositionX: 'X 위치',
    fieldPositionY: 'Y 위치',
    accentColor:    '강조 색상',
    borderRadius:   '모서리 반경',
    dropShadow:     '그림자',
    closeBtn:       '닫기',
    resetBtn:       '초기화',

    // Editor footer
    footerTerms:   '이용약관',
    footerPrivacy: '개인정보처리방침',
    footerCopy:    '© 2026 MySeed. All rights reserved.',

    // Widget registry labels
    labelSavingsGoal:     '저축 목표',
    labelMonthlyExpenses: '월별 지출',
    labelPostIt:          '포스트잇',
    labelQuote:           '명언',
    labelFlowAnalysis:    '흐름 분석',
    labelPortfolioHealth: '포트폴리오 건강도',
    labelTable:           '테이블',
    labelList:            '체크리스트',
  },
} as const
