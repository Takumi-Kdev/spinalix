// Spinalix — 常駐する「脳」サーバー
// CLI:  node server.mjs            （dist/ を配信、.spinalix/brain.json に保存）
// アプリ: import { startServer } from './server.mjs'

import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { networkInterfaces } from 'node:os'

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

export function lanAddress(port) {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return `http://${net.address}:${port}`
    }
  }
  return `http://localhost:${port}`
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return Buffer.concat(chunks).toString('utf8')
}

export function startServer({ distDir, dataDir, port = 5310, host = '0.0.0.0' } = {}) {
  const DIST = resolve(distDir ?? join(process.cwd(), 'dist'))
  const DATA_FILE = join(resolve(dataDir ?? join(process.cwd(), '.spinalix')), 'brain.json')

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    if (url.pathname === '/api/info') {
      res.writeHead(200, { 'content-type': MIME['.json'] })
      res.end(JSON.stringify({ mode: 'brain', lan: lanAddress(port), dataFile: DATA_FILE }))
      return
    }
    if (url.pathname === '/api/state') {
      if (req.method === 'GET') {
        let state = { updatedAt: 0, payload: null }
        try {
          state = JSON.parse(await readFile(DATA_FILE, 'utf8'))
        } catch {
          // まだ無い
        }
        res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' })
        res.end(JSON.stringify(state))
        return
      }
      if (req.method === 'PUT') {
        try {
          const body = await readBody(req)
          JSON.parse(body)
          await mkdir(resolve(DATA_FILE, '..'), { recursive: true })
          await writeFile(DATA_FILE, body, 'utf8')
          res.writeHead(200, { 'content-type': MIME['.json'] })
          res.end('{"ok":true}')
        } catch (e) {
          res.writeHead(400, { 'content-type': MIME['.json'] })
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
        return
      }
    }

    // 静的配信（SPA fallback）
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/') pathname = '/index.html'
    let filePath = join(DIST, pathname)
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    try {
      if (!existsSync(filePath) || (await stat(filePath)).isDirectory()) {
        filePath = join(DIST, 'index.html')
      }
      const data = await readFile(filePath)
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' })
      res.end(data)
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  })

  return new Promise((resolvePromise, rejectPromise) => {
    let attemptPort = port
    const tryListen = () => {
      server.listen(attemptPort, host)
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && attemptPort < port + 9) {
          attemptPort += 1
          setTimeout(tryListen, 60)
        } else {
          rejectPromise(err)
        }
      })
      server.once('listening', () => {
        resolvePromise({ server, port: attemptPort, lan: lanAddress(attemptPort), dataFile: DATA_FILE })
      })
    }
    tryListen()
  })
}

// CLIとして直接実行された場合
const isDirect = process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`
if (isDirect) {
  const { lan, dataFile } = await startServer({ port: Number(process.env.PORT ?? 5310) })
  console.log('')
  console.log('  Spinalix — 脳が常駐しています')
  console.log('  このMac:      http://localhost:' + (process.env.PORT ?? 5310))
  console.log('  スマホから:    ' + lan)
  console.log('  記憶の保存先:  ' + dataFile)
  console.log('  （データはこのファイルの中だけに存在します。停止は Ctrl+C）')
  console.log('')
}
