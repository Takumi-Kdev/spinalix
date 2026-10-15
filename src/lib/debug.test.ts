import { it } from 'vitest'
import { PERSONA_FRAGMENTS, USER_FRAGMENTS, type SeedFragment } from './persona'
import { analyzeEmotion } from './emotion'
import { assembleCrystal, buildLinks, generateSuddenThought } from './engine'
import type { Fragment, Preferences, SuddenThought } from './types'

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

const PREFS: Preferences = { adoptedKinds: { echo: 0, tension: 0, question: 0, recall: 0 }, rejectedKinds: { echo: 0, tension: 0, question: 0, recall: 0 }, adoptedThoughtTexts: [] }

it('showcase', () => {
  const fragments = [...PERSONA_FRAGMENTS, ...USER_FRAGMENTS].map(toFragment)
  const links = buildLinks(fragments)
  const count = (k: string) => links.filter((l) => l.kind === k).length
  console.log('links:', { total: links.length, recall: count('recall'), echo: count('echo'), tension: count('tension'), similar: count('similar'), theme: count('theme'), person: count('person') })

  let thoughts: SuddenThought[] = []
  for (let i = 0; i < 6; i++) {
    const t = generateSuddenThought(fragments, links, thoughts, PREFS, new Date('2026-10-15T08:00:00+09:00'))
    if (!t) break
    thoughts = [...thoughts, t]
    console.log(`\n[${i + 1}] (${t.kind}) ${t.text}`)
  }

  const crystal = assembleCrystal('留学に行くべきか、迷っている', fragments, links, new Date('2026-10-15T08:00:00+09:00'))
  console.log('\n===== 思考結晶 =====')
  console.log('意図:', crystal.intention)
  console.log('感情の弧 [' + crystal.arcLabel + ']:', crystal.arcPoints.map((p) => `${p.at.slice(5)}=>v${p.valence.toFixed(2)}`).join(' '))
  console.log('\n想起:')
  for (const r of crystal.recalled) console.log(`  ・${r.when}「${r.quote}」 (${r.why})`)
  console.log('\n洞察:')
  for (const i of crystal.insights) console.log(`  ・${i.text}`)
  if (crystal.tension) {
    console.log('\n矛盾:')
    console.log(`  過去(${crystal.tension.pastWhen}): 「${crystal.tension.pastQuote}」`)
    console.log(`  今: 「${crystal.tension.nowQuote}」`)
    console.log(`  → ${crystal.tension.question}`)
  }
  console.log('\n次の一歩:')
  for (const s of crystal.nextSteps) console.log(`  ・${s}`)
})
