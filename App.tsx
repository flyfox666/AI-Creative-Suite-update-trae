
import React from 'react';
import StoryboardGenerator from './components/StoryboardGenerator';
import ImageStudio from './components/ImageStudio';
import MediaAnalyzer from './components/MediaAnalyzer';
import AudioLab from './components/AudioLab';
import Pricing from './components/Pricing';
import TabButton from './components/TabButton';
import { UserProvider } from './contexts/UserContext';
import UserStatus from './components/UserStatus';
import ProAccessModal from './components/ProAccessModal';
import { LocalizationProvider, useLocalization } from './contexts/LocalizationContext';
import LanguageSwitcher from './components/LanguageSwitcher';

type Tab = 'storyboard' | 'image' | 'analyzer' | 'audio' | 'pricing';

const AppContent: React.FC = () => {
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = React.useState<Tab>('storyboard');
  const [storyboardIdea, setStoryboardIdea] = React.useState<string>('');
  const [referenceImage, setReferenceImage] = React.useState<string | null>(null);

  const handleUseStoryboardIdea = (idea: string) => {
    setStoryboardIdea(idea);
    setActiveTab('storyboard');
  };

  const handleUseReferenceImage = (imageUrl: string) => {
    setReferenceImage(imageUrl);
    setActiveTab('storyboard');
  };
  
  const handleInitialDataUsed = () => {
    setStoryboardIdea('');
    setReferenceImage(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <ProAccessModal />
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-end items-center gap-4">
            <LanguageSwitcher />
            <UserStatus />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">
            {t('header.title')}
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            {t('header.subtitle')}
          </p>
        </header>
        
        <nav className="flex justify-center items-center mb-8 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-2 border border-gray-700">
          <TabButton
            label={t('tabs.storyboard')}
            isActive={activeTab === 'storyboard'}
            onClick={() => setActiveTab('storyboard')}
          />
          <TabButton
            label={t('tabs.image')}
            isActive={activeTab === 'image'}
            onClick={() => setActiveTab('image')}
          />
          <TabButton
            label={t('tabs.analyzer')}
            isActive={activeTab === 'analyzer'}
            onClick={() => setActiveTab('analyzer')}
          />
          <TabButton
            label={t('tabs.audio')}
            isActive={activeTab === 'audio'}
            onClick={() => setActiveTab('audio')}
          />
           <TabButton
            label={t('tabs.pricing')}
            isActive={activeTab === 'pricing'}
            onClick={() => setActiveTab('pricing')}
          />
        </nav>

        <main>
          <div className={activeTab === 'storyboard' ? '' : 'hidden'}>
            <StoryboardGenerator 
              initialIdea={storyboardIdea} 
              initialImage={referenceImage}
              onInitialDataUsed={handleInitialDataUsed}
            />
          </div>
          <div className={activeTab === 'image' ? '' : 'hidden'}>
            <ImageStudio onUseImage={handleUseReferenceImage} />
          </div>
          <div className={activeTab === 'analyzer' ? '' : 'hidden'}>
            <MediaAnalyzer onUseIdea={handleUseStoryboardIdea} />
          </div>
          <div className={activeTab === 'audio' ? '' : 'hidden'}>
            <AudioLab />
          </div>
          <div className={activeTab === 'pricing' ? '' : 'hidden'}>
            <Pricing />
          </div>
        </main>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>{t('footer.poweredBy')}</p>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LocalizationProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </LocalizationProvider>
  )
}


export default App;
