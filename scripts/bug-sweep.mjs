// 全画面スイープ: コンソールエラー・例外・表示崩れの検出
import { chromium } from 'playwright'

const URLS = {
  landing: 'http://localhost:5310/',
  app: 'http://localhost:5310/#/app',
}

const errors = []

async function sweep(name, url, fn) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${name}] console: ${m.text().slice(0, 180)}`)
  })
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${String(e).slice(0, 180)}`))
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await fn(page)
  } catch (e) {
    errors.push(`[${name}] flow-failed: ${String(e).slice(0, 200)}`)
  }
  await browser.close()
}

const clickNav = async (page, label) => {
  await page.getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(900)
}

await sweep('landing', URLS.landing, async (page) => {
  await page.waitForTimeout(1500)
  // 全セクションをスクロールして通過
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(220)
  }
  // アプリへの導線
  await page.getByRole('link', { name: 'デモを開く' }).first().click()
  await page.waitForTimeout(1600)
})

await sweep('app-all-views', URLS.app, async (page) => {
  await page.waitForTimeout(2000)
  // ガイドが出ていたら閉じる
  const start = page.getByRole('button', { name: /Start exploring/ })
  if (await start.count()) await start.click()
  await page.waitForTimeout(400)
  for (const v of ['回路', '流れ', '思考', '目的', '計測', '今日']) {
    await clickNav(page, v)
  }
  // 思考を回す
  await clickNav(page, '思考')
  await page.getByRole('button', { name: /深く考える/ }).first().click()
  await page.waitForTimeout(2600)
  // 足跡を開く
  const steps = page.getByRole('button', { name: /思考の足跡/ }).first()
  if (await steps.count()) {
    await steps.click()
    await page.waitForTimeout(600)
  }
  // これは私だ → 採用
  const keep = page.getByRole('button', { name: 'これは私だ' }).first()
  if (await keep.count()) {
    await keep.click()
    await page.waitForTimeout(900)
  }
  // 目的モード
  await clickNav(page, '目的')
  await page.locator('textarea').first().fill('留学に行くべきか、迷っている')
  await page.getByRole('button', { name: '思考結晶をつくる' }).click()
  await page.waitForTimeout(1800)
  // キャプチャ
  await clickNav(page, '今日')
  await page.keyboard.press('n')
  await page.waitForTimeout(700)
  await page.locator('textarea[placeholder*="気持ち"]').fill('バグ確認用のテスト断片です。')
  await page.locator('.fixed.inset-0').getByRole('button', { name: '記憶する' }).click()
  await page.waitForTimeout(1400)
  // 検索
  await page.keyboard.press('/')
  await page.keyboard.type('留学')
  await page.waitForTimeout(500)
  await page.keyboard.press('Escape')
  // 設定（QR含む）
  await clickNav(page, '計測')
  await page.getByRole('button', { name: /設定・接続・取り込み/ }).first().click()
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: '閉じる' }).last().click()
  await page.waitForTimeout(400)
  // Obsidian取り込みの実動作
  await page.getByRole('button', { name: /設定・接続・取り込み/ }).first().click()
  await page.waitForTimeout(600)
  const beforeCount = await page.evaluate(() => {
    const raw = localStorage.getItem('spinalix-v2')
    return raw ? JSON.parse(raw).fragments.length : 0
  })
  try {
    await page.locator('input[webkitdirectory]').setInputFiles('demo-vault')
    await page.waitForTimeout(2600)
  } catch (e) {
    errors.push(`[import] setInputFiles failed: ${String(e).slice(0, 140)}`)
  }
  const afterCount = await page.evaluate(() => {
    const raw = localStorage.getItem('spinalix-v2')
    return raw ? JSON.parse(raw).fragments.length : 0
  })
  console.log(`[import] fragments before=${beforeCount} after=${afterCount}`)
  await page.getByRole('button', { name: '閉じる' }).last().click()
  await page.waitForTimeout(400)
  // リセット → 初期状態からの復帰
  await page.getByRole('button', { name: /設定・接続・取り込み/ }).first().click()
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'リセット' }).click()
  await page.getByRole('button', { name: '本当に戻す' }).click()
  await page.waitForTimeout(2000)
  const afterReset = await page.evaluate(() => {
    const raw = localStorage.getItem('spinalix-v2')
    if (!raw) return null
    const d = JSON.parse(raw)
    return { fragments: d.fragments.length, thoughts: d.thoughts.length }
  })
  console.log(`[reset] state = ${JSON.stringify(afterReset)}`)
  const recallVisible = await page.evaluate(() => document.body.innerText.includes('自己引用'))
  console.log(`[reset] recall visible again: ${recallVisible}`)
})

await sweep('app-mobile', URLS.app, async (page) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(2200)
  const start = page.getByRole('button', { name: /Start exploring/ })
  if (await start.count()) await start.click()
  for (const v of ['回路', '流れ', '思考', '目的', '計測']) {
    await clickNav(page, v)
  }
})

await sweep('app-reload-persistence', URLS.app, async (page) => {
  await page.waitForTimeout(2000)
  const start = page.getByRole('button', { name: /Start exploring/ })
  if (await start.count()) await start.click()
  const before = await page.evaluate(() => {
    const raw = localStorage.getItem('spinalix-v2')
    return raw ? JSON.parse(raw).fragments.length : 0
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  const after = await page.evaluate(() => {
    const raw = localStorage.getItem('spinalix-v2')
    return raw ? JSON.parse(raw).fragments.length : 0
  })
  console.log(`[persistence] before=${before} after=${after}`)
  const size = await page.evaluate(() => {
    const raw = localStorage.getItem('spinalix-v2') ?? ''
    return raw.length
  })
  console.log(`[storage] spinalix-v2 size = ${(size / 1024).toFixed(0)} KB`)
})

console.log('\n=== ERRORS ===')
if (errors.length === 0) console.log('なし')
for (const e of errors) console.log(e)
