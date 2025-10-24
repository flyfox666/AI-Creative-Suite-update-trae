import React, { useState, useCallback, useEffect } from 'react';
import { generateStoryboardAndImages, generateImageForScene } from '../services/geminiService';
import { StoryboardResult, Scene } from '../types';
import InputForm from './InputForm';
import ResultsDisplay from './ResultsDisplay';
import ImageModal from './ImageModal';
import { fileToBase64 } from '../utils/fileUtils';
import * as spinnerLoaders from 'react-loader-spinner';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';

const Dna = (spinnerLoaders as any).Dna;

interface StoryboardGeneratorProps {
  initialIdea?: string;
  initialImage?: string | null;
  onInitialDataUsed: () => void;
}

const StoryboardGenerator: React.FC<StoryboardGeneratorProps> = ({ initialIdea, initialImage, onInitialDataUsed }) => {
  const { user, spendCredits } = useUser();
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

  const isProUser = user.plan === 'pro';

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
                const maxImages = isProUser ? 10 : 3;
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
    const maxImages = isProUser ? 10 : 3;
    const currentCount = referenceImages.length;
    const filesToAdd = Array.from(files);

    if (currentCount + filesToAdd.length > maxImages) {
        setError(t('storyboard.generator.errorImageLimit', { maxImages }));
        return;
    }
    try {
        const newImages = await Promise.all(
            filesToAdd.map(async (file) => {
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

    // Credit Check
    let creditCostPerScene = isProUser ? 8 : 10;
    if (!isProUser && isCoherent) {
        creditCostPerScene = 15; // Higher cost for free users with coherence
    }
    const storyboardCost = parsedSceneCount * creditCostPerScene;
    
    const EXTRA_IMAGE_COST = 5;
    let imageCost = 0;
    if (!isProUser && referenceImages.length > 1) {
        imageCost = (referenceImages.length - 1) * EXTRA_IMAGE_COST;
    }
    
    const totalCreditCost = storyboardCost + imageCost;
    
    if (user.credits < totalCreditCost) {
        setError(t('storyboard.generator.errorNotEnoughCredits', { totalCreditCost, userCredits: user.credits }));
        return;
    }

    setIsLoading(true);
    setError(null);
    setStoryboardResult(null);

    try {
      const result = await generateStoryboardAndImages(userInput, parsedDuration, parsedSceneCount, isCoherent, aspectRatio, referenceImages);
      spendCredits(totalCreditCost);
      setStoryboardResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('storyboard.generator.errorUnexpected'));
    } finally {
      setIsLoading(false);
    }
  }, [userInput, duration, sceneCount, isCoherent, aspectRatio, referenceImages, user, spendCredits, isProUser, t]);

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
    
    let creditCost = isProUser ? 8 : 10;
    if (!isProUser && isCoherent) {
        creditCost = 15;
    }

    if (user.credits < creditCost) {
        setError(t('storyboard.generator.errorRegenCredits', { creditCost }));
        return;
    }

    setRegeneratingScenes(prev => new Set(prev).add(index));
    setError(null);

    try {
        const scene = storyboardResult.scenes[index];
        const previousImageUrl = (isCoherent && index > 0) ? storyboardResult.scenes[index - 1].imageUrl : undefined;
        
        const newImageUrl = await generateImageForScene(scene.fullPrompt, previousImageUrl, aspectRatio);
        spendCredits(creditCost);
        
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
    <>
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
          isProUser={isProUser}
        />
      </div>

      {isLoading && (
        <div className="mt-8 flex flex-col items-center justify-center text-center">
          {Dna ? (
            <Dna
              visible={true}
              height="120"
              width="120"
              ariaLabel="dna-loading"
              wrapperStyle={{}}
              wrapperClass="dna-wrapper"
            />
          ) : (
            <div className="p-4 text-lg text-gray-400">{t('common.loading')}</div>
          )}
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
    </>
  );
};

export default StoryboardGenerator;