import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();

  if (compact) {
    return (
      <div className="bg-blue-500/20 rounded-lg p-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${
              i18n.language === 'en'
                ? 'bg-white text-blue-800 shadow-md'
                : 'text-blue-50 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => i18n.changeLanguage('ja')}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${
              i18n.language === 'ja'
                ? 'bg-white text-blue-800 shadow-md'
                : 'text-blue-50 hover:text-white'
            }`}
          >
            日本語
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-md border-2 border-blue-100 p-1.5">
      <Globe size={18} className="text-blue-700 ml-1" />
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
          i18n.language === 'en'
            ? 'bg-blue-700 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        English
      </button>
      <button
        onClick={() => i18n.changeLanguage('ja')}
        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
          i18n.language === 'ja'
            ? 'bg-blue-700 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        日本語
      </button>
    </div>
  );
}
