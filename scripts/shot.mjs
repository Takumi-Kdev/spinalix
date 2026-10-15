import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const URL = process.env.URL ?? 'http://localhost:5310'
const OUT = process.env.OUT ?? 'submission/gallery'
const view = process.env.VIEW ?? 'home'
const FILE = process.env.FILE ?? view
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1600)
const names = { circuit: '回路', flow: '流れ', stream: '思考', purpose: '目的' }
if (names[view]) {
  await page.getByRole('button', { name: names[view] }).first().click()
  await page.waitForTimeout(view === 'circuit' ? 3400 : 1000)
}
if (view === 'purpose') {
  await page.locator('textarea').first().fill('留学に行くべきか、迷っている')
  await page.getByRole('button', { name: '思考結晶をつくる' }).click()
  await page.waitForTimeout(1500)
}
if (view === 'stream') {
  await page.getByRole('button', { name: /深く考える/ }).first().click()
  await page.waitForTimeout(2600)
}
if (view === 'settings') {
  await page.getByRole('button', { name: /設定・接続・取り込み/ }).first().click()
  await page.waitForTimeout(900)
}
if (view === 'fragment') {
  await page.getByRole('button', { name: /3月10日/ }).first().click()
  await page.waitForTimeout(800)
}
await page.screenshot({ path: `${OUT}/${FILE}.png` })
await browser.close()
console.log('shot', FILE)
