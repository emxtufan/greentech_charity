import React, { useState, useEffect } from 'react';
import { Language } from '../types';

interface IntroOverlayProps {
  lang: Language;
  onStart: () => void;
  onToggleLang: (lang: Language) => void;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({
  lang,
  onStart,
  onToggleLang,
}) => {
  const [stage, setStage] = useState<'initial' | 'visible' | 'translated' | 'hidden'>('initial');

  useEffect(() => {
    // Sequence the entrance animations as in original lc.show()
    const timer1 = setTimeout(() => setStage('visible'), 250);
    const timer2 = setTimeout(() => setStage('translated'), 1750);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleEnter = () => {
    setStage('hidden');
    setTimeout(() => {
      onStart();
    }, 600);
  };

  if (stage === 'hidden') {
    return null;
  }

  const claimText = 'Construim speranta. Casa cu casa.';

  const buttonText = 'Descopera misiunea';

  return (
    <div className={`_b400e8 ${stage === 'hidden' ? '_289adb' : ''}`}>
      <h1 className={`_8ef264 gc-brand-logo-title ${stage !== 'initial' ? '_ea58ee' : ''}`}>
        <img
          className="gc-brand-logo gc-brand-logo--intro"
          src="/logo-charity.webp"
          alt="GREENTECH Charity"
          width="2418"
          height="2541"
        />
      </h1>

      <div
        className={`_c3bb59 ${
          stage === 'initial'
            ? '_289adb'
            : stage === 'translated'
            ? '_ea58ee _0445ca'
            : '_ea58ee'
        }`}
      >
        <div className="_72681f">{claimText}</div>
      </div>

      <div className={`_34fe16 ${stage !== 'initial' ? '_ea58ee' : ''}`}>
        <button
          onClick={handleEnter}
          type="button"
          className="_2bb0cd _7423af _19693e _fc31b1"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span className="_14690a">
            <svg
              className="_6c8233"
              viewBox="0 0 101 101"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 50.5C2.50001 23.9903 23.9903 2.50001 50.5 2.50001C77.0097 2.50001 98.5 23.9903 98.5 50.5C98.5 77.0097 77.0097 98.5 50.5 98.5C23.9903 98.5 2.5 77.0097 2.5 50.5Z"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="_19c712"
                d="M50.5 16.55V84.45"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M84.4502 50.5L16.5502 50.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </span>
          <span className="_5862ff">
            <span className="_fc3732">{buttonText}</span>
          </span>
        </button>
      </div>

      <div className={`_5ddc80 ${stage !== 'initial' ? '_ea58ee' : ''}`}>
        <button
          onClick={() => onToggleLang(lang === 'de' ? 'en' : 'de')}
          type="button"
          style={{ cursor: 'pointer' }}
        >
          Versiune in romana
        </button>
      </div>
    </div>
  );
};
