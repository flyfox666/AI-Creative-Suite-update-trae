#!/usr/bin/env node

const help = () => {
  console.log(`Usage:
  node scripts/gemini-debug.mjs upload <filePath> <mime> [--verbose]
  node scripts/gemini-debug.mjs analyze-video <filePath> <mime> [model] [--verbose]
  node scripts/gemini-debug.mjs analyze-image <filePath> <mime> [model] [--verbose]

Env:
  GEMINI_API_KEY, GEMINI_BASE_URL (default: https://generativelanguage.googleapis.com)
`)
}

const readFileBytes = async (path) => {
  const fs = await import('node:fs/promises')
  const buf = await fs.readFile(path)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

const jsonSafe = async (res) => {
  const text = await res.text()
  try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return text }
}

const logHeaders = (res) => {
  const headers = {}
  res.headers.forEach((v, k) => { headers[k] = v })
  console.log('Response headers:', headers)
}

const startUpload = async (baseUrl, apiKey, bytes, mime, displayName) => {
  const res = await fetch(`${baseUrl}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': mime,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { displayName } }),
  })
  if (!res.ok) throw new Error(`Init ${res.status}: ${await jsonSafe(res)}`)
  const uploadUrl = res.headers.get('X-Goog-Upload-URL') || res.headers.get('x-goog-upload-url') || res.headers.get('Location') || ''
  if (!uploadUrl) throw new Error('Missing X-Goog-Upload-URL')
  return uploadUrl
}

const putUpload = async (uploadUrl, apiKey, bytes) => {
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Type': 'application/octet-stream',
    },
    body: bytes,
  })
  if (!res.ok) throw new Error(`Upload ${res.status}: ${await jsonSafe(res)}`)
  const meta = await res.json()
  const uri = meta?.uri || meta?.file?.uri || meta?.name
  if (!uri) throw new Error('Upload completed but no file uri')
  return { uri, mimeType: meta?.mimeType }
}

const genContent = async (baseUrl, apiKey, model, parts, verbose) => {
  const body = { contents: [{ role: 'user', parts }] }
  const res = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (verbose) logHeaders(res)
  const text = await res.text()
  if (!res.ok) throw new Error(`Gen ${res.status}: ${text}`)
  return text
}

const main = async () => {
  const args = process.argv.slice(2)
  if (!args.length) return help()
  const cmd = args[0]
  const verbose = args.includes('--verbose')
  const API_KEY = process.env.GEMINI_API_KEY
  const BASE_URL = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
  if (!API_KEY) throw new Error('GEMINI_API_KEY not set')

  if (cmd === 'upload') {
    const [_, filePath, mime] = args
    if (!filePath || !mime) return help()
    const bytes = await readFileBytes(filePath)
    const url = await startUpload(BASE_URL, API_KEY, bytes, mime, 'CLI_UPLOAD')
    if (verbose) console.log('Upload URL:', url)
    const meta = await putUpload(url, API_KEY, bytes)
    console.log('file_uri:', meta.uri)
    return
  }
  if (cmd === 'analyze-video') {
    const [_, filePath, mime, model = 'gemini-2.5-flash'] = args
    if (!filePath || !mime) return help()
    const bytes = await readFileBytes(filePath)
    const url = await startUpload(BASE_URL, API_KEY, bytes, mime, 'CLI_VIDEO')
    if (verbose) console.log('Upload URL:', url)
    const meta = await putUpload(url, API_KEY, bytes)
    const parts = [ { file_data: { file_uri: meta.uri, mime_type: mime } }, { text: 'Analyze the video and describe its content.' } ]
    const out = await genContent(BASE_URL, API_KEY, model, parts, verbose)
    console.log(out)
    return
  }
  if (cmd === 'analyze-image') {
    const [_, filePath, mime, model = 'gemini-2.5-flash'] = args
    if (!filePath || !mime) return help()
    const bytes = await readFileBytes(filePath)
    const url = await startUpload(BASE_URL, API_KEY, bytes, mime, 'CLI_IMAGE')
    if (verbose) console.log('Upload URL:', url)
    const meta = await putUpload(url, API_KEY, bytes)
    const parts = [ { file_data: { file_uri: meta.uri, mime_type: mime } }, { text: 'Describe the image.' } ]
    const out = await genContent(BASE_URL, API_KEY, model, parts, verbose)
    console.log(out)
    return
  }
  help()
}

main().catch(e => { console.error(String(e?.message || e)); process.exit(1) })