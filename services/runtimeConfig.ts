type Provider = 'gemini' | 'ark'

const get = (key: string, fallback?: string): string => {
  try {
    const v = window.localStorage.getItem(key)
    if (v && v.trim()) return v.trim()
  } catch {}
  return (fallback || '').trim()
}

export const getProvider = (): Provider => {
  const v = get('settings.AI_PROVIDER', (process.env.AI_PROVIDER || 'gemini'))
  return (v === 'ark' ? 'ark' : 'gemini')
}

export const getGeminiConfig = () => ({
  apiKey: get('settings.GEMINI_API_KEY', process.env.GEMINI_API_KEY || process.env.API_KEY || ''),
  baseUrl: get('settings.GEMINI_BASE_URL', process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'),
})

export const getGeminiOpenAICompat = (): boolean => {
  const v = get('settings.GEMINI_OPENAI_COMPAT', 'false')
  return v === 'true'
}

export const getFetchImageAsBase64 = (): boolean => {
  const v = get('settings.FETCH_IMAGE_AS_BASE64', 'false')
  return v === 'true'
}

export const getOpenAICompatApiKey = (): string => {
  return get('settings.OPENAI_COMPAT_API_KEY', process.env.OPENAI_COMPAT_API_KEY || '')
}

export const getArkConfig = () => {
  const isLocal = typeof window !== 'undefined' && (
    /localhost|127\.0\.0\.1/.test(window.location.hostname) ||
    /^10\./.test(window.location.hostname) ||
    /^192\.168\./.test(window.location.hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname)
  )
  const apiKey = get('settings.ARK_API_KEY', process.env.ARK_API_KEY || '')
  const baseUrl = isLocal
    ? '/arkapi/api/v3'
    : get('settings.ARK_BASE_URL', process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3')
  return { apiKey, baseUrl }
}

export const getModelConfig = () => ({
  chat: get('settings.MODEL_CHAT', ''),
  image: get('settings.MODEL_IMAGE', ''),
  vision: get('settings.MODEL_VISION', ''),
  video: get('settings.MODEL_VIDEO', ''),
})



export const getVideoMaxTokens = (): number => {
  const raw = get('settings.VIDEO_MAX_TOKENS', '')
  const n = parseInt(raw || '300', 10)
  return Number.isFinite(n) && n > 0 ? n : 300
}

export const getReplyLanguage = (): 'auto' | 'zh' | 'en' => {
  const v = get('settings.REPLY_LANGUAGE', 'auto')
  if (v === 'zh' || v === 'en') return v
  return 'auto'
}

export const getImageSizePreset = (): '2K' | '4K' | '' => {
  const v = get('settings.IMAGE_SIZE_PRESET', '2K')
  return v === '4K' ? '4K' : v === '2K' ? '2K' : ''
}

export const getImageWatermark = (): boolean => {
  const v = get('settings.IMAGE_WATERMARK', 'false')
  return v === 'true'
}

export const saveSettings = (settings: Record<string, string>) => {
  Object.entries(settings).forEach(([k, v]) => {
    try { window.localStorage.setItem(k, v || '') } catch {}
  })
}

export const getCoherenceStrength = (): 'off' | 'weak' | 'strong' => {
  const v = get('settings.COHERENCE_STRENGTH', 'strong')
  if (v === 'off' || v === 'weak' || v === 'strong') return v
  return 'strong'
}

export const getUseFilesApiForMedia = (): 'auto' | 'always' | 'never' => {
  const v = get('settings.USE_FILES_API_FOR_MEDIA', 'auto')
  if (v === 'always' || v === 'never' || v === 'auto') return v
  return 'auto'
}

export const getDebugLogs = (): boolean => {
  const v = get('settings.DEBUG_LOGS', 'false')
  return v === 'true'
}

export const getArkT2ISeed = (): number | undefined => {
  const raw = get('settings.ARK_T2I_SEED', '')
  if (!raw) return undefined
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) return undefined
  if (n === -1) return -1
  if (n >= 0 && n <= 2147483647) return n
  return undefined
}