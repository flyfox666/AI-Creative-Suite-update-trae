import React from 'react'
import { useLocalization } from '../contexts/LocalizationContext'

interface Props {
  open: boolean
  onClose: () => void
  onGoSettings: () => void
}

const HelpModal: React.FC<Props> = ({ open, onClose, onGoSettings }) => {
  const { t } = useLocalization()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-2xl w-full mx-4 bg-gray-900 text-gray-100 rounded-xl border border-gray-700 shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">{t('help.title')}</h3>
            <button aria-label={t('proModal.closeAria')} onClick={onClose} className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700">×</button>
          </div>
          <p className="mt-2 text-sm text-gray-400">{t('help.subtitle')}</p>
          <ol className="mt-4 space-y-3 list-decimal list-inside">
            <li>{t('help.step1')}</li>
            <li>{t('help.step2')}</li>
            <li>{t('help.step3')}</li>
            <li>{t('help.step4')}</li>
            <li>{t('help.step5')}</li>
            <li>{t('help.step6')}</li>
          </ol>
          <div className="mt-4 text-sm text-gray-400">
            <div className="font-semibold text-gray-300">{t('help.videoMaxTokensTitle')}</div>
            <p className="mt-1">{t('help.videoMaxTokensDetail')}</p>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={onGoSettings} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg text-white">{t('help.goSettings')}</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">{t('help.close')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpModal