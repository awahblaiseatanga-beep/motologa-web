import React from 'react';
import { useTranslation } from 'react-i18next';

interface LicensePlateBadgeProps {
  plate: string;
  size?: 'sm' | 'md' | 'lg';
  showCountryFlag?: boolean;
  className?: string;
  id?: string;
}

export const LicensePlateBadge: React.FC<LicensePlateBadgeProps> = ({
  plate,
  size = 'md',
  showCountryFlag = true,
  className = '',
  id,
}) => {
  const { t } = useTranslation('common');
  const formattedPlate = plate.trim().toUpperCase() || '•• •••• •';

  const sizeClasses = {
    sm: 'text-[11px] sm:text-xs font-bold px-2 py-0.5 min-h-[30px]',
    md: 'text-xs sm:text-sm font-bold tracking-wider px-2.5 sm:px-3.5 py-1.5 min-h-[40px] sm:min-h-[44px]',
    lg: 'text-base xs:text-lg sm:text-xl md:text-2xl font-black tracking-wide sm:tracking-widest px-3 sm:px-4 py-2 sm:py-2.5 min-h-[48px] sm:min-h-[56px]',
  };

  return (
    <div
      id={id}
      className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-r-md shadow-inner bg-[#142F30] border-l-4 border-[#34D399] font-mono text-slate-100 uppercase select-none transition-all max-w-full overflow-hidden ${sizeClasses[size]} ${className}`}
    >
      {showCountryFlag && (
        <div className="flex items-center gap-1 shrink-0 bg-[#0E2829]/90 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-sans font-bold border border-emerald-500/30 text-emerald-300">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{t('licensePlate.cmr')}</span>
        </div>
      )}
      <span className="tracking-wider sm:tracking-widest font-mono font-bold text-slate-100 drop-shadow-xs whitespace-nowrap truncate">
        {formattedPlate}
      </span>
    </div>
  );
};
