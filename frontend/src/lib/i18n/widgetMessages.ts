// ─── lib/i18n/widgetMessages.ts ────────────────────────────────────────────────
// 위젯별 다국어 메시지 (EN / KO).
// 사용 방법: const t = widgetMessages[locale]  →  t.portfolioHealth 등으로 접근

export const widgetMessages = {
  en: {
    // PortfolioHealthWidget
    portfolioHealth: 'Portfolio Health',
    netWorth:        'Net Worth',
    assets:          'Assets',
    liabilities:     'Liabilities',

    // MonthlyExpensesWidget
    monthlyExpenses: 'Monthly Expenses',
    colCategory:     'CATEGORY',
    colAmount:       'AMOUNT',
    colDate:         'DATE',
    colStatus:       'STATUS',
    statusPaid:      'Paid',
    statusPending:   'Pending',

    // SavingsGoalWidget
    savingsGoal: 'Savings Goal',
    achieved:    'Achieved',
    remaining:   'left',
    goalAchieved:'🎉 Done!',

    // FlowAnalysisWidget
    flowAnalysis:    'Flow Analysis',
    monthlyIncome:   'MONTHLY INCOME',
    totalExpenses:   'TOTAL EXPENSES',
    retainedPrefix:  'You have retained ',
    retainedSuffix:  ' of your total earnings this cycle.',

    // TableWidget
    tableTitle:      'Table',
    addRow:          '+ Add row',
    editColHint:     'Click column header to manage columns',
    colAddLeft:      'Add column to left',
    colAddRight:     'Add column to right',
    colDelete:       'Delete column',
    colRename:       'Rename',

    // ReviewListWidget
    reviewListTitle:  'Spending Review',
    reviewAddItem:    '+ Add item',
    reviewGood:       'Good',
    reviewMeh:        'Meh',
    reviewBad:        'Bad',
    reviewTotal:      'Total',
    reviewPlaceholderLabel:  'Item name',
    reviewPlaceholderAmount: 'Amount',

    // PostItNoteWidget
    postItNote: 'Post-it Note',

    // QuoteWidget (DEFAULT 값)
    quoteText:   '"A penny saved is a penny earned."',
    quoteAuthor: 'BENJAMIN FRANKLIN',
  },
  ko: {
    // PortfolioHealthWidget
    portfolioHealth: '포트폴리오 건강도',
    netWorth:        '순자산',
    assets:          '자산',
    liabilities:     '부채',

    // MonthlyExpensesWidget
    monthlyExpenses: '월별 지출',
    colCategory:     '카테고리',
    colAmount:       '금액',
    colDate:         '날짜',
    colStatus:       '상태',
    statusPaid:      '완료',
    statusPending:   '대기',

    // SavingsGoalWidget
    savingsGoal: '저축 목표',
    achieved:    '달성',
    remaining:   '남음',
    goalAchieved:'🎉 달성!',

    // FlowAnalysisWidget
    flowAnalysis:    '흐름 분석',
    monthlyIncome:   '월 수입',
    totalExpenses:   '총 지출',
    retainedPrefix:  '이번 주기에 수입의 ',
    retainedSuffix:  '를 유지했습니다.',

    // TableWidget
    tableTitle:      '테이블',
    addRow:          '+ 행 추가',
    editColHint:     '열 헤더를 클릭해 열을 관리하세요',
    colAddLeft:      '왼쪽에 열 추가',
    colAddRight:     '오른쪽에 열 추가',
    colDelete:       '열 삭제',
    colRename:       '이름 변경',

    // ReviewListWidget
    reviewListTitle:  '지출 리뷰',
    reviewAddItem:    '+ 항목 추가',
    reviewGood:       '잘함',
    reviewMeh:        '애매',
    reviewBad:        '아쉬움',
    reviewTotal:      '합계',
    reviewPlaceholderLabel:  '항목 이름',
    reviewPlaceholderAmount: '금액',

    // PostItNoteWidget
    postItNote: '포스트잇',

    // QuoteWidget (DEFAULT 값)
    quoteText:   '"한 푼이라도 아끼면 한 푼 버는 것이다."',
    quoteAuthor: '벤자민 프랭클린',
  },
} as const
