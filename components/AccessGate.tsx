
import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

const ACCESS_CODE = 'gemini-creative';

const AccessGate: React.FC<{ onAuthenticate: () => void }> = ({ onAuthenticate }) => {
    const { t } = useLocalization();
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        setTimeout(() => {
            if (code.trim().toLowerCase() === ACCESS_CODE) {
                onAuthenticate();
            } else {
                setError(t('accessGate.error'));
                setIsLoading(false);
            }
        }, 500);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-8 border border-gray-700">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">
                        {t('accessGate.title')}
                    </h1>
                    <p className="mt-2 text-gray-400">
                        {t('accessGate.subtitle')}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="access-code" className="sr-only">{t('accessGate.placeholder')}</label>
                        <input
                            id="access-code"
                            name="access-code"
                            type="password"
                            autoComplete="off"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500"
                            placeholder={t('accessGate.placeholder')}
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 text-center">{error}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                        >
                            {isLoading ? t('accessGate.verifying') : t('accessGate.button')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccessGate;
