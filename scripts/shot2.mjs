import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const URL = process.env.URL ?? 'http://localhost:5310/'
const OUT = process.env.OUT ?? 'submission/review'
const FILE = process.env.FILE ?? 'shot'
const FULL = process.env.FULL === '1'
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: process.env.W ? Number(process.env.W) : 1440, height: process.env.H ? Number(process.env.H) : 960 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await page.screenshot({ path: `${OUT}/${FILE}.png`, fullPage: FULL })
await browser.close()
console.log('shot', FILE)
