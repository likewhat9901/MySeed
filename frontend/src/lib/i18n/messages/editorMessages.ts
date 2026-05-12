// ─── lib/i18n/messages/editorMessages.ts ────────────────────────────────────────────────
// 에디터 UI 다국어 메시지 (EN / KO).
// LeftSidebar / RightSidebar(PropertiesPanel, WidgetsPanel) / Editor footer

export const editorMessages = {
  en: {
    // LeftSidebar
    myLedgers:       'MY CANVAS',
    quickActions:    'QUICK ACTIONS',
    saving:          'Saving…',
    saved:           'Saved ✓',
    saveDraft:       'Save Draft',
    tabCanvas:       'Canvas',
    importData:      'Excel Sync',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar:   'Expand sidebar',
    myLedgersTitle:  'My Canvas',
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

    // Canvas toolbar
    editingBadge: 'Editing',

    // Import page
    importNotSelected:      'Not selected',
    importTemplateSelect:   'Select template',
    importTemplateModified: 'Modified',
    importNoTemplates:      'No saved templates',
    importMappingCount:     'mappings',
    importTemplateInUse:    'In use',
    importSaving:           'Saving…',
    importSaved:            'Saved ✓',
    importSave:             'Save',
    importSavedState:       'Saved',
    importSaveAs:           'Save as',
    importAutoMap:               'AI Auto Map',
    importAutoMapping:           'Mapping…',
    importOverwrite:             'Overwrite existing',
    importOverwriteConfirmTitle: 'Overwrite template',
    importOverwriteConfirmDesc:  "Overwrite '{name}' with the current mappings.",
    importOverwriteWarning:      'This action cannot be undone.',
    importOverwriteConfirm:      'Overwrite',
    importTemplateName:          'Template name',
    importDuplicateName:    'Name already exists',
    importWidgetLabel:      'Widget',
    importRangeLabel:       'Range',
    importConnect:          'Connect',
    importUploading:        'Reading file…',
    importDropPrompt:       'Upload an Excel file',
    importDropHint:         '.xlsx · .xls · drag or click',
    importCanvasHint:       'Click a widget to select it',
    importCanvasSelected:   'selected · select a cell on the right to connect',

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
    myLedgers:       '내 캔버스',
    quickActions:    '빠른 실행',
    saving:          '저장 중…',
    saved:           '저장됨 ✓',
    saveDraft:       '저장',
    tabCanvas:       '캔버스',
    importData:      '엑셀 연동',
    collapseSidebar: '사이드바 접기',
    expandSidebar:   '사이드바 펼치기',
    myLedgersTitle:  '내 캔버스',
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

    // Canvas toolbar
    editingBadge: '편집 중',

    // Import page
    importNotSelected:      '선택 전',
    importTemplateSelect:   '템플릿 선택',
    importTemplateModified: '수정됨',
    importNoTemplates:      '저장된 템플릿 없음',
    importMappingCount:     '개',
    importTemplateInUse:    '사용 중',
    importSaving:           '저장 중...',
    importSaved:            '저장됨 ✓',
    importSave:             '저장',
    importSavedState:       '저장됨',
    importSaveAs:           '다른 이름으로 저장',
    importAutoMap:               'AI 자동 매핑',
    importAutoMapping:           '매핑 중…',
    importOverwrite:             '기존 템플릿에 덮어쓰기',
    importOverwriteConfirmTitle: '템플릿 덮어쓰기',
    importOverwriteConfirmDesc:  "'{name}' 템플릿을 현재 매핑으로 덮어씁니다.",
    importOverwriteWarning:      '이 작업은 되돌릴 수 없습니다.',
    importOverwriteConfirm:      '덮어쓰기',
    importTemplateName:     '템플릿 이름',
    importDuplicateName:    '이미 있는 이름이에요',
    importWidgetLabel:      '위젯',
    importRangeLabel:       '범위',
    importConnect:          '연결',
    importUploading:        '파일 읽는 중...',
    importDropPrompt:       '엑셀 파일을 올려주세요',
    importDropHint:         '.xlsx · .xls · 드래그하거나 클릭',
    importCanvasHint:       '위젯을 클릭해 선택하세요',
    importCanvasSelected:   '선택됨 · 오른쪽에서 셀 선택 후 연결',

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
