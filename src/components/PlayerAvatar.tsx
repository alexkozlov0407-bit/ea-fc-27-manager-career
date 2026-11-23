import React, { useState } from 'react';
import clubCrestsMap from '../engine/clubCrests.json';
import { Club, Player, Position } from '../engine/types';

interface PlayerAvatarProps {
  player: Pick<Player, 'knownAs' | 'headshotUrl' | 'jerseyNumber' | 'primaryPosition'>;
  clubColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  clubColor = '#10b981',
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = player.knownAs
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const showImg = Boolean(player.headshotUrl) && !imgFailed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-white/20 flex items-center justify-center font-display font-bold uppercase select-none ${SIZE_CLASSES[size]} ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 25%, ${clubColor}55, #0e1c28 80%)`,
      }}
    >
      {showImg ? (
        <img
          src={player.headshotUrl}
          alt={player.knownAs}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="flex flex-col items-center justify-center leading-none text-white/90">
          <span>{initials || 'FC'}</span>
        </div>
      )}
    </div>
  );
};

interface ClubCrestProps {
  club?: {
    id?: number;
    name?: string;
    shortName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    crestUrl?: string;
  } | null;
  size?: number;
  className?: string;
}

export const ClubCrest: React.FC<ClubCrestProps> = ({ club, size = 32, className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const primary = club?.primaryColor ?? '#10b981';
  const secondary = club?.secondaryColor ?? '#0f172a';
  const label = club?.shortName ?? 'FC';
  const isLightPrimary = primary.toLowerCase() === '#f4f5f7' || primary.toLowerCase() === '#f5f5f5' || primary.toLowerCase() === '#f5d423';
  const textColor = isLightPrimary ? '#0b1320' : '#ffffff';

  const crestUrl = club?.crestUrl || (club?.id ? (clubCrestsMap as Record<string, string>)[String(club.id)] : undefined);

  if (crestUrl && !imgFailed) {
    return (
      <div
        className={`relative shrink-0 flex items-center justify-center select-none ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={crestUrl}
          alt={club?.name ?? 'Club crest'}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain drop-shadow"
        />
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      className={`shrink-0 drop-shadow ${className}`}
      aria-label={club?.name ?? 'Club crest'}
    >
      <defs>
        <linearGradient id={`crest-${label}-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>
      <path
        d="M20 2 L36 7 V21 C36 31.5 29 38.5 20 42 C11 38.5 4 31.5 4 21 V7 Z"
        fill={`url(#crest-${label}-${size})`}
        stroke="rgba(255,255,255,0.68)"
        strokeWidth="2"
      />
      <path
        d="M20 5 L33 9 V20.5 C33 29 27.2 35 20 38 C12.8 35 7 29 7 20.5 V9 Z"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1"
      />
      <text
        x="20"
        y="25.5"
        textAnchor="middle"
        fill={textColor}
        fontSize="11.5"
        fontWeight="800"
        fontFamily="Barlow Condensed, sans-serif"
        letterSpacing="0.5"
      >
        {label.slice(0, 3)}
      </text>
    </svg>
  );
};

interface OvrDiamondProps {
  ovr: number;
  delta?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const OvrDiamond: React.FC<OvrDiamondProps> = ({ ovr, delta = 0, size = 'md' }) => {
  const dim = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-14 h-14 text-2xl' : 'w-11 h-11 text-lg';
  const borderColor =
    delta > 0
      ? 'border-[#38f2c8]/85 bg-[#123d38]/70 text-[#b8fff0]'
      : delta < 0
      ? 'border-[#f05252]/85 bg-[#3d171c]/70 text-[#ffb4b4]'
      : 'border-white/45 bg-[#122434]/75 text-white';

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div
        className={`${dim} relative flex items-center justify-center font-display font-extrabold tabular-nums`}
      >
        <span
          className={`absolute inset-1 rotate-45 border ${borderColor} rounded-[3px] shadow-sm`}
          aria-hidden="true"
        />
        <span className="relative z-10 leading-none">{ovr}</span>
      </div>
    </div>
  );
};

export function positionColorClass(pos: Position): string {
  if (pos === 'GK') return 'text-amber-300';
  if (pos === 'CB' || pos === 'LB' || pos === 'RB') return 'text-sky-300';
  if (pos === 'ST' || pos === 'LW' || pos === 'RW') return 'text-rose-300';
  return 'text-emerald-300';
}

export function getPlayerCutoutUrl(name?: string, useFallback = false): string | null {
  if (!name) return useFallback ? '/assets/cutouts/cutout_34.png' : null;
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('bruyne') || n.includes('kdb')) return '/assets/cutouts/kdb.png';
  if (n.includes('eze')) return '/assets/cutouts/eze.png';
  if (n.includes('raphinha')) return '/assets/cutouts/raphinha.png';
  if (n.includes('doue')) return '/assets/cutouts/doue.png';
  if (n.includes('vlahovic') || n.includes('dusan')) return '/assets/cutouts/vlahovic.png';
  return useFallback ? '/assets/cutouts/cutout_34.png' : null;
}

interface MarqueePlayerCutoutProps {
  name: string;
  className?: string;
  useFallback?: boolean;
  alt?: string;
}

export const MarqueePlayerCutout: React.FC<MarqueePlayerCutoutProps> = ({
  name,
  className = 'h-52 w-auto object-contain',
  useFallback = true,
  alt = 'Marquee Player Cutout',
}) => {
  const [error, setError] = useState(false);
  const cutoutUrl = getPlayerCutoutUrl(name, useFallback);

  if (!cutoutUrl || error) return null;

  return (
    <img
      src={cutoutUrl}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={`select-none filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] pointer-events-none transition-all duration-300 ${className}`}
    />
  );
};
