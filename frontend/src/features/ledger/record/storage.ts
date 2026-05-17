// 내역 탭 엑셀 파일 업로드 및 tb_file 등록
'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/core/client'
import { callRpc } from '@/lib/supabase/core/rpc'

export async function uploadExcelFile(
  memId: string,
  file: File,
): Promise<{ fileId: string; filePath: string } | null> {
  const supabase = getSupabaseBrowserClient()
  const ext = file.name.lastIndexOf('.') !== -1 ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const baseName = file.name.slice(0, file.name.length - ext.length)
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${memId}/${safeName}_${Date.now()}${ext}`

  const mimeType = file.name.endsWith('.xls')
    ? 'application/vnd.ms-excel'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  const { error } = await supabase.storage
    .from('import-files')
    .upload(path, file, { upsert: true, contentType: mimeType })

  if (error) {
    console.error('[record/storage] uploadExcelFile 실패:', error.message)
    return null
  }

  const rows = await callRpc<{ file_id: string }[]>(
    'register_import_file',
    { p_mem_id: memId, p_file_name: file.name, p_file_path: path },
    [],
  )

  const fileId = rows[0]?.file_id
  if (!fileId) return null
  return { fileId, filePath: path }
}
