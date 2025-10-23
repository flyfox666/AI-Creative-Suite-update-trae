
import React, { useState } from 'react';
import { generateImageWithImagen, editImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { Oval } from 'react-loader-spinner';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';

type StudioMode = 'generate' | 'edit';

interface ImageStudioProps {
  onUseImage: (imageUrl: string) => void;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ onUseImage }) => {
  const { user, spendCredits } = useUser();
  const { t } = useLocalization();
  const [mode, setMode] = useState<StudioMode>('generate');
  
  // --- State Separation ---
  // Generate Mode State
  const [generatePrompt, setGeneratePrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Edit Mode State
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [originalImage, setOriginalImage] = useState<{url: string, base64: string, mimeType: string} | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  
  // General State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Free user limit state
  const [freeUserGenerationCount, setFreeUserGenerationCount] = useState<number>(0);
  const [freeUserEditCount, setFreeUserEditCount] = useState<number>(0);

  const isProUser = user.plan === 'pro';
  const FREE_GENERATION_LIMIT = 3;
  const FREE_EDIT_LIMIT = 3;

  const handleGenerate = async () => {
    if (!isProUser && freeUserGenerationCount >= FREE_GENERATION_LIMIT) {
        setError(t('imageStudio.errorFreeGenerations', { limit: FREE_GENERATION_LIMIT }));
        return;
    }
    if (!generatePrompt.trim()) {
      setError(t('imageStudio.errorPrompt'));
      return;
    }
    
    const creditCost = isProUser ? 20 : 40;
    if (user.credits < creditCost) {
        setError(t('imageStudio.errorCredits', { cost: creditCost, userCredits: user.credits }));
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageUrl = await generateImageWithImagen(generatePrompt, aspectRatio);
      spendCredits(creditCost);
      setGeneratedImage(imageUrl);
      if (!isProUser) {
        setFreeUserGenerationCount(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!isProUser && freeUserEditCount >= FREE_EDIT_LIMIT) {
        setError(t('imageStudio.errorFreeEdits', { limit: FREE_EDIT_LIMIT }));
        return;
    }
    if (!editPrompt.trim()) {
      setError(t('imageStudio.errorEditInstruction'));
      return;
    }
    if (!originalImage) {
        setError(t('imageStudio.errorUpload'));
        return;
    }

    const creditCost = isProUser ? 5 : 25;
    if (user.credits < creditCost) {
        setError(t('imageStudio.errorCredits', { cost: creditCost, userCredits: user.credits }));
        return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    try {
      const imageUrl = await editImage(originalImage.base64, originalImage.mimeType, editPrompt);
      spendCredits(creditCost);
      setEditedImage(imageUrl);
      if (!isProUser) {
          setFreeUserEditCount(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const { base64, mimeType } = await fileToBase64(file);
        const url = `data:${mimeType};base64,${base64}`;
        setOriginalImage({ url, base64, mimeType });
        setEditedImage(null); // Reset edited image on new upload
      } catch (err) {
        setError('Failed to process image file.');
      }
    }
  };
  
  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const fileExtension = imageUrl.match(/data:image\/(.+);/)?.[1] || 'png';
    link.download = `ai-studio-image.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleSendToEdit = (imageUrl: string) => {
    const match = imageUrl.match(/^data:(image\/.+);base64,(.+)$/);
    if (match) {
        const mimeType = match[1];
        const base64 = match[2];
        setOriginalImage({ url: imageUrl, base64, mimeType });
        setMode('edit');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        setError(t('imageStudio.errorProcessImage'));
    }
  };
  
  const handleModeChange = (newMode: StudioMode) => {
      setMode(newMode);
      setError(null);
  }

  const generateCreditCost = isProUser ? 20 : 40;
  const editCreditCost = isProUser ? 5 : 25;

  const renderGenerateUI = () => {
    const isLimitReached = !isProUser && freeUserGenerationCount >= FREE_GENERATION_LIMIT;
    
    return (
    <>
      <textarea
        id="prompt-input-generate"
        value={generatePrompt}
        onChange={(e) => setGeneratePrompt(e.target.value)}
        placeholder={t('imageStudio.generatePlaceholder')}
        className="mt-1 w-full h-24 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500 resize-none"
        disabled={isLoading}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-400">{t('imageStudio.aspectRatioLabel')}</label>
          <select
            id="aspect-ratio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as any)}
            className="mt-1 w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-200"
            disabled={isLoading}
          >
            <option value="1:1">{t('imageStudio.aspectRatioSquare')}</option>
            <option value="16:9">{t('imageStudio.aspectRatioLandscape')}</option>
            <option value="9:16">{t('imageStudio.aspectRatioPortrait')}</option>
            <option value="4:3">{t('imageStudio.aspectRatioStandard')}</option>
            <option value="3:4">{t('imageStudio.aspectRatioVertical')}</option>
          </select>
        </div>
      </div>
       <div className="flex justify-end items-center pt-2 flex-col sm:flex-row gap-2 mt-4">
         {!isProUser && (
            <p className="text-xs text-gray-500 mr-auto pt-2 sm:pt-0">
                {isLimitReached
                ? t('imageStudio.freeGenerationsLimit')
                : t('imageStudio.freeGenerationsLeft', { count: FREE_GENERATION_LIMIT - freeUserGenerationCount })}
            </p>
         )}
        <button
          onClick={handleGenerate}
          disabled={isLoading || !generatePrompt.trim() || isLimitReached}
          className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
        >
          {isLoading ? t('common.generating') : t('imageStudio.generateButton', { cost: generateCreditCost })}
        </button>
      </div>
    </>
    )
  };

  const renderEditUI = () => {
    const isLimitReached = !isProUser && freeUserEditCount >= FREE_EDIT_LIMIT;
    return (
     <>
      <textarea
          id="prompt-input-edit"
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          placeholder={t('imageStudio.editPlaceholder')}
          className="mt-1 w-full h-24 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500 resize-none"
          disabled={isLoading}
      />
      <div className="my-4">
        <label htmlFor="image-upload" className="block text-sm font-medium text-gray-400 mb-2">{t('imageStudio.uploadLabel')}</label>
        <input 
            type="file" 
            id="image-upload"
            onChange={handleImageUpload}
            accept="image/*"
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/40"
            disabled={isLoading}
        />
      </div>
      <div className="flex justify-end items-center pt-2 flex-col sm:flex-row gap-2">
        {!isProUser && (
            <p className="text-xs text-gray-500 mr-auto pt-2 sm:pt-0">
                {isLimitReached
                ? t('imageStudio.freeEditsLimit')
                : t('imageStudio.freeEditsLeft', { count: FREE_EDIT_LIMIT - freeUserEditCount })}
            </p>
        )}
        <button
          onClick={handleEdit}
          disabled={isLoading || !editPrompt.trim() || !originalImage || isLimitReached}
          className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
        >
          {isLoading ? t('common.editing') : t('imageStudio.editButton', { cost: editCreditCost })}
        </button>
      </div>
     </>
    )
  };


  return (
    <div className="space-y-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-6 border border-gray-700">
            <div className="flex justify-center mb-6 border-b border-gray-700">
                 <button onClick={() => handleModeChange('generate')} className={`px-6 py-2 font-medium border-b-2 transition-colors ${mode === 'generate' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('imageStudio.generateTab')}</button>
                 <button onClick={() => handleModeChange('edit')} className={`px-6 py-2 font-medium border-b-2 transition-colors ${mode === 'edit' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('imageStudio.editTab')}</button>
            </div>
            <div className="space-y-4">
                <div>
                    <label htmlFor={mode === 'generate' ? 'prompt-input-generate' : 'prompt-input-edit'} className="block text-lg font-medium text-gray-300">
                        {mode === 'generate' ? t('imageStudio.generateTitle') : t('imageStudio.editTitle')}
                    </label>
                    {mode === 'generate' ? renderGenerateUI() : renderEditUI()}
                </div>
            </div>
        </div>
        
        {isLoading && (
            <div className="flex justify-center items-center gap-4 text-lg text-gray-300">
                <Oval height="40" width="40" color="#a855f7" secondaryColor="#67e8f9" strokeWidth={3} />
                <span>{mode === 'generate' ? t('imageStudio.loadingGenerate') : t('imageStudio.loadingEdit')}</span>
            </div>
        )}

        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                <strong className="font-bold">{t('common.error')}: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        
        {/* Results Display */}
        <div className="mt-8">
            {mode === 'generate' && generatedImage && (
                <div>
                    <h3 className="text-2xl font-bold text-center mb-4 text-gray-200">{t('imageStudio.resultGeneratedTitle')}</h3>
                    <div className="max-w-xl mx-auto">
                      <img src={generatedImage} alt="Generated result" className="rounded-lg shadow-xl mx-auto w-full" />
                      <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-4">
                        <button 
                          onClick={() => onUseImage(generatedImage)}
                          className="px-4 sm:px-6 py-2 font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 rounded-lg shadow-lg hover:from-green-600 hover:to-teal-600 transition-all transform hover:scale-105 text-sm sm:text-base"
                        >
                          {t('imageStudio.useInStoryboardButton')}
                        </button>
                         <button
                            onClick={() => handleSendToEdit(generatedImage)}
                            className="px-4 sm:px-6 py-2 font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base"
                        >
                            {t('imageStudio.editImageButton')}
                        </button>
                        <button
                            onClick={() => handleDownload(generatedImage)}
                            className="px-4 sm:px-6 py-2 font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base"
                        >
                            {t('common.download')}
                        </button>
                      </div>
                    </div>
                </div>
            )}
            {mode === 'edit' && (originalImage || editedImage) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {originalImage && (
                        <div className="text-center">
                            <h3 className="text-2xl font-bold mb-4 text-gray-200">{t('imageStudio.resultOriginalTitle')}</h3>
                            <img src={originalImage.url} alt="Original for editing" className="rounded-lg shadow-xl mx-auto max-w-full" />
                        </div>
                    )}
                    {editedImage && (
                        <div className="text-center">
                            <h3 className="text-2xl font-bold mb-4 text-gray-200">{t('imageStudio.resultEditedTitle')}</h3>
                            <img src={editedImage} alt="Edited result" className="rounded-lg shadow-xl mx-auto max-w-full" />
                            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-4">
                                <button 
                                    onClick={() => onUseImage(editedImage)}
                                    className="px-4 sm:px-6 py-2 font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 rounded-lg shadow-lg hover:from-green-600 hover:to-teal-600 transition-all transform hover:scale-105 text-sm sm:text-base"
                                >
                                    {t('imageStudio.useInStoryboardButton')}
                                </button>
                                <button
                                    onClick={() => handleDownload(editedImage)}
                                    className="px-4 sm:px-6 py-2 font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base"
                                >
                                    {t('common.download')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageStudio;