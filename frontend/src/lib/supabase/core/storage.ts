import { getSupabaseBrowserClient } from './client'

const BUCKET = 'ledger-covers'

/**
 * ledger 커버 이미지를 Supabase Storage에 업로드하고 public URL을 반환합니다.
 * 경로: {memId}/{ledId}.{ext}
 */
export async function uploadLedgerCover(
  memId: string,
  ledId: string,
  file: File,
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${memId}/${ledId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) {
    console.error('[storage/uploadLedgerCover] 실패:', error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // 캐시 무효화를 위해 timestamp 쿼리 파라미터 추가
  return `${data.publicUrl}?t=${Date.now()}`
}
