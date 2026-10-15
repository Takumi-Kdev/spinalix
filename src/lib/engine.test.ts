import { describe, expect, it } from 'vitest'
import { PERSONA_FRAGMENTS, USER_FRAGMENTS, type SeedFragment } from './persona'
import { analyzeEmotion } from './emotion'
import { adoptThought, assembleCrystal, buildLinks, generateSuddenThought, pairKey, usedPairKeys } from './engine'
import type { Fragment, Preferences } from './types'

function toFragment(seed: SeedFragment, idx: number): Fragment {
  const emotion = seed.em
    ? {
        valence: seed.em.v,
        arousal: seed.em.a,
        intensities: seed.em.i ?? analyzeEmotion(seed.t).intensities,
      }
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

const EMPTY_PREFS: Preferences = { adoptedKinds: { echo: 0, tension: 0, question: 0, recall: 0 }, rejectedKinds: { echo: 0, tension: 0, question: 0, recall: 0 }, adoptedThoughtTexts: [] }

function loadPersona(): Fragment[] {
  return [...PERSONA_FRAGMENTS, ...USER_FRAGMENTS].map(toFragment)
}

describe('記憶エンジン（ペルソナデータでの実検証）', () => {
  const fragments = loadPersona()
  const links = buildLinks(fragments)

  it('ペルソナは少なくとも60の断片を持つ', () => {
    expect(fragments.length).toBeGreaterThanOrEqual(60)
    expect(new Set(fragments.map((f) => f.id)).size).toBe(fragments.length)
  })

  it('自動回路が張られる（echo/tensionを含む）', () => {
    const kinds = new Set(links.map((l) => l.kind))
    expect(kinds.has('similar')).toBe(true)
    expect(kinds.has('theme')).toBe(true)
    expect(kinds.has('echo')).toBe(true)
    expect(kinds.has('tension')).toBe(true)
  })

  it('9月の「心臓がうるさい」への自己引用が recall で繋がる', () => {
    const mar = fragments.find((f) => f.text.includes('考えるだけで、心臓がうるさい'))
    const sep = fragments.find((f) => f.text.includes('あれが、たぶん答えだ'))
    expect(mar && sep).toBeTruthy()
    const key = pairKey(mar!.id, sep!.id)
    const found = links.find((l) => pairKey(l.a, l.b) === key && l.kind === 'recall')
    expect(found).toBeTruthy()
    expect(found!.reason).toContain('心臓がうるさい')
  })

  it('遠い時期の同じ感情が echo で繋がる', () => {
    const echoes = links.filter((l) => l.kind === 'echo')
    expect(echoes.length).toBeGreaterThanOrEqual(1)
    expect(echoes[0].reason).toBeTruthy()
  })

  it('5月の「諦めたほうがいい」と8月の「扉は思ったより多かった」が tension で繋がる', () => {
    const may = fragments.find((f) => f.text.includes('諦めたほうがいい'))
    const aug = fragments.find((f) => f.text.includes('扉は思ったより多かった'))
    const key = pairKey(may!.id, aug!.id)
    const found = links.find((l) => pairKey(l.a, l.b) === key && l.kind === 'tension')
    expect(found).toBeTruthy()
  })

  it('ふと（想起）が生成され、出典に実在の断片を持つ', () => {
    const used = new Set<string>()
    const texts: string[] = []
    let thoughts = [] as ReturnType<typeof generateSuddenThought>[]
    for (let i = 0; i < 6; i++) {
      const t = generateSuddenThought(fragments, links, thoughts as never[], EMPTY_PREFS, new Date('2026-10-15T08:00:00+09:00'))
      if (!t) break
      thoughts = [...thoughts, t]
      texts.push(t.text)
      for (const id of t.from) expect(fragments.some((f) => f.id === id)).toBe(true)
    }
    expect(texts.length).toBeGreaterThanOrEqual(5)
    const joined = texts.join('\n')
    expect(joined).toContain('')
    // 同じ組み合わせを再利用しない
    const keys = usedPairKeys(thoughts as never[])
    expect(keys.size).toBeGreaterThanOrEqual(5)
  })

  it('採用された想起は機械の断片として回路に定着する', () => {
    const t = generateSuddenThought(fragments, links, [], EMPTY_PREFS, new Date('2026-10-15T08:00:00+09:00'))!
    const mf = adoptThought(t, fragments)
    expect(mf.source).toBe('machine')
    expect(mf.text).toBe(t.text)
    expect(mf.themes.length).toBeGreaterThan(0)
  })

  it('思考結晶: 留学の迷いに対して、出典つきの想起・感情の弧・矛盾を返す', () => {
    const crystal = assembleCrystal('留学に行くべきか、迷っている', fragments, links, new Date('2026-10-15T08:00:00+09:00'))
    expect(crystal.recalled.length).toBeGreaterThanOrEqual(3)
    expect(crystal.recalled.some((r) => r.quote.includes('留学') || r.why.includes('留学'))).toBe(true)
    expect(crystal.arcPoints.length).toBeGreaterThanOrEqual(3)
    expect(crystal.insights.length).toBeGreaterThanOrEqual(2)
    expect(crystal.nextSteps.length).toBeGreaterThanOrEqual(1)
  })

  it('決定論的: 同じ入力から同じ想起が出る', () => {
    const a = generateSuddenThought(fragments, links, [], EMPTY_PREFS, new Date('2026-10-15T08:00:00+09:00'))
    const b = generateSuddenThought(fragments, links, [], EMPTY_PREFS, new Date('2026-10-15T08:00:00+09:00'))
    expect(a?.text).toBe(b?.text)
    expect(a?.from).toEqual(b?.from)
  })
})

describe('感情モデル（語彙推定）', () => {
  it('強い喜びの文から joy を検出する', () => {
    const e = analyzeEmotion('最高すぎる!やっと合格できた、本当に嬉しい!')
    expect(e.valence).toBeGreaterThan(0.4)
    expect(e.intensities.joy).toBeGreaterThan(0.3)
  })
  it('不安の文から anxiety を検出し valence が負になる', () => {
    const e = analyzeEmotion('面接のことを考えると、とても不安で、心配で眠れない')
    expect(e.valence).toBeLessThan(0)
    expect(e.intensities.anxiety).toBeGreaterThan(0.3)
  })
})
