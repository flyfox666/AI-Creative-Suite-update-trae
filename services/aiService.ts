import type { AIProvider } from './providers/aiProvider'
import { ArkProvider } from './providers/arkProvider'
import { GeminiProvider, geminiUploadMediaForDebug, geminiUploadMediaWithStatus } from './providers/geminiProvider'
import { getProvider } from './runtimeConfig'

const select = (): AIProvider => (getProvider() === 'ark' ? ArkProvider : GeminiProvider)

export const generateImageForScene = (...args: Parameters<AIProvider['generateImageForScene']>) => select().generateImageForScene(...args)
export const generateStoryboardAndImages = (...args: Parameters<AIProvider['generateStoryboardAndImages']>) => select().generateStoryboardAndImages(...args)
export const combineImages = (...args: Parameters<AIProvider['combineImages']>) => select().combineImages(...args)
export const generateImage = (...args: Parameters<AIProvider['generateImage']>) => select().generateImage(...args)
export const editImage = (...args: Parameters<AIProvider['editImage']>) => select().editImage(...args)
export const analyzeImage = (...args: Parameters<AIProvider['analyzeImage']>) => select().analyzeImage(...args)
export const analyzeVideo = (...args: Parameters<AIProvider['analyzeVideo']>) => select().analyzeVideo(...args)

export const uploadMediaDebug = async (base64: string, mimeType: string): Promise<{ uri: string; status: string }> => {
  if (getProvider() !== 'gemini') return { uri: '', status: 'debug upload only available for Gemini provider' }
  return geminiUploadMediaForDebug(base64, mimeType)
}

export const uploadMediaWithStatus = async (
  base64: string,
  mimeType: string,
  onStatus: (info: { stage: string; uri?: string; state?: string; detail?: string }) => void,
) => {
  if (getProvider() !== 'gemini') return { uri: '', status: 'upload only available for Gemini provider' }
  return geminiUploadMediaWithStatus(base64, mimeType, onStatus)
}