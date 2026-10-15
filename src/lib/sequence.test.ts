import { describe, expect, it } from 'vitest'
import { PERSONA_FRAGMENTS, USER_FRAGMENTS, type SeedFragment } from './persona'
import { analyzeEmotion } from './emotion'
import { assembleCrystal, buildLinks, generateSuddenThought } from './engine'
import type { Fragment, Preferences, SuddenThought } from './types'

// デモの筋書き（想起の順番と質）を決定論的に保証するテスト。
// このテストが通る限り、動画の再撮影でも同じ体験が再現できる。

function toFragment(seed: SeedFragment, idx: number): Fragment {
  const emotion = seed.em
    ? { valence: seed.em.v, arousal: seed.em.a, intensities: seed.em.i ?? analyzeEmotion(seed.t).intensities }
    : analyzeEmotion(seed.t)
  return {
    id: `f${String(idx).padStart(3, '0')}`,
    text: seed.t,
    createdAt: `${seed.d}T09:00:00+09:00`,
    source: 'user',
    emotion,
    people: seed.p ?? [],
    themes: seed.th ?? [],
  }
}

const PREFS: Preferences = {
  adoptedKinds: { echo: 0, tension: 0, question: 0, recall: 0 },
  rejectedKinds: { echo: 0, tension: 0, question: 0, recall: 0 },
  adoptedThoughtTexts: [],
}

describe('デモの筋書き（8ヶ月の記憶から生まれる想起の順番）', () => {
  const fragments = [...PERSONA_FRAGMENTS, ...USER_FRAGMENTS].map(toFragment)
  const links = buildLinks(fragments)

  it('1) 最初の想起は「自己引用」— 3月の「心臓がうるさい」を9月の自分が引き直している', () => {
    const t = generateSuddenThought(fragments, links, [], PREFS, new Date('2026-10-15T08:00:00+09:00'))!
    expect(t.kind).toBe('recall')
    expect(t.text).toContain('心臓がうるさい')
    expect(t.text).toContain('あれが、たぶん答えだ')
  })

  it('2) 二番目の想起は「矛盾」— 5月の諦めと10月の「明日、出す。」', () => {
    const first = generateSuddenThought(fragments, links, [], PREFS, new Date('2026-10-15T08:00:00+09:00'))!
    const second = generateSuddenThought(fragments, links, [first], PREFS, new Date('2026-10-15T08:00:00+09:00'))!
    expect(second.kind).toBe('tension')
    expect(second.text).toContain('諦めたほうがいい')
    expect(second.text).toContain('明日、出す')
  })

  it('3) 想起は種類が単調にならず、同じペアを再利用しない', () => {
    let thoughts: SuddenThought[] = []
    const kinds: string[] = []
    for (let i = 0; i < 6; i++) {
      const t = generateSuddenThought(fragments, links, thoughts, PREFS, new Date('2026-10-15T08:00:00+09:00'))
      if (!t) break
      thoughts = [...thoughts, t]
      kinds.push(t.kind)
    }
    expect(thoughts.length).toBeGreaterThanOrEqual(5)
    // 同じ種類が2回までしか連続しない
    for (let i = 2; i < kinds.length; i++) {
      expect(kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2]).toBe(false)
    }
    const pairs = thoughts.filter((t) => t.from.length === 2).map((t) => [...t.from].sort().join('|'))
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('4) 思考結晶は、行動の事実と人物の広がりを根拠つきで指摘する', () => {
    const c = assembleCrystal('留学に行くべきか、迷っている', fragments, links, new Date('2026-10-15T08:00:00+09:00'))
    const joined = c.insights.map((i) => i.text).join('\n')
    expect(joined).toMatch(/断片に現れた/)
    expect(joined).toMatch(/ミナ|父|母|ユイ/)
    expect(c.tension).toBeTruthy()
    expect(c.tension!.pastQuote.length).toBeGreaterThan(5)
  })
})
