import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
await mkdir('submission/review', { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto('http://localhost:5310/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const shots = [
  ['#engine', 'land-engine'],
  ['#system', 'land-system'],
  ['#screens', 'land-screens'],
  ['#position', 'land-position'],
]
for (const [sel, name] of shots) {
  const el = await page.$(sel)
  if (el) {
    await el.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await el.screenshot({ path: `submission/review/${name}.png` })
    console.log('shot', name)
  }
}
// テストと事業は見出しから
for (const [text, name] of [['テスト', 'land-tests'], ['事業', 'land-business']]) {
  const h = page.locator('h2', { hasText: text }).first()
  if (await h.count()) {
    const section = h.locator('xpath=ancestor::section[1]')
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await section.screenshot({ path: `submission/review/${name}.png` })
    console.log('shot', name)
  }
}
await browser.close()
