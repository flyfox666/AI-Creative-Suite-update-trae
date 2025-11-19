
import React, { useState } from 'react';
import CodeBlock from './CodeBlock';
import SceneCard from './SceneCard';
import { StoryboardResult } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

declare var JSZip: any;

interface ResultsDisplayProps {
  result: StoryboardResult;
  onImageClick: (url: string, sceneNumber: number) => void;
  regeneratingScenes: Set<number>;
  onRegenerateImage: (index: number) => void;
  onScenePromptChange: (index: number, newFullPrompt: string) => void;
  onReferenceImageUpload: (index: number, file: File) => void;
}

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onImageClick, regeneratingScenes, onRegenerateImage, onScenePromptChange, onReferenceImageUpload }) => {
  const { t } = useLocalization();
  const [finalPromptCopied, setFinalPromptCopied] = useState(false);
  
  
  const handleFinalPromptCopy = () => {
    if (!result?.copyReadyPrompt) return;
    navigator.clipboard.writeText(result.copyReadyPrompt);
    setFinalPromptCopied(true);
    setTimeout(() => setFinalPromptCopied(false), 2000);
  };
  
  const handleDownloadAll = async () => {
    if (!result || typeof JSZip === 'undefined') {
        console.error("Result data is not available or JSZip is not loaded.");
        return;
    }
    
    // no credits deduction

    const zip = new JSZip();
    zip.file("prompt.txt", result.copyReadyPrompt);
    const imgFolder = zip.folder("scenes");

    if (imgFolder) {
        const imagePromises = result.scenes.map(async (scene, index) => {
            if (scene.imageUrl) {
                try {
                    const response = await fetch(scene.imageUrl);
                    const blob = await response.blob();
                    const fileExtension = blob.type.split('/')[1] || 'png';
                    imgFolder.file(`scene_${index + 1}.${fileExtension}`, blob);
                } catch (e) {
                    console.error(`Failed to fetch image for scene ${index+1}`, e);
                }
            }
        });
        await Promise.all(imagePromises);
    }
    
    zip.generateAsync({ type: "blob" }).then((content: any) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "storyboard.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">{t('storyboard.results.framesTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.scenes.map((scene, index) => (
                <SceneCard 
                    key={index}
                    scene={scene}
                    imageUrl={scene.imageUrl}
                    sceneNumber={index + 1}
                    onImageClick={onImageClick}
                    isRegenerating={regeneratingScenes.has(index)}
                    onRegenerate={() => onRegenerateImage(index)}
                    onPromptChange={(newPrompt) => onScenePromptChange(index, newPrompt)}
                    onReferenceImageUpload={(file) => onReferenceImageUpload(index, file)}
                />
            ))}
        </div>
      </div>

      {result.copyReadyPrompt && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-2xl font-bold text-gray-200">{t('storyboard.results.finalPromptTitle')}</h3>
            <div className="relative group">
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-md hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:hover:from-purple-600 disabled:hover:to-cyan-600"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>{t('storyboard.results.downloadButtonPro')}</span>
              </button>
              
            </div>
          </div>
          <div className="mb-3">
             <button
              onClick={handleFinalPromptCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
             >
                {finalPromptCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                <span>{finalPromptCopied ? t('common.copied') : t('common.copyPrompt')}</span>
             </button>
          </div>
          <CodeBlock content={result.copyReadyPrompt} />
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;