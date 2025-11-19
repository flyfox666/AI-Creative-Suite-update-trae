
import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';

type Locale = 'en' | 'zh';
type Translations = Record<Locale, any>;

interface LocalizationContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, replacements?: Record<string, string | number>) => any;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const getNestedTranslation = (obj: any, key: string): any | undefined => {
    return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
};

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState<Locale>('en');
    const [translations, setTranslations] = useState<Translations | null>(null);

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                const base = import.meta.env.BASE_URL || '/';
                const [enRes, zhRes] = await Promise.all([
                    fetch(`${base}locales/en.json`),
                    fetch(`${base}locales/zh.json`)
                ]);
                if (!enRes.ok || !zhRes.ok) {
                    throw new Error('Failed to fetch translation files');
                }
                const enData = await enRes.json();
                const zhData = await zhRes.json();
                setTranslations({ en: enData, zh: zhData });
            } catch (error) {
                console.error("Failed to load translation files:", error);
                // Set empty translations to allow app to render with keys instead of crashing
                setTranslations({ en: {}, zh: {} });
            }
        };

        fetchTranslations();
    }, []);

    const t = useCallback((key: string, replacements?: Record<string, string | number>): any => {
        if (!translations) {
            // Should be caught by the loading state below, but as a fallback:
            return key;
        }

        let translation = getNestedTranslation(translations[locale], key);

        if (translation === undefined) {
            // Fallback to English if translation is not found in the current locale
            translation = getNestedTranslation(translations['en'], key);
        }

        if (translation === undefined) {
            console.warn(`Translation key "${key}" not found for any locale.`);
            return key; // Return the key itself if not found
        }
        
        if (typeof translation === 'string' && replacements) {
            Object.keys(replacements).forEach(placeholder => {
                const regex = new RegExp(`{{${placeholder}}}`, 'g');
                translation = translation.replace(regex, String(replacements[placeholder]));
            });
        }

        return translation;
    }, [locale, translations]);
    
    const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

    // Display a loading indicator until translations are fetched
    if (!translations) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-gray-500 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <LocalizationContext.Provider value={value}>
            {children}
        </LocalizationContext.Provider>
    );
};

export const useLocalization = (): LocalizationContextType => {
    const context = useContext(LocalizationContext);
    if (context === undefined) {
        throw new Error('useLocalization must be used within a LocalizationProvider');
    }
    return context;
};
