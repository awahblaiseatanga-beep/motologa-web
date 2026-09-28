import React, { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface LanguageSwitcherProps {
  currentPreference: 'en' | 'fr' | null;
  garageDefault: 'en' | 'fr';
  onPreferenceChange: (pref: 'en' | 'fr' | null) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  currentPreference, 
  garageDefault, 
  onPreferenceChange 
}) => {
  const { t, i18n } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Read-time derivation mapping
  const effectiveLanguage = currentPreference ?? garageDefault;

  const getLanguageLabel = (langCode: 'en' | 'fr') => {
    return langCode === 'en' ? 'English' : 'Français';
  };

  const handleSelect = async (newValue: 'en' | 'fr' | null) => {
    if (newValue === currentPreference) {
      setIsOpen(false);
      return;
    }
    
    setIsUpdating(true);
    setIsOpen(false);

    try {
      // 1. Immediately update backend explicit user mapping allowing downstream triggers
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('set_language_preference', {
        preference: newValue
      });
        
      if (error) throw error;

      // 2. Dispatch local structural hook
      onPreferenceChange(newValue);

      // 3. Force live React render matching target non-mutating UI
      const targetLang = newValue ?? garageDefault;
      i18n.changeLanguage(targetLang);
      
    } catch (err) {
      console.error('Failed to update language mapping:', err);
      // Fallback reversion occurs optimally via error toast outside standard state.
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="flex items-center gap-2 bg-stone-900 border border-stone-800 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg transition text-stone-200"
      >
        <Globe className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium tracking-wide uppercase">
          {getLanguageLabel(effectiveLanguage)}
        </span>
        <ChevronDown className="w-4 h-4 text-stone-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          <button
            onClick={() => handleSelect('en')}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-stone-800 transition text-sm font-medium text-stone-200"
          >
            <span>English</span> {/* i18n-ignore */}
            {currentPreference === 'en' && <Check className="w-4 h-4 text-emerald-400" />}
          </button>
          
          <button
            onClick={() => handleSelect('fr')}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-stone-800 transition text-sm font-medium text-stone-200"
          >
            <span>Français</span> {/* i18n-ignore */}
            {currentPreference === 'fr' && <Check className="w-4 h-4 text-emerald-400" />}
          </button>

          <div className="border-t border-stone-800 my-1" />

          <button
            onClick={() => handleSelect(null)}
            className="w-full px-4 py-2.5 flex flex-col items-start hover:bg-stone-800 transition group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-stone-400 group-hover:text-stone-300">
                {t('language.useGarageDefault', 'Use Garage Default')}
              </span>
              {currentPreference === null && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <span className="text-[10px] text-stone-600 uppercase font-bold tracking-wider mt-1">
              {t('language.current', 'Current:')} {getLanguageLabel(garageDefault)}
            </span>
          </button>
        </div>
      )}
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  );
};
