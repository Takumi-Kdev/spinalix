import { it } from 'vitest'
import { PERSONA_FRAGMENTS, USER_FRAGMENTS, type SeedFragment } from './persona'
import { analyzeEmotion } from './emotion'
import { buildLinks } from './engine'
import { generateSuddenThought } from './think'
import { activate, primingSeeds } from './activation'
import type { Fragment, Preferences, SuddenThought } from './types'

function toFragment(seed: SeedFragment, idx: number): Fragment {
  const emotion = seed.em
    ? { valence: seed.em.v, arousal: seed.em.a, intensities: seed.em.i ?? analyzeEmotion(seed.t).intensities }
    : analyzeEmotion(seed.t)
  return { id: `f${String(idx).padStart(3, '0')}`, text: seed.t, createdAt: `${seed.d}T09:00:00+09:00`, source: 'user', emotion, people: seed.p ?? [], themes: seed.th ?? [] }
}

const PREFS: Preferences = {
  adoptedKinds: { echo: 0, tension: 0, question: 0, recall: 0, arc: 0, leap: 0, openloop: 0 },
  rejectedKinds: { echo: 0, tension: 0, question: 0, recall: 0, arc: 0, leap: 0, openloop: 0 },
  adoptedThoughtTexts: [],
}

it('showcase v2', () => {
  const fragments = [...PERSONA_FRAGMENTS, ...USER_FRAGMENTS].map(toFragment)
  const links = buildLinks(fragments)
  const now = new Date('2026-10-15T08:00:00+09:00')
  const act = activate(fragments, links, now)
  const seeds = primingSeeds(fragments, now)
  console.log('\nシード:', JSON.stringify(seeds.map((s) => ({ id: s.id, w: s.weight, r: s.reason }))))
  const top = [...act.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  console.log('活性トップ:', JSON.stringify(top.map(([id, v]) => ({ id, v: Number(v.toFixed(3)) }))))

  let thoughts: SuddenThought[] = []
  for (let i = 0; i < 7; i++) {
    const t = generateSuddenThought(fragments, links, thoughts, PREFS, now)
    if (!t) break
    thoughts = [...thoughts, t]
    console.log(`\n[${i + 1}] (${t.kind} / ${t.fingerprint}) ${t.text}`)
    for (const s of t.steps) console.log(`    ・${s.label}: ${s.detail}`)
  }
})
