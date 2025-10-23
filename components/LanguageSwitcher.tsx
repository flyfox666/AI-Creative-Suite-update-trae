import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

const LanguageSwitcher: React.FC = () => {
    const { locale, setLocale } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleLanguageChange = (newLocale: 'en' | 'zh') => {
        setLocale(newLocale);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-full bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
                title="Switch language"
            >
                <span className="font-serif text-base">文</span>
                <span className="font-sans text-base -ml-1">A</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10 p-1">
                    <button
                        onClick={() => handleLanguageChange('en')}
                        className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                            locale === 'en' 
                            ? 'bg-gray-100 text-green-600 font-semibold' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => handleLanguageChange('zh')}
                        className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                            locale === 'zh' 
                            ? 'bg-gray-100 text-green-600 font-semibold' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        简体中文
                    </button>
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;