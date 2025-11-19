
import React, { useState } from 'react';
import { analyzeImage, analyzeVideo, uploadMediaDebug, uploadMediaWithStatus } from '../services/aiService';
import { getProvider } from '../services/runtimeConfig';
import { fileToBase64 } from '../utils/fileUtils';
import { Oval } from 'react-loader-spinner';
import CodeBlock from './CodeBlock';
import { useLocalization } from '../contexts/LocalizationContext';

type AnalyzerMode = 'image' | 'video';

interface MediaAnalyzerProps {
    onUseIdea: (idea: string) => void;
}

const MediaAnalyzer: React.FC<MediaAnalyzerProps> = ({ onUseIdea }) => {
    const { t } = useLocalization();
    const [mode, setMode] = useState<AnalyzerMode>('image');
    
    // --- State Separation ---
    // Image Mode State
    const [imagePrompt, setImagePrompt] = useState<string>('Describe this image in detail.');
    const [imageFile, setImageFile] = useState<{url: string, base64: string, mimeType: string} | null>(null);
    const [imageAnalysisResult, setImageAnalysisResult] = useState<string | null>(null);

    // Video Mode State
    const [videoFile, setVideoFile] = useState<{url: string, base64: string, mimeType: string} | null>(null);
    const [useThinkingMode, setUseThinkingMode] = useState<boolean>(false);
    const [videoAnalysisResult, setVideoAnalysisResult] = useState<string | null>(null);
    const [videoUploadInfo, setVideoUploadInfo] = useState<{ uri?: string; status?: string; stage?: string } | null>(null);

    // General State
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const isProUser = true;

    const videoRef = React.useRef<HTMLVideoElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setError(null);
            // 20MB 限制，Base64 请求体过大可能导致中止
            if (mode === 'video' && selectedFile.size > 20 * 1024 * 1024) {
                setError(t('mediaAnalyzer.videoUploadError'));
                return;
            }
            try {
                const { base64, mimeType } = await fileToBase64(selectedFile);
                // 暂停并清理旧媒体预览
                if (mode === 'video' && videoRef.current) {
                    try { videoRef.current.pause(); } catch {}
                    try {
                        const oldUrl = videoFile?.url
                        if (oldUrl) {
                            try { videoRef.current.src = '' } catch {}
                            try { URL.revokeObjectURL(oldUrl) } catch {}
                        }
                    } catch {}
                } else {
                    const oldImgUrl = imageFile?.url
                    if (oldImgUrl) {
                        try { URL.revokeObjectURL(oldImgUrl) } catch {}
                    }
                }
                const url = `data:${mimeType};base64,${base64}`;
                if (mode === 'image') {
                    setImageFile({ url, base64, mimeType });
                    setImageAnalysisResult(null);
                } else {
                    setVideoFile({ url, base64, mimeType });
                    setVideoAnalysisResult(null);
                    if (getProvider() === 'gemini') {
                      setVideoUploadInfo({ stage: 'init' })
                      uploadMediaWithStatus(base64, mimeType, (info) => {
                        setVideoUploadInfo({ uri: info.uri, status: info.state || info.detail || '', stage: info.stage })
                      }).catch(e => {
                        setVideoUploadInfo({ status: e instanceof Error ? e.message : String(e), stage: 'error' })
                      })
                    } else {
                      setVideoUploadInfo(null)
                    }
                }
            } catch (err) {
                setError(t('mediaAnalyzer.errorProcess'));
            }
        }
    };

    React.useEffect(() => {
      return () => {
        try { if (imageFile?.url) URL.revokeObjectURL(imageFile.url) } catch {}
        try {
          if (videoFile?.url) {
            try { if (videoRef.current) videoRef.current.src = '' } catch {}
            URL.revokeObjectURL(videoFile.url)
          }
        } catch {}
      }
    }, [])

    const handleAnalyze = async () => {
        const fileToAnalyze = mode === 'image' ? imageFile : videoFile;
        if (!fileToAnalyze) {
            setError(t('mediaAnalyzer.errorFile'));
            return;
        }
        if (mode === 'image' && !imagePrompt.trim()){
            setError(t('mediaAnalyzer.errorPrompt'));
            return;
        }
        
        // no credits logic

        setIsLoading(true);
        setError(null);
        if (mode === 'image') setImageAnalysisResult(null);
        else setVideoAnalysisResult(null);


        try {
            let result;
            if (mode === 'image') {
                result = await analyzeImage(fileToAnalyze.base64, fileToAnalyze.mimeType, imagePrompt);
                setImageAnalysisResult(result);
            } else { // video
                try {
                  if (getProvider() === 'gemini') {
                    const info = await uploadMediaDebug(fileToAnalyze.base64, fileToAnalyze.mimeType)
                    setVideoUploadInfo(info)
                  } else {
                    setVideoUploadInfo(null)
                  }
                } catch (e) {
                  setVideoUploadInfo({ uri: '', status: e instanceof Error ? e.message : String(e) })
                }
                result = await analyzeVideo(fileToAnalyze.base64, fileToAnalyze.mimeType, useThinkingMode);
                setVideoAnalysisResult(result);
            }
            // no credits deduction
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (/ERR_ABORTED/.test(msg) || /blob:/.test(msg)) {
                // 预览层的加载被中止，不影响分析结果，忽略此错误
            } else {
                setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis.')
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderAnalysisResult = () => {
        const result = mode === 'image' ? imageAnalysisResult : videoAnalysisResult;
        if (!result) return null;
    
        const isStructuredScript = mode === 'video' && result.includes("Scene 1:") && result.includes("Subject / Scene Settings");
        const title = isStructuredScript ? t('mediaAnalyzer.replicationScriptTitle') : t('mediaAnalyzer.analysisResultTitle');
    
        return (
          <div>
            <h3 className="text-2xl font-bold mb-4 text-gray-200">{title}</h3>
            <CodeBlock content={result} />
            {mode === 'video' && (
                 <div className="mt-4 flex justify-start">
                  <button
                    onClick={() => onUseIdea(result)}
                    className="px-6 py-2 font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 rounded-lg shadow-lg hover:from-green-600 hover:to-teal-600 transition-all transform hover:scale-105"
                  >
                    {t('mediaAnalyzer.useAsIdeaButton')}
                  </button>
                </div>
            )}
          </div>
        );
    };
    
    const handleModeChange = (newMode: AnalyzerMode) => {
        setMode(newMode);
        setError(null);
    };

    const imageCreditCost = undefined as any;
    
    const getVideoCreditCost = () => {
        return undefined as any;
    };


    const renderVideoUI = () => {
        return (
             <div className="space-y-4">
                 <div className="mb-4">
                    <label htmlFor="video-upload" className="block text-sm font-medium text-gray-400 mb-2">{t('mediaAnalyzer.uploadVideoLabel')}</label>
                    <input 
                        type="file" 
                        id="video-upload"
                        onChange={handleFileChange}
                        accept="video/*"
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/40"
                        disabled={isLoading}
                    />
                </div>
                <div className="pt-2 relative group">
                    <div className="flex items-center gap-2">
                        <label htmlFor="thinking-toggle" className="block text-sm font-medium text-gray-400">
                            {t('mediaAnalyzer.thinkingModeLabel')}
                        </label>
                        {!isProUser && <span className="text-xs font-bold text-yellow-400">{t('mediaAnalyzer.thinkingModeCost')}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{t('mediaAnalyzer.thinkingModeHint')}</p>
                    <button
                        type="button"
                        onClick={() => setUseThinkingMode(!useThinkingMode)}
                        className={`${useThinkingMode ? 'bg-purple-600' : 'bg-gray-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
                        role="switch"
                        aria-checked={useThinkingMode}
                        disabled={isLoading}
                    >
                        <span aria-hidden="true" className={`${useThinkingMode ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-max px-3 py-2 bg-gray-900 border border-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                        {isProUser 
                            ? t('mediaAnalyzer.thinkingModeTooltipPro')
                            : t('mediaAnalyzer.thinkingModeTooltipFree')
                        }
                    </div>
                </div>
                <div className="flex justify-between items-start pt-2">
                    {videoUploadInfo && (
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 w-80">
                        <div className="text-sm text-gray-400">Files API 上传信息</div>
                        <div className="mt-1 text-xs text-gray-300">阶段：<span className="font-mono">{videoUploadInfo.stage || 'N/A'}</span></div>
                        <div className="mt-1 text-xs text-gray-300">状态：<span className="font-mono">{videoUploadInfo.status || 'N/A'}</span></div>
                        <div className="mt-1 text-xs text-gray-300 break-all">file_uri：<span className="font-mono">{videoUploadInfo.uri || 'N/A'}</span></div>
                      </div>
                    )}
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !videoFile}
                        className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                    >
                        {isLoading ? t('common.analyzing') : t('mediaAnalyzer.analyzeVideoButton', {})}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">{t('mediaAnalyzer.title')}</h2>
                <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">{t('mediaAnalyzer.subtitle')}</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-6 border border-gray-700">
                <div className="flex justify-center mb-6 border-b border-gray-700">
                    <button onClick={() => handleModeChange('image')} className={`px-6 py-2 font-medium border-b-2 transition-colors ${mode === 'image' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('mediaAnalyzer.imageTab')}</button>
                    <button onClick={() => handleModeChange('video')} className={`px-6 py-2 font-medium border-b-2 transition-colors ${mode === 'video' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('mediaAnalyzer.videoTab')}</button>
                </div>

                {mode === 'image' && (
                    <div className="space-y-4">
                         <div className="mb-4">
                            <label htmlFor="image-upload" className="block text-sm font-medium text-gray-400 mb-2">{t('mediaAnalyzer.uploadImageLabel')}</label>
                            <input 
                                type="file" 
                                id="image-upload"
                                onChange={handleFileChange}
                                accept="image/*"
                                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/40"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="prompt-input" className="block text-lg font-medium text-gray-300">{t('mediaAnalyzer.promptLabel')}</label>
                            <textarea
                                id="prompt-input"
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                placeholder={t('mediaAnalyzer.promptPlaceholder')}
                                className="mt-1 w-full h-24 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500 resize-none"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex justify-end items-center pt-2">
                            <button
                                onClick={handleAnalyze}
                                disabled={isLoading || !imageFile}
                                className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                            >
                                {isLoading ? t('common.analyzing') : t('mediaAnalyzer.analyzeImageButton', {})}
                            </button>
                        </div>
                    </div>
                )}
                {mode === 'video' && renderVideoUI()}
            </div>

            {isLoading && (
                <div className="flex justify-center items-center gap-4 text-lg text-gray-300">
                    <Oval height="40" width="40" color="#a855f7" secondaryColor="#67e8f9" strokeWidth={3} />
                    <span>{t('mediaAnalyzer.loading')}</span>
                </div>
            )}

            {error && (
                <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                    <strong className="font-bold">{t('common.error')}: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {(mode === 'image' ? imageFile : videoFile) && (
                    <div className="text-center">
                        <h3 className="text-2xl font-bold mb-4 text-gray-200">{t('mediaAnalyzer.yourMediaTitle')}</h3>
                        {(mode === 'image' ? imageFile?.mimeType : videoFile?.mimeType)?.startsWith('image/') ? (
                            <img src={mode === 'image' ? imageFile?.url : videoFile?.url} alt="Uploaded media" className="rounded-lg shadow-xl mx-auto max-w-full" />
                        ) : (
                            <video ref={videoRef} src={mode === 'image' ? imageFile?.url : videoFile?.url} controls preload="metadata" className="rounded-lg shadow-xl mx-auto max-w-full" />
                        )}
                    </div>
                )}
                {(imageAnalysisResult || videoAnalysisResult) && (
                    <div className="text-left">
                         {renderAnalysisResult()}
                    </div>
                )}
                
            </div>
        </div>
    );
};

export default MediaAnalyzer;