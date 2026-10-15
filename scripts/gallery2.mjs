import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const OUT = 'submission/gallery'
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

// 01 ランディング（全体）
await page.goto('http://localhost:5310/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
await page.screenshot({ path: `${OUT}/01-landing-full.png`, fullPage: true })
await page.screenshot({ path: `${OUT}/00-landing-hero.png` })
console.log('01 landing')

// アプリ
await page.goto('http://localhost:5310/#/app', { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await page.screenshot({ path: `${OUT}/02-home.png` })

const names = { circuit: '回路', flow: '流れ', stream: '思考', purpose: '目的', system: '計測' }
for (const [v, label] of Object.entries(names)) {
  await page.getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(v === 'circuit' ? 4200 : 1100)
  if (v === 'stream') {
    await page.getByRole('button', { name: /深く考える/ }).first().click()
    await page.waitForTimeout(2800)
  }
  if (v === 'purpose') {
    await page.locator('textarea').first().fill('留学に行くべきか、迷っている')
    await page.getByRole('button', { name: '思考結晶をつくる' }).click()
    await page.waitForTimeout(1600)
  }
  await page.screenshot({ path: `${OUT}/0${3 + Object.keys(names).indexOf(v) + 1}-${v}.png` })
  console.log('shot', v)
}

// 設定（QR）
await page.getByRole('button', { name: '設定・接続・取り込み' }).first().click()
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/08-settings.png` })

await browser.close()

console.log('done (embeds untouched)')
