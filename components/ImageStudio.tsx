import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateImage, editImage, combineImages as combineImagesService } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';

// --- Type Definitions ---
type ImagePayload = { url: string; base64: string; mimeType: string };

type GenerationContext = {
  prompt: string;
  images: ImagePayload[];
  mode: 'generate' | 'edit' | 'combine';
};

type ChatMessage = {
  id: number;
  sender: 'user' | 'ai' | 'system';
  text?: string;
  images?: ImagePayload[];
  isError?: boolean;
  generationContext?: GenerationContext;
};


// --- Prop Definitions ---
interface ImageStudioProps {
  onUseImage: (imageUrl: string) => void;
}

// --- Icon Components ---
const SendIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);
const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
    </svg>
);
const CloseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.033-2.134H8.71c-1.123 0-2.033.954-2.033 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const RegenerateIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 15M20 20l-1.5-1.5A9 9 0 003.5 9" />
    </svg>
);
const EditIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);


// --- Main Component ---
const ImageStudio: React.FC<ImageStudioProps> = ({ onUseImage }) => {
  const { user, spendCredits } = useUser();
  const { t } = useLocalization();
  const isProUser = user.plan === 'pro';

  const getInitialMessage = useCallback((): ChatMessage => {
      const costs = t('imageStudio.cost', {}) as any;
      return {
          id: 0,
          sender: 'system',
          text: t('imageStudio.introMessage', {
              gen_free: costs.generate.free,
              gen_pro: costs.generate.pro,
              edit_free: costs.edit.free,
              edit_pro: costs.edit.pro,
              combine_free: costs.combine.free,
              combine_pro: costs.combine.pro,
          })
      };
  }, [t]);

  const [messages, setMessages] = useState<ChatMessage[]>([getInitialMessage()]);
  const [stagedImages, setStagedImages] = useState<ImagePayload[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // When locale changes, update the initial system message
  useEffect(() => {
    setMessages(currentMessages => {
        if (currentMessages.length > 0 && currentMessages[0].id === 0) {
            const newMessages = [...currentMessages];
            newMessages[0] = getInitialMessage();
            return newMessages;
        }
        return currentMessages;
    });
  }, [getInitialMessage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  const addErrorMessage = useCallback((message: string) => {
     const errorMsg: ChatMessage = {
        id: Date.now(),
        sender: 'system',
        text: `${t('common.error')}: ${message}`,
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
  }, [t]);

  const handleClearChat = () => {
    setMessages([getInitialMessage()]);
    setStagedImages([]);
    setPrompt('');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const maxImages = isProUser ? 10 : 3;
    if (stagedImages.length + files.length > maxImages) {
      addErrorMessage(t('imageStudio.errorImageLimit', { max: maxImages }));
      event.target.value = '';
      return;
    }

    try {
      const newImages = await Promise.all(
        Array.from(files).map(async (file: File) => {
          const { base64, mimeType } = await fileToBase64(file);
          const url = `data:${mimeType};base64,${base64}`;
          return { url, base64, mimeType };
        })
      );
      setStagedImages(prev => [...prev, ...newImages]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('imageStudio.errorFileProcess');
      addErrorMessage(errorMessage);
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveStagedImage = (urlToRemove: string) => {
    setStagedImages(prev => prev.filter(img => img.url !== urlToRemove));
  };

  const handleSend = async () => {
    if (!prompt.trim() && stagedImages.length === 0) return;

    if (stagedImages.length > 0 && !prompt.trim()) {
        addErrorMessage(t('imageStudio.errorNoPromptForImages'));
        return;
    }

    const mode = stagedImages.length === 0 ? 'generate' : stagedImages.length === 1 ? 'edit' : 'combine';
    const costs = t('imageStudio.cost', {}) as any;
    const creditCost = isProUser ? costs[mode].pro : costs[mode].free;

    if (user.credits < creditCost) {
        addErrorMessage(t('imageStudio.errorCredits', { cost: creditCost, userCredits: user.credits }));
        return;
    }

    setIsLoading(true);
    
    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: prompt,
      images: stagedImages,
    };
    setMessages(prev => [...prev, userMessage]);
    
    const currentPrompt = prompt;
    const currentImages = stagedImages;
    
    setPrompt('');
    setStagedImages([]);
    
    try {
      let resultUrl: string;
      if (mode === 'generate') {
        resultUrl = await generateImage(currentPrompt);
      } else if (mode === 'edit') {
        resultUrl = await editImage(currentImages[0].base64, currentImages[0].mimeType, currentPrompt);
      } else { // combine
        const combined = await combineImagesService(currentImages, currentPrompt);
        resultUrl = `data:${combined.mimeType};base64,${combined.base64}`;
      }
      
      const match = resultUrl.match(/^data:(image\/.+);base64,(.+)$/);
      if (!match) throw new Error("Generated image data is invalid.");
      
      const resultImage: ImagePayload = {
          url: resultUrl,
          mimeType: match[1],
          base64: match[2]
      };
      
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        images: [resultImage],
        generationContext: {
            prompt: currentPrompt,
            images: currentImages,
            mode,
        }
      };
      setMessages(prev => [...prev, aiMessage]);
      spendCredits(creditCost);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      addErrorMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };
  
  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const fileExtension = imageUrl.match(/data:image\/(.+);/)?.[1] || 'png';
    link.download = `ai-studio-image.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleRegenerate = async (context: GenerationContext) => {
    if (isLoading) return;

    const { mode, prompt: regenPrompt, images: regenImages } = context;
    const costs = t('imageStudio.cost', {}) as any;
    const creditCost = isProUser ? costs[mode].pro : costs[mode].free;

    if (user.credits < creditCost) {
        addErrorMessage(t('imageStudio.errorCredits', { cost: creditCost, userCredits: user.credits }));
        return;
    }

    setIsLoading(true);

    try {
        let resultUrl: string;
        if (mode === 'generate') {
            resultUrl = await generateImage(regenPrompt);
        } else if (mode === 'edit') {
            resultUrl = await editImage(regenImages[0].base64, regenImages[0].mimeType, regenPrompt);
        } else { // combine
            const combined = await combineImagesService(regenImages, regenPrompt);
            resultUrl = `data:${combined.mimeType};base64,${combined.base64}`;
        }

        const match = resultUrl.match(/^data:(image\/.+);base64,(.+)$/);
        if (!match) throw new Error("Generated image data is invalid.");

        const resultImage: ImagePayload = {
            url: resultUrl,
            mimeType: match[1],
            base64: match[2]
        };

        const aiMessage: ChatMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            images: [resultImage],
            generationContext: context, // Carry over the same context
        };
        setMessages(prev => [...prev, aiMessage]);
        spendCredits(creditCost);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        addErrorMessage(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const handleEditAgain = (imageToEdit: ImagePayload) => {
      if (isLoading) return;
      setStagedImages([imageToEdit]);
      promptInputRef.current?.focus();
  };
  

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 border border-gray-700 flex flex-col h-[75vh]">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-200">{t('tabs.image')}</h3>
          <div className="relative group">
              <button
                  onClick={handleClearChat}
                  className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  aria-label={t('imageStudio.clearChatTooltip')}
              >
                  <TrashIcon className="w-5 h-5" />
              </button>
              <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t('imageStudio.clearChatTooltip')}
              </div>
          </div>
      </div>
        
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
             {msg.sender !== 'user' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex-shrink-0"></div>}
             <div className={`w-full max-w-lg space-y-2 ${msg.sender === 'user' ? 'text-right' : ''}`}>
               {msg.sender !== 'system' && <p className="text-xs font-bold text-gray-400">{msg.sender === 'user' ? t('imageStudio.userLabel') : t('imageStudio.aiLabel')}</p>}
               {msg.text && (
                 <div className={`p-4 rounded-xl ${
                    msg.sender === 'user' ? 'bg-purple-600 text-white' : 
                    msg.isError ? 'bg-red-900/50 text-red-300 border border-red-700' :
                    'bg-gray-700/80 text-gray-200'
                  }`}>
                    <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                 </div>
               )}
               {msg.images && msg.images.length > 0 && (
                 <div className={`grid gap-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {msg.images.map(img => (
                        <img key={img.url} src={img.url} alt="Content" className="rounded-lg shadow-md max-w-full" />
                    ))}
                 </div>
               )}
                {msg.sender === 'ai' && msg.images && msg.images.length > 0 && (
                    <div className="flex justify-start flex-wrap gap-2 pt-2">
                        <button onClick={() => onUseImage(msg.images![0].url)} className="flex items-center px-3 py-1.5 text-xs font-semibold bg-green-600/30 text-green-300 rounded-md hover:bg-green-600/50 transition-colors">{t('imageStudio.useInStoryboardButton')}</button>
                        <button onClick={() => handleDownload(msg.images![0].url)} className="flex items-center px-3 py-1.5 text-xs font-semibold bg-gray-600/50 text-gray-300 rounded-md hover:bg-gray-600 transition-colors">{t('common.download')}</button>
                        {msg.generationContext && (
                            <button onClick={() => handleRegenerate(msg.generationContext!)} disabled={isLoading} className="flex items-center px-3 py-1.5 text-xs font-semibold bg-blue-600/30 text-blue-300 rounded-md hover:bg-blue-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <RegenerateIcon className="w-3.5 h-3.5 mr-1.5" />
                                {t('imageStudio.regenerateButton')}
                            </button>
                        )}
                        <button onClick={() => handleEditAgain(msg.images![0])} disabled={isLoading} className="flex items-center px-3 py-1.5 text-xs font-semibold bg-yellow-600/30 text-yellow-300 rounded-md hover:bg-yellow-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <EditIcon className="w-3.5 h-3.5 mr-1.5" />
                            {t('imageStudio.editButton')}
                        </button>
                    </div>
                )}
             </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-3 justify-start">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex-shrink-0"></div>
                 <div className="p-4 rounded-xl bg-gray-700/80 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                 </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/30">
        {stagedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
                {stagedImages.map(img => (
                    <div key={img.url} className="relative group w-16 h-16">
                        <img src={img.url} alt="Staged" className="w-full h-full object-cover rounded-md" />
                        <button 
                            onClick={() => handleRemoveStagedImage(img.url)}
                            className="absolute -top-1 -right-1 p-1 rounded-full bg-gray-900 hover:bg-red-500 text-white transition-all opacity-50 group-hover:opacity-100"
                            aria-label={t('imageStudio.removeImageAria')}
                        >
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}
        <div className="relative flex items-center">
            <textarea
                ref={promptInputRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('imageStudio.placeholder')}
                rows={1}
                className="w-full p-3 pr-24 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500 resize-none"
                disabled={isLoading}
            />
            <div className="absolute right-2 flex items-center gap-1">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    disabled={isLoading}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50"
                    aria-label={t('imageStudio.uploadButtonAria')}
                >
                    <UploadIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={handleSend}
                    disabled={isLoading || (!prompt.trim() && stagedImages.length === 0)}
                    className="p-2 rounded-full text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50"
                    aria-label={t('imageStudio.sendButtonAria')}
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;