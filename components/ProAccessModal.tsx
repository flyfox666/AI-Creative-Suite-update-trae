

import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';

const ProAccessModal: React.FC = () => {
    const { isProModalOpen, closeProModal, switchToPro } = useUser();
    const { t } = useLocalization();
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    if (!isProModalOpen) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const success = await switchToPro(accessCode);
        if (success) {
            setAccessCode('');
            closeProModal();
        } else {
            setError(t('proModal.error'));
        }
        setIsLoading(false);
    };

    const handleClose = () => {
        setError(null);
        setAccessCode('');
        closeProModal();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            onClick={handleClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="relative bg-gray-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl shadow-purple-500/20 max-w-sm w-full border border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-center text-white mb-2">{t('proModal.title')}</h2>
                <p className="text-center text-gray-400 mb-6">{t('proModal.subtitle')}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="access-code-input" className="sr-only">PRO Access Code</label>
                        <input
                            id="access-code-input"
                            type="text"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder={t('proModal.placeholder')}
                            className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500"
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading || !accessCode.trim()}
                        className="w-full px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {isLoading ? t('proModal.verifying') : t('proModal.button')}
                    </button>
                </form>

                <div className="mt-6 p-4 bg-gray-900 border border-gray-700 rounded-lg text-sm text-center">
                    <p className="text-gray-300">
                        {t('proModal.contact')}
                    </p>
                    <a href="mailto:flyfox666@gmail.com" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                        flyfox666@gmail.com
                    </a>
                </div>

                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 p-2 text-gray-500 hover:text-white transition-colors"
                    aria-label={t('proModal.closeAria')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ProAccessModal;