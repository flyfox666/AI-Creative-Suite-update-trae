

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { generateSpeech } from '../services/geminiService';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { Oval } from 'react-loader-spinner';
import { decode, pcmToWavBlob } from '../utils/audioUtils';
import VoiceSelector from './VoiceSelector';

type Voice = 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir' | 'Vindemiatrix' | 'Gacrux' | 'Schedar' | 'Achernar' | 'Alnilam' | 'Enceladus' | 'Leda' | 'Orus' | 'Pulcherrima' | 'Umbriel' | 'Zubenelgenubi';

const VOICES: { name: Voice; descriptionKey: string }[] = [
    { name: 'Kore', descriptionKey: 'Kore' },
    { name: 'Puck', descriptionKey: 'Puck' },
    { name: 'Zephyr', descriptionKey: 'Zephyr' },
    { name: 'Charon', descriptionKey: 'Charon' },
    { name: 'Fenrir', descriptionKey: 'Fenrir' },
    { name: 'Vindemiatrix', descriptionKey: 'Vindemiatrix' },
    { name: 'Gacrux', descriptionKey: 'Gacrux' },
    { name: 'Schedar', descriptionKey: 'Schedar' },
    { name: 'Achernar', descriptionKey: 'Achernar' },
    { name: 'Alnilam', descriptionKey: 'Alnilam' },
    { name: 'Enceladus', descriptionKey: 'Enceladus' },
    { name: 'Leda', descriptionKey: 'Leda' },
    { name: 'Orus', descriptionKey: 'Orus' },
    { name: 'Pulcherrima', descriptionKey: 'Pulcherrima' },
    { name: 'Umbriel', descriptionKey: 'Umbriel' },
    { name: 'Zubenelgenubi', descriptionKey: 'Zubenelgenubi' },
];

const INSPIRATION_CUES = [
    '(laughs)',
    '(sighs)',
    'Say cheerfully: ',
    'Say sadly: ',
    '(whispering) '
];

const AudioLab: React.FC = () => {
    const { user, spendCredits } = useUser();
    const { t } = useLocalization();
    const [textInput, setTextInput] = useState('');
    const [selectedVoice, setSelectedVoice] = useState<Voice>('Kore');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioResultUrl, setAudioResultUrl] = useState<string | null>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    const isProUser = user.plan === 'pro';
    
    const getCharBasedCost = useCallback(() => {
        const charCount = textInput.trim().length;
        if (charCount === 0) return 0;
        const costPer100Chars = isProUser ? 0.5 : 1;
        return Math.max(1, Math.ceil((charCount / 100) * costPer100Chars));
    }, [textInput, isProUser]);

    const totalGenerationCost = useMemo(() => {
        return getCharBasedCost();
    }, [getCharBasedCost]);

    const handleCueClick = (cue: string) => {
        const textarea = textInputRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + cue + text.substring(end);
        
        setTextInput(newText);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + cue.length;
    };
    
    const handleGenerate = async () => {
        if (!textInput.trim()) {
            setError(t('audioLab.errorEmptyText'));
            return;
        }

        const cost = totalGenerationCost;
        if (user.credits < cost) {
            setError(t('audioLab.errorCredits', { cost, userCredits: user.credits }));
            return;
        }

        setIsLoading(true);
        setError(null);
        setAudioResultUrl(null);

        try {
            const base64Audio = await generateSpeech(textInput, selectedVoice);
            const pcmData = decode(base64Audio);
            const audioBlob = pcmToWavBlob(pcmData, 24000, 1); // The TTS model returns 24000Hz, 1-channel audio
            const url = URL.createObjectURL(audioBlob);
            setAudioResultUrl(url);
            spendCredits(cost);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const generateButtonText = () => {
        if (isLoading) return t('audioLab.generatingButton');
        const cost = totalGenerationCost;
        return t('audioLab.generateButton', { cost });
    };
    
    const isGenerateDisabled = () => {
        if (isLoading) return true;
        if (!textInput.trim()) return true;
        return false;
    };

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">{t('audioLab.title')}</h2>
                <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">{t('audioLab.subtitle')}</p>
            </div>
        
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-6 border border-gray-700 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-3">{t('audioLab.voicesTitle')}</h3>
                    <VoiceSelector
                        voices={VOICES}
                        selectedVoice={selectedVoice}
                        onVoiceChange={setSelectedVoice}
                    />
                </div>

                {/* Text Input */}
                <div>
                     <textarea
                        ref={textInputRef}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={t('audioLab.placeholder')}
                        className="w-full h-40 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500 resize-none text-base"
                        disabled={isLoading}
                     />
                </div>

                {/* Inspiration Cues */}
                <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">{t('audioLab.inspirationTitle')}</h4>
                    <div className="flex flex-wrap gap-2">
                        {INSPIRATION_CUES.map(cue => (
                             <button 
                                key={cue}
                                onClick={() => handleCueClick(cue)}
                                className="px-3 py-1 text-xs font-mono bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 hover:text-white transition-colors"
                             >
                                {cue.trim()}
                             </button>
                        ))}
                    </div>
                </div>

                {/* Generate Button */}
                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerateDisabled()}
                        className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                    >
                        {generateButtonText()}
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center gap-4 text-lg text-gray-300">
                    <Oval height="40" width="40" color="#a855f7" secondaryColor="#67e8f9" strokeWidth={3} />
                    <span>{t('audioLab.generatingButton')}</span>
                </div>
            )}

            {error && (
                <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                    <strong className="font-bold">{t('common.error')}: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className={`bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-700`}>
                <h3 className="text-xl font-bold text-gray-200 mb-4">{t('audioLab.resultTitle')}</h3>
                {audioResultUrl ? (
                    <div className="space-y-4">
                        <audio src={audioResultUrl} controls className="w-full" />
                        <a 
                            href={audioResultUrl} 
                            download="generated-audio.wav"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t('common.download')} (.wav)
                        </a>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                         <p>{t('audioLab.noContent', { defaultValue: 'Audio generation content will appear here.' })}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioLab;