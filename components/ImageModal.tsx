import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface ImageModalProps {
  imageUrl: string;
  sceneNumber: number;
  onClose: () => void;
}

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CloseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, sceneNumber, onClose }) => {
    const { t } = useLocalization();
    // Stop event propagation to prevent closing modal when clicking on the image/buttons
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    // Determine file extension from the data URL mime type
    const getFileExtension = (dataUrl: string) => {
        const mimeType = dataUrl.match(/data:image\/(.+);/)?.[1];
        return mimeType || 'png'; // default to png
    }

    const fileExtension = getFileExtension(imageUrl);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="relative bg-gray-900 p-4 rounded-lg shadow-2xl max-w-4xl max-h-[90vh] flex flex-col"
                onClick={stopPropagation}
            >
                <img src={imageUrl} alt={`Scene ${sceneNumber}`} className="max-w-full max-h-full object-contain rounded-md" />
                
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors"
                    aria-label={t('storyboard.imageModal.closeAria')}
                >
                    <CloseIcon className="w-6 h-6" />
                </button>
                
                <a
                    href={imageUrl}
                    download={`scene-${sceneNumber}-image.${fileExtension}`}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-transform hover:scale-105"
                    aria-label={t('storyboard.imageModal.downloadAria')}
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span>{t('common.download')}</span>
                </a>
            </div>
        </div>
    );
};

export default ImageModal;