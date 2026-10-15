// 記憶の分析 — テーマの弧・開いた輪（約束の追跡）・人・問い・沈黙
// すべて決定論的。ここで見つけた「構造」が思考の材料になる。

import type { Fragment } from './types'
import { dominantEmotion, EMOTION_META } from './emotion'
import { monthKey } from './dates'

export interface ThemeArc {
  theme: string
  count: number
  months: string[]
  firstAt: string
  lastAt: string
  avgValenceEarly: number
  avgValenceLate: number
  direction: 'rising' | 'falling' | 'flat'
  latest: Fragment
}

export interface OpenLoop {
  theme: string
  want: { fragmentId: string; quote: string; when: string }[]
  actions: { fragmentId: string; quote: string; when: string }[]
  monthsQuiet: number
  score: number
}

export interface PersonProfile {
  person: string
  count: number
  avgValence: number
  firstAt: string
  lastAt: string
  recentDelta: number
}

export interface ThemeStats {
  themes: ThemeArc[]
  openLoops: OpenLoop[]
  people: PersonProfile[]
  questions: { fragmentId: string; text: string; when: string }[]
  quietThemes: { theme: string; monthsQuiet: number; lastAt: string }[]
}

const WANT = /やりたい|行きたい|行ってみたい|始めたい|始めよう|挑戦|してみたい|しようと思う|つもり|したい/
const ACTION = /始めた|始めて|申し込|予約した|予約を|動き出|動いた|決めた|調べた|出した|出そう|行った|買った|やった|作り始め|書いた|送った/
const QUESTION = /だろうか|のだろう|のかな|かな。|だろう。|どうして|なぜ|なんだろう|べきだろう|いいのか/

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

export function analyzeMemory(fragments: Fragment[], now: Date = new Date()): ThemeStats {
  const byTheme = new Map<string, Fragment[]>()
  for (const f of fragments) {
    for (const t of f.themes) {
      byTheme.set(t, [...(byTheme.get(t) ?? []), f])
    }
  }

  // ── テーマの弧 ─────────────────────────────
  const themes: ThemeArc[] = []
  for (const [theme, fs] of byTheme) {
    if (fs.length < 2) continue
    const sorted = [...fs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    const half = Math.max(1, Math.floor(sorted.length / 2))
    const early = avg(sorted.slice(0, half).map((f) => f.emotion.valence))
    const late = avg(sorted.slice(half).map((f) => f.emotion.valence))
    const diff = late - early
    themes.push({
      theme,
      count: fs.length,
      months: [...new Set(sorted.map((f) => monthKey(f.createdAt)))],
      firstAt: sorted[0].createdAt,
      lastAt: sorted[sorted.length - 1].createdAt,
      avgValenceEarly: early,
      avgValenceLate: late,
      direction: diff > 0.18 ? 'rising' : diff < -0.18 ? 'falling' : 'flat',
      latest: sorted[sorted.length - 1],
    })
  }
  themes.sort((a, b) => b.count - a.count)

  // ── 開いた輪（言ったのに、やっていない）─────────
  const openLoops: OpenLoop[] = []
  for (const [theme, fs] of byTheme) {
    const wants = fs.filter((f) => WANT.test(f.text))
    const acts = fs.filter((f) => ACTION.test(f.text))
    if (wants.length === 0) continue
    const lastWant = wants[wants.length - 1]
    const lastAct = acts[acts.length - 1]
    const monthsQuiet = lastAct
      ? Math.max(0, (new Date(lastWant.createdAt).getTime() - new Date(lastAct.createdAt).getTime()) / (30.44 * 86400000))
      : (now.getTime() - new Date(lastWant.createdAt).getTime()) / (30.44 * 86400000)
    const score = wants.length - acts.length * 0.6 + (lastAct ? 0 : 1)
    if (score <= 0) continue
    openLoops.push({
      theme,
      want: wants.map((f) => ({ fragmentId: f.id, quote: f.text, when: f.createdAt })),
      actions: acts.map((f) => ({ fragmentId: f.id, quote: f.text, when: f.createdAt })),
      monthsQuiet: Math.round(monthsQuiet * 10) / 10,
      score,
    })
  }
  openLoops.sort((a, b) => b.score - a.score || b.monthsQuiet - a.monthsQuiet)

  // ── 人プロフィール ────────────────────────
  const people = new Map<string, Fragment[]>()
  for (const f of fragments) {
    for (const p of f.people) people.set(p, [...(people.get(p) ?? []), f])
  }
  const profiles: PersonProfile[] = []
  for (const [person, fs] of people) {
    if (fs.length < 2) continue
    const sorted = [...fs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    const half = Math.max(1, Math.floor(sorted.length / 2))
    profiles.push({
      person,
      count: fs.length,
      avgValence: avg(fs.map((f) => f.emotion.valence)),
      firstAt: sorted[0].createdAt,
      lastAt: sorted[sorted.length - 1].createdAt,
      recentDelta:
        avg(sorted.slice(half).map((f) => f.emotion.valence)) - avg(sorted.slice(0, half).map((f) => f.emotion.valence)),
    })
  }
  profiles.sort((a, b) => b.count - a.count)

  // ── 問い（まだ答えていない）────────────────
  const questions = fragments
    .filter((f) => QUESTION.test(f.text))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((f) => ({ fragmentId: f.id, text: f.text, when: f.createdAt }))

  // ── 沈黙したテーマ（かつて熱く、ここ2ヶ月語られていない）──
  const quietThemes: ThemeStats['quietThemes'] = []
  for (const arc of themes) {
    const daysSince = (now.getTime() - new Date(arc.lastAt).getTime()) / 86400000
    if (daysSince >= 45 && arc.count >= 2) {
      quietThemes.push({ theme: arc.theme, monthsQuiet: Math.round(daysSince / 30.44), lastAt: arc.lastAt })
    }
  }

  return { themes, openLoops, people: profiles, questions, quietThemes }
}

export function themeEmotionLabel(fragments: Fragment[]): { label: string; color: string } {
  const key = dominantEmotion(
    fragments.reduce(
      (acc, f) => acc,
      fragments[0]?.emotion ?? { valence: 0, arousal: 0.3, intensities: {} },
    ),
  )
  return key ? { label: EMOTION_META[key].label, color: EMOTION_META[key].color } : { label: '凪', color: '#9aa3b2' }
}
