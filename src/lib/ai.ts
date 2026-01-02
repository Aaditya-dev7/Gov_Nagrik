export type ImageMatch = { ok: boolean; score?: number; reason?: string }
export type Correction = { corrected: string; applied: boolean }

function timeoutFetch(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = init
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(input, { ...rest, signal: controller.signal }).finally(() => clearTimeout(id))
}

function normalizeText(s: string): string {
  const rep: Array<[RegExp, string]> = [
    [/\s+/g, ' '],
    [/(^\s+|\s+$)/g, ''],
    [/\b(pls|plz)\b/gi, 'please'],
    [/\bu\b/gi, 'you'],
    [/\br\b/gi, 'are'],
    [/\bcuz\b|\bcoz\b|\bcaus?e\b/gi, 'because'],
  ]
  let out = s
  for (const [re, r] of rep) out = out.replace(re, r)
  out = out.replace(/\s*([,.;:!?])\s*/g, '$1 ')
  out = out.replace(/\s+/g, ' ').trim()
  out = out
    .split(/([.!?])/)
    .reduce<string[]>((acc, part, idx, arr) => {
      if (/[.!?]/.test(part)) return acc
      const punct = idx + 1 < arr.length ? arr[idx + 1] : ''
      const t = part.trim()
      if (!t) return acc
      const cap = t.charAt(0).toUpperCase() + t.slice(1)
      acc.push(punct ? cap + punct : cap)
      return acc
    }, [])
    .join(' ')
  return out
}

export async function correctDescription(description: string): Promise<Correction> {
  const basic = normalizeText(description || '')
  const key = (import.meta as any).env?.VITE_HF_API_KEY as string | undefined
  if (!key) return { corrected: basic, applied: basic !== description }
  try {
    const body = JSON.stringify({ inputs: description })
    const res = await timeoutFetch('https://api-inference.huggingface.co/models/vennify/t5-base-grammar-correction', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
      timeoutMs: 12000,
    })
    if (res.ok) {
      const data = (await res.json()) as Array<{ generated_text?: string }>
      const gen = (data?.[0]?.generated_text || '').trim()
      if (gen) {
        const norm = normalizeText(gen)
        return { corrected: norm, applied: norm !== description }
      }
    }
  } catch {}
  return { corrected: basic, applied: basic !== description }
}

function tokenize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4)
}

async function blipCaptionFromUrl(url: string, key?: string): Promise<string | null> {
  try {
    const imgRes = await timeoutFetch(url, { method: 'GET', headers: { Accept: 'image/*' }, timeoutMs: 12000 })
    if (!imgRes.ok) return null
    const blob = await imgRes.blob()
    if (!key) return null
    const res = await timeoutFetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/octet-stream' },
      body: blob,
      timeoutMs: 15000,
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ generated_text?: string }>
    const caption = data?.[0]?.generated_text?.toLowerCase() || ''
    return caption || null
  } catch {
    return null
  }
}

export async function analyzeImageDescription(urls: string[], description: string): Promise<ImageMatch> {
  const key = (import.meta as any).env?.VITE_HF_API_KEY as string | undefined
  if (!urls || urls.length === 0) return { ok: true }
  const url = urls[0]
  const caption = await blipCaptionFromUrl(url, key)
  if (!caption) return { ok: true }
  const descTokens = new Set(tokenize(description))
  const capTokens = new Set(tokenize(caption))
  let overlap = 0
  for (const t of descTokens) if (capTokens.has(t)) overlap++
  const score = descTokens.size ? overlap / Math.max(descTokens.size, 1) : 0
  if (descTokens.size >= 4 && overlap === 0) return { ok: false, score, reason: 'No semantic overlap between image and description' }
  return { ok: true, score }
}
