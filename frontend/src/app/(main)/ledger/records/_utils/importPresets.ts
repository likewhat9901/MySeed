// 카드사/뱅크샐러드 등 고정 형식 엑셀의 컬럼 매핑 preset 정의
import type { ColumnMappingEntry } from '@/features/ledger/record/types'

export interface ImportPreset {
  id:       string
  label:    string
  note:     string  // 다운로드 경로 안내 등 부가 설명
  mappings: (sheetName: string) => ColumnMappingEntry[]
}

// 각 preset의 mappings는 시트명을 받아 ColumnMappingEntry[]를 반환.
// 실제 행 범위는 업로드 후 데이터 길이로 결정되어야 하지만,
// 고정 형식은 헤더 행 + 데이터 행 구조가 일정하므로 넉넉한 범위(2:10000)로 지정.

export const IMPORT_PRESETS: ImportPreset[] = [
  {
    id:    'banksalad',
    label: '뱅크샐러드',
    note:  '뱅크샐러드 앱 > 내보내기 > 엑셀 다운로드',
    mappings: (sheet) => [
      { column: 'date',        sheet, address: 'A2:A10000' },
      { column: 'description', sheet, address: 'C2:C10000' },
      { column: 'amount',      sheet, address: 'D2:D10000' },
      { column: 'category',    sheet, address: 'E2:E10000' },
    ],
  },
]
