import React, { useState } from 'react';
import clubCrestsMap from '../engine/clubCrests.json';
import { Club, Player, Position } from '../engine/types';

export type ClubData = any;
export type PlayerData = any;

export const ClubCrest: React.FC<{ club?: any; size?: number; className?: string }> = ({
  club,
  size = 44,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (!club) {
    return <div style={{ width: size, height: size }} className={`shrink-0 ${className}`} />;
  }

  // 1. Prioritize authentic official club crest image from club.crestUrl or clubCrestsMap
  const crestUrl =
    club?.crestUrl || (club?.id ? (clubCrestsMap as Record<string, string>)[String(club.id)] : undefined);

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

  const idStr = String(club.id || '').toLowerCase();
  const slug = String(club.slug || club.shortName || club.name || '').toLowerCase();

  // Club Tigres authentic gold & royal blue shield emblem
  if (idStr === 'tigres' || slug.includes('tigres')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 76"
        fill="none"
        className={`shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${className}`}
        aria-hidden="true"
      >
        <path
          d="M6 6H58V48C58 61 44 70 32 73C20 70 6 61 6 48V6Z"
          fill="#0041A8"
          stroke="#F5B800"
          strokeWidth="3.5"
        />
        <rect x="9" y="9" width="46" height="11" fill="#003285" />
        <text
          x="32"
          y="17"
          textAnchor="middle"
          fill="#F5B800"
          fontSize="8.5"
          fontWeight="900"
          fontFamily="sans-serif"
          letterSpacing="0.8"
        >
          TIGRES
        </text>
        <path
          d="M15 24H49L46 47L32 58L18 47L15 24Z"
          fill="#F5B400"
          stroke="#002D72"
          strokeWidth="1.5"
        />
        <path d="M19 29L27 33L21 37L27 40L22 44" stroke="#002D72" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M45 29L37 33L43 37L37 40L42 44" stroke="#002D72" strokeWidth="2.4" strokeLinecap="round" />
        <polygon points="32,38 28,45 36,45" fill="#002D72" />
        <path d="M26 49H38" stroke="#002D72" strokeWidth="2.4" strokeLinecap="round" />
        <text
          x="32"
          y="67"
          textAnchor="middle"
          fill="#F5B800"
          fontSize="7"
          fontWeight="800"
          fontFamily="sans-serif"
          letterSpacing="1"
        >
          UANL
        </text>
      </svg>
    );
  }

  // Parma Calcio iconic shield with black cross & yellow/blue stripes
  if (idStr === 'parma' || slug.includes('parma')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 76"
        fill="none"
        className={`shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${className}`}
        aria-hidden="true"
      >
        <defs>
          <clipPath id="parma-clip">
            <path d="M6 6H58V44C58 59 45 68 32 72C19 68 6 59 6 44V6Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#parma-clip)">
          <rect x="6" y="6" width="52" height="66" fill="#FFFFFF" />
          <rect x="17" y="18" width="5" height="54" fill="#101418" />
          <rect x="6" y="34" width="26" height="5" fill="#101418" />
          <rect x="32" y="18" width="6.5" height="54" fill="#FFD100" />
          <rect x="38.5" y="18" width="6.5" height="54" fill="#0A3A8A" />
          <rect x="45" y="18" width="6.5" height="54" fill="#FFD100" />
          <rect x="51.5" y="18" width="6.5" height="54" fill="#0A3A8A" />
          <rect x="6" y="6" width="52" height="12" fill="#FFD100" />
          <text
            x="32"
            y="14.5"
            textAnchor="middle"
            fill="#101418"
            fontSize="6.2"
            fontWeight="900"
            fontFamily="sans-serif"
            letterSpacing="0.4"
          >
            PARMA CALCIO
          </text>
        </g>
        <path
          d="M6 6H58V44C58 59 45 68 32 72C19 68 6 59 6 44V6Z"
          stroke="#DCE6EE"
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  // Arsenal crimson & gold crest
  if (idStr === 'arsenal' || slug.includes('arsenal')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 76"
        fill="none"
        className={`shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${className}`}
        aria-hidden="true"
      >
        <path
          d="M7 10C18 6 46 6 57 10V45C57 60 44 68 32 72C20 68 7 60 7 45V10Z"
          fill="#DB0007"
          stroke="#D4AF37"
          strokeWidth="3.2"
        />
        <path d="M11 14H53V24H11V14Z" fill="#063672" />
        <text
          x="32"
          y="21.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="7.2"
          fontWeight="900"
          fontFamily="sans-serif"
          letterSpacing="0.9"
        >
          ARSENAL
        </text>
        <rect x="18" y="38" width="29" height="6" rx="3" fill="#E5C158" />
        <circle cx="28" cy="48" r="7" stroke="#E5C158" strokeWidth="2.6" fill="#9C0005" />
        <circle cx="28" cy="48" r="2" fill="#E5C158" />
      </svg>
    );
  }

  // Liverpool crimson & teal shield
  if (idStr === 'liverpool' || slug.includes('liverpool')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 76"
        fill="none"
        className={`shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${className}`}
        aria-hidden="true"
      >
        <path
          d="M8 10H56V46C56 59 44 68 32 72C20 68 8 59 8 46V10Z"
          fill="#C8102E"
          stroke="#00B2A9"
          strokeWidth="3"
        />
        <text
          x="32"
          y="24"
          textAnchor="middle"
          fill="#F6EB61"
          fontSize="7"
          fontWeight="900"
          fontFamily="sans-serif"
        >
          L.F.C.
        </text>
        <path
          d="M32 30L39 41L34 45L40 56H24L30 45L25 41L32 30Z"
          fill="#F6EB61"
        />
      </svg>
    );
  }

  // Real Madrid white/gold crown emblem
  if (idStr === 'realmadrid' || slug.includes('real madrid') || slug.includes('realmadrid')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 76"
        fill="none"
        className={`shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${className}`}
        aria-hidden="true"
      >
        <path d="M21 16L25 8L32 13L39 8L43 16H21Z" fill="#D4AF37" />
        <circle cx="32" cy="44" r="23" fill="#FFFFFF" stroke="#D4AF37" strokeWidth="3.5" />
        <path d="M17 59L47 29" stroke="#1D428A" strokeWidth="7" />
        <text
          x="32"
          y="48"
          textAnchor="middle"
          fill="#B68B1D"
          fontSize="13"
          fontWeight="900"
          fontFamily="serif"
        >
          MCF
        </text>
      </svg>
    );
  }

  // FC Barcelona blaugrana shield
  if (idStr === 'barcelona' || slug.includes('barcelona')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 76"
        fill="none"
        className={`shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${className}`}
        aria-hidden="true"
      >
        <path
          d="M8 10H56V46C56 59 44 68 32 72C20 68 8 59 8 46V10Z"
          fill="#004D98"
          stroke="#EDBB00"
          strokeWidth="3"
        />
        <rect x="10" y="34" width="44" height="10" fill="#EDBB00" />
        <text
          x="32"
          y="41.5"
          textAnchor="middle"
          fill="#101418"
          fontSize="8.5"
          fontWeight="900"
          fontFamily="sans-serif"
        >
          FCB
        </text>
        <rect x="12" y="13" width="18" height="19" fill="#FFFFFF" />
        <rect x="19" y="13" width="4" height="19" fill="#DB0030" />
        <rect x="12" y="20.5" width="18" height="4" fill="#DB0030" />
        <rect x="34" y="13" width="18" height="19" fill="#A50044" />
      </svg>
    );
  }

  // Cruz Azul roundel crest (used for transfer bid badge)
  if (idStr === 'cruzazul' || slug.includes('cruz azul') || slug.includes('cruzazul')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="28" fill="#0052A5" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx="32" cy="32" r="19" fill="#FFFFFF" stroke="#D71920" strokeWidth="3.5" />
        <rect x="28" y="18" width="8" height="28" fill="#0052A5" />
        <rect x="18" y="28" width="28" height="8" fill="#0052A5" />
      </svg>
    );
  }

  // Generic dynamic crest fallback
  const primary = club?.primaryColor ?? '#10b981';
  const secondary = club?.secondaryColor ?? '#0f172a';
  const label = (club?.shortName || club?.name || 'FC').slice(0, 3).toUpperCase();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 76"
      fill="none"
      className={`shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${className}`}
      aria-hidden="true"
    >
      <path
        d="M8 8H56V46C56 59 44 68 32 72C20 68 8 59 8 46V8Z"
        fill={secondary}
        stroke={primary}
        strokeWidth="3.5"
      />
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="15"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        {label}
      </text>
    </svg>
  );
};

export const CompetitionBadge: React.FC<{ name: string; size?: number }> = ({
  name,
  size = 24,
}) => {
  const isIntl = name.toLowerCase().includes('european') || name.toLowerCase().includes('cup');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      {isIntl ? (
        <>
          <path
            d="M14 3C8.4 3 4 7.5 4 13.5C4 19.8 8.8 25 14 25C19.2 25 24 19.8 24 13.5"
            stroke="#FF7A1A"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M14 6C17.8 6 20.5 9.2 20.5 13.2C20.5 17.5 17.6 21 14 21C10.5 21 8.5 18 8.5 14.5"
            stroke="#38BDF8"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="14" cy="13.5" r="2.6" fill="#FACC15" />
        </>
      ) : (
        <>
          <circle cx="14" cy="14" r="11" fill="#162838" stroke="#38F2C8" strokeWidth="2" />
          <path d="M9 17L11 10L14 13L17 10L19 17H9Z" fill="#38F2C8" />
        </>
      )}
    </svg>
  );
};

export const PlayerAvatar: React.FC<{
  player: any;
  clubColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
}> = ({ player, clubColor = '#1e3a5f', size = 'md', className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const dim =
    typeof size === 'number'
      ? size
      : size === 'xs'
      ? 28
      : size === 'sm'
      ? 36
      : size === 'lg'
      ? 56
      : size === 'xl'
      ? 80
      : 44;

  if (player?.headshotUrl && !imgFailed) {
    return (
      <div
        style={{ width: dim, height: dim }}
        className={`relative shrink-0 overflow-hidden rounded-[8px] border border-white/20 select-none bg-black/40 ${className}`}
      >
        <img
          src={player.headshotUrl}
          alt={player.knownAs ?? 'Player'}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      </div>
    );
  }

  const skin = player?.skinTone ?? '#c9977c';
  const hair = player?.hairColor ?? '#1b1a1d';
  const kit = player?.jerseyColor ?? clubColor;
  const pId = player?.id ?? 'gen';

  return (
    <div
      style={{ width: dim, height: dim }}
      className={`relative rounded-[6px] overflow-hidden bg-gradient-to-b from-[#253b4a] to-[#0f1c26] shrink-0 flex items-end justify-center border border-white/12 shadow-inner ${className}`}
      aria-hidden="true"
    >
      <svg width={dim} height={dim} viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id={`p-skin-${pId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={skin} />
            <stop offset="100%" stopColor="#8d5d44" />
          </linearGradient>
        </defs>
        <path d="M4 40C6 31 12 27.5 20 27.5C28 27.5 34 31 36 40H4Z" fill={kit} />
        <path d="M14.5 28L20 33.5L25.5 28" stroke="#dbe9f0" strokeOpacity="0.7" strokeWidth="1.3" />
        <rect x="17" y="22.5" width="6" height="6.5" rx="2" fill={`url(#p-skin-${pId})`} />
        <path d="M17 24.5C18.8 26 21.2 26 23 24.5V22.5H17V24.5Z" fill="#000" fillOpacity="0.22" />
        <ellipse cx="20" cy="16" rx="6.2" ry="7.6" fill={`url(#p-skin-${pId})`} />
        <path
          d="M13.6 15.2C13.5 10.1 16.3 7.8 20 7.8C23.7 7.8 26.5 10.1 26.4 15.2C25.3 12.2 23.1 11 20 11C16.9 11 14.7 12.2 13.6 15.2Z"
          fill={hair}
        />
        <path d="M16.2 14.8H18.8M21.2 14.8H23.8" stroke="#2c1d17" strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M24.8 11.5C26 13.5 26 16.5 24.8 18.8" stroke="#ffffff" strokeOpacity="0.24" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
};

export const BroadcastEditorialArt: React.FC<{
  variant: 'striker-green' | 'tunnel-night' | 'touchline-tactics';
  imageSrc?: string;
  alt: string;
}> = ({ variant, imageSrc, alt }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (imageSrc && !imgFailed) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-cover object-top"
      />
    );
  }

  if (variant === 'striker-green') {
    return (
      <svg
        viewBox="0 0 420 520"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        role="img"
        aria-label={alt}
      >
        <defs>
          <linearGradient id="stad-sky" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#1b2c32" />
            <stop offset="38%" stopColor="#26403c" />
            <stop offset="72%" stopColor="#0f2524" />
            <stop offset="100%" stopColor="#060a0e" />
          </linearGradient>
          <radialGradient id="stad-sun" cx="62%" cy="22%" r="58%">
            <stop offset="0%" stopColor="#9cead0" stopOpacity="0.44" />
            <stop offset="46%" stopColor="#268568" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#060b0f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="emerald-jersey" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#35cc93" />
            <stop offset="44%" stopColor="#198762" />
            <stop offset="82%" stopColor="#0e523d" />
            <stop offset="100%" stopColor="#07281f" />
          </linearGradient>
          <linearGradient id="jersey-highlight" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0%" stopColor="#a8ffdf" stopOpacity="0.48" />
            <stop offset="50%" stopColor="#38f2c8" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#062119" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="figure-shadow" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#243136" />
            <stop offset="45%" stopColor="#121c21" />
            <stop offset="100%" stopColor="#080d11" />
          </linearGradient>
          <linearGradient id="bottom-scrim" x1="0" y1="0.38" x2="0" y2="1">
            <stop offset="0%" stopColor="#060a0e" stopOpacity="0" />
            <stop offset="56%" stopColor="#060a0e" stopOpacity="0.76" />
            <stop offset="100%" stopColor="#060a0e" stopOpacity="0.99" />
          </linearGradient>
        </defs>

        <rect width="420" height="520" fill="url(#stad-sky)" />
        <rect width="420" height="520" fill="url(#stad-sun)" />

        <g opacity="0.22" stroke="#b8fff0" strokeWidth="1.2">
          <line x1="-20" y1="88" x2="440" y2="42" />
          <line x1="-20" y1="118" x2="440" y2="78" />
          <line x1="0" y1="158" x2="420" y2="158" strokeOpacity="0.5" />
        </g>
        <g opacity="0.28">
          <ellipse cx="92" cy="68" rx="46" ry="12" fill="#d6ffef" opacity="0.24" />
          <ellipse cx="328" cy="62" rx="54" ry="14" fill="#d6ffef" opacity="0.22" />
          <rect x="0" y="160" width="420" height="82" fill="#0c171e" opacity="0.52" />
          <circle cx="42" cy="186" r="14" fill="#d9b77c" opacity="0.26" />
          <circle cx="84" cy="198" r="10" fill="#5fd1a5" opacity="0.25" />
          <circle cx="122" cy="182" r="16" fill="#d4b37e" opacity="0.2" />
          <circle cx="310" cy="186" r="18" fill="#d9b77c" opacity="0.25" />
          <circle cx="356" cy="202" r="14" fill="#5fd1a5" opacity="0.28" />
          <circle cx="394" cy="184" r="12" fill="#e2c897" opacity="0.22" />
          <circle cx="62" cy="252" r="22" fill="#3b7867" opacity="0.24" />
          <circle cx="364" cy="264" r="26" fill="#3b7867" opacity="0.24" />
        </g>

        <polygon points="0,330 220,95 270,95 45,330" fill="#38f2c8" opacity="0.06" />
        <polygon points="295,0 420,0 420,175 185,420" fill="#d8ff4a" opacity="0.045" />

        <g transform="translate(0, 8)">
          <path
            d="M192 132H230V176C220 187 202 187 192 176V132Z"
            fill="url(#figure-shadow)"
          />
          <path
            d="M178 102C177 73 192 56 211 56C230 56 245 73 244 102C243 128 228 148 211 148C194 148 179 128 178 102Z"
            fill="url(#figure-shadow)"
          />
          <path
            d="M236 68C246 82 246 112 235 132C229 142 220 147 211 148"
            stroke="#8ef7d8"
            strokeOpacity="0.65"
            strokeWidth="2.2"
            fill="none"
          />
          <path
            d="M185 72C177 86 177 108 183 124"
            stroke="#b8fff0"
            strokeOpacity="0.25"
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M78 446L104 234C112 198 144 178 184 172H238C278 178 312 200 322 238L352 446H78Z"
            fill="url(#emerald-jersey)"
          />
          <path
            d="M78 446L104 234C112 198 144 178 184 172H238C278 178 312 200 322 238L352 446H78Z"
            fill="url(#jersey-highlight)"
          />

          <g stroke="#8cf7d4" strokeOpacity="0.24" fill="none">
            <path d="M138 232C174 212 244 212 282 234" strokeWidth="2.4" />
            <path d="M134 258C174 238 246 238 286 260" strokeWidth="2" />
            <path d="M130 284C174 264 248 264 290 286" strokeWidth="1.6" />
            <path d="M126 310C174 290 250 290 294 312" strokeWidth="1.3" />
          </g>
          <path d="M114 214L168 182M122 222L176 190M130 230L184 198" stroke="#c8fff0" strokeOpacity="0.48" strokeWidth="2.5" />
          <path d="M308 214L254 182M300 222L246 190M292 230L238 198" stroke="#c8fff0" strokeOpacity="0.48" strokeWidth="2.5" />
          <path d="M180 172L211 198L242 172" fill="#093829" stroke="#a6f9df" strokeOpacity="0.6" strokeWidth="2.2" />

          <g transform="translate(242, 224)">
            <path
              d="M0 0H26V21C26 31 13 37 13 37C13 37 0 31 0 21V0Z"
              fill="#0a3428"
              stroke="#d8ff4a"
              strokeWidth="1.8"
            />
            <polygon points="13,7 19,17 13,27 7,17" fill="#38f2c8" opacity="0.88" />
          </g>

          <path d="M104 234L148 258L134 352L84 342Z" fill="#0b4a36" opacity="0.72" />
          <path d="M322 238L278 262L292 356L342 346Z" fill="#073124" opacity="0.72" />

          <path d="M184 268H238" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />
          <circle cx="211" cy="242" r="7" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="1.4" fill="none" />
        </g>

        <rect width="420" height="520" fill="url(#bottom-scrim)" />
      </svg>
    );
  }

  if (variant === 'tunnel-night') {
    return (
      <svg
        viewBox="0 0 420 520"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        role="img"
        aria-label={alt}
      >
        <defs>
          <linearGradient id="tun-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#091522" />
            <stop offset="50%" stopColor="#102b3d" />
            <stop offset="100%" stopColor="#06090d" />
          </linearGradient>
          <radialGradient id="tun-light" cx="50%" cy="22%" r="54%">
            <stop offset="0%" stopColor="#38f2c8" stopOpacity="0.52" />
            <stop offset="55%" stopColor="#125568" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#060a0f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="420" height="520" fill="url(#tun-bg)" />
        <rect width="420" height="520" fill="url(#tun-light)" />
        <path d="M30 0L135 280M390 0L285 280" stroke="#38f2c8" strokeOpacity="0.2" strokeWidth="2" />
        <path d="M85 0L155 270M335 0L265 270" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" />
        <rect x="135" y="42" width="150" height="230" rx="8" fill="#133d4b" opacity="0.35" />
        <ellipse cx="210" cy="136" rx="28" ry="34" fill="#0d1b26" stroke="#76f5d7" strokeOpacity="0.45" strokeWidth="1.5" />
        <path
          d="M126 390L148 205C154 182 178 172 210 172C242 172 266 182 272 205L294 390H126Z"
          fill="#0c1b28"
          stroke="#5beec9"
          strokeOpacity="0.35"
          strokeWidth="2"
        />
        <rect width="420" height="520" fill="url(#bottom-scrim)" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 420 520"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full"
      role="img"
      aria-label={alt}
    >
      <defs>
        <linearGradient id="tac-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e2234" />
          <stop offset="52%" stopColor="#123a3f" />
          <stop offset="100%" stopColor="#070b0f" />
        </linearGradient>
      </defs>
      <rect width="420" height="520" fill="url(#tac-bg)" />
      <g stroke="#38f2c8" strokeOpacity="0.22" strokeWidth="2" fill="none">
        <path d="M40 310L110 110H310L380 310Z" />
        <line x1="75" y1="210" x2="345" y2="210" />
        <circle cx="210" cy="210" r="38" />
        <path d="M160 110V152H260V110" />
      </g>
      {[
        [210, 140],
        [135, 195],
        [285, 195],
        [170, 238],
        [250, 238],
        [210, 278],
      ].map(([cx, cy], idx) => (
        <g key={idx}>
          <circle cx={cx} cy={cy} r="10" fill="#38f2c8" fillOpacity="0.18" />
          <circle cx={cx} cy={cy} r="4.5" fill="#b8fff0" />
        </g>
      ))}
      <rect width="420" height="520" fill="url(#bottom-scrim)" />
    </svg>
  );
};

export const OvrDiamond: React.FC<{ ovr: number; delta?: number; size?: 'sm' | 'md' | 'lg' }> = ({
  ovr,
  delta = 0,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-14 h-14 text-2xl' : 'w-11 h-11 text-lg';
  const borderColor =
    delta > 0
      ? 'border-[#38f2c8]/85 bg-[#123d38]/70 text-[#b8fff0]'
      : delta < 0
      ? 'border-[#f05252]/85 bg-[#3d171c]/70 text-[#ffb4b4]'
      : 'border-white/45 bg-[#122434]/75 text-white';

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div className={`${dim} relative flex items-center justify-center font-display font-extrabold tabular-nums`}>
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

export const MarqueePlayerCutout: React.FC<{
  name: string;
  className?: string;
  useFallback?: boolean;
  alt?: string;
}> = ({
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
