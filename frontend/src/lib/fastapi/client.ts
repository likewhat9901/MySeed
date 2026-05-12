// lib/fastapi/client.ts — FastAPI 서버 공통 fetch 래퍼

const BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? ''

export async function fastapiPost<T>(
  path: string,
  body: FormData | Record<string, unknown>,
): Promise<T | null> {
  const isFormData = body instanceof FormData
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: isFormData ? body : JSON.stringify(body),
    headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    console.error(`[fastapi] POST ${path} 오류:`, res.status, await res.text())
    return null
  }
  return res.json()
}
