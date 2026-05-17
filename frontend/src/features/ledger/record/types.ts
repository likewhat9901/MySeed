// 내역(record) 데이터 타입 — 내역 탭 테이블 및 현황 카드 집계 기준
import type { Category, TransactionType } from '@/constants/categories'

export type ReviewRating = 'good' | 'bad' | null
export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY'

export interface LedgerRecord {
  id:             string
  date:           string        // YYYY-MM-DD
  time:           string | null // HH:MM
  type:           TransactionType
  category:       Category
  subcategory:    string | null
  description:    string        // 내용/상호명
  amount:         number        // 원 단위 양수
  currency:       Currency
  paymentMethod:  string | null // 결제수단
  memo:           string | null
  review:         ReviewRating
}

export type RecordColumn = 'date' | 'time' | 'type' | 'category' | 'subcategory' | 'description' | 'amount' | 'currency' | 'paymentMethod' | 'memo'

export const RECORD_COLUMN_LABELS: Record<RecordColumn, string> = {
  date:          '날짜',
  time:          '시간',
  type:          '타입',
  category:      '대분류',
  subcategory:   '소분류',
  description:   '내용',
  amount:        '금액',
  currency:      '화폐',
  paymentMethod: '결제수단',
  memo:          '메모',
}

export interface ColumnMappingEntry {
  column:  RecordColumn
  sheet:   string
  address: string  // "B2:B100" 형태의 범위
}
