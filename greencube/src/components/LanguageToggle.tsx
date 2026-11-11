import React from 'react';
import { Language } from '../types';

interface LanguageToggleProps {
  currentLang: Language;
  onToggleLang: (lang: Language) => void;
  visible: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  currentLang,
  onToggleLang,
  visible,
}) => {
  const targetLang: Language = currentLang === 'de' ? 'en' : 'de';

  return (
    <div className={`_530659 ${visible ? '_e11df6' : ''}`}>
      <button
        onClick={() => onToggleLang(targetLang)}
        type="button"
        style={{ cursor: 'pointer' }}
      >
        <span className="_5aa79a">
          Romana
        </span>
        <span className="_03bb8f">
          Versiune in romana
        </span>
      </button>
    </div>
  );
};
