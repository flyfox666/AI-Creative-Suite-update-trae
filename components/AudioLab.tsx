

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateSpeech, analyzeVoice } from '../services/geminiService';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { Oval } from 'react-loader-spinner';
import { decode, pcmToWavBlob } from '../utils/audioUtils';
import { fileToBase64, blobToBase64 } from '../utils/fileUtils';
import VoiceSelector from './VoiceSelector';

type Voice = 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir' | 'Vindemiatrix' | 'Gacrux' | 'Schedar' | 'Achernar' | 'Alnilam' | 'Enceladus' | 'Leda' | 'Orus' | 'Pulcherrima' | 'Umbriel' | 'Zubenelgenubi';
type AudioLabMode = 'prebuilt' | 'custom';
type RecordingState = 'idle' | 'recording' | 'recorded' | 'error';
type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

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
    const [mode, setMode] = useState<AudioLabMode>('prebuilt');
    const [textInput, setTextInput] = useState('');
    const [selectedVoice, setSelectedVoice] = useState<Voice>('Kore');
    const [customVoiceFile, setCustomVoiceFile] = useState<{url: string, base64: string, mimeType: string} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioResultUrl, setAudioResultUrl] = useState<string | null>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    // Recording state
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [micPermission, setMicPermission] = useState<PermissionState>('prompt');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    
    const isProUser = user.plan === 'pro';

    useEffect(() => {
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'microphone' as PermissionName })
                .then((permissionStatus) => {
                    setMicPermission(permissionStatus.state as PermissionState);
                    permissionStatus.onchange = () => {
                        setMicPermission(permissionStatus.state as PermissionState);
                    };
                })
                .catch(() => {
                    setMicPermission('unavailable');
                });
        } else {
            setMicPermission('unavailable');
        }
    }, []);

    const getCreditCost = useCallback(() => {
        const generationCharCount = textInput.trim().length;
        const costPer100Chars = isProUser ? 0.5 : 1;
        const generationCost = generationCharCount === 0 ? 0 : Math.max(1, Math.ceil((generationCharCount / 100) * costPer100Chars));

        if (mode === 'custom') {
            const analysisCost = isProUser ? 50 : 100;
            return analysisCost + generationCost;
        } else {
            return generationCost > 0 ? generationCost : 1; // Minimum 1 credit to generate
        }
    }, [textInput, isProUser, mode]);

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
    
    const handleCustomVoiceFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setError(null);
            setRecordedAudioUrl(null);
            setRecordingState('idle');
            try {
                const { base64, mimeType } = await fileToBase64(selectedFile);
                const url = URL.createObjectURL(selectedFile);
                setCustomVoiceFile({ url, base64, mimeType });
            } catch (err) {
                setError(t('mediaAnalyzer.errorProcess'));
            }
        }
    };
    
    const handleGenerate = async () => {
        if (!textInput.trim()) {
            setError(t('audioLab.errorEmptyText'));
            return;
        }

        const cost = getCreditCost();
        if (user.credits < cost) {
            setError(t('audioLab.errorCredits', { cost, userCredits: user.credits }));
            return;
        }

        setIsLoading(true);
        setError(null);
        setAudioResultUrl(null);

        try {
            let base64Audio;
            if (mode === 'custom') {
                if (!customVoiceFile) {
                    throw new Error(t('audioLab.errorNoCustomVoiceFile'));
                }
                const voiceDescription = await analyzeVoice(customVoiceFile.base64, customVoiceFile.mimeType);
                base64Audio = await generateSpeech(textInput, 'Kore', voiceDescription);
            } else {
                base64Audio = await generateSpeech(textInput, selectedVoice);
            }

            const pcmData = decode(base64Audio);
            const wavBlob = pcmToWavBlob(pcmData, 24000, 1);
            const url = URL.createObjectURL(wavBlob);
            setAudioResultUrl(url);
            spendCredits(cost);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Recording Handlers ---
    const startRecording = async () => {
        setError(null);
        setCustomVoiceFile(null);
        setRecordingState('recording');
        audioChunksRef.current = [];
        setRecordingSeconds(0);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Find a supported mimeType to improve compatibility
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/ogg;codecs=opus',
                'audio/webm',
                'audio/mp4',
            ];
            const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

            const options = supportedMimeType ? { mimeType: supportedMimeType } : {};
            
            mediaRecorderRef.current = new MediaRecorder(stream, options);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorderRef.current.onstop = () => {
                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    setRecordedAudioUrl(audioUrl);
                }
                stream.getTracks().forEach(track => track.stop()); // Release microphone
            };

            mediaRecorderRef.current.start();
            timerRef.current = window.setInterval(() => {
                setRecordingSeconds(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError(t('audioLab.errorMicrophone'));
            setRecordingState('idle');
            if (timerRef.current) {
                 clearInterval(timerRef.current);
                 timerRef.current = null;
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setRecordingState('recorded');
        if (timerRef.current) clearInterval(timerRef.current);
    };
    
    const handleUseRecording = async () => {
        if (!recordedAudioUrl) return;
        try {
            const blob = await fetch(recordedAudioUrl).then(r => r.blob());
            const { base64, mimeType } = await blobToBase64(blob);
            setCustomVoiceFile({ url: recordedAudioUrl, base64, mimeType });
        } catch(err) {
            setError('Failed to process recording.');
        }
    };
    
    const handleRecordAgain = () => {
        setRecordingState('idle');
        setRecordedAudioUrl(null);
        setRecordingSeconds(0);
        if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    };
    
    const clearCustomVoice = () => {
        setCustomVoiceFile(null);
        handleRecordAgain();
    };


    const renderCustomVoiceUI = () => (
        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">{t('audioLab.customVoiceTitle')}</h3>
            <p className="text-sm text-gray-400 mt-1">{t('audioLab.customVoiceDescription')}</p>

            {/* --- Recording Section --- */}
            <fieldset disabled={isLoading || !!customVoiceFile} className="disabled:opacity-50">
                <h4 className="font-semibold text-gray-300">{t('audioLab.recordVoiceTitle')}</h4>
                <p className="text-xs text-gray-400 mb-3">{t('audioLab.recordVoiceDescription')}</p>
                {micPermission === 'denied' ? (
                     <div className="p-3 bg-yellow-900/50 border border-yellow-700 text-yellow-300 rounded-lg text-sm">
                        <p className="font-bold">{t('audioLab.micPermissionDeniedTitle')}</p>
                        <p>{t('audioLab.micPermissionDeniedDescription')}</p>
                    </div>
                ) : (
                    <>
                         {recordingState === 'idle' && (
                            <button onClick={startRecording} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                                {t('audioLab.startRecordingButton')}
                            </button>
                        )}
                        {recordingState === 'recording' && (
                            <div className="flex items-center gap-4">
                                <button onClick={stopRecording} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                                     {t('audioLab.stopRecordingButton')}
                                </button>
                                 <div className="flex items-center gap-2 text-red-400">
                                     <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <span>{t('audioLab.recordingStatus')} {recordingSeconds}s</span>
                                </div>
                            </div>
                        )}
                        {recordingState === 'recorded' && recordedAudioUrl && (
                             <div>
                                <h5 className="font-semibold text-gray-300 text-sm mb-2">{t('audioLab.reviewRecordingTitle')}</h5>
                                <audio src={recordedAudioUrl} controls className="max-w-xs mb-3"></audio>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleUseRecording} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">{t('audioLab.useRecordingButton')}</button>
                                    <button onClick={handleRecordAgain} className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors">{t('audioLab.recordAgainButton')}</button>
                                </div>
                             </div>
                        )}
                    </>
                )}
            </fieldset>
            
            <div className="flex items-center">
                <hr className="flex-grow border-gray-600" />
                <span className="px-4 text-gray-500 text-sm">{t('audioLab.orSeparator')}</span>
                <hr className="flex-grow border-gray-600" />
            </div>

            {/* --- Upload Section --- */}
            <fieldset disabled={isLoading || recordingState !== 'idle'} className="disabled:opacity-50">
                 <label htmlFor="audio-upload" className="font-semibold text-gray-300">{t('audioLab.uploadAudioLabel')}</label>
                 <input 
                    type="file" 
                    id="audio-upload"
                    onChange={handleCustomVoiceFileChange}
                    accept="audio/*"
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/40 mt-2"
                />
            </fieldset>

            {customVoiceFile && (
                <div className="flex items-center gap-4 pt-2">
                    <audio src={customVoiceFile.url} controls className="max-w-xs"></audio>
                    <button onClick={clearCustomVoice} className="px-3 py-1.5 text-xs font-semibold text-red-300 bg-red-900/50 rounded-lg hover:bg-red-900/80">Clear</button>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">{t('audioLab.title')}</h2>
                <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">{t('audioLab.subtitle')}</p>
            </div>
        
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-6 border border-gray-700 space-y-6">
                <div className="flex justify-center mb-6 border-b border-gray-700">
                    <button onClick={() => setMode('prebuilt')} className={`px-6 py-2 font-medium border-b-2 transition-colors ${mode === 'prebuilt' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('audioLab.prebuiltVoicesTab')}</button>
                    <button onClick={() => setMode('custom')} className={`px-6 py-2 font-medium border-b-2 transition-colors ${mode === 'custom' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('audioLab.customVoiceTab')}</button>
                </div>
                
                {mode === 'prebuilt' && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">{t('audioLab.voicesTitle')}</h3>
                        <VoiceSelector
                            voices={VOICES}
                            selectedVoice={selectedVoice}
                            onVoiceChange={setSelectedVoice}
                        />
                    </div>
                )}

                {mode === 'custom' && renderCustomVoiceUI()}

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
                        disabled={isLoading || !textInput.trim() || (mode === 'custom' && !customVoiceFile)}
                        className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                    >
                        {isLoading ? t('audioLab.generatingButton') : t('audioLab.generateButton', { cost: getCreditCost() })}
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

            {audioResultUrl && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold text-gray-200 mb-4">{t('audioLab.resultTitle')}</h3>
                    <audio controls src={audioResultUrl} className="w-full">
                        Your browser does not support the audio element.
                    </audio>
                     <div className="mt-4">
                        <a
                            href={audioResultUrl}
                            download={`ai-audio-${mode === 'custom' ? 'custom' : selectedVoice}.wav`}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t('common.download')} (.wav)
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioLab;