// 思考の言語化 — 道筋（path）を、あなたの言葉のままに文へ組み上げる
// 「抽出 + 接続」方式: 引用は必ず実在の断片から取る。接続詞と枠だけをエンジンが与える。

import type { Fragment } from './types'
import type { Walk, WalkMode } from './walk'
import { walkSpanDays } from './walk'
import type { OpenLoop } from './analysis'
import { dominantEmotion, EMOTION_META } from './emotion'
import { formatJP } from './dates'
import { extractQuotes, shortQuote } from './text'

export interface ThoughtStep {
  label: string
  detail: string
}

export interface ThoughtDraft {
  kind: 'recall' | 'echo' | 'tension' | 'question' | 'arc' | 'leap' | 'openloop'
  text: string
  from: string[]
  path: string[]
  steps: ThoughtStep[]
  score: number
  fingerprint: string
  mode: WalkMode | 'openloop' | 'question'
}

const IMPORTANT = /[。、！？!?]/ // 未使用（互換のため残置）
void IMPORTANT

const EMOTIONISH =
  /嬉し|楽しい|幸せ|好き|大好き|楽しみ|不安|心配|怖い|悲し|寂し|つらい|辛い|疲れ|怒|ムカ|迷|泣|笑|ときめき|わくわく|ドキドキ/
const DECISIONISH = /べき|ほうがいい|しよう|したい|決め|つもり|始めた|調べた|申し込|予約|出す|行く|やる/
const FILLER = /これ|それ|そういう|そんな/

/** 「」の中では分割しない（引用の途中で切らない） */
function splitClauses(text: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuote = false
  for (const ch of text) {
    if (ch === '「' || ch === '『') inQuote = true
    if (ch === '」' || ch === '』') inQuote = false
    current += ch
    if (!inQuote && /[。、！？!?]/.test(ch)) {
      out.push(current)
      current = ''
    }
  }
  if (current.trim().length > 0) out.push(current)
  return out
}

/**
 * 断片から「いちばん強い一節」を取り出す（引用の単位）。
 * - 内側の引用（「」）は「呼び戻し」なので、新しい言葉を優先する
 * - 意志・決断の言葉を優先し、指示語だけの節は避ける
 * - 最後の短い節は前の節と結合する（「あれが」「、たぶん答えだ」→「あれが、たぶん答えだ」）
 */
export function keyClause(text: string, max = 26): string {
  const clauses = splitClauses(text)
    .map((c) => c.replace(/」って$/, '」').replace(/[。、！？!?]+$/g, '').trim())
    .filter((c) => c.length >= 2)
  const candidates: { quote: string; index: number; total: number }[] = []
  for (let i = 0; i < clauses.length; i++) {
    const c = clauses[i]
    if (c.length >= 6) candidates.push({ quote: c, index: i, total: clauses.length })
    if (i === clauses.length - 2 && c.length >= 2 && clauses[i + 1].length < 8) {
      candidates.push({ quote: `${c}、${clauses[i + 1]}`, index: i, total: clauses.length })
    }
  }
  if (candidates.length === 0) return shortQuote(text, max)

  const scored = candidates.map(({ quote, index, total }) => {
    const hasInnerQuote = /[「『]/.test(quote)
    const emo = EMOTIONISH.test(quote) ? 2 : 0
    const decision = DECISIONISH.test(quote) ? 1.2 : 0
    const filler = FILLER.test(quote) ? 0.9 : 0
    const lenBonus = quote.length >= 8 && quote.length <= max ? 0.6 : quote.length < 8 ? 0.1 : 0.3
    const lateBonus = total > 1 ? (index / (total - 1)) * 0.3 : 0
    return { quote, score: emo + decision + lenBonus + lateBonus - filler - (hasInnerQuote ? 1.5 : 0) }
  })
  scored.sort((a, b) => b.score - a.score || a.quote.length - b.quote.length)
  return shortQuote(scored[0].quote, max)
}

function hashPick(seed: string, mod: number): number {
  let h = 7
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000003
  return h % mod
}

function emotionLabelOf(f: Fragment): string {
  const d = dominantEmotion(f.emotion)
  return d ? EMOTION_META[d].label : '凪'
}

interface Segment {
  f: Fragment
  when: string
  quote: string
}

function toSegment(f: Fragment): Segment {
  return { f, when: formatJP(f.createdAt), quote: keyClause(f.text) }
}

/** 道筋 → 文。モードごとの語り口と、2ホップ/3ホップの型。 */
export function renderWalk(walk: Walk, fragments: Fragment[]): ThoughtDraft {
  const byId = new Map(fragments.map((f) => [f.id, f]))
  const rawSegs = walk.path.map((id) => toSegment(byId.get(id)!)).filter(Boolean)
  // 文は時系列で読ませる（道筋のアニメーションは walk.path の順のまま）
  const segs = [...rawSegs].sort((x, y) => new Date(x.f.createdAt).getTime() - new Date(y.f.createdAt).getTime())
  const span = walkSpanDays(walk, fragments)
  const a = segs[0]
  const c = segs[segs.length - 1]
  const b = segs.length >= 3 ? segs[1] : null
  const emotion = emotionLabelOf(c.f)
  const theme = walk.hops.find((h) => h.kind === 'tension')?.reason ?? walk.hops.find((h) => h.kind === 'theme')?.reason ?? ''
  const kind: ThoughtDraft['kind'] =
    walk.mode === 'resonance' ? 'recall' : walk.mode === 'contrast' ? 'tension' : walk.mode === 'leap' ? 'leap' : walk.mode === 'arc' ? 'arc' : 'echo'

  const variants: ((s: { A: Segment; B: Segment | null; C: Segment; span: number; emotion: string; theme: string }) => string)[] =
    walk.mode === 'resonance'
      ? [
          (s) =>
            s.B
              ? `${s.C.when}のあなたは「${s.C.quote}」。それは${s.A.when}の「${s.A.quote}」を自分で引き直したもので、${s.B.when}の「${s.B.quote}」を経て、ここまで来ている。`
              : `${s.A.when}「${s.A.quote}」——${s.span}日後の${s.C.when}、あなたはこの言葉を自分で引き直している。「${s.C.quote}」`,
          (s) =>
            s.B
              ? `「${s.A.quote}」（${s.A.when}）→「${s.B.quote}」（${s.B.when}）→「${s.C.quote}」（${s.C.when}）。${s.span}日かけて、同じ${s.emotion}が道になっている。`
              : `「${s.A.quote}」。${s.C.when}のあなたは、この一行を自分で引用してこう書いた——「${s.C.quote}」。`,
        ]
      : walk.mode === 'contrast'
        ? [
            (s) =>
              s.B
                ? `${s.A.when}のあなたは「${s.A.quote}」と言った。${s.B.when}に「${s.B.quote}」と揺れて、${s.C.when}には「${s.C.quote}」。この${s.theme || '問い'}の中で、向きが変わった。`
                : `${s.A.when}のあなたは「${s.A.quote}」と言った。${s.C.when}のあなたは「${s.C.quote}」。${s.theme || '同じテーマ'}の中で、向きは正反対だ。どちらが本当のあなた?`,
            (s) =>
              s.B
                ? `「${s.A.quote}」（${s.A.when}）→「${s.B.quote}」（${s.B.when}）→「${s.C.quote}」（${s.C.when}）。同じ${s.theme || '問い'}の話なのに、途中で向きが反転している。`
                : `「${s.A.quote}」（${s.A.when}）と「${s.C.quote}」（${s.C.when}）。同じ${s.theme || '問い'}の話なのに、向きが正反対だ。何があった?`,
          ]
        : walk.mode === 'dwell'
          ? [
              (s) =>
                s.B
                  ? `${s.A.when}「${s.A.quote}」。${s.B.when}も、${s.C.when}も、${s.emotion}のまま——「${s.C.quote}」。${s.span}日、この感情は消えていない。`
                  : `${s.A.when}「${s.A.quote}」。${s.C.when}にも、同じ${s.emotion}が流れている——「${s.C.quote}」。${s.span}日経っても、消えていない。`,
              (s) => `「${s.A.quote}」（${s.A.when}）から「${s.C.quote}」（${s.C.when}）へ。言葉は変わったのに、${s.emotion}だけが、まっすぐに続いている。`,
            ]
          : walk.mode === 'leap'
            ? [
                (s) =>
                  `${s.A.when}の「${s.A.quote}」と、${s.C.when}の「${s.C.quote}」。まるで無関係なのに、${s.emotion}の質感だけが、そっくりだ。`,
                (s) =>
                  s.B
                    ? `「${s.A.quote}」と「${s.C.quote}」——${s.B.when}の「${s.B.quote}」を挟んで、${s.span}日の距離を飛び越えて、同じ感覚が置かれている。`
                    : `「${s.A.quote}」と「${s.C.quote}」。${s.span}日の距離を飛び越えて、同じ${s.emotion}が置かれている。`,
              ]
            : [
                (s) =>
                  s.B
                    ? `${s.A.when}「${s.A.quote}」→ ${s.B.when}「${s.B.quote}」→ ${s.C.when}「${s.C.quote}」。${s.theme || 'この問い'}についての、${s.span}日の軌跡。`
                    : `「${s.A.quote}」（${s.A.when}）から「${s.C.quote}」（${s.C.when}）へ。${s.theme || 'この問い'}についての、${s.span}日の軌跡。`,
                (s) =>
                  `${s.A.when}に「${s.A.quote}」と書き、${s.C.when}には「${s.C.quote}」。この間の${s.span}日を、${s.theme || '一つの問い'}が貫いている。`,
              ]

  const frame = variants[hashPick(walk.fingerprint, variants.length)]
  const recallHop = walk.hops.find((h) => h.kind === 'recall' && h.reason)
  let text: string
  if (walk.mode === 'resonance' && recallHop) {
    // 引用の主（quoted）と、引き直した側（quoting）を、ホップそのものから取る
    const fromF = byId.get(recallHop.from)!
    const toF = byId.get(recallHop.to)!
    const [quoted, quoting] = new Date(fromF.createdAt) <= new Date(toF.createdAt) ? [fromF, toF] : [toF, fromF]
    const days = Math.abs(
      Math.round((new Date(quoting.createdAt).getTime() - new Date(quoted.createdAt).getTime()) / 86400000),
    )
    const qQuoting = keyClause(quoting.text)
    text =
      hashPick(walk.fingerprint + 'r', 2) === 0
        ? `「${recallHop.reason}」——${formatJP(quoted.createdAt)}のこの一行を、${days}日後の${formatJP(quoting.createdAt)}、あなたは自分で引用している。「${qQuoting}」`
        : `${formatJP(quoting.createdAt)}の「${qQuoting}」。それは${formatJP(quoted.createdAt)}の「${recallHop.reason}」を、自分の言葉で引き直している。`
  } else {
    text = frame({ A: a, B: b, C: c, span, emotion, theme })
  }

  const steps: ThoughtStep[] = [
    { label: '起点', detail: `${formatJP(byId.get(walk.path[0])!.createdAt)}の断片を活性化（${emotionLabelOf(byId.get(walk.path[0])!)}）` },
    ...walk.hops.map((h, i) => ({
      label: i === 0 ? '拡散' : '跳躍',
      detail: `${formatJP(byId.get(h.to)!.createdAt)}へ — ${h.note}`,
    })),
  ]

  return {
    kind,
    text,
    from: walk.path,
    path: walk.path,
    steps,
    score: walk.score,
    fingerprint: walk.fingerprint,
    mode: walk.mode,
  }
}

/** 開いた輪（言ったのに、やっていない）から想起をつくる */
export function renderOpenLoop(loop: OpenLoop, fragments: Fragment[]): ThoughtDraft {
  const byId = new Map(fragments.map((f) => [f.id, f]))
  const lastWant = loop.want[loop.want.length - 1]
  const wantF = byId.get(lastWant.fragmentId)!
  const variants = [
    `${formatJP(lastWant.when)}に「${keyClause(wantF.text)}」と書いた。あれから${loop.monthsQuiet}ヶ月。${loop.theme}について、行動の言葉は${loop.actions.length}回。この輪は、まだ開いている。`,
    `「${keyClause(wantF.text)}」——${formatJP(lastWant.when)}の言葉。${loop.monthsQuiet}ヶ月が経った。${loop.theme}については、やりたい気持ちが${loop.want.length}回、行動が${loop.actions.length}回。`,
  ]
  const text = variants[hashPick(loop.theme + lastWant.fragmentId, variants.length)]
  return {
    kind: 'openloop',
    text,
    from: [lastWant.fragmentId, ...loop.actions.slice(-1).map((a) => a.fragmentId)],
    path: [lastWant.fragmentId],
    steps: [
      { label: '発見', detail: `テーマ「${loop.theme}」に、やりたい言葉が${loop.want.length}回` },
      { label: '照合', detail: `行動の言葉は${loop.actions.length}回・最後は${loop.actions.length > 0 ? formatJP(loop.actions[loop.actions.length - 1].when) : 'なし'}` },
      { label: '結論', detail: `${loop.monthsQuiet}ヶ月、開いたままの輪` },
    ],
    score: 0.9 + Math.min(0.4, loop.monthsQuiet / 10),
    fingerprint: `openloop|${loop.theme}`,
    mode: 'openloop',
  }
}

export function renderQuestion(question: { fragmentId: string; text: string; when: string }, fragments: Fragment[]): ThoughtDraft {
  const f = fragments.find((x) => x.id === question.fragmentId)!
  const text = `${formatJP(question.when)}の「${keyClause(f.text)}」。この問いは、まだ答えを持っていない。今日のあなたなら、何と答える?`
  return {
    kind: 'question',
    text,
    from: [question.fragmentId],
    path: [question.fragmentId],
    steps: [
      { label: '発見', detail: '問いの形のまま残っている断片' },
      { label: '照合', detail: '以降の断片に、直接の答えが見つからない' },
    ],
    score: 0.75,
    fingerprint: `question|${question.fragmentId}`,
    mode: 'question',
  }
}
