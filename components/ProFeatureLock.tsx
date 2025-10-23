
import React from 'react';
import ProBadge from './ProBadge';

interface ProFeatureLockProps {
  featureName: string;
  description: string;
}

const LockIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
);


const ProFeatureLock: React.FC<ProFeatureLockProps> = ({ featureName, description }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-8 border-2 border-dashed border-gray-700 text-center flex flex-col items-center justify-center min-h-[400px]">
      <div className="mb-4 p-4 bg-purple-600/20 rounded-full border border-purple-500">
        <LockIcon className="w-10 h-10 text-purple-400" />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-gray-200">{featureName}</h2>
        <ProBadge />
      </div>
      <p className="max-w-md text-gray-400 mb-6">
        {description}
      </p>
      <button className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 transition-all transform hover:scale-105">
        Upgrade to PRO
      </button>
    </div>
  );
};

export default ProFeatureLock;