// Spinalix — 常駐する「脳」サーバー（Mac側）
// 使い方: npm run build && node server.mjs
//   → 同じWi-Fiのスマホから QR / URL で接続すると、同じ記憶に触れられます
// メモリはディスク上の1つのJSONファイルに保存され、外部には一切送信されません。

import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { networkInterfaces } from 'node:os'

const PORT = Number(process.env.PORT ?? 5310)
const ROOT = resolve(process.cwd())
const DIST = join(ROOT, 'dist')
const DATA_DIR = join(ROOT, '.spinalix')
const DATA_FILE = join(DATA_DIR, 'brain.json')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function lanAddress() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return `http://${net.address}:${PORT}`
    }
  }
  return `http://localhost:${PORT}`
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return Buffer.concat(chunks).toString('utf8')
}

async function loadState() {
  try {
    const raw = await readFile(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function saveState(body) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, body, 'utf8')
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

  // ── API ────────────────────────────────────────────────
  if (url.pathname === '/api/info') {
    res.writeHead(200, { 'content-type': MIME['.json'] })
    res.end(JSON.stringify({ mode: 'brain', lan: lanAddress(), dataFile: DATA_FILE }))
    return
  }
  if (url.pathname === '/api/state') {
    if (req.method === 'GET') {
      const state = await loadState()
      res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' })
      res.end(JSON.stringify(state ?? { updatedAt: 0, payload: null }))
      return
    }
    if (req.method === 'PUT') {
      try {
        const body = await readBody(req)
        JSON.parse(body) // 検証
        await saveState(body)
        res.writeHead(200, { 'content-type': MIME['.json'] })
        res.end('{"ok":true}')
      } catch (e) {
        res.writeHead(400, { 'content-type': MIME['.json'] })
        res.end(JSON.stringify({ ok: false, error: String(e) }))
      }
      return
    }
  }

  // ── 静的配信 ───────────────────────────────────────────
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'
  let filePath = join(DIST, pathname)
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  if (!existsSync(filePath) || (await stat(filePath)).isDirectory()) {
    filePath = join(DIST, 'index.html') // SPA fallback
  }
  try {
    const data = await readFile(filePath)
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('  Spinalix — 脳が常駐しています')
  console.log('  このMac:      http://localhost:' + PORT)
  console.log('  スマホから:    ' + lanAddress())
  console.log('  記憶の保存先:  ' + DATA_FILE)
  console.log('  （データはこのファイルの中だけに存在します。停止は Ctrl+C）')
  console.log('')
})
