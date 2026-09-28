import React from 'react';
import { useTranslation } from 'react-i18next';

interface MotologaLogoProps {
  /**
   * Display mode:
   * - 'icon': Just the MT + Gear monogram
   * - 'full': Monogram + "MOTOLOGA" wordmark
   * - 'badge': Inset in a high-contrast Cameroon Pine badge
   */
  variant?: 'icon' | 'full' | 'badge';
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Optional custom accent for gear (defaults to emerald/amber or monochrome)
   */
  accentColor?: string;
}

export const MotologaLogo: React.FC<MotologaLogoProps> = ({
  variant = 'full',
  className = '',
  size = 'md',
  accentColor,
}) => {
  const { t } = useTranslation('common');
  // Sizing maps
  const iconDimensions = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const fullDimensions = {
    xs: 'h-7 w-auto',
    sm: 'h-9 w-auto',
    md: 'h-11 w-auto',
    lg: 'h-16 w-auto',
    xl: 'h-24 w-auto',
  }[size];

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 bg-[#142F30] border-l-4 border-[#34D399] px-2.5 py-1.5 rounded-xl shadow-xs text-white ${className}`}
      >
        <MotologaLogo variant="icon" size="sm" />
        <div className="flex flex-col leading-none">
          <span className="font-mono font-black text-xs tracking-wider uppercase text-white">
            MOTOLOGA
          </span>
          <span className="text-[9px] font-mono text-[#34D399] tracking-widest font-bold">
            {t('logo.garageOsCmr', 'GARAGE OS • CMR')}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDimensions} ${className}`}
        aria-label="MOTOLOGA Logo" // i18n-ignore
      >
        {/* TECH GEAR WITH CONSTELLATION NODES (Behind right side of T) */}
        <g transform="translate(132, 102)">
          {/* Outer gear cog teeth */}
          <path
            d="M 12,-34 L 23,-31 L 27,-22 A 38 38 0 0 1 36,-11 L 46,-12 L 49,-1 L 43,8 A 38 38 0 0 1 41,21 L 49,27 L 44,38 L 33,35 A 38 38 0 0 1 22,42 L 18,52 L 7,50 L 5,39 A 38 38 0 0 1 -7,38 L -14,46 L -23,40"
            fill="none"
            stroke={accentColor || 'currentColor'}
            strokeWidth="3.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Triangulation Constellation Lines */}
          <g stroke={accentColor || 'currentColor'} strokeWidth="1.8" opacity="0.85">
            <line x1="10" y1="-20" x2="26" y2="-6" />
            <line x1="26" y1="-6" x2="32" y2="12" />
            <line x1="26" y1="-6" x2="14" y2="6" />
            <line x1="32" y1="12" x2="20" y2="28" />
            <line x1="14" y1="6" x2="20" y2="28" />
            <line x1="20" y1="28" x2="4" y2="34" />
            <line x1="14" y1="6" x2="4" y2="34" />
            <line x1="26" y1="-6" x2="42" y2="4" />
            <line x1="32" y1="12" x2="42" y2="4" />
            <line x1="32" y1="12" x2="38" y2="26" />
            <line x1="20" y1="28" x2="38" y2="26" />
            <line x1="4" y1="34" x2="14" y2="44" />
            <line x1="20" y1="28" x2="14" y2="44" />
          </g>

          {/* Connected Network Nodes / Dots */}
          <g fill={accentColor || 'currentColor'}>
            <circle cx="10" cy="-20" r="2.8" />
            <circle cx="26" cy="-6" r="3" />
            <circle cx="42" cy="4" r="3" />
            <circle cx="32" cy="12" r="3" />
            <circle cx="38" cy="26" r="2.8" />
            <circle cx="20" cy="28" r="3" />
            <circle cx="14" cy="44" r="2.8" />
            <circle cx="4" cy="34" r="3" />
            <circle cx="14" cy="6" r="2.6" />
          </g>
        </g>

        {/* BOLD ANGULAR 'M' */}
        {/* Left wing of M with beveled notch */}
        <polygon
          points="46,140 68,54 98,54 74,140"
          fill="currentColor"
        />
        {/* Center chevron / inner angle of M */}
        <polygon
          points="96,54 132,140 110,140 88,88"
          fill="currentColor"
        />
        {/* Right diagonal stroke of M */}
        <polygon
          points="130,140 148,54 126,54 116,98"
          fill="currentColor"
        />

        {/* BOLD ANGULAR 'T' (Overlaps and anchors the monogram) */}
        {/* T Top Horizontal Roof Bar */}
        <polygon
          points="118,34 184,34 176,58 156,58 158,46 132,46 126,58 112,58"
          fill="currentColor"
        />
        {/* T Center Downward Stem */}
        <polygon
          points="130,46 156,46 142,126 122,126"
          fill="currentColor"
        />
      </svg>
    );
  }

  // variant === 'full'
  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 240 175"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${fullDimensions}`}
        aria-label="MOTOLOGA Logo" // i18n-ignore
      >
        {/* Monogram Group */}
        <g transform="translate(20, -5)">
          {/* TECH GEAR WITH CONSTELLATION (Right side of T) */}
          <g transform="translate(132, 95)">
            {/* Outer gear cog teeth */}
            <path
              d="M 12,-34 L 23,-31 L 27,-22 A 38 38 0 0 1 36,-11 L 46,-12 L 49,-1 L 43,8 A 38 38 0 0 1 41,21 L 49,27 L 44,38 L 33,35 A 38 38 0 0 1 22,42 L 18,52 L 7,50 L 5,39 A 38 38 0 0 1 -7,38 L -14,46 L -23,40"
              fill="none"
              stroke={accentColor || 'currentColor'}
              strokeWidth="3.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Triangulation Lines */}
            <g stroke={accentColor || 'currentColor'} strokeWidth="1.8" opacity="0.85">
              <line x1="10" y1="-20" x2="26" y2="-6" />
              <line x1="26" y1="-6" x2="32" y2="12" />
              <line x1="26" y1="-6" x2="14" y2="6" />
              <line x1="32" y1="12" x2="20" y2="28" />
              <line x1="14" y1="6" x2="20" y2="28" />
              <line x1="20" y1="28" x2="4" y2="34" />
              <line x1="14" y1="6" x2="4" y2="34" />
              <line x1="26" y1="-6" x2="42" y2="4" />
              <line x1="32" y1="12" x2="42" y2="4" />
              <line x1="32" y1="12" x2="38" y2="26" />
              <line x1="20" y1="28" x2="38" y2="26" />
              <line x1="4" y1="34" x2="14" y2="44" />
              <line x1="20" y1="28" x2="14" y2="44" />
            </g>

            {/* Network Nodes */}
            <g fill={accentColor || 'currentColor'}>
              <circle cx="10" cy="-20" r="2.8" />
              <circle cx="26" cy="-6" r="3" />
              <circle cx="42" cy="4" r="3" />
              <circle cx="32" cy="12" r="3" />
              <circle cx="38" cy="26" r="2.8" />
              <circle cx="20" cy="28" r="3" />
              <circle cx="14" cy="44" r="2.8" />
              <circle cx="4" cy="34" r="3" />
              <circle cx="14" cy="6" r="2.6" />
            </g>
          </g>

          {/* BOLD ANGULAR 'M' */}
          <polygon
            points="46,134 68,48 98,48 74,134"
            fill="currentColor"
          />
          <polygon
            points="96,48 132,134 110,134 88,82"
            fill="currentColor"
          />
          <polygon
            points="130,134 148,48 126,48 116,92"
            fill="currentColor"
          />

          {/* BOLD ANGULAR 'T' */}
          <polygon
            points="118,28 184,28 176,52 156,52 158,40 132,40 126,52 112,52"
            fill="currentColor"
          />
          <polygon
            points="130,40 156,40 142,120 122,120"
            fill="currentColor"
          />
        </g>

        {/* "MOTOLOGA" WORDMARK */}
        <text
          x="120"
          y="162"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
          fontWeight="900"
          fontSize="18"
          letterSpacing="0.25em"
          className="uppercase"
        >
          MOTOLOGA
        </text>
      </svg>
    </div>
  );
};
