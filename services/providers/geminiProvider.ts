import type { AIProvider } from './aiProvider'
import { parseStoryboard } from '../../utils/parser'
import type { StoryboardResult, Scene } from '../../types'
import { getGeminiConfig, getModelConfig, getReplyLanguage, getVideoMaxTokens, getCoherenceStrength, getUseFilesApiForMedia, getDebugLogs, getGeminiOpenAICompat, getFetchImageAsBase64, getOpenAICompatApiKey } from '../runtimeConfig'

const toDataUrl = (base64: string, mimeType: string) => `data:${mimeType};base64,${base64}`


const isOpenAIBase = (raw: string): boolean => {
  const b = (raw || '')
  return /openai/i.test(b) || /\/v1$/i.test(b) || /\/chat\/completions$/i.test(b) || /\/images\/generations$/i.test(b)
}

const openAIImageGenerate = async (prompt: string, aspectRatio: string, model: string): Promise<string> => {
  const apiKey = getOpenAICompatApiKey()
  const { baseUrl } = getGeminiConfig()
  const b = (baseUrl || '').replace(/\/+$/, '')
  const url = '/api/openai/images/generations'
  const size = aspectRatio === '16:9' ? '1024x576' : aspectRatio === '9:16' ? '576x1024' : '1024x1024'
  const body = { model: model || 'nano-banana-vip', prompt, n: 1, size }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body) })
  if (!res.ok) {
    const text = await res.text()
    try {
      const j = JSON.parse(text)
      const msg = j?.error?.message || j?.message || text
      throw new Error(`OpenAI-style image error ${res.status}: ${msg}`)
    } catch {
      throw new Error(`OpenAI-style image error ${res.status}: ${text}`)
    }
  }
  const j = await res.json()
  const preferBase64 = getFetchImageAsBase64()
  const topUrl = typeof j?.url === 'string' ? j.url : null
  const dataStringUrl = typeof j?.data === 'string' ? j.data : null
  const d = Array.isArray(j?.data) ? j.data[0] : null
  const arrUrl = d?.url || d?.image_url || null
  const arrB64 = d?.b64_json || d?.b64 || null
  const resultUrl = topUrl || dataStringUrl || arrUrl || null
  const guessMime = (u: string): string => (/\.webp($|\?)/i.test(u) ? 'image/webp' : (/\.png($|\?)/i.test(u) ? 'image/png' : (/\.jpg|\.jpeg($|\?)/i.test(u) ? 'image/jpeg' : 'image/webp')))
  if (arrB64) return toDataUrl(String(arrB64), 'image/png')
  if (resultUrl) {
    if (preferBase64) {
      const fr = await fetch('/api/openai/images/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: resultUrl }) })
      if (fr.ok) {
        const info = await fr.json()
        const mt = info?.mimeType || guessMime(resultUrl)
        const b64 = info?.base64 || ''
        if (b64) return toDataUrl(b64, mt)
      }
    }
    return String(resultUrl)
  }
  const b64 = j?.b64_json || j?.b64 || null
  if (b64) return toDataUrl(String(b64), 'image/webp')
  throw new Error('OpenAI-style image did not return data')
}

const geminiFetch = async (path: string, body: any) => {
  const { apiKey, baseUrl } = getGeminiConfig()
  if (!apiKey) throw new Error('Gemini API key is not configured')
  const dbgOn = (!import.meta.env.PROD) && getDebugLogs()
  const t0 = Date.now()
  const compat = getGeminiOpenAICompat() || isOpenAIBase(baseUrl)
  const coreBase = compat ? 'https://generativelanguage.googleapis.com' : resolveCoreBase(baseUrl)
  const res = await fetch(`${coreBase}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    if (dbgOn) {
      const preview = text.slice(0, 1000)
      console.log('[GeminiFetchError]', path, res.status, Date.now() - t0, preview)
    }
    try {
      const j = JSON.parse(text)
      const msg = j?.error?.message || j?.message || text
      throw new Error(`Gemini API error ${res.status}: ${msg}`)
    } catch {
      throw new Error(`Gemini API error ${res.status}: ${text}`)
    }
  }
  const j = await res.json()
  if (dbgOn) {
    const preview = JSON.stringify(j).slice(0, 1000)
    console.log('[GeminiFetchOK]', path, res.status, Date.now() - t0, preview)
  }
  return j
}

const geminiOpenAIChat = async (body: any) => {
  const { apiKey: geminiKey, baseUrl } = getGeminiConfig()
  if (!geminiKey) throw new Error('Gemini API key is not configured')
  const b = (baseUrl || '').replace(/\/+$/, '')
  const compat = getGeminiOpenAICompat() || isOpenAIBase(baseUrl)
  const url = compat ? '/api/openai/chat/completions' : `${b}/v1beta/openai/chat/completions`
  const dbgOn = (!import.meta.env.PROD) && getDebugLogs()
  const t0 = Date.now()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(compat
        ? { 'Authorization': `Bearer ${getOpenAICompatApiKey()}` }
        : { 'x-goog-api-key': geminiKey }
      ),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    if (dbgOn) console.log('[GeminiChatError]', res.status, Date.now() - t0, text.slice(0, 1000))
    try {
      const j = JSON.parse(text)
      const msg = j?.error?.message || j?.message || text
      throw new Error(`Gemini OpenAI chat error ${res.status}: ${msg}`)
    } catch {
      throw new Error(`Gemini OpenAI chat error ${res.status}: ${text}`)
    }
  }
  const j = await res.json()
  if (dbgOn) console.log('[GeminiChatOK]', res.status, Date.now() - t0, JSON.stringify(j).slice(0, 1000))
  return j
}

const base64ToBytes = (b64: string): Uint8Array => {
  try {
    const bin = atob(b64.replace(/^data:[^;]+;base64,/, ''))
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return arr
  } catch {
    return new Uint8Array(0)
  }
}

const geminiUploadFile = async (bytes: Uint8Array, mimeType: string): Promise<{ uri: string; mimeType: string }> => {
  const { apiKey, baseUrl } = getGeminiConfig()
  if (!apiKey) throw new Error('Gemini API key is not configured')
  const dbgOn = (!import.meta.env.PROD) && getDebugLogs()
  const coreBase = resolveCoreBase(baseUrl)
  const initRes = await fetch(`${coreBase}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { displayName: 'MEDIA' } }),
  })
  if (!initRes.ok) {
    const text = await initRes.text()
    throw new Error(`Gemini Files init error ${initRes.status}: ${text}`)
  }
  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL') || initRes.headers.get('x-goog-upload-url') || initRes.headers.get('Location') || initRes.headers.get('location') || ''
  if (!uploadUrl) throw new Error('Gemini Files init missing upload url')
  if (dbgOn) console.log('[FilesInitOK]', uploadUrl)
  const ab1 = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(ab1).set(bytes)
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Type': 'application/octet-stream',
    },
    body: new Blob([ab1], { type: 'application/octet-stream' }),
  })
  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    throw new Error(`Gemini Files upload error ${uploadRes.status}: ${text}`)
  }
  const meta = await uploadRes.json()
  const name = meta?.name || meta?.file?.name || meta?.uri || meta?.file?.uri || ''
  const uri = meta?.uri || meta?.file?.uri || name
  if (dbgOn) console.log('[FilesFinalizeOK]', name, uri)
  if (!uri) throw new Error('Gemini Files upload returned no uri')
  const maxWaitMs = 15000
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const getRes = await fetch(`${coreBase}/v1beta/${encodeURI(name)}`, { headers: { 'x-goog-api-key': apiKey } })
    if (getRes.ok) {
      const info = await getRes.json()
      const state = info?.state || info?.file?.state || ''
      if (dbgOn) console.log('[FilesState]', state)
      if (state === 'ACTIVE') {
        const outUri = info?.uri || info?.file?.uri || uri
        return { uri: outUri, mimeType: info?.mimeType || info?.file?.mimeType || mimeType }
      }
      if (state === 'FAILED') {
        return { uri, mimeType: info?.mimeType || info?.file?.mimeType || mimeType }
      }
    }
    await new Promise(r => setTimeout(r, 800))
  }
  return { uri, mimeType: meta?.mimeType || mimeType }
}

const extractImagePart = (json: any): { base64: string | null; mimeType: string | null; uri: string | null } => {
  try {
    const candidates = json?.candidates || []
    for (const c of candidates) {
      const parts = c?.content?.parts || []
      for (const p of parts) {
        if (p?.inlineData?.data || p?.inline_data?.data) {
          const data = p?.inlineData?.data || p?.inline_data?.data || null
          const mime = p?.inlineData?.mimeType || p?.inline_data?.mime_type || 'image/png'
          return { base64: data, mimeType: mime, uri: null }
        }
        if (p?.fileData?.fileUri || p?.file_data?.file_uri || p?.fileData?.uri || p?.file_data?.uri) {
          const uri = p?.fileData?.fileUri || p?.file_data?.file_uri || p?.fileData?.uri || p?.file_data?.uri || null
          const mime = p?.fileData?.mimeType || p?.file_data?.mime_type || null
          return { base64: null, mimeType: mime, uri }
        }
      }
    }
  } catch {}
  return { base64: null, mimeType: null, uri: null }
}

const extractText = (json: any): string => {
  try {
    const texts: string[] = []
    const candidates = json?.candidates || []
    for (const c of candidates) {
      const parts = c?.content?.parts || []
      for (const p of parts) {
        if (typeof p?.text === 'string') texts.push(p.text)
        if (Array.isArray(p?.parts)) {
          for (const sp of p.parts) {
            if (typeof sp?.text === 'string') texts.push(sp.text)
          }
        }
      }
    }
    return texts.join('\n').trim()
  } catch {}
  return ''
}

export const GeminiProvider: AIProvider = {
  async generateImageForScene(prompt: string, previousImageUrl: string | undefined, aspectRatio: string): Promise<string> {
    const models = getModelConfig()
    const model = models.image || 'gemini-2.5-flash-image'
    const langPref = getReplyLanguage()
    const isZh = langPref === 'zh'
    const strictPrefix = isZh
      ? '请严格按照以下场景描述生成图像，不要添加额外元素。保持电影级构图与光照/色彩一致：'
      : 'Generate an image that strictly follows the following scene description. Avoid extra elements. Cinematic composition with faithful lighting/colors: '
    const parts: any[] = [{ text: strictPrefix + prompt }]
    if (previousImageUrl && /^data:image\//.test(previousImageUrl)) {
      const m = previousImageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
      if (m) {
        const bytes = base64ToBytes(m[2])
        const meta = await geminiUploadFile(bytes, m[1])
        parts.push({ file_data: { file_uri: meta.uri, mime_type: meta.mimeType } })
      }
    }
    const { baseUrl } = getGeminiConfig()
    if (getGeminiOpenAICompat() || isOpenAIBase(baseUrl)) {
      return openAIImageGenerate(strictPrefix + prompt, aspectRatio, model)
    }
    const tryBodies = [
      { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } } },
      { contents: [{ role: 'user', parts }] },
      { contents: [prompt] },
    ]
    let img = { base64: null as string | null, mimeType: null as string | null, uri: null as string | null }
    for (const body of tryBodies) {
      const json = await geminiFetch(`/v1beta/models/${model}:generateContent`, body)
      img = extractImagePart(json)
      if (img.base64 || img.uri) break
    }
    if (img.base64) return toDataUrl(img.base64, img.mimeType || 'image/png')
    if (img.uri) return img.uri
    throw new Error('Gemini did not return generated image')
  },

  async generateStoryboardAndImages(
    userInput: string,
    duration: number,
    sceneCount: number,
    isCoherent: boolean,
    aspectRatio: string,
    referenceImages: { base64: string; mimeType: string }[],
  ): Promise<StoryboardResult> {
    const models = getModelConfig()
    const langPref = getReplyLanguage()
    let isChinese = /[\u4E00-\u9FFF]/.test(userInput)
    if (langPref === 'zh') isChinese = true
    else if (langPref === 'en') isChinese = false
    const perScene = Math.round(duration / sceneCount)
    const systemPrompt = `You are a top-tier Director of Photography and Storyboard Engineer. ${isChinese ? '请用中文回答。' : 'Respond entirely in English.'}
${isChinese ? '严格按以下格式输出：以“场景 N：”作为每个场景的标题，从 1 开始递增到 ' + sceneCount + '，不要输出额外解释。' : 'Output in the exact format: use "Scene N:" as the heading for each scene, starting from 1 up to ' + sceneCount + ', with no extra explanations.'}
${isChinese ? '每个场景包含主体、环境、光照、风格、动作提示等关键字段。' : 'Each scene must include Subject, Environment, Lighting, Grade (style), and Action Cues fields.'}`

    const json = await geminiOpenAIChat({
      model: models.chat || 'gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
    })
    const fullText = String(json?.choices?.[0]?.message?.content || '')
    let { scenes: parsedScenes, copyReadyPrompt } = parseStoryboard(fullText)
    if (!parsedScenes?.length) {
      const firstLine = fullText.split('\n')[0].trim() || userInput
      parsedScenes = [{ title: firstLine, description: firstLine, fullPrompt: firstLine }]
    }
    if (parsedScenes.length > sceneCount) parsedScenes = parsedScenes.slice(0, sceneCount)
    copyReadyPrompt = parsedScenes.map(s => s.fullPrompt).join('\n\n')

    const scenesWithImages: Scene[] = []
    let previousImageUrl: string | undefined = undefined
    if (referenceImages?.length) previousImageUrl = toDataUrl(referenceImages[0].base64, referenceImages[0].mimeType)
    const coherence = getCoherenceStrength()
    for (let i = 0; i < parsedScenes.length; i++) {
      let imageUrl: string | undefined
      if (i === 0 && referenceImages?.length) {
        imageUrl = toDataUrl(referenceImages[0].base64, referenceImages[0].mimeType)
      } else {
        const prev = (isCoherent && coherence === 'strong') ? previousImageUrl : undefined
        imageUrl = await this.generateImageForScene(parsedScenes[i].fullPrompt, prev, aspectRatio)
      }
      scenesWithImages.push({ ...parsedScenes[i], imageUrl })
      previousImageUrl = imageUrl
    }
    return { copyReadyPrompt, scenes: scenesWithImages }
  },

  async combineImages(images: { base64: string; mimeType: string }[], prompt: string): Promise<{ base64: string; mimeType: string }> {
    const models = getModelConfig()
    const model = models.image || 'gemini-2.5-flash-image'
    const parts: any[] = [{ text: prompt }]
    for (const img of images) {
      const bytes = base64ToBytes(img.base64)
      const meta = await geminiUploadFile(bytes, img.mimeType)
      parts.push({ file_data: { file_uri: meta.uri, mime_type: meta.mimeType } })
    }
    const tryBodies = [
      { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'] } },
      { contents: [{ role: 'user', parts }] },
    ]
    let img = { base64: null as string | null, mimeType: null as string | null, uri: null as string | null }
    for (const body of tryBodies) {
      const json = await geminiFetch(`/v1beta/models/${model}:generateContent`, body)
      img = extractImagePart(json)
      if (img.base64 || img.uri) break
    }
    if (img.base64) return { base64: img.base64, mimeType: img.mimeType || 'image/png' }
    if (img.uri) {
      const res = await fetch(img.uri)
      const blob = await res.blob()
      const buf = await blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const b64 = btoa(binary)
      return { base64: b64, mimeType: img.mimeType || blob.type || 'image/png' }
    }
    throw new Error('Gemini did not return combined image')
  },

  async generateImage(prompt: string): Promise<string> {
    const models = getModelConfig()
    const model = models.image || 'gemini-2.5-flash-image'
    const { baseUrl } = getGeminiConfig()
    if (getGeminiOpenAICompat() || isOpenAIBase(baseUrl)) {
      return openAIImageGenerate(prompt, '16:9', model)
    }
    const parts = [{ text: prompt }]
    const tryBodies = [
      { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'] } },
      { contents: [{ role: 'user', parts }] },
      { contents: [prompt] },
    ]
    let img = { base64: null as string | null, mimeType: null as string | null, uri: null as string | null }
    for (const body of tryBodies) {
      const json = await geminiFetch(`/v1beta/models/${model}:generateContent`, body)
      img = extractImagePart(json)
      if (img.base64 || img.uri) break
    }
    if (img.base64) return toDataUrl(img.base64, img.mimeType || 'image/png')
    if (img.uri) return img.uri
    throw new Error('Gemini did not return image')
  },

  async editImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const models = getModelConfig()
    const model = (models.image && /image|flash-image/i.test(models.image)) ? models.image : 'gemini-2.5-flash-image'
    const parts: any[] = [{ text: prompt }]
    let mt = mimeType
    let b64 = base64ImageData
    if (/^data:image\//.test(base64ImageData)) {
      const m = base64ImageData.match(/^data:(image\/[^;]+);base64,(.+)$/)
      if (m) { mt = m[1]; b64 = m[2] }
    }
    const bytes = base64ToBytes(b64)
    const meta = await geminiUploadFile(bytes, mt)
    parts.push({ file_data: { file_uri: meta.uri, mime_type: meta.mimeType } })
    const tryBodies = [
      { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'] } },
      { contents: [{ role: 'user', parts }] },
    ]
    let img = { base64: null as string | null, mimeType: null as string | null, uri: null as string | null }
    for (const body of tryBodies) {
      const json = await geminiFetch(`/v1beta/models/${model}:generateContent`, body)
      img = extractImagePart(json)
      if (img.base64 || img.uri) break
    }
    if (img.base64) return toDataUrl(img.base64, img.mimeType || 'image/png')
    if (img.uri) return img.uri
    throw new Error('Gemini did not return edited image')
  },

  async analyzeImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const models = getModelConfig()
    const model = models.vision || models.chat || 'gemini-2.5-pro'
    const langPref = getReplyLanguage()
    const isChinese = langPref === 'zh' ? true : langPref === 'en' ? false : /[\u4E00-\u9FFF]/.test(prompt)
    const parts: any[] = [{ text: (isChinese ? '请用中文回答。' : 'Respond entirely in English.') + ' ' + prompt }]
    let mt = mimeType
    let b64 = base64ImageData
    if (/^data:image\//.test(base64ImageData)) {
      const m = base64ImageData.match(/^data:(image\/[^;]+);base64,(.+)$/)
      if (m) { mt = m[1]; b64 = m[2] }
    }
    const bytes = base64ToBytes(b64)
    const meta = await geminiUploadFile(bytes, mt)
    parts.push({ file_data: { file_uri: meta.uri, mime_type: meta.mimeType } })
    const json = await geminiFetch(`/v1beta/models/${model}:generateContent`, { contents: [{ parts }] })
    return extractText(json)
  },

  async analyzeVideo(base64VideoData: string, mimeType: string, useThinkingMode: boolean): Promise<string> {
    const models = getModelConfig()
    const pref = models.video && /flash|video/i.test(models.video) ? models.video : (models.chat && /flash/i.test(models.chat) ? models.chat : 'gemini-2.5-flash')
    const maxTokens = getVideoMaxTokens()
    const langPref = getReplyLanguage()
    const isZh = langPref === 'zh' ? true : langPref === 'en' ? false : false
    const prompt = isZh
      ? '请分析该视频并描述其内容，或生成复刻分镜脚本。'
      : 'Analyze the video and describe its content, or generate a replication storyboard.'
    const dbgOn = (process?.env?.NODE_ENV !== 'production') && getDebugLogs()
    if (dbgOn) console.log('[VideoAnalyze]', pref, mimeType, prompt.length)
    const bytes = base64ToBytes(base64VideoData)
    const fileMeta = await geminiUploadFile(bytes, mimeType)
    const filePart = { file_data: { file_uri: fileMeta.uri, mime_type: fileMeta.mimeType } }
    const fileBodies = [
      { contents: [{ role: 'user', parts: [filePart, { text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } },
      { contents: [{ role: 'user', parts: [{ text: prompt }, filePart] }], generationConfig: { maxOutputTokens: maxTokens } },
      { contents: [{ parts: [filePart, { text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } },
    ]
    for (const body of fileBodies) {
      const json = await geminiFetch(`/v1beta/models/${pref}:generateContent`, body)
      const txt = extractText(json)
      if (txt && txt.trim()) return txt
      const br = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.safetyRatings?.[0]?.blocked
      if (dbgOn) console.log('[VideoBlocked]', br)
      if (br) throw new Error(`Gemini video analysis blocked: ${String(br)}`)
    }
    throw new Error('Empty response from Gemini video analysis')
  },
}

export const geminiUploadMediaForDebug = async (base64Data: string, mimeType: string): Promise<{ uri: string; status: string }> => {
  try {
    const bytes = base64ToBytes(base64Data)
    const { apiKey, baseUrl } = getGeminiConfig()
    if (!apiKey) throw new Error('Gemini API key is not configured')
    const coreBase = resolveCoreBase(baseUrl)
    const initRes = await fetch(`${coreBase}/upload/v1beta/files`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(bytes.length),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { displayName: 'MEDIA_DEBUG' } }),
    })
    if (!initRes.ok) return { uri: '', status: `init ${initRes.status}: ${await initRes.text()}` }
    const uploadUrl = initRes.headers.get('X-Goog-Upload-URL') || initRes.headers.get('x-goog-upload-url') || ''
    if (!uploadUrl) return { uri: '', status: 'missing upload url' }
    const ab2 = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(ab2).set(bytes)
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
        'Content-Type': 'application/octet-stream',
      },
      body: new Blob([ab2], { type: 'application/octet-stream' }),
    })
    if (!uploadRes.ok) return { uri: '', status: `upload ${uploadRes.status}: ${await uploadRes.text()}` }
    const meta = await uploadRes.json()
    const name = meta?.name || meta?.file?.name || ''
    const uri = meta?.uri || meta?.file?.uri || name
    const { apiKey: k, baseUrl: b } = getGeminiConfig()
    const coreB = resolveCoreBase(b)
    const getRes = await fetch(`${coreB}/v1beta/${encodeURI(name)}`, { headers: { 'x-goog-api-key': k } })
    if (!getRes.ok) return { uri, status: `get ${getRes.status}: ${await getRes.text()}` }
    const info = await getRes.json()
    const state = info?.state || info?.file?.state || 'UNKNOWN'
    return { uri: info?.uri || info?.file?.uri || uri, status: state }
  } catch (e: any) {
    return { uri: '', status: String(e?.message || e) }
  }
}

export const geminiUploadMediaWithStatus = async (
  base64Data: string,
  mimeType: string,
  onStatus: (info: { stage: string; uri?: string; state?: string; detail?: string }) => void,
): Promise<{ uri: string; status: string }> => {
  const { apiKey, baseUrl } = getGeminiConfig()
  const bytes = base64ToBytes(base64Data)
  if (!apiKey) return { uri: '', status: 'Gemini API key is not configured' }
  try {
    onStatus({ stage: 'init' })
    const coreBase = resolveCoreBase(baseUrl)
    const initRes = await fetch(`${coreBase}/upload/v1beta/files`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(bytes.length),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { displayName: 'MEDIA_UI' } }),
    })
    if (!initRes.ok) return { uri: '', status: `init ${initRes.status}` }
    const uploadUrl = initRes.headers.get('X-Goog-Upload-URL') || initRes.headers.get('x-goog-upload-url') || ''
    if (!uploadUrl) return { uri: '', status: 'missing upload url' }
    onStatus({ stage: 'upload_url', detail: uploadUrl })
    const ab = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(ab).set(bytes)
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
        'Content-Type': 'application/octet-stream',
      },
      body: new Blob([ab], { type: 'application/octet-stream' }),
    })
    if (!uploadRes.ok) return { uri: '', status: `upload ${uploadRes.status}` }
    onStatus({ stage: 'uploaded' })
    const meta = await uploadRes.json()
    const name = meta?.name || meta?.file?.name || ''
    const uri = meta?.uri || meta?.file?.uri || name
    let status = 'PENDING'
    const start = Date.now()
    while (Date.now() - start < 15000) {
      const getRes = await fetch(`${coreBase}/v1beta/${encodeURI(name)}`, { headers: { 'x-goog-api-key': apiKey } })
      if (getRes.ok) {
        const info = await getRes.json()
        const state = info?.state || info?.file?.state || 'UNKNOWN'
        onStatus({ stage: 'state', uri: info?.uri || info?.file?.uri || uri, state })
        status = state
        if (state === 'ACTIVE' || state === 'FAILED') break
      }
      await new Promise(r => setTimeout(r, 800))
    }
    return { uri, status }
  } catch (e: any) {
    return { uri: '', status: String(e?.message || e) }
  }
}
const resolveCoreBase = (raw: string): string => {
  const b = (raw || '').replace(/\/+$/, '')
  if (/openai/i.test(b) || /\/v1$/i.test(b) || /\/chat\/completions$/i.test(b) || /\/images\/generations$/i.test(b)) {
    return 'https://generativelanguage.googleapis.com'
  }
  return b || 'https://generativelanguage.googleapis.com'
}