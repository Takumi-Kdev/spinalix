// 日本語テキストの軽量比較（トークナイザ不要・端末内）

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[、。！？!?.,\s「」『』（）()\[\]…ー#*:~|]+/g, '')
}

/** 文字バイグラム集合（日本語は分かち書きなしでもこれで十分機能する） */
export function bigrams(s: string): Set<string> {
  const t = normalize(s)
  const out = new Set<string>()
  if (t.length === 0) return out
  if (t.length === 1) {
    out.add(t)
    return out
  }
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2))
  return out
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  if (union === 0) return 0
  return inter / union
}

/** クエリのバイグラムがどれだけ対象に含まれるか（0..1、クエリ被覆率） */
export function coverage(query: Set<string>, target: Set<string>): number {
  if (query.size === 0) return 0
  let inter = 0
  for (const x of query) if (target.has(x)) inter++
  return inter / query.size
}

/** 「...」や『...』で括られた引用句を取り出す（自己引用の検出に使う） */
export function extractQuotes(text: string): string[] {
  const out: string[] = []
  const re = /[「『]([^」』]{2,40})[」』]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) out.push(m[1])
  return out
}

export function shortQuote(text: string, max = 34): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max) + '…'
}

/** 最後の一文を取り出す（想起テンプレートの締めに使う） */
export function lastSentence(text: string, max = 60): string {
  const parts = text.split('。').map((s) => s.trim()).filter((s) => s.length >= 3)
  const last = parts.length > 0 ? parts[parts.length - 1] : text
  return shortQuote(last, max)
}
