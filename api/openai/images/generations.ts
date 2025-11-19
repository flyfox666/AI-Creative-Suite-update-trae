import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }
  try {
    const token = process.env.OPENAI_COMPAT_API_KEY || process.env.GEMINI_API_KEY || ''
    if (!token) {
      res.status(500).json({ error: 'Missing OPENAI_COMPAT_API_KEY' })
      return
    }
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    const upstream = await fetch('https://vibecodingapi.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body,
    })
    const text = await upstream.text()
    res.status(upstream.status).send(text)
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}