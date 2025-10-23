import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { findUserByEmail, verifyProAccessCode } from '../auth/mockUsers';

interface UserContextType {
    user: User;
    spendCredits: (amount: number) => void;
    login: (email: string) => Promise<boolean>;
    switchToPro: (accessCode: string) => Promise<boolean>;
    switchToFree: () => void;
    isProModalOpen: boolean;
    openProModal: () => void;
    closeProModal: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'ai-creative-suite-user';

// Default user states. We create copies to avoid mutation.
const getFreeUserTemplate = (email = 'test@user.com'): User => ({
  email: email,
  plan: 'free',
  credits: 200,
});

const getProUserTemplate = (email = 'pro@example.com'): User => ({
  email: email,
  plan: 'pro',
  credits: 1000, // Pro users get more credits
});

const getInitialUser = (): User => {
    try {
        const savedUser = window.localStorage.getItem(USER_STORAGE_KEY);
        if (savedUser) {
            // Add validation here if user object shape changes over time
            return JSON.parse(savedUser);
        }
    } catch (error) {
        console.error("Failed to read user from localStorage", error);
        // If parsing fails, clear the corrupted data
        window.localStorage.removeItem(USER_STORAGE_KEY);
    }
    // Return a default free user if nothing is saved or if there was an error
    return getFreeUserTemplate();
};


export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User>(getInitialUser);
    const [isProModalOpen, setIsProModalOpen] = useState(false);

    // Effect to save user state to localStorage whenever it changes
    useEffect(() => {
        try {
            window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        } catch (error) {
            console.error("Failed to save user to localStorage", error);
        }
    }, [user]);

    const spendCredits = (amount: number) => {
        setUser(currentUser => {
            return {
                ...currentUser,
                credits: Math.max(0, currentUser.credits - amount),
            }
        });
    };

    const login = async (email: string): Promise<boolean> => {
        const foundUser = findUserByEmail(email);
        if (foundUser) {
            setUser(foundUser);
            return true;
        }
        // For this demo, if user is not found, we create a new free user
        // In a real app, this might show an error.
        setUser(getFreeUserTemplate(email));
        return true;
    };

    const switchToPro = async (accessCode: string): Promise<boolean> => {
        const isValid = await verifyProAccessCode(accessCode);
        if (isValid) {
            setUser(currentUser => getProUserTemplate(currentUser.email));
            return true;
        }
        return false;
    };

    const switchToFree = () => {
        setUser(currentUser => getFreeUserTemplate(currentUser.email));
    };

    const openProModal = () => setIsProModalOpen(true);
    const closeProModal = () => setIsProModalOpen(false);

    return (
        <UserContext.Provider value={{ 
            user, 
            spendCredits, 
            login, 
            switchToPro, 
            switchToFree,
            isProModalOpen,
            openProModal,
            closeProModal
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};