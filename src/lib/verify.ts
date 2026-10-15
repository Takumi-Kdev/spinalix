// APIモードの検証層 — LLMに「考えさせない」ための門番
// 思考はエンジンが作る。LLMは言葉を整えるだけ。ここで、記憶にないことを言ったら破棄する。

import type { Fragment } from './types'
import { extractQuotes, normalize } from './text'
import { formatJP } from './dates'

export interface StylizeVerdict {
  ok: boolean
  reason?: string
}

/** 汎用的な励まし・助言・決まり文句（ありきたりな回答の検出） */
const GENERIC = /頑張|がんば|きっと|大丈夫|応援|素晴らし|ポジティブ|前向き|未来は明る|あなたなら|一歩ずつ|自分を信じ|大切にしよう|無理しな|休んでね|よく頑張/

export function verifyStylized(text: string, citedIds: string[], fragments: Fragment[]): StylizeVerdict {
  const byId = new Map(fragments.map((f) => [f.id, f]))
  const cited = citedIds.map((id) => byId.get(id)).filter((f): f is Fragment => Boolean(f))
  if (cited.length === 0) return { ok: false, reason: 'cited に出典が無い' }

  if (text.length > 160) return { ok: false, reason: '長すぎる（3文以内に）' }
  if (GENERIC.test(text)) return { ok: false, reason: 'ありきたりな励まし・助言が入っている' }

  const quotes = extractQuotes(text)
  if (quotes.length === 0) return { ok: false, reason: 'あなたの言葉の引用がない' }
  const haystack = cited.map((f) => normalize(f.text)).join('\u0000')
  for (const q of quotes) {
    const nq = normalize(q)
    if (nq.length < 2) continue
    if (!haystack.includes(nq)) return { ok: false, reason: `引用が原断片に見つからない: 「${q}」` }
  }

  // 日付（月日）を新しく作っていないか
  const mentioned = [...text.matchAll(/(\d{1,2})月(\d{1,2})日/g)].map((m) => m[0])
  if (mentioned.length > 0) {
    const allowed = new Set(cited.flatMap((f) => [formatJP(f.createdAt), `${new Date(f.createdAt).getMonth() + 1}月${new Date(f.createdAt).getDate()}日`]))
    for (const m of mentioned) {
      if (!allowed.has(m)) return { ok: false, reason: `出典にない日付: ${m}` }
    }
  }

  return { ok: true }
}
