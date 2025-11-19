import React, { useEffect, useState } from 'react'
import { useLocalization } from '../contexts/LocalizationContext'
import { saveSettings, getGeminiConfig } from '../services/runtimeConfig'
import { generateImage } from '../services/aiService'

const Settings: React.FC = () => {
  const { t } = useLocalization()
  const [provider, setProvider] = useState('ark')
  const [geminiKey, setGeminiKey] = useState('')
  const [arkKey, setArkKey] = useState('')
  const [arkBase, setArkBase] = useState('')
  const [modelChat, setModelChat] = useState('')
  const [modelImage, setModelImage] = useState('')
  const [modelVision, setModelVision] = useState('')
  const [modelVideo, setModelVideo] = useState('')
  const [videoMaxTokens, setVideoMaxTokens] = useState('')
  const [replyLanguage, setReplyLanguage] = useState('')
  const [imageSizePreset, setImageSizePreset] = useState('')
  const [imageWatermark, setImageWatermark] = useState(false)
  const [geminiBase, setGeminiBase] = useState('')
  const [geminiChatPreset, setGeminiChatPreset] = useState('')
  const [geminiChatCustom, setGeminiChatCustom] = useState('')
  const [geminiImagePreset, setGeminiImagePreset] = useState('')
  const [geminiImageCustom, setGeminiImageCustom] = useState('')
  const [geminiVisionPreset, setGeminiVisionPreset] = useState('')
  const [geminiVisionCustom, setGeminiVisionCustom] = useState('')
  const [geminiVideoPreset, setGeminiVideoPreset] = useState('')
  const [geminiVideoCustom, setGeminiVideoCustom] = useState('')

  const [arkChatPreset, setArkChatPreset] = useState('')
  const [arkChatCustom, setArkChatCustom] = useState('')
  const [arkImagePreset, setArkImagePreset] = useState('')
  const [arkImageCustom, setArkImageCustom] = useState('')
  const [arkVisionPreset, setArkVisionPreset] = useState('')
  const [arkVisionCustom, setArkVisionCustom] = useState('')
  const [arkVideoPreset, setArkVideoPreset] = useState('')
  const [arkVideoCustom, setArkVideoCustom] = useState('')
  const [arkT2ISeed, setArkT2ISeed] = useState('')

  const [coherenceStrength, setCoherenceStrength] = useState('')
  const [useFilesApiForMedia, setUseFilesApiForMedia] = useState('')
  const [debugLogs, setDebugLogs] = useState(false)




  

  useEffect(() => {
    try {
      setProvider(window.localStorage.getItem('settings.AI_PROVIDER') || 'ark')
      setGeminiKey(window.localStorage.getItem('settings.GEMINI_API_KEY') || '')
      setArkKey(window.localStorage.getItem('settings.ARK_API_KEY') || '')
      setArkBase(window.localStorage.getItem('settings.ARK_BASE_URL') || '')
      setModelChat(window.localStorage.getItem('settings.MODEL_CHAT') || '')
      setModelImage(window.localStorage.getItem('settings.MODEL_IMAGE') || '')
      setModelVision(window.localStorage.getItem('settings.MODEL_VISION') || '')
      setModelVideo(window.localStorage.getItem('settings.MODEL_VIDEO') || '')
      setVideoMaxTokens(window.localStorage.getItem('settings.VIDEO_MAX_TOKENS') || '')
      setReplyLanguage(window.localStorage.getItem('settings.REPLY_LANGUAGE') || 'auto')
      setImageSizePreset(window.localStorage.getItem('settings.IMAGE_SIZE_PRESET') || '2K')
      setImageWatermark((window.localStorage.getItem('settings.IMAGE_WATERMARK') || '') === 'true')

      setGeminiBase(window.localStorage.getItem('settings.GEMINI_BASE_URL') || '')
      const cv = window.localStorage.getItem('settings.MODEL_CHAT') || ''
      const iv = window.localStorage.getItem('settings.MODEL_IMAGE') || ''
      const vv = window.localStorage.getItem('settings.MODEL_VISION') || ''
      const dv = window.localStorage.getItem('settings.MODEL_VIDEO') || ''
      const inPresets = (value: string, presets: string[]) => presets.includes(value) ? value : 'custom'
      const setPair = (presetSetter: (v: string)=>void, customSetter: (v: string)=>void, value: string, presets: string[]) => {
        const p = inPresets(value, presets)
        presetSetter(p)
        if (p === 'custom') customSetter(value)
      }
      setPair(setGeminiChatPreset, setGeminiChatCustom, cv, ['gemini-2.5-pro','gemini-2.5-flash','gemini-flash-lite-latest'])
      setPair(setGeminiImagePreset, setGeminiImageCustom, iv, ['gemini-2.5-flash-image'])
      setPair(setGeminiVisionPreset, setGeminiVisionCustom, vv, ['gemini-2.5-pro','gemini-2.5-flash'])
      setPair(setGeminiVideoPreset, setGeminiVideoCustom, dv, ['gemini-2.5-flash','gemini-2.5-pro'])

      setPair(setArkChatPreset, setArkChatCustom, cv, ['doubao-1-5-pro-32k-250115','doubao-seed-1-6-lite-251015','doubao-seed-1-6-251015','doubao-seed-1-6-flash-250828'])
      if (!cv) setArkChatPreset('doubao-1-5-pro-32k-250115')
      setPair(setArkImagePreset, setArkImageCustom, iv, ['doubao-seedream-4-0-250828','doubao-seedream-3-0-t2i-250415'])
      setPair(setArkVisionPreset, setArkVisionCustom, vv, ['doubao-seed-1-6-lite-251015','doubao-seed-1-6-251015','doubao-seed-1-6-flash-250828'])
      setPair(setArkVideoPreset, setArkVideoCustom, dv, ['doubao-seed-1-6-lite-251015','doubao-seed-1-6-251015','doubao-seed-1-6-flash-250828'])




      

      setCoherenceStrength(window.localStorage.getItem('settings.COHERENCE_STRENGTH') || 'strong')
      setUseFilesApiForMedia(window.localStorage.getItem('settings.USE_FILES_API_FOR_MEDIA') || 'auto')
      setDebugLogs((window.localStorage.getItem('settings.DEBUG_LOGS') || '') === 'true')
      setArkT2ISeed(window.localStorage.getItem('settings.ARK_T2I_SEED') || '')
    } catch {}
  }, [])

  const handleSave = () => {
    if (provider === 'gemini') {
      const base = geminiBase || 'https://generativelanguage.googleapis.com'
      if (/\/openai\//i.test(base)) {
        alert('Gemini Base URL 不应为 OpenAI 兼容路径，请使用 https://generativelanguage.googleapis.com')
        return
      }
      const imgModel = geminiImagePreset === 'custom' ? geminiImageCustom : geminiImagePreset
      if (!imgModel || !/image|flash-image/i.test(imgModel)) {
        alert('Gemini 图片模型无效，请选择或填写支持图片生成的模型（如 gemini-2.5-flash-image）')
        return
      }
    }
    saveSettings({
      'settings.AI_PROVIDER': provider || 'ark',
      'settings.GEMINI_API_KEY': geminiKey,
      'settings.GEMINI_BASE_URL': geminiBase,
      'settings.ARK_API_KEY': arkKey,
      'settings.ARK_BASE_URL': arkBase,
      'settings.MODEL_CHAT': provider === 'gemini' ? (geminiChatPreset === 'custom' ? geminiChatCustom : geminiChatPreset) : (arkChatPreset === 'custom' ? arkChatCustom : arkChatPreset || modelChat),
      'settings.MODEL_IMAGE': provider === 'gemini' ? (geminiImagePreset === 'custom' ? geminiImageCustom : geminiImagePreset) : (arkImagePreset === 'custom' ? arkImageCustom : arkImagePreset || modelImage),
      'settings.MODEL_VISION': provider === 'gemini' ? (geminiVisionPreset === 'custom' ? geminiVisionCustom : geminiVisionPreset) : (arkVisionPreset === 'custom' ? arkVisionCustom : arkVisionPreset || modelVision),
      'settings.MODEL_VIDEO': provider === 'gemini' ? (geminiVideoPreset === 'custom' ? geminiVideoCustom : geminiVideoPreset) : (arkVideoPreset === 'custom' ? arkVideoCustom : arkVideoPreset || modelVideo),
      'settings.VIDEO_MAX_TOKENS': videoMaxTokens,
      
      'settings.REPLY_LANGUAGE': replyLanguage || 'auto',
      'settings.IMAGE_SIZE_PRESET': imageSizePreset || '2K',
      'settings.IMAGE_WATERMARK': String(imageWatermark),
      'settings.COHERENCE_STRENGTH': coherenceStrength || 'strong',
      'settings.USE_FILES_API_FOR_MEDIA': useFilesApiForMedia || 'auto',
      'settings.DEBUG_LOGS': String(debugLogs),
      'settings.ARK_T2I_SEED': arkT2ISeed,
      
      
      
      
    })
    alert(t('settings.saved'))
  }

  return (
    <div className="max-w-3xl mx-auto bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">{t('settings.title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">{t('settings.provider')}</label>
          <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
            <option value="ark">Ark</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        {provider === 'ark' && (
          <>
            <div>
              <label className="block text-sm mb-1">{t('settings.imageSizePreset')}</label>
              <select value={imageSizePreset} onChange={e => setImageSizePreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="2K">{t('settings.imageSizePreset2K')}</option>
                <option value="4K">{t('settings.imageSizePreset4K')}</option>
              </select>
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={imageWatermark} onChange={e => setImageWatermark(e.target.checked)} />
                <span>{t('settings.imageWatermark')}</span>
              </label>
            </div>
          </>
        )}
        <div>
          <label className="block text-sm mb-1">{t('settings.replyLanguage')}</label>
          <select value={replyLanguage} onChange={e => setReplyLanguage(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
            <option value="auto">{t('settings.replyLanguageAuto')}</option>
            <option value="zh">{t('settings.replyLanguageChinese')}</option>
            <option value="en">{t('settings.replyLanguageEnglish')}</option>
          </select>
        </div>
        {provider === 'gemini' && (
          <>
            <div>
              <label className="block text-sm mb-1">Gemini Base URL</label>
              <input value={geminiBase} onChange={e => setGeminiBase(e.target.value)} placeholder="https://generativelanguage.googleapis.com" className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
            </div>
            <div>
              <label className="block text-sm mb-1">Gemini API Key</label>
              <input value={geminiKey} onChange={e => setGeminiKey(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('settings.modelChat')}</label>
              <select value={geminiChatPreset} onChange={e => setGeminiChatPreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
                <option value="custom">Custom...</option>
              </select>
              {geminiChatPreset === 'custom' && (
                <input value={geminiChatCustom} onChange={e => setGeminiChatCustom(e.target.value)} placeholder="Enter custom model id" className="mt-2 w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('settings.modelImage')}</label>
              <select value={geminiImagePreset} onChange={e => setGeminiImagePreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="gemini-2.5-flash-image">gemini-2.5-flash-image</option>
                <option value="custom">Custom...</option>
              </select>
              {geminiImagePreset === 'custom' && (
                <input value={geminiImageCustom} onChange={e => setGeminiImageCustom(e.target.value)} placeholder="Enter custom model id" className="mt-2 w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('settings.modelVision')}</label>
              <select value={geminiVisionPreset} onChange={e => setGeminiVisionPreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="custom">Custom...</option>
              </select>
              {geminiVisionPreset === 'custom' && (
                <input value={geminiVisionCustom} onChange={e => setGeminiVisionCustom(e.target.value)} placeholder="Enter custom model id (e.g., nano banana)" className="mt-2 w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('settings.modelVideo')}</label>
              <select value={geminiVideoPreset} onChange={e => setGeminiVideoPreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                <option value="custom">Custom...</option>
              </select>
              {geminiVideoPreset === 'custom' && (
                <input value={geminiVideoCustom} onChange={e => setGeminiVideoCustom(e.target.value)} placeholder="Enter custom model id" className="mt-2 w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">风格连贯强度</label>
              <select value={coherenceStrength} onChange={e => setCoherenceStrength(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="strong">强（参考上一帧）</option>
                <option value="weak">弱（不参考上一帧）</option>
                <option value="off">关闭</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">媒体文件上传方式</label>
              <select value={useFilesApiForMedia} onChange={e => setUseFilesApiForMedia(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="auto">自动（≥20MB 使用 Files API）</option>
                <option value="always">始终使用 Files API</option>
                <option value="never">从不使用 Files API</option>
              </select>
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={debugLogs} onChange={e => setDebugLogs(e.target.checked)} />
                <span>调试日志（开发模式）</span>
              </label>
            </div>
            <div>
              <button onClick={async () => {
                try {
                  const url = await generateImage('Health check: generate a simple colorful geometric image')
                  alert('Gemini 图片生成连通性正常')
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Unknown error'
                  alert(`Gemini 图片生成连通性失败：${msg}`)
                }
              }} className="mt-2 px-4 py-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg">Gemini 图像健康检查</button>
            </div>
            <div>
              <button onClick={async () => {
                try {
                  const { apiKey, baseUrl } = getGeminiConfig()
                  if (!apiKey || !baseUrl) throw new Error('Gemini API Key 或 Base URL 未配置')
                  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9oZpFf8AAAAASUVORK5CYII='
                  const mimeType = 'image/png'
                  const bin = atob(b64)
                  const bytes = new Uint8Array(bin.length)
                  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
                  const initRes = await fetch(`${baseUrl}/upload/v1beta/files`, {
                    method: 'POST',
                    headers: {
                      'x-goog-api-key': apiKey,
                      'X-Goog-Upload-Protocol': 'resumable',
                      'X-Goog-Upload-Command': 'start',
                      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
                      'X-Goog-Upload-Header-Content-Type': mimeType,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ file: { displayName: 'HEALTH' } }),
                  })
                  if (!initRes.ok) throw new Error(`Init ${initRes.status}: ${await initRes.text()}`)
                  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL') || initRes.headers.get('x-goog-upload-url') || initRes.headers.get('Location') || ''
                  if (!uploadUrl) throw new Error('未返回上传 URL')
                  const uploadRes = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                      'x-goog-api-key': apiKey,
                      'X-Goog-Upload-Command': 'upload, finalize',
                      'X-Goog-Upload-Offset': '0',
                      'Content-Type': 'application/octet-stream',
                    },
                    body: bytes,
                  })
                  if (!uploadRes.ok) throw new Error(`Upload ${uploadRes.status}: ${await uploadRes.text()}`)
                  const meta = await uploadRes.json()
                  const uri = meta?.uri || meta?.file?.uri || meta?.name
                  if (!uri) throw new Error('未返回 file_uri')
                  alert(`Gemini 文件上传健康检查成功\nfile_uri: ${uri}`)
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Unknown error'
                  alert(`Gemini 文件上传健康检查失败：${msg}`)
                }
              }} className="mt-2 px-4 py-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg">Gemini 文件上传健康检查</button>
            </div>
          </>
        )}
        {provider === 'ark' && (
          <>
            <div>
              <label className="block text-sm mb-1">Ark API Key</label>
              <input value={arkKey} onChange={e => setArkKey(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
            </div>
            <div>
              <label className="block text-sm mb-1">Ark Base URL</label>
              <input value={arkBase} onChange={e => setArkBase(e.target.value)} placeholder="https://ark.cn-beijing.volces.com/api/v3" className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('settings.modelChat')}</label>
              <select value={arkChatPreset} onChange={e => setArkChatPreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="doubao-1-5-pro-32k-250115">doubao-1-5-pro-32k-250115</option>
                <option value="doubao-seed-1-6-lite-251015">doubao-seed-1-6-lite-251015</option>
                <option value="doubao-seed-1-6-251015">doubao-seed-1-6-251015</option>
                <option value="doubao-seed-1-6-flash-250828">doubao-seed-1-6-flash-250828</option>
                <option value="custom">Custom...</option>
              </select>
              {arkChatPreset === 'custom' && (
                <input value={arkChatCustom} onChange={e => setArkChatCustom(e.target.value)} placeholder="Enter custom model id" className="mt-2 w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('settings.modelImage')}</label>
              <select value={arkImagePreset} onChange={e => setArkImagePreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="doubao-seedream-4-0-250828">doubao-seedream-4-0-250828</option>
                <option value="doubao-seedream-3-0-t2i-250415">doubao-seedream-3-0-t2i-250415</option>
                <option value="custom">Custom...</option>
              </select>
              {arkImagePreset === 'custom' && (
                <input value={arkImageCustom} onChange={e => setArkImageCustom(e.target.value)} placeholder="Enter custom model id" className="mt-2 w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
              )}
              {(arkImagePreset === 'doubao-seedream-3-0-t2i-250415') && (
                <div className="mt-2">
                  <label className="block text-sm mb-1">t2i Seed（-1 随机，或 0–2147483647）</label>
                  <input value={arkT2ISeed} onChange={e => setArkT2ISeed(e.target.value)} placeholder="例如 -1 或 12345" className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('settings.modelVision')}</label>
              <select value={arkVisionPreset} onChange={e => setArkVisionPreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="doubao-seed-1-6-lite-251015">doubao-seed-1-6-lite-251015</option>
                <option value="doubao-seed-1-6-251015">doubao-seed-1-6-251015</option>
                <option value="doubao-seed-1-6-flash-250828">doubao-seed-1-6-flash-250828</option>
                <option value="custom">Custom...</option>
              </select>
              {arkVisionPreset === 'custom' && (
                <input value={arkVisionCustom} onChange={e => setArkVisionCustom(e.target.value)} placeholder="Enter custom model id" className="mt-2 w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('settings.modelVideo')}</label>
              <select value={arkVideoPreset} onChange={e => setArkVideoPreset(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200">
                <option value="doubao-seed-1-6-lite-251015">doubao-seed-1-6-lite-251015</option>
                <option value="doubao-seed-1-6-251015">doubao-seed-1-6-251015</option>
                <option value="doubao-seed-1-6-flash-250828">doubao-seed-1-6-flash-250828</option>
                <option value="custom">Custom...</option>
              </select>
              {arkVideoPreset === 'custom' && (
                <input value={arkVideoCustom} onChange={e => setArkVideoCustom(e.target.value)} placeholder="Enter custom model id" className="mt-2 w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
              )}
            </div>
            <div>
              <button onClick={async () => {
                try {
                  const url = await generateImage('Health check: generate a simple colorful geometric image')
                  alert('Ark 图片生成连通性正常')
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Unknown error'
                  alert(`Ark 图片生成连通性失败：${msg}`)
                }
              }} className="mt-2 px-4 py-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg">Ark 图像健康检查</button>
            </div>
          </>
        )}
        <div>
          <label className="block text-sm mb-1">{t('settings.videoMaxTokens')}</label>
          <input value={videoMaxTokens} onChange={e => setVideoMaxTokens(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" />
        </div
>
      </div>
      
      <div className="mt-6">
        <button onClick={handleSave} className="px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg">{t('settings.save')}</button>
      </div>
    </div>
  )
}

export default Settings