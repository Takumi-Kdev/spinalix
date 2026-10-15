// 提出用動画の制作スクリプト
// 使い方: node scripts/video.mjs
//  - ナレーション: macOS の Kyoko（日本語）
//  - 画面: Playwright でアプリ/プロダクトページ/コードを収録
//  - 字幕: ページ内に描画（英語）
//  - 出力: submission/video/demo.mp4（1920x1080, 30fps, 5分以内）

import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { CURSOR_SCRIPT } from './cursor-overlay.mjs'

const ROOT = process.cwd()
const RAW = `${ROOT}/submission/video/raw`
const AUD = `${ROOT}/submission/video/audio`
const SCN = `${ROOT}/submission/video/scenes`
const APP = 'http://localhost:5310/#/app'
const LP = 'http://localhost:5310/'
const CUR = `${ROOT}/video-code.html`

for (const d of [RAW, AUD, SCN]) rmSync(d, { recursive: true, force: true })
for (const d of [RAW, AUD, SCN]) mkdirSync(d, { recursive: true })

const PAD = 0.7 // 各シーンの末尾に足す静けさ（秒）
const RATE = 172

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ────────────────────────────────────────────────────────────────
// シーン定義
// ────────────────────────────────────────────────────────────────
const SCENES = [
  {
    id: 's0-hook',
    jp: 'この文章は、AIが書きました。でも、AIが使ったのは、私自身の言葉だけです。三月十日に残した「心臓がうるさい」という一行を、九月五日の私が、自分で引用しています。どうやって見つけたのか。起点、拡散、跳躍。選ばれなかった道まで、全部説明できます。',
    subs: [
      [0, 'This sentence was written by AI. But the only words it used were mine.'],
      [7.5, "'My heart was pounding' — written March 10. My September self quoted it back."],
      [15, 'How did it find that? Origin, spreading, leaps — even the paths it rejected.'],
    ],
    run: async (page, T) => {
      await page.goto(APP, { waitUntil: 'networkidle' })
      await sleep(1500)
      await page.mouse.move(700, 300)
      await page.mouse.move(1080, 400, { steps: 12 })
      // 「思考の足跡をひらく」を押す
      const btn = page.getByRole('button', { name: /思考の足跡/ }).first()
      await btn.click()
      await sleep(900)
      // 出典チップへ
      await page.mouse.move(760, 640, { steps: 15 })
      await sleep(Math.max(0, T * 1000 - 5200))
    },
  },
  {
    id: 's1-problem',
    jp: 'メモは貯まります。でも、読み返されない。AIに考えさせると、平均的な答えが返ってくる。問題は、記憶が足りないことではなく、自分の記憶が使われないことです。Spinalixは、記憶を貯める道具ではなく、記憶に考えさせるエンジンです。',
    subs: [
      [0, 'Notes pile up — never read again. Ask an AI and you get average answers.'],
      [8.5, "The problem isn't a lack of memory. It's that our own memories never get used."],
      [16, 'Spinalix is not a place to store memories. It is an engine that thinks with them.'],
    ],
    run: async (page, T) => {
      await page.goto(LP, { waitUntil: 'networkidle' })
      await sleep(1600)
      await page.mouse.move(900, 420)
      await sleep(2600)
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('p')].find((p) => p.textContent?.includes('メモは貯まるが'))
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      await page.mouse.move(1050, 560, { steps: 10 })
      await sleep(Math.max(0, T * 1000 - 6200))
    },
  },
  {
    id: 's2-engine',
    jp: '心臓は、端末の中で完結する記憶エンジンです。感情の強さと忘却曲線から、今、心の中で温まっている記憶を計算する。拡散活性化です。そこから回路を歩きます。ビーム探索で、共鳴、対照、反すう、軌跡、跳躍という、五つの歩き方。三月の言葉が九月に引用されている。そんな道筋を、決定論的に見つけます。',
    subs: [
      [0, 'The heart is an on-device memory engine.'],
      [5, 'Spreading activation finds what is warm inside you, right now.'],
      [12, 'Then it walks the memory graph — five ways of thinking, with beam search.'],
      [21, 'A phrase from March, quoted back in September. Found deterministically.'],
    ],
    run: async (page, T) => {
      await page.goto(`${LP}#engine`, { waitUntil: 'networkidle' })
      await sleep(1600)
      await page.mouse.move(700, 500)
      const step = 120
      const chunks = Math.max(1, Math.floor((T * 1000 - 6000) / step))
      for (let i = 0; i < chunks; i++) {
        await page.mouse.wheel(0, 8)
        await sleep(step)
      }
    },
  },
  {
    id: 's3-verify',
    jp: 'APIを使う場合も、AIには考えさせません。返ってきた言葉は検証層を通り、記憶にない引用や、出典にない日付は、破棄されます。十七のテストが、その約束を守っています。',
    subs: [
      [0, 'Even in API mode, the AI is never allowed to think.'],
      [5.5, 'A verifier rejects fabricated quotes, invented dates, and generic advice.'],
      [12, 'Seventeen tests guard that promise.'],
    ],
    run: async (page, T) => {
      await page.goto(`file://${CUR}`, { waitUntil: 'load' })
      await sleep(1400)
      await page.mouse.move(700, 520)
      const step = 120
      const chunks = Math.max(1, Math.floor((T * 1000 - 4000) / step))
      for (let i = 0; i < chunks; i++) {
        await page.mouse.wheel(0, 12)
        await sleep(step)
      }
    },
  },
  {
    id: 's4-capture',
    jp: '記録は、どこからでも。ショートカットひとつで、五秒。整理は、一切いりません。',
    subs: [
      [0, 'Capture from anywhere. One shortcut, five seconds.'],
      [5, 'No folders. No tags. No organizing.'],
    ],
    run: async (page, T) => {
      await page.goto(APP, { waitUntil: 'networkidle' })
      await sleep(1400)
      await page.keyboard.press('n')
      await page.waitForSelector('textarea[placeholder*="気持ち"]', { timeout: 6000 })
      await sleep(600)
      await page.locator('textarea[placeholder*="気持ち"]').fill('今日は、昔の友達に偶然会って、少し嬉しかった。')
      await sleep(1300)
      await page.mouse.move(560, 860, { steps: 10 })
      try {
        await page.locator('.fixed.inset-0').getByRole('button', { name: '記憶する' }).click({ timeout: 7000 })
      } catch {
        await page.getByRole('button', { name: '記憶する' }).last().click({ timeout: 7000 })
      }
      await sleep(Math.max(0, T * 1000 - 6200))
    },
  },
  {
    id: 's5-circuit',
    jp: '断片は、自動で回路になります。感情は色。いま朱色の粒が走っているのが、さっきの想起が歩いた道です。',
    subs: [
      [0, 'Fragments become circuits — automatically. Emotion is the color.'],
      [6, 'The vermilion sparks are the exact path of the recall.'],
    ],
    run: async (page, T) => {
      await page.goto(APP, { waitUntil: 'networkidle' })
      await sleep(1600)
      await page.getByRole('button', { name: '回路' }).first().click()
      await sleep(3600)
      await page.mouse.move(980, 520, { steps: 16 })
      await page.mouse.down()
      await page.mouse.move(1120, 600, { steps: 18 })
      await page.mouse.up()
      await sleep(Math.max(0, T * 1000 - 8000))
    },
  },
  {
    id: 's6-flow',
    jp: '八ヶ月の感情を、一本の川として見ます。五月に沈んで、八月に戻ってきているのが、ひと目で分かります。',
    subs: [
      [0, 'Eight months of emotion, as a single river.'],
      [6, 'You sank in May. You came back in August. Visible at a glance.'],
    ],
    run: async (page, T) => {
      await page.goto(APP, { waitUntil: 'networkidle' })
      await sleep(1600)
      await page.getByRole('button', { name: '流れ' }).first().click()
      await sleep(1800)
      await page.mouse.move(760, 420, { steps: 14 })
      await sleep(1600)
      await page.mouse.move(1120, 430, { steps: 18 })
      await sleep(Math.max(0, T * 1000 - 7000))
    },
  },
  {
    id: 's7-stream',
    jp: 'この脳は、私が問いを立てなくても考えます。二十四秒ごとに記憶を歩き、便箋を積んでいく。「五月のあなたは、留学は諦めたほうがいいと言った。それなのに、十月のあなたは、三月より落ち着いていると言う」。不快になることもあります。でも、これは忖度しないということです。',
    subs: [
      [0, 'This brain thinks even when I ask nothing.'],
      [5, "Every 24 seconds, it walks my memory and stacks a letter."],
      [12, '"In May you said: give up on studying abroad."'],
      [18, '"Yet in October you say: calmer than March." Uncomfortable — that is the point.'],
    ],
    run: async (page, T) => {
      await page.goto(APP, { waitUntil: 'networkidle' })
      await sleep(1500)
      await page.getByRole('button', { name: '思考' }).first().click()
      await sleep(1000)
      await page.getByRole('button', { name: /深く考える/ }).first().click()
      await sleep(3400)
      await page.mouse.move(900, 700, { steps: 14 })
      const stepsBtn = page.getByRole('button', { name: /思考の足跡/ }).first()
      if (await stepsBtn.count()) {
        await stepsBtn.click()
      }
      await sleep(Math.max(0, T * 1000 - 9500))
    },
  },
  {
    id: 's8-purpose',
    jp: '決断したいときは、目的モード。八ヶ月分の断片から、出典つきの思考結晶が組み上がります。感情の弧、洞察、矛盾、そして、次の一歩。',
    subs: [
      [0, 'When a decision is near, Purpose mode.'],
      [6, 'A crystallization with sources: an emotional arc, insights, contradictions, next steps.'],
    ],
    run: async (page, T) => {
      await page.goto(APP, { waitUntil: 'networkidle' })
      await sleep(1400)
      await page.getByRole('button', { name: '目的' }).first().click()
      await sleep(900)
      await page.locator('textarea').first().fill('留学に行くべきか、迷っている')
      await page.mouse.move(700, 640, { steps: 10 })
      await sleep(900)
      await page.getByRole('button', { name: '思考結晶をつくる' }).click()
      await sleep(2400)
      const step = 110
      const chunks = Math.max(1, Math.floor((T * 1000 - 7000) / step))
      for (let i = 0; i < chunks; i++) {
        await page.mouse.wheel(0, 18)
        await sleep(step)
      }
    },
  },
  {
    id: 's9-scale',
    jp: 'スケーラビリティは、三つ。ひとつ、処理は端末の中。AIのクラウド原価はゼロで、ユーザーが増えても、コストは増えません。ふたつ、記憶はローカルのJSONファイル。アプリはメニューバーに常駐し、同じWi-Fiのスマホが、印ひとつで同じ脳に接続します。みっつ、断片が一万を超えたら、回路計算はブロック分割に載せ替えます。エンジンは純関数なので、差し替えは局所です。',
    subs: [
      [0, 'Three things make it scale. One: processing is on-device — zero cloud cost per user.'],
      [9, 'Two: memory is one local JSON. A menu-bar app; your phone joins with one seal.'],
      [20, 'Three: at ten thousand fragments, the pure-function engine swaps in bucketed search.'],
    ],
    run: async (page, T) => {
      await page.goto(APP, { waitUntil: 'networkidle' })
      await sleep(1500)
      await page.getByRole('button', { name: '計測' }).first().click()
      await sleep(1600)
      const step = 110
      const mid = Math.floor((T * 1000 - 9000) / 2 / step)
      for (let i = 0; i < mid; i++) {
        await page.mouse.wheel(0, 22)
        await sleep(step)
      }
      await page.getByRole('button', { name: /設定・接続・取り込み/ }).first().click()
      await sleep(1800)
      await page.mouse.move(900, 640, { steps: 14 })
      await sleep(1200)
    },
  },
  {
    id: 's10-business',
    jp: '無料は、ローカル完結のまま。Proは、月七百八十円。AIジャーナルのローズバッドは月十三ドルで六百万ドルを調達し、デジタル日記の市場は六千億円規模、年十パーセントで成長しています。原価の大半は端末の中だから、粗利率は九十五パーセントを超えます。AI文体モードは、信頼を売る課金です。',
    subs: [
      [0, 'Free stays local. Pro is ¥780 a month.'],
      [7, 'AI journals like Rosebud charge $12.99/mo and raised $6M. The market grows 10% a year.'],
      [18, 'Most cost lives on-device: gross margin above 95%. The AI stylist sells trust.'],
    ],
    run: async (page, T) => {
      await page.goto(LP, { waitUntil: 'networkidle' })
      await sleep(1400)
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('h2')].find((h) => h.textContent?.includes('事業'))
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      await sleep(2200)
      await page.mouse.move(1000, 480, { steps: 12 })
      await sleep(Math.max(0, T * 1000 - 5200))
    },
  },
  {
    id: 's11-close',
    jp: 'Spinalixは、あなたを評価しません。励ましもしません。ただ、あなたが忘れていたあなたを、返してきます。記憶は、あなたの手元に。Spinalix。記憶が、あなたに話しかける。',
    subs: [
      [0, 'Spinalix will not rate you. It will not flatter you.'],
      [6, 'It just gives back the parts of you that you had forgotten.'],
      [14, 'Your memory stays with you. Spinalix — a memory that speaks to you.'],
    ],
    run: async (page, T) => {
      await page.goto(APP, { waitUntil: 'networkidle' })
      await sleep(1600)
      await page.mouse.move(900, 480)
      await sleep(1200)
      const last = page.getByRole('button', { name: /思考の足跡/ }).first()
      if (await last.count()) await last.click()
      await sleep(Math.max(0, T * 1000 - 4200))
    },
  },
]

// ────────────────────────────────────────────────────────────────
// 実行
// ────────────────────────────────────────────────────────────────
const probe = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString().trim())

async function narrate(scene) {
  const aiff = `${AUD}/${scene.id}.aiff`
  const wav = `${AUD}/${scene.id}.wav`
  execFileSync('say', ['-v', 'Kyoko', '-r', String(RATE), '-o', aiff, scene.jp])
  execFileSync('ffmpeg', ['-y', '-i', aiff, '-ar', '48000', '-ac', '2', wav], { stdio: 'ignore' })
  return probe(wav)
}

async function main() {
  const browser = await chromium.launch()

  // 1) ナレーション生成と尺の確定
  const plan = []
  for (const scene of SCENES) {
    const dur = await narrate(scene)
    const total = Math.ceil((dur + PAD) * 10) / 10
    plan.push({ scene, audio: dur, total })
    console.log(`[audio] ${scene.id}: ${dur.toFixed(1)}s → scene ${total.toFixed(1)}s`)
  }
  let t = 0
  for (const p of plan) {
    p.start = t
    t += p.total
  }
  console.log(`[plan] total ${t.toFixed(1)}s`)

  // 2) 画面収録
  for (const p of plan) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
    })
    await context.addInitScript(CURSOR_SCRIPT)
    const page = await context.newPage()
    // シーン開始時から字幕をセット（run 内の sleep と並行して切り替え）
    const subTimer = setInterval(() => {}, 1e9) // プレースホルダ（実行中は使わない）
    let sceneDone = false
    const subs = p.scene.subs
    ;(async () => {
      const start = Date.now()
      let idx = 0
      while (!sceneDone) {
        const elapsed = (Date.now() - start) / 1000
        while (idx + 1 < subs.length && subs[idx + 1][0] <= elapsed) idx++
        const text = subs[idx][1]
        await page.evaluate((tt) => { if (window.__sub && window.__subText !== tt) window.__sub(tt) }, text).catch(() => {})
        await sleep(250)
      }
    })()
    const sceneStart = Date.now()
    try {
      await p.scene.run(page, p.total)
    } catch (err) {
      console.warn(`[warn] ${p.scene.id} の操作でエラー（残り時間は静止で埋めます）:`, String(err).slice(0, 160))
      const remain = p.total * 1000 - (Date.now() - sceneStart) - 300
      if (remain > 0) await sleep(remain)
    }
    sceneDone = true
    await page.evaluate(() => window.__sub && window.__sub('')).catch(() => {})
    const video = page.video()
    await context.close()
    clearInterval(subTimer)
    const rawPath = await video.path()
    const out = `${SCN}/${p.scene.id}.mp4`
    const rawDur = probe(rawPath)
    if (rawDur >= p.total) {
      execFileSync('ffmpeg', ['-y', '-i', rawPath, '-t', String(p.total), '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', out], { stdio: 'ignore' })
    } else {
      execFileSync('ffmpeg', ['-y', '-i', rawPath, '-vf', `fps=30,tpad=stop_mode=clone:stop_duration=${(p.total - rawDur).toFixed(2)}`, '-t', String(p.total), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', out], { stdio: 'ignore' })
    }
    console.log(`[scene] ${p.scene.id}: raw ${rawDur.toFixed(1)}s → ${p.total.toFixed(1)}s`)
  }
  await browser.close()

  // 3) 音声をシーン尺に合わせて整える
  for (const p of plan) {
    const src = `${AUD}/${p.scene.id}.wav`
    const out = `${AUD}/${p.scene.id}.pad.wav`
    execFileSync('ffmpeg', ['-y', '-i', src, '-af', `apad=pad_dur=${p.total}`, '-t', String(p.total), '-ar', '48000', '-ac', '2', out], { stdio: 'ignore' })
  }

  // 4) 連結（映像・音声）
  const listV = `${SCN}/list.txt`
  writeFileSync(listV, plan.map((p) => `file '${p.scene.id}.mp4'`).join('\n'))
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listV, '-c', 'copy', `${SCN}/video.mp4`], { stdio: 'ignore', cwd: SCN })

  const listA = `${AUD}/list.txt`
  writeFileSync(listA, plan.map((p) => `file '${p.scene.id}.pad.wav'`).join('\n'))
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listA, '-c', 'copy', `${AUD}/audio.wav`], { stdio: 'ignore', cwd: AUD })

  // 5) 最終ミックス
  const final = `${ROOT}/submission/video/demo.mp4`
  execFileSync(
    'ffmpeg',
    ['-y', '-i', `${SCN}/video.mp4`, '-i', `${AUD}/audio.wav`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final],
    { stdio: 'ignore' },
  )
  console.log(`[done] ${final} (${probe(final).toFixed(1)}s)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
