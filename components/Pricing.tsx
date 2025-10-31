

import React from 'react';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';

const CheckIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const CrossIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);


const Pricing: React.FC = () => {
    const { user, openProModal } = useUser();
    const { t } = useLocalization();
    const isPro = user.plan === 'pro';
    const costs = t('imageStudio.cost', {}) as any;

    const handleUpgrade = () => {
        if (isPro) return;
        openProModal();
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-6 md:p-10 border border-gray-700">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
                    {t('pricing.title')}
                </h1>
                <p className="mt-4 text-xl text-gray-400">
                    {t('pricing.subtitle')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Free Plan */}
                <div className="border border-gray-700 rounded-2xl p-8 flex flex-col">
                    <h3 className="text-2xl font-bold text-white">{t('pricing.freePlan.name')}</h3>
                    <p className="mt-2 text-gray-400">{t('pricing.freePlan.description')}</p>
                    <div className="mt-6">
                        <span className="text-5xl font-extrabold text-white">{t('pricing.freePlan.price')}</span>
                    </div>
                    <ul className="mt-8 space-y-4 text-gray-300">
                        <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                            <span><span className="font-semibold text-white">{t('pricing.freePlan.feature1Value')}</span> {t('pricing.freePlan.feature1')}</span>
                        </li>
                         <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                            <span><span className="font-semibold text-white">{t('pricing.freePlan.feature2Value')}</span> {t('pricing.freePlan.feature2')} {t('pricing.freePlan.feature2Cost')}</span>
                        </li>
                         <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                            <span>{t('pricing.freePlan.feature_image_studio_title')}
                                <ul className="list-disc list-inside text-gray-400 mt-1 pl-2 text-sm">
                                    <li>{t('pricing.freePlan.feature_image_studio_generate', {cost: costs.generate.free })}</li>
                                    <li>{t('pricing.freePlan.feature_image_studio_edit', {cost: costs.edit.free })}</li>
                                    <li>{t('pricing.freePlan.feature_image_studio_combine', {cost: costs.combine.free })}</li>
                                </ul>
                            </span>
                        </li>
                        <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                            <span>{t('pricing.freePlan.feature5')}
                                <ul className="list-disc list-inside text-gray-400 mt-1 pl-2 text-sm">
                                    <li>{t('pricing.freePlan.feature5_1')} (<span className="font-semibold text-white">{t('pricing.freePlan.feature5_1_cost')}</span>)</li>
                                    <li>{t('pricing.freePlan.feature5_2')} (<span className="font-semibold text-white">{t('pricing.freePlan.feature5_2_cost')}</span>)</li>
                                    <li>{t('pricing.freePlan.feature5_3')} (<span className="font-semibold text-white">{t('pricing.freePlan.feature5_3_cost')}</span>)</li>
                                </ul>
                            </span>
                        </li>
                        <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                            <span>
                                {t('pricing.freePlan.feature_audio_lab')}
                                 <ul className="list-disc list-inside text-gray-400 mt-1 pl-2 text-sm">
                                    <li>{t('pricing.freePlan.feature_audio_lab_cost_prebuilt')}</li>
                                </ul>
                            </span>
                        </li>
                    </ul>
                    <div className="mt-auto pt-8">
                         <button
                            disabled={user.plan === 'free'}
                            className="w-full px-6 py-3 text-lg font-semibold text-center text-white bg-gray-600 rounded-lg cursor-not-allowed disabled:opacity-80"
                        >
                            {t('pricing.freePlan.buttonText')}
                        </button>
                    </div>
                </div>

                {/* PRO Plan */}
                <div className="relative border-2 border-purple-500 rounded-2xl p-8 flex flex-col shadow-2xl shadow-purple-500/20">
                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1 text-sm font-semibold tracking-wider text-white uppercase bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full">
                            {t('pricing.proPlan.badge')}
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{t('pricing.proPlan.name')}</h3>
                    <p className="mt-2 text-gray-400">{t('pricing.proPlan.description')}</p>
                     <div className="mt-6">
                        <span className="text-5xl font-extrabold text-white">{t('pricing.proPlan.price')}</span>
                        <span className="text-xl font-medium text-gray-400">{t('pricing.proPlan.pricePer')}</span>
                    </div>
                    <ul className="mt-8 space-y-4 text-gray-300">
                        <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                            <span><span className="font-semibold text-white">{t('pricing.proPlan.feature1Value')}</span> {t('pricing.proPlan.feature1')}</span>
                        </li>
                        <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                             <span><span className="font-semibold text-white">{t('pricing.proPlan.feature2Value')}</span> {t('pricing.proPlan.feature2')}</span>
                        </li>
                        <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                             <span><span className="font-semibold text-white">{t('pricing.proPlan.feature3')}</span>
                                <ul className="list-disc list-inside text-gray-400 mt-1 pl-2 text-sm">
                                    <li>{t('pricing.proPlan.feature_image_studio_generate', {cost: costs.generate.pro })}</li>
                                    <li>{t('pricing.proPlan.feature_image_studio_edit', {cost: costs.edit.pro })}</li>
                                    <li>{t('pricing.proPlan.feature_image_studio_combine', {cost: costs.combine.pro })}</li>
                                </ul>
                             </span>
                        </li>
                         <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                            <span><span className="font-semibold text-white">{t('pricing.proPlan.feature4')}</span> {t('pricing.proPlan.feature4_detail')}</span>
                        </li>
                        <li className="flex items-start">
                            <CheckIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                            <span>
                                {t('pricing.proPlan.feature_audio_lab')}
                                <ul className="list-disc list-inside text-gray-400 mt-1 pl-2 text-sm">
                                    <li>{t('pricing.proPlan.feature_audio_lab_cost_prebuilt')}</li>
                                </ul>
                            </span>
                        </li>
                    </ul>
                     <div className="mt-auto pt-8">
                        <button
                            onClick={handleUpgrade}
                            disabled={isPro}
                            className="w-full px-6 py-3 text-lg font-semibold text-center text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:hover:from-purple-600"
                        >
                            {isPro ? t('pricing.proPlan.buttonTextCurrent') : t('pricing.proPlan.buttonText')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pricing;