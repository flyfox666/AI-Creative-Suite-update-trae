import React, { createContext, useState, useContext, ReactNode } from 'react';
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

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User>(getFreeUserTemplate());
    const [isProModalOpen, setIsProModalOpen] = useState(false);

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
        return false;
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