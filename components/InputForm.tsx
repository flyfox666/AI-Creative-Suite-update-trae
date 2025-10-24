import React from 'react';
import ProBadge from './ProBadge';
import { useLocalization } from '../contexts/LocalizationContext';

interface InputFormProps {
  userInput: string;
  setUserInput: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  sceneCount: string;
  setSceneCount: (value: string) => void;
  isCoherent: boolean;
  setIsCoherent: (value: boolean) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  referenceImages: { url: string }[];
  onReferenceImageAdd: (files: FileList) => void;
  onReferenceImageRemove: (url: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isProUser: boolean;
}

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const CloseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);


const InputForm: React.FC<InputFormProps> = ({
  userInput,
  setUserInput,
  duration,
  setDuration,
  sceneCount,
  setSceneCount,
  isCoherent,
  setIsCoherent,
  aspectRatio,
  setAspectRatio,
  referenceImages,
  onReferenceImageAdd,
  onReferenceImageRemove,
  onSubmit,
  isLoading,
  isProUser
}) => {
  const { t } = useLocalization();
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      onSubmit();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onReferenceImageAdd(files);
      event.target.value = ''; // Allow re-uploading the same file
    }
  };

  const maxScenes = isProUser ? 10 : 3;
  const maxImages = isProUser ? 10 : 3;
  const canUploadMore = referenceImages.length < maxImages;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
            <div>
              <label htmlFor="idea-input" className="block text-lg font-medium text-gray-300">
                {t('storyboard.form.ideaLabel')}
              </label>
              <textarea
                id="idea-input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('storyboard.form.ideaPlaceholder')}
                className="mt-1 w-full h-32 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500 resize-none"
                disabled={isLoading}
              />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration-input" className="block text-sm font-medium text-gray-400">
                  {t('storyboard.form.durationLabel')}
                </label>
                <input
                  type="number"
                  id="duration-input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="25"
                  className="mt-1 w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-200"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="scenes-input" className="block text-sm font-medium text-gray-400">
                  {t('storyboard.form.scenesLabel', { maxScenes })}
                </label>
                <input
                  type="number"
                  id="scenes-input"
                  value={sceneCount}
                  onChange={(e) => setSceneCount(e.target.value)}
                  min="1"
                  max={maxScenes}
                  className="mt-1 w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-200"
                  disabled={isLoading}
                />
              </div>
            </div>
        </div>

        <div>
            <label className="block text-lg font-medium text-gray-300">
                {t('storyboard.form.referenceImageLabel')}
            </label>
            <p className="text-sm text-gray-500 mb-1">{t('storyboard.form.referenceImageHint')}</p>
            {!isProUser && <p className="text-xs text-yellow-400 mb-2">{t('storyboard.form.referenceImageCostHint')}</p>}
            <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {referenceImages.map((image) => (
                        <div key={image.url} className="relative group aspect-w-16 aspect-h-9">
                            <img src={image.url} alt="Reference preview" className="rounded-lg w-full h-full object-cover bg-gray-900/50" />
                            <button 
                                onClick={() => onReferenceImageRemove(image.url)}
                                className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all opacity-0 group-hover:opacity-100"
                                aria-label={t('storyboard.form.removeImageAria')}
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                {canUploadMore && (
                    <label htmlFor="file-upload" className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md cursor-pointer hover:border-purple-500 transition-colors duration-200">
                        <div className="space-y-1 text-center">
                            <UploadIcon className="mx-auto h-12 w-12 text-gray-500"/>
                            <div className="flex justify-center text-sm text-gray-500">
                                <span className="font-medium text-purple-400">
                                    {t('storyboard.form.uploadImageLabel')}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">{t('storyboard.form.uploadHint')}</p>
                        </div>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" multiple />
                    </label>
                )}
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 pt-2">
        <div className="relative group">
            <div className="flex items-center gap-2">
                <label htmlFor="coherence-toggle" className="block text-sm font-medium text-gray-400">
                  {t('storyboard.form.coherenceLabel')}
                </label>
                {isProUser ? <ProBadge /> : <span className="text-xs font-bold text-yellow-400">{t('storyboard.form.coherenceCost')}</span>}
            </div>
            <p className="text-xs text-gray-500 mb-2">{t('storyboard.form.coherenceHint')}</p>
            <button
              type="button"
              onClick={() => setIsCoherent(!isCoherent)}
              className={`${isCoherent ? 'bg-purple-600' : 'bg-gray-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
              role="switch"
              aria-checked={isCoherent}
              disabled={isLoading}
            >
              <span
                aria-hidden="true"
                className={`${isCoherent ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
            <div className="absolute top-full left-0 mt-2 w-max px-3 py-2 bg-gray-900 border border-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                {isProUser
                ? t('storyboard.form.coherenceTooltipPro')
                : t('storyboard.form.coherenceTooltipFree')
                }
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-400">
              {t('storyboard.form.aspectRatioLabel')}
            </label>
            <p className="text-xs text-gray-500 mb-2">{t('storyboard.form.aspectRatioHint')}</p>
            <div className="flex rounded-md shadow-sm">
              <button type="button" onClick={() => setAspectRatio('16:9')} disabled={isLoading} className={`relative inline-flex items-center justify-center px-4 py-1.5 rounded-l-md border border-gray-600 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors ${ aspectRatio === '16:9' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700' }`}>
                {t('storyboard.form.aspectRatioLandscape')}
              </button>
              <button type="button" onClick={() => setAspectRatio('9:16')} disabled={isLoading} className={`-ml-px relative inline-flex items-center justify-center px-4 py-1.5 rounded-r-md border border-gray-600 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors ${ aspectRatio === '9:16' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700' }`}>
                {t('storyboard.form.aspectRatioPortrait')}
              </button>
            </div>
        </div>
      </div>

      <div className="flex justify-end items-center pt-2">
        <p className="text-xs text-gray-500 mr-4">{t('storyboard.form.submitHint')}</p>
        <button
          onClick={onSubmit}
          disabled={isLoading || !userInput.trim()}
          className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
        >
          {isLoading ? t('storyboard.form.generatingButton') : t('storyboard.form.generateButton')}
        </button>
      </div>
    </div>
  );
};

export default InputForm;