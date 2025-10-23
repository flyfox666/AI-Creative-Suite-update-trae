

import React from 'react';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';

const UserStatus: React.FC = () => {
    const { user, openProModal, switchToFree } = useUser();
    const { t } = useLocalization();

    if (!user) return null;

    const handlePlanChange = () => {
        if (user.plan === 'pro') {
            // Allow pro users to switch back to free to test both states
            switchToFree();
        } else {
            openProModal();
        }
    };

    const isPro = user.plan === 'pro';

    return (
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-lg p-2 flex items-center space-x-3 text-sm">
            <div className="text-right">
                 <div className="text-gray-300">
                    <span className="font-semibold">{user.credits}</span>
                    <span className="text-gray-400"> {t('userStatus.credits')}</span>
                </div>
            </div>
            <button
                onClick={handlePlanChange}
                title={isPro ? t('userStatus.proTooltip') : t('userStatus.freeTooltip')}
                className={`px-3 py-1 text-xs font-bold rounded-full self-center transition-transform transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 ${isPro ? 'bg-purple-500 text-white' : 'bg-gray-600 text-gray-200'}`}
            >
                {isPro ? user.plan.toUpperCase() : t('userStatus.upgrade')}
            </button>
        </div>
    );
};

export default UserStatus;