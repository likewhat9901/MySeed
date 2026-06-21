// 줄이기 목표 / 모으기 목표 타입 정의 (v1: localStorage 기반)

export interface ReductionGoal {
  id:            string
  ledId:         string | null  // 가계부 ID (null이면 전역)
  targetMonth:   string         // 'YYYY-MM'
  category:      string
  targetAmount:  number
  createdAt:     string
}

export interface SavingsGoal {
  id:            string
  ledId:         string | null
  name:          string
  emoji?:        string         // 목표 아이콘 (선택)
  targetAmount:  number
  monthlyTarget: number         // 월 적립 목표액 (0이면 미설정)
  deadline:      string | null  // 'YYYY-MM' or 'YYYY-MM-DD'
  startAmount:   number         // 시작 금액
  createdAt:     string
}

export interface SavingsDeposit {
  id:           string
  goalId:       string
  targetMonth:  string          // 'YYYY-MM'
  amount:       number
  createdAt:    string
}

// 이번달 다짐 — 행동 규칙 + 지킴/못지킴 수동 기록
export type ResolutionStatus = 'none' | 'kept' | 'broken'

export interface Resolution {
  id:           string
  ledId:        string | null
  targetMonth:  string          // 'YYYY-MM'
  text:         string
  status:       ResolutionStatus
  brokenCount:  number          // 어긴 횟수
  createdAt:    string
  emoji?:       string          // 다짐 아이콘 (선택)
  category?:    string          // 연결 카테고리 (지난달 대비 자동 비교용)
  baselineAmount?: number       // 다짐 생성 시점의 해당 카테고리 지출 (기준선)
  note?:        string          // 회고 메모 (지킴/못지킴 이유)
}

// 월말 회고 — 월별 1개
export type RetroMood = 'tight' | 'soso' | 'okay' | 'proud'

export interface Retrospective {
  id:           string
  ledId:        string | null
  month:        string          // 'YYYY-MM'
  good:         string
  bad:          string
  next:         string
  updatedAt:    string
  mood?:        RetroMood        // 이번달 돈 관리 기분
  note?:        string          // 한마디 회고 (good/bad/next 통합 대체)
}
