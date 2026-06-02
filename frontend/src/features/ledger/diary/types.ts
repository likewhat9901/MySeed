// 일기 엔트리 타입 정의 (v1: localStorage 기반)

export type DiaryMood = 'good' | 'neutral' | 'bad'

export interface DiaryEntry {
  id:        string
  ledId:     string | null
  date:      string        // YYYY-MM-DD
  mood:      DiaryMood
  text:      string
  createdAt: string
  updatedAt: string
}
