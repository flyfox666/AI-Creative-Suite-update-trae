export interface AIProvider {
  generateImageForScene(prompt: string, previousImageUrl: string | undefined, aspectRatio: string): Promise<string>
  generateStoryboardAndImages(
    userInput: string,
    duration: number,
    sceneCount: number,
    isCoherent: boolean,
    aspectRatio: string,
    referenceImages: { base64: string; mimeType: string }[]
  ): Promise<import('../../types').StoryboardResult>
  combineImages(images: { base64: string; mimeType: string }[], prompt: string): Promise<{ base64: string; mimeType: string }>
  generateImage(prompt: string): Promise<string>
  editImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string>
  analyzeImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string>
  analyzeVideo(base64VideoData: string, mimeType: string, useThinkingMode: boolean): Promise<string>

}