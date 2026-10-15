// 審査員用ギャラリー画像の自動生成（1500x1000）
// 使い方: npm run brain を起動した状態で `node scripts/gallery.mjs`
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BRAIN = process.env.BRAIN_URL ?? 'http://localhost:5310'
const OUT = 'submission/gallery'

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()

  // 1) ホーム — 自己引用の想起
  await page.goto(BRAIN, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.body.innerText.includes('自己引用'), null, { timeout: 15000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/01-home-recall.png` })

  // 2) 回路
  await page.getByRole('button', { name: '回路' }).click()
  await page.waitForTimeout(2800)
  await page.screenshot({ path: `${OUT}/02-circuit.png` })

  // 3) 思考結晶
  await page.getByRole('button', { name: '目的' }).click()
  await page.waitForTimeout(500)
  await page.locator('textarea').first().fill('留学に行くべきか、迷っている')
  await page.getByRole('button', { name: '思考結晶をつくる' }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/03-thought-crystal.png` })

  // 4) 矛盾セクションまでスクロール
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('p')].find((p) => p.textContent?.includes('あなたの中の矛盾'))
    el?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/04-crystal-tension.png` })

  // 5) 接続（QR）
  await page.getByRole('button', { name: 'ホーム' }).click()
  await page.getByRole('button', { name: '設定' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/05-connection-qr.png` })
  await page.keyboard.press('Escape').catch(() => {})
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="閉じる"]')
    if (el) el.click()
  })
  await page.waitForTimeout(400)

  // 6) 断片の詳細（つながっている記憶）
  const chip = page.locator('button', { hasText: /\d+月\d+日/ }).first()
  if (await chip.count()) {
    await chip.click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/06-fragment-links.png` })
  }

  await browser.close()
  console.log('gallery written to', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
