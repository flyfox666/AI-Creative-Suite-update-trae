import http from 'node:http'
import { URL } from 'node:url'

const PORT = process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT, 10) : 4000
const GEMINI_BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
const ARK_BASE = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com').replace(/\/$/, '')

const clients = new Set()
const sendEvent = msg => {
  const data = `data: ${JSON.stringify(msg)}\n\n`
  for (const res of clients) {
    try { res.write(data) } catch {}
  }
}

const maskHeaders = h => {
  const out = {}
  for (const [k, v] of Object.entries(h)) {
    const key = k.toLowerCase()
    if (key === 'authorization') out[k] = 'Bearer ****'
    else if (key === 'x-goog-api-key') out[k] = '****'
    else out[k] = v
  }
  return out
}

const readBody = req => new Promise(resolve => {
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => resolve(Buffer.concat(chunks)))
})

const server = http.createServer(async (req, res) => {
  const now = Date.now()
  const u = new URL(req.url, `http://localhost:${PORT}`)
  if (u.pathname === '/logs/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    clients.add(res)
    req.on('close', () => clients.delete(res))
    return
  }
  let target = ''
  if (u.pathname.startsWith('/gemini/')) target = GEMINI_BASE + u.pathname.replace('/gemini', '') + (u.search || '')
  else if (u.pathname.startsWith('/ark/')) target = ARK_BASE + u.pathname.replace('/ark', '') + (u.search || '')
  else { res.writeHead(404); res.end('Not found'); return }
  const reqHeaders = { ...req.headers }
  const body = await readBody(req)
  const startMsg = { ts: new Date(now).toISOString(), method: req.method, path: u.pathname + u.search, target, reqHeaders: maskHeaders(reqHeaders), reqSize: body.length }
  console.log(`[${startMsg.ts}] ${startMsg.method} ${startMsg.path} → ${target} req=${startMsg.reqSize}B`)
  sendEvent({ type: 'start', ...startMsg })
  let status = 0
  let outText = ''
  let respHeaders = {}
  try {
    const fRes = await fetch(target, { method: req.method, headers: reqHeaders, body: body.length ? body : undefined })
    status = fRes.status
    fRes.headers.forEach((v, k) => { respHeaders[k] = v })
    const buf = await fRes.arrayBuffer()
    const len = buf.byteLength
    const max = 1024
    outText = Buffer.from(buf).toString('utf8').slice(0, max)
    res.writeHead(status, respHeaders)
    res.end(Buffer.from(buf))
    const endMsg = { ts: new Date().toISOString(), status, durMs: Date.now() - now, resSize: len }
    console.log(`[${endMsg.ts}] ${req.method} ${u.pathname} ← ${status} ${endMsg.durMs}ms res=${len}B`)
    sendEvent({ type: 'end', ...endMsg })
  } catch (e) {
    const errMsg = String(e?.message || e)
    console.error(`ERR ${req.method} ${u.pathname}: ${errMsg}`)
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end(errMsg)
    sendEvent({ type: 'error', ts: new Date().toISOString(), message: errMsg })
  }
})

server.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`)
  console.log(`Gemini → ${GEMINI_BASE}`)
  console.log(`Ark → ${ARK_BASE}`)
})