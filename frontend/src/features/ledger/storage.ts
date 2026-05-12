'use client'

// ─── features/ledger/storage.ts ───────────────────────────────────────────────
// Supabase Storage — 장부 커버 이미지 업로드

import { getSupabaseBrowserClient } from '@/lib/supabase/core/client'

const BUCKET = 'ledger-covers'

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
    console.error('[ledger/storage] uploadLedgerCover 실패:', error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
