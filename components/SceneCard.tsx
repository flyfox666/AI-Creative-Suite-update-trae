import React, { useState, useRef } from 'react';
import { Scene } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

interface SceneCardProps {
  scene: Scene;
  imageUrl: string | undefined;
  sceneNumber: number;
  onImageClick: (url: string, sceneNumber: number) => void;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onPromptChange: (newPrompt: string) => void;
  onReferenceImageUpload: (file: File) => void;
}

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

const RegenerateIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 15M20 20l-1.5-1.5A9 9 0 003.5 9" />
    </svg>
);

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);


const SceneCard: React.FC<SceneCardProps> = ({ scene, imageUrl, sceneNumber, onImageClick, isRegenerating, onRegenerate, onPromptChange, onReferenceImageUpload }) => {
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocalization();

  const handleCopy = () => {
    navigator.clipboard.writeText(scene.fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onReferenceImageUpload(file);
    }
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-md rounded-xl overflow-hidden shadow-lg border border-gray-700 transition-all duration-300 hover:shadow-purple-500/20 hover:border-purple-600 flex flex-col">
      <div 
        className="relative w-full h-48 bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => !isRegenerating && imageUrl && onImageClick(imageUrl, sceneNumber)}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={`Scene ${sceneNumber}: ${scene.title}`} 
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full animate-pulse bg-gray-700 flex items-center justify-center text-gray-500">
            {t('storyboard.results.generatingImage')}
          </div>
        )}
        {isRegenerating && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                <div className="w-8 h-8 border-4 border-gray-500 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h4 className="text-lg font-bold text-gray-100">{t('storyboard.results.sceneTitle', { sceneNumber, title: scene.title })}</h4>
        <div className="flex items-center gap-2 mt-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/*"
                disabled={isRegenerating}
            />
            <div className="relative group flex items-center">
                <button
                  onClick={handleUploadClick}
                  className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50"
                  aria-label="Upload reference image"
                  disabled={isRegenerating}
                >
                  <UploadIcon className="w-4 h-4"/>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t('storyboard.results.uploadReferenceTooltip')}
                </div>
            </div>
            <div className="relative group flex items-center">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50"
                  aria-label={t('storyboard.results.copyPromptTooltip')}
                  disabled={isRegenerating}
                >
                  {copied ? <CheckIcon className="w-4 h-4 text-green-400"/> : <CopyIcon className="w-4 h-4"/>}
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t('storyboard.results.copyPromptTooltip')}
                </div>
            </div>
            <div className="relative group flex items-center">
                <button
                  onClick={onRegenerate}
                  className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50 disabled:animate-pulse"
                  aria-label={t('storyboard.results.regenerateImageTooltip')}
                  disabled={isRegenerating}
                >
                  <RegenerateIcon className="w-4 h-4"/>
                </button>
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t('storyboard.results.regenerateImageTooltip')}
                </div>
            </div>
        </div>
        <div className="mt-2 flex-grow min-h-0 relative">
            <textarea 
                className="text-xs text-gray-300 bg-gray-900/50 p-2 rounded-md h-40 w-full font-mono whitespace-pre-wrap break-words resize-none border-0 focus:ring-1 focus:ring-purple-500 transition-shadow"
                value={scene.fullPrompt}
                onChange={(e) => onPromptChange(e.target.value)}
                disabled={isRegenerating}
                aria-label={`Prompt for Scene ${sceneNumber}`}
            />
        </div>
      </div>
    </div>
  );
};

export default SceneCard;