import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { generateSpeech } from '../services/geminiService';
import { decode, pcmToWavBlob } from '../utils/audioUtils';

type Voice = 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir' | 'Vindemiatrix' | 'Gacrux' | 'Schedar' | 'Achernar' | 'Alnilam' | 'Enceladus' | 'Leda' | 'Orus' | 'Pulcherrima' | 'Umbriel' | 'Zubenelgenubi';

interface VoiceSelectorProps {
    selectedVoice: Voice;
    onVoiceChange: (voice: Voice) => void;
    voices: { name: Voice; descriptionKey: string }[];
}

const PlayIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.748 1.295 2.538 0 3.286L7.279 20.99c-1.25.72-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);


const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onVoiceChange, voices }) => {
    const { user, spendCredits } = useUser();
    const { t } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);
    const [auditioningVoice, setAuditioningVoice] = useState<Voice | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isProUser = user.plan === 'pro';

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleAudition = useCallback(async (voiceName: Voice) => {
        if (auditioningVoice) return;
        
        const cost = isProUser ? 0 : 1;
        if(user.credits < cost) {
            setError(t('audioLab.errorPreviewCredits', { cost }));
            setTimeout(() => setError(null), 3000);
            return;
        }

        setAuditioningVoice(voiceName);
        setError(null);
        
        try {
            const base64Audio = await generateSpeech(t('audioLab.auditionText'), voiceName);
            const pcmData = decode(base64Audio);
            const wavBlob = pcmToWavBlob(pcmData, 24000, 1);
            const url = URL.createObjectURL(wavBlob);
            
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => URL.revokeObjectURL(url);
            
            if (cost > 0) {
                spendCredits(cost);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Audition failed.';
            setError(t('audioLab.errorAuditionFailed', { errorMessage }));
            setTimeout(() => setError(null), 3000);
        } finally {
            setAuditioningVoice(null);
        }
    }, [auditioningVoice, isProUser, user.credits, spendCredits, t]);
    
    const handleSelectVoice = (voiceName: Voice) => {
        onVoiceChange(voiceName);
        setIsOpen(false);
    };

    const selectedVoiceDetails = voices.find(v => v.name === selectedVoice);

    return (
        <div ref={wrapperRef} className="relative w-full md:w-2/3 lg:w-1/2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full p-4 rounded-lg border-2 transition-all duration-200 text-left bg-gray-900/50 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 border-gray-600"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div>
                    <p className="font-bold text-white">{selectedVoiceDetails?.name}</p>
                    <p className="text-sm text-gray-400 mt-1">{t('audioLab.voiceDescriptions')[selectedVoiceDetails?.descriptionKey || 'Kore']}</p>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div 
                    className="absolute top-full left-0 mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-20 max-h-60 overflow-y-auto"
                    role="listbox"
                >
                    {voices.map(voice => (
                        <div key={voice.name} className="flex items-center justify-between hover:bg-gray-700/50" role="option" aria-selected={selectedVoice === voice.name}>
                            <div
                                onClick={() => handleSelectVoice(voice.name)}
                                className="flex-grow p-4 cursor-pointer"
                            >
                                <p className={`font-semibold ${selectedVoice === voice.name ? 'text-purple-400' : 'text-white'}`}>{voice.name}</p>
                                <p className="text-sm text-gray-400">{t('audioLab.voiceDescriptions')[voice.descriptionKey]}</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleAudition(voice.name); }}
                                disabled={!!auditioningVoice}
                                aria-label={t('audioLab.auditionButtonAria')}
                                className="p-4 text-gray-400 hover:text-white disabled:opacity-50"
                            >
                                {auditioningVoice === voice.name 
                                    ? <div className="w-5 h-5 border-2 border-gray-500 border-t-purple-400 rounded-full animate-spin"></div>
                                    : <PlayIcon className="w-5 h-5" />
                                }
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="text-red-400 text-xs mt-2 absolute">{error}</p>}
        </div>
    );
}

export default VoiceSelector;