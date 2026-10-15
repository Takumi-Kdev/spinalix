// Spinalix 記憶エンジン — 自動回路・想起生成・思考結晶
// 全て決定論的（同じ入力 → 同じ出力）。端末内で完結し、LLMなしでも動く。
// 設計原則:
//  1. 捏造しない — 生成物は必ず実在の断片に接地し、出典を持つ
//  2. 問いを必要としない — システム側から想起を提案する
//  3. 忖度しない — 矛盾（tension）を隠さず提示する
//  4. 学ぶ — 人間の採否(adopted/rejected)が次の生成に効く

import type {
  CrystalRecall,
  EmotionPoint,
  EmotionKey,
  Fragment,
  Link,
  Preferences,
  SuddenThought,
  ThoughtCrystal,
  ThoughtKind,
} from './types'
import { blendEmotion, dominantEmotion, EMOTION_META, emotionDistance, intensityOf } from './emotion'
import { analyzeMemory } from './analysis'
import { bigrams, coverage, extractQuotes, jaccard, lastSentence, normalize, pairKey, shortQuote } from './text'
import { daysBetween, formatJP, monthKey, monthLabel } from './dates'
import { think, generateSuddenThought } from './think'

export interface EngineOptions {
  maxLinksPerNode?: number
  now?: Date
}

const DEFAULT_MAX_LINKS = 8

function intersectCount(a: string[], b: string[]): string[] {
  const setB = new Set(b)
  return a.filter((x) => setB.has(x))
}

// ─────────────────────────────────────────────────────────
// 1. 自動回路: 断片同士を意味・感情・テーマで自動接続する
// ─────────────────────────────────────────────────────────

export function buildLinks(fragments: Fragment[], opts: EngineOptions = {}): Link[] {
  const maxPerNode = opts.maxLinksPerNode ?? DEFAULT_MAX_LINKS
  const raw: Link[] = []

  for (let i = 0; i < fragments.length; i++) {
    for (let j = i + 1; j < fragments.length; j++) {
      const a = fragments[i]
      const b = fragments[j]
      const lex = jaccard(bigrams(a.text), bigrams(b.text))
      const emo = 1 - emotionDistance(a.emotion, b.emotion)
      const days = daysBetween(a.createdAt, b.createdAt)
      const themes = intersectCount(a.themes, b.themes)
      const people = intersectCount(a.people, b.people)

      if (themes.length > 0) {
        raw.push({ a: a.id, b: b.id, kind: 'theme', weight: Math.min(0.5, 0.14 * themes.length + emo * 0.2), reason: themes[0] })
      }
      if (people.length > 0) {
        raw.push({ a: a.id, b: b.id, kind: 'person', weight: 0.3 + emo * 0.15, reason: people[0] })
      }

      const sim = 0.55 * lex + 0.45 * emo
      if (sim >= 0.34 && days > 1) {
        raw.push({ a: a.id, b: b.id, kind: 'similar', weight: sim })
      }

      // echo: 遠く離れた時期の、同じ感情の震え（言葉は違うのに、同じ感情）
      const domA = dominantEmotion(a.emotion)
      const domB = dominantEmotion(b.emotion)
      if (
        domA &&
        domA === domB &&
        days >= 21 &&
        emo >= 0.7 &&
        lex <= 0.24 &&
        intensityOf(a.emotion, domA) > 0.5 &&
        intensityOf(b.emotion, domB) > 0.5
      ) {
        raw.push({
          a: a.id,
          b: b.id,
          kind: 'echo',
          weight: emo * 0.75 + Math.min(0.2, days / 1500),
          reason: EMOTION_META[domA].label,
        })
      }

      // tension: 同じテーマで、感情の向きが正反対（矛盾・価値観の揺れ）
      // 「なんとなく気分が違う」ではなく、意志や覚悟の食い違いだけを拾う
      const dv = Math.abs(a.emotion.valence - b.emotion.valence)
      const STANCE = /べき|ほうがいい|諦め|決め|決断|しよう|やめ|無理|現実|怖い|覚悟|したい|行きたい|出す/
      const maxIa = Math.max(0, ...Object.values(a.emotion.intensities).map((v) => v ?? 0))
      const maxIb = Math.max(0, ...Object.values(b.emotion.intensities).map((v) => v ?? 0))
      const hasStance = STANCE.test(a.text) || STANCE.test(b.text)
      if (themes.length > 0 && dv >= 0.85 && days >= 14 && Math.min(maxIa, maxIb) >= 0.45 && (hasStance || dv >= 1.1)) {
        raw.push({
          a: a.id,
          b: b.id,
          kind: 'tension',
          weight: Math.min(1, dv) * (0.7 + Math.min(0.3, days / 600)),
          reason: themes[0],
        })
      }

      // recall: 過去の自分の言葉を引用している（「あの時の『心臓がうるさい』」）
      const newer = new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      const older = newer === a ? b : a
      for (const q of extractQuotes(newer.text)) {
        if (normalize(older.text).includes(normalize(q))) {
          raw.push({ a: a.id, b: b.id, kind: 'recall', weight: 1.05, reason: q })
          break
        }
      }
    }
  }

  // ノード×種類ごとに上位だけ残し、全体としても上位だけ残す
  // （矛盾と反響は「少数精鋭」でないとノイズになる）
  const KIND_CAP: Record<Link['kind'], number> = { recall: 2, echo: 2, tension: 2, similar: 3, theme: 2, person: 2 }
  const perNodeKind = new Map<string, Link[]>()
  for (const l of raw) {
    for (const id of [l.a, l.b]) {
      const key = `${id}|${l.kind}`
      const arr = perNodeKind.get(key) ?? []
      arr.push(l)
      perNodeKind.set(key, arr)
    }
  }
  const kindKept = new Set<Link>()
  for (const [key, arr] of perNodeKind) {
    const kind = key.split('|')[1] as Link['kind']
    arr.sort((x, y) => y.weight - x.weight || pairKey(x.a, x.b).localeCompare(pairKey(y.a, y.b)))
    for (const l of arr.slice(0, KIND_CAP[kind])) kindKept.add(l)
  }

  // ノードごとに上位リンクだけ残す（グラフを読める密度に保つ）
  const byNode = new Map<string, Link[]>()
  for (const l of kindKept) {
    for (const id of [l.a, l.b]) {
      const arr = byNode.get(id) ?? []
      arr.push(l)
      byNode.set(id, arr)
    }
  }
  const keep = new Set<Link>()
  for (const [, arr] of byNode) {
    arr.sort((x, y) => y.weight - x.weight || x.kind.localeCompare(y.kind) || pairKey(x.a, x.b).localeCompare(pairKey(y.a, y.b)))
    for (const l of arr.slice(0, maxPerNode)) keep.add(l)
  }

  const out = [...keep]
  out.sort((x, y) => y.weight - x.weight || pairKey(x.a, x.b).localeCompare(pairKey(y.a, y.b)))
  return out
}

// ─────────────────────────────────────────────────────────
// 2. 想起生成 — think.ts（思考サイクル）に移動
//    拡散活性化 → 記憶グラフの歩行 → 言語化 → 特別な思考
// ─────────────────────────────────────────────────────────

export function usedPairKeys(thoughts: SuddenThought[]): Set<string> {
  return new Set(thoughts.map((t) => t.fingerprint).filter(Boolean))
}

/** 矛盾の物語性: 振れ幅が大きいほど優先（例: 5月の諦め ↔ 10月の決断） */
function narrativeBonus(l: Link, fragments: Fragment[]): number {
  const a = fragments.find((f) => f.id === l.a)
  const b = fragments.find((f) => f.id === l.b)
  if (!a || !b) return 0
  const dv = Math.abs(a.emotion.valence - b.emotion.valence)
  return dv >= 1.2 ? 0.06 : 0
}

function hashIndex(s: string, mod: number): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h % mod
}

/** 採用された想起 → 新しい「機械の断片」として回路に定着する */
export function adoptThought(thought: SuddenThought, fragments: Fragment[]): Fragment {
  const sources = thought.from
    .map((id) => fragments.find((f) => f.id === id))
    .filter((f): f is Fragment => Boolean(f))
  let emotion = sources[0]?.emotion ?? { valence: 0, arousal: 0.3, intensities: {} }
  for (let i = 1; i < sources.length; i++) emotion = blendEmotion(emotion, sources[i].emotion)
  const themes = [...new Set(sources.flatMap((s) => s.themes))]
  const people = [...new Set(sources.flatMap((s) => s.people))]
  return {
    id: `mf-${thought.id}`,
    text: thought.text,
    createdAt: new Date().toISOString(),
    source: 'machine',
    emotion,
    people,
    themes,
  }
}

// ─────────────────────────────────────────────────────────
// 3. 思考結晶 — 目的が発生した瞬間に、断片から成果物を組み上げる
// ─────────────────────────────────────────────────────────

export function assembleCrystal(intention: string, fragments: Fragment[], links: Link[], now: Date = new Date()): ThoughtCrystal {
  const analysis = analyzeMemory(fragments, now)
  const q = bigrams(intention)
  const directThemes = [...new Set(fragments.flatMap((f) => f.themes))].filter((t) => intention.includes(t))
  const words = intention.replace(/[、。！？!?.,\s]/g, '')

  const scored = fragments.map((f) => {
    const cov = coverage(q, bigrams(f.text))
    const lex = jaccard(q, bigrams(f.text))
    const themeBonus = f.themes.some((t) => directThemes.includes(t)) ? 0.45 : 0
    const personBonus = f.people.some((p) => words.includes(p)) ? 0.35 : 0
    const maxIntensity = Math.max(0, ...Object.values(f.emotion.intensities).map((v) => v ?? 0))
    const emoBoost = maxIntensity * 0.12
    const timeBoost = Math.min(0.1, daysBetween(f.createdAt, now.toISOString()) / 3650)
    const score = cov * 0.9 + lex * 0.5 + themeBonus + personBonus + emoBoost + timeBoost
    const why: string[] = []
    if (themeBonus) why.push(`テーマ「${f.themes.find((t) => directThemes.includes(t))}」`)
    if (personBonus) why.push(`人物` )
    if (maxIntensity > 0.6) why.push(`感情の強さ（${dominantEmotion(f.emotion) ? EMOTION_META[dominantEmotion(f.emotion)!].label : ''}）`)
    if (cov > 0.18) why.push('言葉が近い')
    if (why.length === 0) why.push('記憶の中核')
    return { f, score, why: why.join('・') }
  })

  scored.sort((x, y) => y.score - x.score || x.f.id.localeCompare(y.f.id))
  const top = scored.filter((s) => s.score > 0.12).slice(0, 7)
  const recalledPool = top.length >= 3 ? top : scored.slice(0, 5)

  const recalled: CrystalRecall[] = recalledPool.map((s) => ({
    fragmentId: s.f.id,
    quote: shortQuote(s.f.text, 60),
    when: formatJP(s.f.createdAt),
    why: s.why,
  }))

  // 感情の弧: 想起に最も多く現れるテーマの感情推移
  const themeTally = new Map<string, number>()
  for (const s of recalledPool) for (const t of s.f.themes) themeTally.set(t, (themeTally.get(t) ?? 0) + 1)
  const topTheme = [...themeTally.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]
  const arcFragments = (topTheme ? fragments.filter((f) => f.themes.includes(topTheme)) : fragments).sort(
    (x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
  )

  const buckets = new Map<string, Fragment[]>()
  for (const f of arcFragments) {
    const k = monthKey(f.createdAt)
    buckets.set(k, [...(buckets.get(k) ?? []), f])
  }
  const arcPoints: EmotionPoint[] = [...buckets.entries()].map(([k, fs]) => ({
    at: k,
    valence: fs.reduce((acc, f) => acc + f.emotion.valence, 0) / fs.length,
    arousal: fs.reduce((acc, f) => acc + f.emotion.arousal, 0) / fs.length,
  }))

  const half = Math.floor(arcPoints.length / 2)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  const v1 = avg(arcPoints.slice(0, half).map((p) => p.valence))
  const v2 = avg(arcPoints.slice(half).map((p) => p.valence))
  const a1 = avg(arcPoints.slice(0, half).map((p) => p.arousal))
  const a2 = avg(arcPoints.slice(half).map((p) => p.arousal))
  const vDiff = v2 - v1
  const aDiff = a2 - a1
  let arcLabel: string
  if (vDiff > 0.22) arcLabel = '沈みから、持ち直しへ'
  else if (vDiff < -0.22) arcLabel = '高まりから、重さへ'
  else arcLabel = '横ばいの、凪'
  if (Math.abs(aDiff) > 0.28 && Math.abs(vDiff) <= 0.22) arcLabel = aDiff > 0 ? '静けさから、前へ' : '疾走から、静止へ'

  // 洞察（決定論的・根拠付き）
  const insights: { text: string; evidence: string[] }[] = []
  const fids = recalledPool.map((s) => s.f.id)
  const pushEvidence = (ids: string[]) => ids.slice(0, 3)

  if (topTheme) {
    const themeFrags = fragments.filter((f) => f.themes.includes(topTheme))
    const months = new Set(themeFrags.map((f) => monthKey(f.createdAt))).size
    insights.push({
      text: `「${topTheme}」は${months}ヶ月のあいだに${themeFrags.length}の断片に現れた。これは気まぐれではない。あなたの中心にある問いだ。`,
      evidence: pushEvidence(themeFrags.slice(-3).map((f) => f.id)),
    })
  }

  // 開いた輪（あれば最優先で指摘する）
  const loop = topTheme ? analysis.openLoops.find((l) => l.theme === topTheme) : undefined
  if (loop) {
    const want = loop.want[loop.want.length - 1]
    const lastAction = loop.actions[loop.actions.length - 1]
    insights.unshift({
      text:
        `「${loop.theme}」には、開いた輪がある。「${shortQuote(byIdOf(fragments, want.fragmentId)?.text ?? '', 20)}」と${formatJP(want.when)}に書いて、` +
        (lastAction ? `行動の最後は${formatJP(lastAction.when)}（${loop.actions.length}回）。` : '行動の言葉はまだ0回。') +
        `${loop.monthsQuiet}ヶ月、開いたまま。`,
      evidence: [want.fragmentId, ...(lastAction ? [lastAction.fragmentId] : [])],
    })
  } else {
    const wilCount = fragments.filter((f) => /やりたい|行きたい|行ってみたい|始めたい|挑戦/.test(f.text)).length
    const doCount = fragments.filter((f) => /始めた|申し込|動き出|動いた|決めた|予約した|調べた|出した/.test(f.text)).length
    if (wilCount > doCount) {
      insights.push({
        text: `「やりたい」の言葉は${wilCount}回。それに対して「やった」は${doCount}回。気持ちは十分に熟している。次に必要なのは決意ではなく、日付。`,
        evidence: pushEvidence(fids),
      })
    } else if (doCount > wilCount) {
      insights.push({
        text: `この問いについて、あなたはもう動いている（「やった」の言葉は${doCount}回）。残っているのは、決意ではなく、決めるという一言だけかもしれない。`,
        evidence: pushEvidence(fids),
      })
    }
  }

  const peopleTally = new Map<string, number>()
  for (const s of recalledPool) for (const p of s.f.people) peopleTally.set(p, (peopleTally.get(p) ?? 0) + 1)
  const topPeople = [...peopleTally.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
  if (topPeople.length >= 2) {
    const names = topPeople.slice(0, 3).map(([p]) => p).join('、')
    insights.push({
      text: `この問いには ${names} が繰り返し現れる。ひとりで決めようとしているのに、この問いはもう、あなただけのものではない。`,
      evidence: pushEvidence(recalledPool.filter((s) => s.f.people.length > 0).map((s) => s.f.id)),
    })
  }

  // テーマの交差（この問いが、いつも何と一緒に現れるか）
  if (topTheme) {
    const pair = analysis.themePairs.find((p) => (p.a === topTheme || p.b === topTheme) && p.count >= 3)
    if (pair) {
      const other = pair.a === topTheme ? pair.b : pair.a
      insights.push({
        text: `「${topTheme}」の話は、いつも「${other}」と一緒に現れる（${pair.count}回・最後は${formatJP(pair.latest)}）。この二つは、切り離して考えられない。`,
        evidence: pushEvidence(fids),
      })
    }
  }

  const blended = recalledPool.map((s) => s.f.emotion).reduce((acc, e) => blendEmotion(acc, e))
  const domEmotion = dominantEmotion(blended)
  if (domEmotion) {
    insights.push({
      text: `この問いを語るときのあなたの言葉は「${EMOTION_META[domEmotion].label}」の色を帯びている。判断だけでなく、その感情ごと持っていていい。`,
      evidence: pushEvidence(fids),
    })
  }

  // 矛盾（tension）: 想起セット内 → 同テーマ全体 の順に探す
  const fidSet = new Set(fids)
  const tensionLinks = links.filter((l) => l.kind === 'tension' && ((fidSet.has(l.a) && fidSet.has(l.b)) || (topTheme && l.reason === topTheme)))
  let tension: ThoughtCrystal['tension'] | undefined
  if (tensionLinks.length > 0) {
    const best = [...tensionLinks].sort(
      (x, y) =>
        y.weight + narrativeBonus(y, fragments) - (x.weight + narrativeBonus(x, fragments)) ||
        pairKey(x.a, x.b).localeCompare(pairKey(y.a, y.b)),
    )[0]
    const fa = fragments.find((f) => f.id === best.a)
    const fb = fragments.find((f) => f.id === best.b)
    if (fa && fb) {
      const [older, newer] = [fa, fb].sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime())
      tension = {
        pastQuote: shortQuote(older.text, 60),
        pastWhen: formatJP(older.createdAt),
        nowQuote: shortQuote(newer.text, 60),
        theme: best.reason ?? 'この問い',
        question: `${formatJP(older.createdAt)}の自分と、${formatJP(newer.createdAt)}の自分。${best.reason ?? 'この問い'}について、変わったのは状況か、それとも価値観か。`,
      }
    }
  }

  // 次の一歩（問いの形で、命令しない）
  const topPerson = topPeople[0]?.[0]
  const nextSteps = [
    topPerson ? `${topPerson}に、この結晶をそのまま見せてみる。` : 'この結晶を誰かに見せてみる。',
    topTheme ? `「${topTheme}」について、"やりたい"ではなく"いつやるか"を、一行だけ書いてみる。` : '次の一歩を、日付つきで一行だけ書いてみる。',
  ]

  return {
    id: `tc-${hashIndex(intention + now.toISOString(), 100000)}`,
    createdAt: now.toISOString(),
    intention,
    recalled,
    arcLabel,
    arcPoints,
    insights: insights.slice(0, 4),
    tension,
    nextSteps,
  }
}

function byIdOf(fragments: Fragment[], id: string): Fragment | undefined {
  return fragments.find((f) => f.id === id)
}

/** ホームに出す「今の想起」— 未処理の最新 or 新規生成 */
export function currentSuddenThought(
  fragments: Fragment[],
  links: Link[],
  thoughts: SuddenThought[],
  prefs: Preferences,
  now: Date = new Date(),
): SuddenThought | null {
  const pending = [...thoughts].reverse().find((t) => t.status === 'new')
  if (pending) return pending
  return generateSuddenThought(fragments, links, thoughts, prefs, now)
}

export function emotionColorOf(f: Fragment): string {
  const d = dominantEmotion(f.emotion)
  return d ? EMOTION_META[d].color : '#9aa3b2'
}

export function dominantLabelOf(f: Fragment): string {
  const d = dominantEmotion(f.emotion)
  return d ? EMOTION_META[d].label : '凪'
}

export function arcMonthsLabel(points: EmotionPoint[]): string {
  if (points.length === 0) return ''
  return `${monthLabel(points[0].at)} → ${monthLabel(points[points.length - 1].at)}`
}

export type { EmotionKey }

export { think, generateSuddenThought, pairKey }
