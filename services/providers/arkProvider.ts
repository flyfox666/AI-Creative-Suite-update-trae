import type { AIProvider } from './aiProvider'
import { parseStoryboard } from '../../utils/parser'
import type { StoryboardResult, Scene } from '../../types'
import { getArkConfig, getModelConfig, getVideoMaxTokens, getReplyLanguage, getImageSizePreset, getImageWatermark, getArkT2ISeed } from '../runtimeConfig'

const arkFetch = async (path: string, body: any) => {
  const { apiKey, baseUrl } = getArkConfig()
  if (!apiKey) throw new Error('Ark API key is not configured')
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ark API error ${res.status}: ${text}`)
  }
  return res.json()
}

const toDataUrl = (base64: string, mimeType: string) => `data:${mimeType};base64,${base64}`

const aspectToSize = (aspect: string): string => {
  switch (aspect) {
    case '16:9': return '2560x1440'
    case '9:16': return '1440x2560'
    case '1:1': return '2048x2048'
    case '4:3': return '2304x1728'
    case '3:4': return '1728x2304'
    case '3:2': return '2496x1664'
    case '2:3': return '1664x2496'
    case '21:9': return '3024x1296'
    default: return '2048x2048'
  }
}

const IMAGE_MODEL_DEFAULT = 'doubao-seedream-4-0-250828'
const CHAT_MODEL_DEFAULT = 'doubao-1-5-pro-32k-250115'
const VISION_MODEL_DEFAULT = 'doubao-1-5-vision-pro-32k-250115'

const fetchImageAsBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image URL: ${res.status}`)
  const blob = await res.blob()
  const mimeType = blob.type || 'image/png'
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image blob'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(blob)
  })
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL from fetched image')
  return { base64: match[2], mimeType: match[1] }
}

const ArkProviderInternal: AIProvider = {
  async generateImageForScene(prompt: string, previousImageUrl: string | undefined, aspectRatio: string): Promise<string> {
    const models = getModelConfig()
    const model = models.image || IMAGE_MODEL_DEFAULT
    const isT2I = /seedream-3-0-t2i/i.test(model)
    const preset = getImageSizePreset()
    const mapPreset = (p: string): string => (p === '4K' ? '4096x4096' : p === '2K' ? '2048x2048' : '')
    const sizeStr = isT2I
      ? (mapPreset(preset) || '1024x1024')
      : (mapPreset(preset) || aspectToSize(aspectRatio))
    const validSize = /^\d+x\d+$/.test(sizeStr) ? sizeStr : '1024x1024'
    const payload: any = {
      model,
      prompt,
      size: validSize,
      response_format: 'b64_json',
      watermark: getImageWatermark(),
    }
    if (isT2I) {
      const seed = getArkT2ISeed()
      if (typeof seed !== 'undefined') payload.seed = seed
    }
    if (!isT2I && previousImageUrl) payload.image = [previousImageUrl]
    if (/seedream-4-0/i.test(model)) payload.sequential_image_generation = 'disabled'
    const json = await arkFetch('/images/generations', payload)
    const data = json?.data || json?.images || []
    const first = Array.isArray(data) ? data[0] : null
    if (first?.b64_json) return toDataUrl(first.b64_json, 'image/png')
    if (first?.url) return first.url
    throw new Error('Ark did not return generated image')
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
    const perScene = Math.round(duration / sceneCount)
    const langPref = getReplyLanguage()
    let isChinese = /[\u4E00-\u9FFF]/.test(userInput)
    if (langPref === 'zh') isChinese = true
    else if (langPref === 'en') isChinese = false
    const headingWord = isChinese ? '场景' : 'Scene'
    const colonChar = isChinese ? '：' : ':'
    const languageRule = isChinese ? 'Respond entirely in Chinese.' : 'Respond entirely in English.'
    const systemPrompt = `You are a top-tier Director of Photography and Storyboard Engineer.
Rules:
- Output ONLY a structured storyboard script. ${languageRule}
- Use headings exactly: "Sequence Overview:" then "${headingWord} 1${colonChar}", "${headingWord} 2${colonChar}", ... up to "${headingWord} ${sceneCount}${colonChar}".
- Output exactly ${sceneCount} scenes. No extra scenes beyond ${sceneCount}.
- For each scene (~${perScene}s), include keys: ${isChinese ? '主体：, 环境：, 光照：, 色彩：, 动作提示：' : 'Subject:, Environment:, Lighting:, Grade:, Action Cues:'} with time lines (0.0s${colonChar}, ...).
- Do not include any extra prose before or after the script.`

    let finalUserInput = userInput
    if (referenceImages?.length) {
      const refs = referenceImages.map((img, idx) => ({
        type: 'image_url',
        image_url: { url: toDataUrl(img.base64, img.mimeType) },
      }))
      // Ask Ark to summarize visuals
      const visResp = await arkFetch('/chat/completions', {
        model: models.vision || VISION_MODEL_DEFAULT,
        messages: [
          { role: 'system', content: (isChinese ? '请用中文回答。' : 'Respond entirely in English.') + ' Describe images for a film director: subject, environment, lighting, mood.' },
          { role: 'user', content: [{ type: 'text', text: 'Analyze the following reference images:' }, ...refs] },
        ],
      })
      const visText = visResp?.choices?.[0]?.message?.content || ''
      finalUserInput = `USER IDEA: "${userInput}"

VISUAL CONTEXT FROM REFERENCE IMAGES:
${visText}

Combine the user's idea with the visual context to create the storyboard.`
    }

    const storyResp = await arkFetch('/chat/completions', {
      model: models.chat || CHAT_MODEL_DEFAULT,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalUserInput },
      ],
    })
    const fullText: string = storyResp?.choices?.[0]?.message?.content || ''
    let { scenes: parsedScenes, copyReadyPrompt } = parseStoryboard(fullText)
    if (!parsedScenes?.length) {
      const firstLine = fullText.split('\n')[0].trim() || userInput
      parsedScenes = [{ title: firstLine, description: firstLine, fullPrompt: `Scene 1:${fullText || userInput}` }]
      console.warn('Storyboard parse failed; using fallback scene from first line')
    }
    // Enforce scene count: trim extra scenes, keep within requested count
    if (parsedScenes.length > sceneCount) {
      parsedScenes = parsedScenes.slice(0, sceneCount)
    }
    // Recompute copyReadyPrompt for the selected scenes only
    copyReadyPrompt = parsedScenes.map(s => s.fullPrompt).join('\n\n')

    const scenesWithImages: Scene[] = []
    let previousImageUrl: string | undefined = undefined
    if (referenceImages?.length) previousImageUrl = toDataUrl(referenceImages[0].base64, referenceImages[0].mimeType)

    for (let i = 0; i < parsedScenes.length; i++) {
      let imageUrl: string | undefined
      if (i === 0 && referenceImages?.length) {
        imageUrl = toDataUrl(referenceImages[0].base64, referenceImages[0].mimeType)
      } else {
        imageUrl = await ArkProviderInternal.generateImageForScene(parsedScenes[i].fullPrompt, isCoherent ? previousImageUrl : undefined, aspectRatio)
      }
      scenesWithImages.push({ ...parsedScenes[i], imageUrl })
      previousImageUrl = imageUrl
    }

    return { copyReadyPrompt, scenes: scenesWithImages }
  },

  async combineImages(images: { base64: string; mimeType: string }[], prompt: string): Promise<{ base64: string; mimeType: string }> {
    const models = getModelConfig()
    const model = models.image || IMAGE_MODEL_DEFAULT
    const isT2I = /seedream-3-0-t2i/i.test(model)
    const preset = getImageSizePreset()
    const mapPreset = (p: string): string => (p === '4K' ? '4096x4096' : p === '2K' ? '2048x2048' : '')
    const sizeStr = mapPreset(preset) || '2048x2048'
    const validSize = /^\d+x\d+$/.test(sizeStr) ? sizeStr : '2048x2048'
    if (isT2I) {
      const json = await arkFetch('/images/generations', {
        model,
        prompt,
        size: validSize,
        response_format: 'b64_json',
        watermark: getImageWatermark(),
        ...(typeof getArkT2ISeed() !== 'undefined' ? { seed: getArkT2ISeed() } : {}),
      })
      const first = Array.isArray(json?.data) ? json.data[0] : null
      if (first?.b64_json) return { base64: first.b64_json, mimeType: 'image/png' }
      if (first?.url) return { base64: '', mimeType: 'image/url' }
      throw new Error('Ark did not return combined image')
    } else {
      const payload: any = {
        model,
        prompt,
        image: images.map(img => (img.base64 ? toDataUrl(img.base64, img.mimeType) : (img as any).url)),
        size: validSize,
        response_format: 'b64_json',
        watermark: getImageWatermark(),
      }
      const json = await arkFetch('/images/generations', payload)
      const first = Array.isArray(json?.data) ? json.data[0] : null
      if (first?.b64_json) return { base64: first.b64_json, mimeType: 'image/png' }
      if (first?.url) return { base64: '', mimeType: 'image/url' }
      throw new Error('Ark did not return combined image')
    }
  },

  async generateImage(prompt: string): Promise<string> {
    const models = getModelConfig()
    const json = await arkFetch('/images/generations', { model: models.image || IMAGE_MODEL_DEFAULT, prompt, size: getImageSizePreset() || '2048x2048', response_format: 'b64_json', watermark: getImageWatermark() })
    const first = Array.isArray(json?.data) ? json.data[0] : null
    if (first?.b64_json) return toDataUrl(first.b64_json, 'image/png')
    if (first?.url) return first.url
    throw new Error('Ark did not return image')
  },

  async editImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const models = getModelConfig()
    const model = models.image || IMAGE_MODEL_DEFAULT
    const isT2I = /seedream-3-0-t2i/i.test(model)
    const preset = getImageSizePreset()
    const mapPreset = (p: string): string => (p === '4K' ? '4096x4096' : p === '2K' ? '2048x2048' : '')
    const sizeStr = mapPreset(preset) || '2048x2048'
    const validSize = /^\d+x\d+$/.test(sizeStr) ? sizeStr : '2048x2048'
    if (isT2I) {
      const json = await arkFetch('/images/generations', {
        model,
        prompt,
        size: validSize,
        response_format: 'b64_json',
        watermark: getImageWatermark(),
        ...(typeof getArkT2ISeed() !== 'undefined' ? { seed: getArkT2ISeed() } : {}),
      })
      const first = Array.isArray(json?.data) ? json.data[0] : null
      if (first?.b64_json) return toDataUrl(first.b64_json, 'image/png')
      if (first?.url) return first.url
      throw new Error('Ark did not return edited image')
    } else {
      const isHttpUrl = /^https?:\/\//.test(base64ImageData)
      const isDataUrl = /^data:image\//.test(base64ImageData)
      const imageField = isHttpUrl
        ? base64ImageData
        : isDataUrl
          ? base64ImageData
          : toDataUrl(base64ImageData, mimeType)
      const json = await arkFetch('/images/generations', {
        model,
        prompt,
        image: imageField,
        size: validSize,
        response_format: 'b64_json',
        watermark: getImageWatermark(),
      })
      const first = Array.isArray(json?.data) ? json.data[0] : null
      if (first?.b64_json) return toDataUrl(first.b64_json, 'image/png')
      if (first?.url) return first.url
      throw new Error('Ark did not return edited image')
    }
  },

  async analyzeImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const models = getModelConfig()
    const langPref = getReplyLanguage()
    const isChinese = langPref === 'zh' ? true : langPref === 'en' ? false : /[\u4E00-\u9FFF]/.test(prompt)
    const json = await arkFetch('/chat/completions', {
      model: models.vision || VISION_MODEL_DEFAULT,
      messages: [
        { role: 'system', content: isChinese ? '请用中文回答。' : 'Respond entirely in English.' },
        { role: 'user', content: [ { type: 'text', text: prompt }, { type: 'image_url', image_url: { url: toDataUrl(base64ImageData, mimeType) } } ] },
      ],
    })
    return json?.choices?.[0]?.message?.content || ''
  },

  async analyzeVideo(base64VideoData: string, mimeType: string, useThinkingMode: boolean): Promise<string> {
    const models = getModelConfig()
    const langPref = getReplyLanguage()
    const isChinese = langPref === 'zh'
    if (!models.video && !VISION_MODEL_DEFAULT) throw new Error('Video model is not configured')
    const videoDataUrl = toDataUrl(base64VideoData, mimeType)
    const maxTokens = getVideoMaxTokens()
    try {
      const json = await arkFetch('/chat/completions', {
        model: models.video || VISION_MODEL_DEFAULT,
        messages: [
          { role: 'system', content: isChinese ? '请用中文回答。' : 'Respond entirely in English.' },
          {
            role: 'user',
            content: [
              { type: 'video_url', video_url: { url: videoDataUrl } },
              { type: 'text', text: (isChinese ? '请用中文分析该视频并描述其内容或生成复刻分镜。' : 'Analyze the video and describe its content or generate a replication storyboard. Respond entirely in English.') },
            ],
          },
        ],
        max_tokens: maxTokens,
        ...(useThinkingMode ? { thinking: { enable: true } } : {}),
      })
      const text = json?.choices?.[0]?.message?.content || ''
      if (!text) throw new Error('Empty response from Ark video analysis')
      return text
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (msg.includes('InvalidParameter') && msg.includes('video_url')) {
        throw new Error('Selected model does not support video understanding. Please choose a video-capable model or endpoint.')
      }
      if (msg.includes('AuthenticationError')) {
        throw new Error('Ark API key missing or invalid. Please configure a valid ARK_API_KEY in Settings.')
      }
      throw e
    }
  },


}

export const ArkProvider = ArkProviderInternal