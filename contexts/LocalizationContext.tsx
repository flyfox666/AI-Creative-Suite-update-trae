import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';

type Locale = 'en' | 'zh';
type Translations = Record<Locale, any>;

interface LocalizationContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const getNestedTranslation = (obj: any, key: string): string | undefined => {
    return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
};

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState<Locale>('en');
    const [translations, setTranslations] = useState<Translations | null>(null);

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                const [enRes, zhRes] = await Promise.all([
                    fetch('/locales/en.json'),
                    fetch('/locales/zh.json')
                ]);
                const enData = await enRes.json();
                const zhData = await zhRes.json();
                setTranslations({ en: enData, zh: zhData });
            } catch (error) {
                console.error("Failed to load translation files:", error);
            }
        };

        fetchTranslations();
    }, []);

    const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
        if (!translations) {
            return key;
        }

        let translation = getNestedTranslation(translations[locale], key);

        if (!translation) {
            console.warn(`Translation key "${key}" not found for locale "${locale}". Falling back to English.`);
            translation = getNestedTranslation(translations['en'], key);
        }

        if (!translation) {
            return key; // Return the key itself if not found in English either
        }
        
        if (replacements) {
            Object.keys(replacements).forEach(placeholder => {
                const regex = new RegExp(`{{${placeholder}}}`, 'g');
                translation = translation!.replace(regex, String(replacements[placeholder]));
            });
        }

        return translation!;
    }, [locale, translations]);
    
    const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

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
