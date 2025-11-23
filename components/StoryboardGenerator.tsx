import React, { useState, useCallback, useEffect } from 'react';
import { generateStoryboardAndImages, generateImageForScene, combineImages } from '../services/aiService';
import { StoryboardResult, Scene } from '../types';
import InputForm from './InputForm';
import ResultsDisplay from './ResultsDisplay';
import ImageModal from './ImageModal';
import { fileToBase64 } from '../utils/fileUtils';
import { useLocalization } from '../contexts/LocalizationContext';


interface StoryboardGeneratorProps {
  initialIdea?: string;
  initialImage?: string | null;
  onInitialDataUsed: () => void;
}

type ReferenceImageMode = 'contextual' | 'combine';

const StoryboardGenerator: React.FC<StoryboardGeneratorProps> = ({ initialIdea, initialImage, onInitialDataUsed }) => {
  const { t } = useLocalization();
  const [userInput, setUserInput] = useState<string>('');
  const [duration, setDuration] = useState<string>('15');
  const [sceneCount, setSceneCount] = useState<string>('3');
  const [isCoherent, setIsCoherent] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [storyboardResult, setStoryboardResult] = useState<StoryboardResult | null>(null);
  const [modalImage, setModalImage] = useState<{ url: string; sceneNumber: number } | null>(null);
  const [regeneratingScenes, setRegeneratingScenes] = useState<Set<number>>(new Set());
  const [referenceImages, setReferenceImages] = useState<{url: string, base64: string, mimeType: string}[]>([]);
  const [referenceImageMode, setReferenceImageMode] = useState<ReferenceImageMode>('contextual');

  const isProUser = true;

  useEffect(() => {
    if (initialIdea) {
        setUserInput(initialIdea);
        onInitialDataUsed();
    }
  }, [initialIdea, onInitialDataUsed]);

  useEffect(() => {
    if (initialImage) {
        const match = initialImage.match(/^data:(image\/.+);base64,(.+)$/);
        if (match) {
            const mimeType = match[1];
            const base64 = match[2];
            setReferenceImages(prev => {
                if (prev.some(img => img.url === initialImage)) return prev;
                const maxImages = 10;
                const newImage = { url: initialImage, base64, mimeType };
                const updatedImages = [...prev, newImage];
                // Slice to respect the limit if it's exceeded, keeping the newest ones
                return updatedImages.slice(-maxImages);
            });
        }
        onInitialDataUsed();
    }
  }, [initialImage, onInitialDataUsed, isProUser]);

  const handleReferenceImageAdd = async (files: FileList) => {
    const maxImages = 10;
    const currentCount = referenceImages.length;
    const filesToAdd = Array.from(files);

    if (currentCount + filesToAdd.length > maxImages) {
        setError(t('storyboard.generator.errorImageLimit', { maxImages }));
        return;
    }
    try {
        const newImages = await Promise.all(
            filesToAdd.map(async (file) => {
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(t('storyboard.generator.errorImageTooLarge'))
                }
                const { base64, mimeType } = await fileToBase64(file);
                const url = `data:${mimeType};base64,${base64}`;
                return { url, base64, mimeType };
            })
        );
        setReferenceImages(prev => [...prev, ...newImages]);
    } catch (err) {
        setError(t('storyboard.generator.errorFileProcess'));
    }
  };

  const handleReferenceImageRemove = (urlToRemove: string) => {
    setReferenceImages(prev => prev.filter(img => img.url !== urlToRemove));
  };
  
  const handleSubmit = useCallback(async () => {
    if (!userInput.trim()) {
      setError(t('storyboard.generator.errorIdea'));
      return;
    }
    const parsedDuration = parseInt(duration, 10);
    const parsedSceneCount = parseInt(sceneCount, 10);

    if (isNaN(parsedDuration) || isNaN(parsedSceneCount) || parsedDuration <= 0 || parsedSceneCount <= 0) {
        setError(t('storyboard.generator.errorInvalidNumbers'));
        return;
    }

    // no credit checks

    setIsLoading(true);
    setError(null);
    setStoryboardResult(null);

    try {
      let finalReferenceImages = referenceImages;

      if (referenceImageMode === 'combine' && referenceImages.length > 1) {
          try {
              const combinedImage = await combineImages(
                  referenceImages, 
                  'Combine the key elements from these images into a single, coherent cinematic scene.'
              );
              const combinedImageUrl = `data:${combinedImage.mimeType};base64,${combinedImage.base64}`;
              
              finalReferenceImages = [{
                  url: combinedImageUrl,
                  base64: combinedImage.base64,
                  mimeType: combinedImage.mimeType,
              }];
          } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              throw new Error(t('storyboard.generator.errorCombine', { errorMessage }));
          }
      }

      const result = await generateStoryboardAndImages(userInput, parsedDuration, parsedSceneCount, isCoherent, aspectRatio, finalReferenceImages);
      // no credits deduction
      setStoryboardResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('storyboard.generator.errorUnexpected'));
    } finally {
      setIsLoading(false);
    }
  }, [userInput, duration, sceneCount, isCoherent, aspectRatio, referenceImages, referenceImageMode, t]);

  const handleImageClick = (url: string, sceneNumber: number) => {
    if (url) {
        setModalImage({ url, sceneNumber });
    }
  };

  const handleCloseModal = () => {
    setModalImage(null);
  };

  const handleScenePromptChange = (index: number, newFullPrompt: string) => {
    if (!storyboardResult) return;
    
    const newScenes = [...storyboardResult.scenes];
    newScenes[index] = { ...newScenes[index], fullPrompt: newFullPrompt };
    
    const newCopyReadyPrompt = newScenes.map(s => s.fullPrompt).join('\n\n');
    
    setStoryboardResult({
        scenes: newScenes,
        copyReadyPrompt: newCopyReadyPrompt,
    });
  };

  const handleRegenerateImage = async (index: number) => {
    if (!storyboardResult) return;
    
    // no credit checks

    setRegeneratingScenes(prev => new Set(prev).add(index));
    setError(null);

    try {
        const scene = storyboardResult.scenes[index];
        const previousImageUrl = (isCoherent && index > 0) ? storyboardResult.scenes[index - 1].imageUrl : undefined;
        
        const newImageUrl = await generateImageForScene(scene.fullPrompt, previousImageUrl, aspectRatio);
        // no credits deduction
        
        const newScenes = [...storyboardResult.scenes];
        newScenes[index] = { ...newScenes[index], imageUrl: newImageUrl };
        
        setStoryboardResult({
            ...storyboardResult,
            scenes: newScenes,
        });

    } catch (err) {
        console.error(`Error regenerating image for scene ${index + 1}:`, err);
        const errorMessage = err instanceof Error ? err.message : t('storyboard.generator.errorUnexpected');
        setError(t('storyboard.generator.errorRegenFailed', { index: index + 1, errorMessage }));
    } finally {
        setRegeneratingScenes(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
        });
    }
  };

  const handleReferenceImageUpload = async (index: number, file: File) => {
    if (!storyboardResult) return;
    
    try {
        const { base64, mimeType } = await fileToBase64(file);
        const dataUrl = `data:${mimeType};base64,${base64}`;

        const newScenes = [...storyboardResult.scenes];
        newScenes[index] = { ...newScenes[index], imageUrl: dataUrl };
        
        setStoryboardResult({
            ...storyboardResult,
            scenes: newScenes,
        });

    } catch (err) {
        console.error(`Error processing uploaded image for scene ${index + 1}:`, err);
        const errorMessage = err instanceof Error ? err.message : t('storyboard.generator.errorUnexpected');
        setError(t('storyboard.generator.errorUploadFailed', { index: index + 1, errorMessage }));
    }
  };


  return (
    <div className="space-y-8">
      <div className="text-center">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">{t('storyboardGenerator.title')}</h2>
          <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">{t('storyboardGenerator.subtitle')}</p>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-6 border border-gray-700">
        <InputForm 
          userInput={userInput}
          setUserInput={setUserInput}
          duration={duration}
          setDuration={setDuration}
          sceneCount={sceneCount}
          setSceneCount={setSceneCount}
          isCoherent={isCoherent}
          setIsCoherent={setIsCoherent}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          referenceImages={referenceImages}
          onReferenceImageAdd={handleReferenceImageAdd}
          onReferenceImageRemove={handleReferenceImageRemove}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          referenceImageMode={referenceImageMode}
          setReferenceImageMode={setReferenceImageMode}
        />
      </div>

      {isLoading && (
        <div className="mt-8 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" aria-label="loading"></div>
          <p className="mt-4 text-lg text-gray-300 animate-pulse">{t('storyboard.generator.loadingMessage')}</p>
        </div>
      )}

      {error && (
        <div className="mt-8 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
          <strong className="font-bold">{t('common.error')}: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {!isLoading && storyboardResult && (
        <div className="mt-10">
          <ResultsDisplay 
            result={storyboardResult} 
            onImageClick={handleImageClick}
            regeneratingScenes={regeneratingScenes}
            onRegenerateImage={handleRegenerateImage}
            onScenePromptChange={handleScenePromptChange}
            onReferenceImageUpload={handleReferenceImageUpload}
          />
        </div>
      )}

      {modalImage && (
        <ImageModal 
            imageUrl={modalImage.url} 
            sceneNumber={modalImage.sceneNumber} 
            onClose={handleCloseModal} 
        />
      )}
    </div>
  );
};

export default StoryboardGenerator;