import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto('http://localhost:5310/#/app', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const names = { stream: '思考', purpose: '目的', system: '計測' }
for (const [v, label] of Object.entries(names)) {
  await page.getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(1000)
  if (v === 'stream') {
    await page.getByRole('button', { name: /深く考える/ }).first().click()
    await page.waitForTimeout(2600)
  }
  if (v === 'purpose') {
    await page.locator('textarea').first().fill('留学に行くべきか、迷っている')
    await page.getByRole('button', { name: '思考結晶をつくる' }).click()
    await page.waitForTimeout(1500)
  }
  await page.screenshot({ path: `submission/review/app-${v}.png` })
  console.log('shot', v)
}
// モバイル
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })
const mp = await m.newPage()
await mp.goto('http://localhost:5310/#/app', { waitUntil: 'networkidle' })
await mp.waitForTimeout(2000)
await mp.screenshot({ path: 'submission/review/mobile-home.png' })
console.log('shot mobile')
await browser.close()
