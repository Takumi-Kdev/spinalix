import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const URL = process.env.URL ?? 'http://localhost:5310'
const OUT = process.env.OUT ?? 'submission/gallery'
const view = process.env.VIEW ?? 'home'
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
if (view !== 'home') {
  const names = { circuit: '回路', flow: '流れ', stream: '思考', purpose: '目的' }
  await page.getByRole('button', { name: names[view] }).first().click()
  await page.waitForTimeout(view === 'circuit' ? 3200 : 900)
}
if (view === 'purpose') {
  await page.locator('textarea').first().fill('留学に行くべきか、迷っている')
  await page.getByRole('button', { name: '思考結晶をつくる' }).click()
  await page.waitForTimeout(1400)
}
if (view === 'stream') {
  await page.getByRole('button', { name: /深く考える/ }).first().click()
  await page.waitForTimeout(2500)
}
await page.screenshot({ path: `${OUT}/${view}.png` })
await browser.close()
console.log('shot', view)
