import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }
  try {
    const { url } = (typeof req.body === 'object' ? req.body : JSON.parse(String(req.body || '{}'))) as { url?: string }
    if (!url || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: 'Invalid url' })
      return
    }
    const upstream = await fetch(url)
    if (!upstream.ok) {
      const text = await upstream.text()
      res.status(upstream.status).json({ error: text || `fetch ${upstream.status}` })
      return
    }
    const ct = upstream.headers.get('content-type') || 'image/webp'
    const buf = Buffer.from(await upstream.arrayBuffer())
    const b64 = buf.toString('base64')
    res.status(200).json({ base64: b64, mimeType: ct })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}