
import React from 'react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm sm:text-base font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900
        ${
          isActive
            ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
            : 'text-gray-300 hover:bg-gray-700/50'
        }
      `}
    >
      {label}
    </button>
  );
};

export default TabButton;
