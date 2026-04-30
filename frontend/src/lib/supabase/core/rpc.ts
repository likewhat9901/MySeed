import { getSupabaseBrowserClient } from "./client";

const isDev = process.env.NODE_ENV === 'development'

function logRpc(label: string, args: Record<string, unknown>, durationMs: number, result: 'ok' | 'error' | 'null', data?: unknown) {
  if (!isDev) return
  const prefix = result === 'ok' ? '✅' : '❌'
  const tag = `[rpc/${label}]`
  if (result === 'ok') {
    console.groupCollapsed(`${prefix} ${tag} ${durationMs}ms`)
    console.log('args  :', args)
    console.log('data  :', data)
    console.groupEnd()
  } else {
    console.group(`${prefix} ${tag} ${durationMs}ms`)
    console.log('args   :', args)
    if (result === 'null') {
      console.log('result : data가 null 반환됨')
    } else if (data && typeof data === 'object' && 'message' in data) {
      const e = data as { code?: string; message?: string; details?: string; hint?: string }
      console.log('code   :', e.code)
      console.log('message:', e.message)
      console.log('details:', e.details)
      console.log('hint   :', e.hint)
    } else {
      console.log('result :', data)
    }
    console.groupEnd()
  }
}

/**
 * 데이터를 반환하는 Supabase RPC 호출 헬퍼.
 * 운영 환경: 실패(error 또는 data null) 시 fallback 반환.
 * 개발 환경: 실패를 throw해 RLS/계약 불일치를 즉시 드러냅니다.
 */
export async function callRpc<T>(
  name: string,
  args: Record<string, unknown>,
  fallback: T,
  label = name,
): Promise<T> {
  const supabase = getSupabaseBrowserClient()
  const t = Date.now()
  const { data, error } = await supabase.rpc(name, args)
  const ms = Date.now() - t

  if (error) {
    logRpc(label, args, ms, 'error', error)
    if (isDev) throw new Error(`[rpc/${label}] 호출 실패. RPC/RLS/인자를 확인하세요.`)
    return fallback
  }
  if (data == null) {
    logRpc(label, args, ms, 'null')
    if (isDev) throw new Error(`[rpc/${label}] data가 null입니다. RPC 반환/RLS를 확인하세요.`)
    return fallback
  }

  logRpc(label, args, ms, 'ok', data)
  return data as T
}

/**
 * void(결과 없음)를 반환하는 Supabase RPC 호출 헬퍼.
 * 운영 환경: 성공 시 true, 실패 시 false 반환.
 * 개발 환경: 실패를 throw해 RLS/계약 불일치를 즉시 드러냅니다.
 */
export async function callRpcVoid(
  name: string,
  args: Record<string, unknown>,
  label = name,
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const t = Date.now()
  const { error } = await supabase.rpc(name, args)
  const ms = Date.now() - t

  if (error) {
    logRpc(label, args, ms, 'error', error)
    if (isDev) throw new Error(`[rpc/${label}] 호출 실패. RPC/RLS/인자를 확인하세요.`)
    return false
  }

  logRpc(label, args, ms, 'ok')
  return true
}
