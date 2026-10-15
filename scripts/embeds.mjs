import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto('http://localhost:5310/#/app', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const names = { circuit: '回路', flow: '流れ', stream: '思考' }
const files = { circuit: '02-circuit', flow: '03-flow', stream: '04-stream' }
for (const [v, label] of Object.entries(names)) {
  await page.getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(v === 'circuit' ? 4200 : 1200)
  if (v === 'stream') {
    await page.getByRole('button', { name: /深く考える/ }).first().click()
    await page.waitForTimeout(2600)
  }
  const main = page.locator('main')
  await main.screenshot({ path: `public/gallery/${files[v]}.png` })
  console.log('embed', v)
}
await browser.close()
