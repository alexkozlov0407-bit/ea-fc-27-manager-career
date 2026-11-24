import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';

/**
 * FC 27 tab-landing carousel (Squad / Scouting / Academy …).
 * Geometry is measured from the 1804×956 reference captures and expressed in vw/vh
 * so it scales with the viewport the same way the console UI does.
 */
export const CARD_LEFT_VW = 4.55;
export const CARD_WIDTH_VW = 29.6;
export const CARD_STEP_VW = 30.85;
const VISIBLE_CARDS = 3;

export interface HubCard {
  id: string;
  /** Label of the ✕ pill under the focused card, e.g. "Enter Team Strategy". */
  cta: string;
  render: (focused: boolean) => React.ReactNode;
  /** ▢ secondary action shown at the bottom of the card while it is focused. */
  secondary?: { label: string; onAction: () => void };
  /** Page dots + (R) cycler shown next to the secondary action while focused. */
  pager?: { count: number; index: number; onCycle: () => void };
}

interface HubCarouselProps {
  cards: HubCard[];
  focus: number;
  onFocus: (i: number) => void;
  onActivate: (i: number) => void;
}

export const HubCarousel: React.FC<HubCarouselProps> = ({ cards, focus, onFocus, onActivate }) => {
  const offset = Math.max(0, focus - (VISIBLE_CARDS - 1));
  const focusedCard = cards[focus];

  // Keyboard: A/D move, Space/Enter enters, F = ▢ secondary, R = cycle pager.
  const stateRef = useRef({ cards, focus, onFocus, onActivate });
  stateRef.current = { cards, focus, onFocus, onActivate };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const { cards: cs, focus: f, onFocus: setF, onActivate: act } = stateRef.current;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'a' || k === 'ArrowLeft') {
        e.preventDefault();
        setF(Math.max(0, f - 1));
      } else if (k === 'd' || k === 'ArrowRight') {
        e.preventDefault();
        setF(Math.min(cs.length - 1, f + 1));
      } else if ((k === ' ' || k === 'Enter') && !e.repeat) {
        e.preventDefault();
        act(f);
      } else if (k === 'f' && cs[f]?.secondary && !e.repeat) {
        e.preventDefault();
        cs[f].secondary!.onAction();
      } else if (k === 'r' && cs[f]?.pager) {
        e.preventDefault();
        cs[f].pager!.onCycle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative w-full overflow-hidden select-none h-[calc(100vh-75px)] min-h-[620px]">
      <ArenaBackdrop />

      <div
        className="absolute top-[9vh] h-[63vh] min-h-[440px] transition-transform duration-300 ease-out"
        style={{ left: `${CARD_LEFT_VW}vw`, transform: `translateX(-${offset * CARD_STEP_VW}vw)` }}
      >
        {cards.map((card, i) => {
          const focused = i === focus;
          return (
            <div
              key={card.id}
              role="button"
              tabIndex={-1}
              aria-label={card.cta}
              aria-current={focused}
              onMouseEnter={() => onFocus(i)}
              onClick={() => onActivate(i)}
              className={`absolute top-0 cursor-pointer rounded-[6px] pt-[5.2vh] transition-all duration-200 ${
                focused ? 'z-10 -translate-y-[0.9vh] h-[calc(100%+1.8vh)]' : 'h-full'
              }`}
              style={{
                left: `${i * CARD_STEP_VW}vw`,
                width: `${CARD_WIDTH_VW + (focused ? 0.8 : 0)}vw`,
                marginLeft: focused ? '-0.4vw' : 0,
                background: focused
                  ? 'linear-gradient(158deg, rgba(128,146,176,0.62) 0%, rgba(80,98,130,0.58) 46%, rgba(112,106,154,0.56) 100%)'
                  : 'linear-gradient(180deg, rgba(42,57,82,0.84) 0%, rgba(33,46,68,0.88) 100%)',
                border: focused ? '2px solid rgba(232,238,255,0.82)' : '1px solid rgba(255,255,255,0.04)',
                boxShadow: focused
                  ? '0 0 0 1px rgba(255,255,255,0.12), 0 0 34px rgba(196,210,255,0.28), 0 22px 50px rgba(0,0,0,0.45)'
                  : '0 18px 40px rgba(0,0,0,0.35)',
                backdropFilter: 'blur(14px)',
              }}
            >
              {card.render(focused)}

              {focused && (card.secondary || card.pager) && (
                <div className="absolute left-[3.2%] right-[5%] bottom-[2.6vh] flex items-center justify-between">
                  {card.secondary ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        card.secondary!.onAction();
                      }}
                      className="flex items-center gap-[0.7vw] text-white font-medium text-[clamp(13px,1.1vw,21px)]"
                    >
                      <PadGlyph shape="square" />
                      {card.secondary.label}
                    </button>
                  ) : (
                    <span />
                  )}
                  {card.pager && card.pager.count > 1 && (
                    <PagerDots
                      count={card.pager.count}
                      index={card.pager.index}
                      onCycle={(e) => {
                        e.stopPropagation();
                        card.pager!.onCycle();
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ✕ CTA pill, centred under the focused card */}
      {focusedCard && (
        <button
          type="button"
          onClick={() => onActivate(focus)}
          className="absolute top-[calc(9vh+63vh+4.4vh)] -translate-x-1/2 transition-[left] duration-300 ease-out flex items-center gap-[0.75vw] rounded-[6px] px-[1.6vw] h-[clamp(40px,6.4vh,62px)] font-bold text-[#141824] text-[clamp(13px,1.05vw,20px)] whitespace-nowrap"
          style={{
            left: `${CARD_LEFT_VW + (focus - offset) * CARD_STEP_VW + CARD_WIDTH_VW / 2}vw`,
            background: 'linear-gradient(90deg, #d4fff4 0%, #ece2ff 55%, #e6d9ff 100%)',
            boxShadow: '0 0 22px rgba(214,200,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.9)',
          }}
        >
          <PadGlyph shape="cross" dark />
          {focusedCard.cta}
        </button>
      )}
    </div>
  );
};

/** CSS stand-in for the in-game 3D stadium wall (swap for a render when one is available). */
export const ArenaBackdrop: React.FC = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0">
    <div
      className="absolute left-[7vw] right-[6.5vw] top-[1.5vh] h-[62vh]"
      style={{
        background:
          'linear-gradient(100deg, rgba(36,66,108,0.95) 0%, rgba(34,82,104,0.92) 36%, rgba(38,124,108,0.92) 70%, rgba(48,150,120,0.95) 100%)',
        maskImage: 'linear-gradient(180deg, #000 0%, #000 78%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 78%, transparent 100%)',
      }}
    />
    <div
      className="absolute inset-y-0 left-0 w-[9vw]"
      style={{ background: 'linear-gradient(90deg, rgba(8,18,26,0.95), rgba(8,18,26,0))' }}
    />
    <div
      className="absolute inset-y-0 right-0 w-[8vw]"
      style={{ background: 'linear-gradient(270deg, rgba(8,18,26,0.92), rgba(8,18,26,0))' }}
    />
    <div
      className="absolute left-[52vw] top-[-10vh] h-[95vh] w-[1.6vw] rotate-[38deg] opacity-25"
      style={{ background: 'linear-gradient(180deg, rgba(190,255,235,0.0), rgba(190,255,235,0.5), rgba(190,255,235,0))' }}
    />
    <div
      className="absolute inset-x-0 bottom-0 h-[30vh]"
      style={{ background: 'linear-gradient(0deg, rgba(6,12,18,0.96) 0%, rgba(8,16,24,0.7) 55%, rgba(8,16,24,0) 100%)' }}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Card typography + building blocks
// ---------------------------------------------------------------------------
export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-center font-bold text-white tracking-[-0.01em] text-[clamp(22px,1.9vw,38px)] leading-tight px-[4%] whitespace-nowrap">
    {children}
  </h3>
);

export const CardSubtitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mt-[1.2vh] text-center font-bold text-[#8ff0cd] text-[clamp(12px,0.98vw,19px)] ${className}`}>
    {children}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`mx-auto w-[80%] text-center text-[#cbd3de] text-[clamp(12px,1.05vw,20px)] leading-[1.5] ${className}`}>
    {children}
  </p>
);

/** PlayStation face-button glyph used in prompts (✕ ○ ▢ △). */
export const PadGlyph: React.FC<{ shape: 'cross' | 'circle' | 'square' | 'triangle'; dark?: boolean }> = ({ shape, dark }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-full w-[clamp(20px,1.6vw,30px)] h-[clamp(20px,1.6vw,30px)] ${
      dark ? 'bg-[#141824] text-white' : 'bg-white/20 text-white/90'
    }`}
  >
    <svg viewBox="0 0 20 20" className="w-[55%] h-[55%]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      {shape === 'cross' && <path d="M5 5 L15 15 M15 5 L5 15" />}
      {shape === 'circle' && <circle cx="10" cy="10" r="5.5" />}
      {shape === 'square' && <rect x="5" y="5" width="10" height="10" rx="0.5" />}
      {shape === 'triangle' && <path d="M10 4.5 L16 15 H4 Z" strokeLinejoin="round" />}
    </svg>
  </span>
);

export const PagerDots: React.FC<{ count: number; index: number; onCycle?: (e: React.MouseEvent) => void }> = ({
  count,
  index,
  onCycle,
}) => (
  <button type="button" onClick={onCycle} className="flex items-center gap-[0.45vw] text-white/70" aria-label="Next page (R)">
    <span className="text-[clamp(9px,0.7vw,13px)]">◀</span>
    <span className="inline-flex items-center justify-center rounded-full bg-white/25 text-white font-bold w-[clamp(18px,1.35vw,26px)] h-[clamp(18px,1.35vw,26px)] text-[clamp(9px,0.72vw,14px)]">
      R
    </span>
    <span className="text-[clamp(9px,0.7vw,13px)]">▶</span>
    {Array.from({ length: count }, (_, i) => (
      <span
        key={i}
        className={`rounded-full ${i === index ? 'bg-white w-[clamp(8px,0.62vw,12px)] h-[clamp(8px,0.62vw,12px)]' : 'bg-white/45 w-[clamp(5px,0.36vw,7px)] h-[clamp(5px,0.36vw,7px)]'}`}
      />
    ))}
  </button>
);

/** Row of 5 rating stars (filled = gold, empty = grey), as on the scout cards. */
export const StarRating: React.FC<{ value: number; max?: number }> = ({ value, max = 5 }) => (
  <div className="flex items-center justify-center gap-[0.12vw]">
    {Array.from({ length: max }, (_, i) => (
      <Star
        key={i}
        className={`w-[clamp(16px,1.42vw,28px)] h-[clamp(16px,1.42vw,28px)] ${
          i < Math.round(value) ? 'fill-[#d9b45a] text-[#d9b45a]' : 'fill-[#6f7886] text-[#6f7886]'
        }`}
      />
    ))}
  </div>
);

/**
 * Head-and-shoulders render sitting on a row divider. Uses the real headshot when one loads,
 * otherwise a neutral silhouette placeholder (no render available for this player).
 */
export const PlayerBust: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src) && !failed;
  return (
    <div className="relative shrink-0 w-[clamp(60px,5.6vw,108px)] h-[clamp(64px,10.4vh,104px)] flex items-end justify-center overflow-hidden">
      {show ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-auto max-w-none object-contain object-bottom"
        />
      ) : (
        <svg viewBox="0 0 100 92" className="h-[92%] w-auto" aria-label={`${alt} (render placeholder)`}>
          <ellipse cx="50" cy="34" rx="19" ry="23" fill="rgba(214,222,234,0.30)" />
          <path d="M8 92 C10 66 28 58 50 58 C72 58 90 66 92 92 Z" fill="rgba(214,222,234,0.22)" />
        </svg>
      )}
    </div>
  );
};

/** Diamond badge with "–" (rating not yet revealed by scouting). */
export const UnknownDiamond: React.FC = () => (
  <span className="relative inline-flex items-center justify-center w-[clamp(34px,3.1vw,58px)] h-[clamp(34px,3.1vw,58px)]">
    <span className="absolute inset-[14%] rotate-45 border-2 border-white/25 rounded-[3px]" />
    <span className="relative w-[34%] h-[3px] rounded bg-white" />
  </span>
);

/** Circular "Players Found" ring, segmented by position group. */
export const PlayersFoundRing: React.FC<{ segments: { value: number; color: string }[]; label: string }> = ({
  segments,
  label,
}) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 44;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative w-[clamp(64px,5.8vw,110px)] h-[clamp(64px,5.8vw,110px)]">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(220,226,236,0.75)" strokeWidth="3" />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="5"
                strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return el;
          })}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-white font-light text-[clamp(18px,1.65vw,32px)]">
        {label}
      </span>
    </div>
  );
};

/** Simplified national flags drawn in SVG; anything else falls back to a labelled placeholder tile. */
export const FlagTile: React.FC<{ country: string }> = ({ country }) => {
  const cls = 'w-[clamp(72px,7vw,128px)] h-auto shadow-[0_6px_14px_rgba(0,0,0,0.35)]';
  switch (country) {
    case 'England':
      return (
        <svg viewBox="0 0 128 84" className={cls} aria-label="England">
          <rect width="128" height="84" fill="#fff" />
          <rect x="54" width="20" height="84" fill="#ce1124" />
          <rect y="32" width="128" height="20" fill="#ce1124" />
        </svg>
      );
    case 'Spain':
      return (
        <svg viewBox="0 0 128 84" className={cls} aria-label="Spain">
          <rect width="128" height="84" fill="#aa151b" />
          <rect y="21" width="128" height="42" fill="#f1bf00" />
        </svg>
      );
    case 'Germany':
      return (
        <svg viewBox="0 0 128 84" className={cls} aria-label="Germany">
          <rect width="128" height="28" fill="#000" />
          <rect y="28" width="128" height="28" fill="#dd0000" />
          <rect y="56" width="128" height="28" fill="#ffce00" />
        </svg>
      );
    case 'France':
      return (
        <svg viewBox="0 0 128 84" className={cls} aria-label="France">
          <rect width="43" height="84" fill="#002395" />
          <rect x="43" width="42" height="84" fill="#fff" />
          <rect x="85" width="43" height="84" fill="#ed2939" />
        </svg>
      );
    case 'Italy':
      return (
        <svg viewBox="0 0 128 84" className={cls} aria-label="Italy">
          <rect width="43" height="84" fill="#009246" />
          <rect x="43" width="42" height="84" fill="#fff" />
          <rect x="85" width="43" height="84" fill="#ce2b37" />
        </svg>
      );
    case 'United States':
      return (
        <svg viewBox="0 0 128 84" className={cls} aria-label="United States">
          <rect width="128" height="84" fill="#fff" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} y={i * 12.92} width="128" height="6.46" fill="#b22234" />
          ))}
          <rect width="56" height="45" fill="#3c3b6e" />
          {Array.from({ length: 20 }, (_, i) => (
            <circle key={i} cx={6 + (i % 5) * 11} cy={6 + Math.floor(i / 5) * 11} r="1.8" fill="#fff" />
          ))}
        </svg>
      );
    default:
      return (
        <div className={`${cls} aspect-[128/84] flex items-center justify-center border border-dashed border-white/40 bg-white/10 text-[10px] font-bold uppercase text-white/70`}>
          {country.slice(0, 3)} flag
        </div>
      );
  }
};

/** White shield with mortarboard, used on the Academy cards. */
export const AcademyShieldIcon: React.FC = () => (
  <svg viewBox="0 0 150 176" className="w-[clamp(84px,8.1vw,148px)] h-auto" aria-hidden>
    <path d="M0 0 H150 V128 L75 176 L0 128 Z" fill="#eef0f3" />
    <g fill="#2f3d52">
      <path d="M75 44 L128 66 L75 88 L22 66 Z" />
      <path d="M44 80 V104 C44 112 106 112 106 104 V80 L75 93 Z" />
    </g>
    <path d="M118 70 V102" stroke="#2f3d52" strokeWidth="4" />
    <rect x="114" y="100" width="8" height="12" fill="#2f3d52" />
  </svg>
);

/** ◯ Back: Esc / B runs `onBack` while `active` (ignored while typing in a field). */
export function useBackKey(active: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        cb.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

/**
 * Layer-3 breadcrumb header (e.g. "Office | Finances", "Squad | Team Management") with L1/R1 sub-tabs.
 * Gaps are measured from the FC 27 captures: parent → title 2.45vw, title → divider 2.35vw, divider → tabs 2.3vw.
 */
export const LayerHeader: React.FC<{
  parent: string;
  title: string;
  tabs: readonly string[];
  active: string;
  onTab: (tab: string) => void;
  right?: React.ReactNode;
  /** Show the L1/R1 bumper chips above the tabs (hidden when there is only one tab). */
  bumpers?: boolean;
}> = ({ parent, title, tabs, active, onTab, right, bumpers = true }) => (
  <header className="relative h-[13vh] min-h-[90px]">
    <img
      src="/assets/branding/mc-logo-transparent.png"
      alt="Manager Career"
      className="absolute left-[1.95vw] top-[4.4vh] w-[clamp(44px,3.8vw,70px)] h-[clamp(44px,3.8vw,70px)] rounded-full object-contain"
    />
    <div className="absolute left-[8vw] top-[5.6vh] flex items-center">
      <span className="text-[clamp(13px,1.1vw,21px)] text-white/75">{parent}</span>
      <span className="ml-[2.45vw] text-[clamp(17px,1.5vw,28px)] font-bold">{title}</span>
      <span className="ml-[2.35vw] h-[4vh] w-px bg-white/30" />
      <nav className="relative ml-[2.3vw] flex gap-[2.3vw]" aria-label={`${title} sections`}>
        <div className={`absolute left-[0.7vw] -top-[4.6vh] flex gap-[0.5vw] ${bumpers ? '' : 'hidden'}`}>
          {['L1', 'R1'].map((b) => (
            <span key={b} className="rounded-md bg-white/15 px-[0.35vw] text-[clamp(8px,0.6vw,11px)] font-bold text-white/70">
              {b}
            </span>
          ))}
        </div>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTab(t)}
            className={`text-[clamp(13px,1.12vw,21px)] ${active === t ? 'font-bold text-white' : 'text-white/60 hover:text-white/90'}`}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
    {right}
  </header>
);

/** Full-screen layer background (blue → green menu wash with faint light facets). */
export const LayerBackdrop: React.FC = () => (
  <>
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'linear-gradient(112deg, #1a2244 0%, #1c2a57 22%, #1b3f60 46%, #1c5f58 70%, #22805a 88%, #2c935e 100%)' }}
    />
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none opacity-60"
      style={{
        backgroundImage:
          'linear-gradient(128deg, transparent 54%, rgba(255,255,255,0.05) 54.2%, rgba(255,255,255,0.05) 54.5%, transparent 54.7%), linear-gradient(32deg, transparent 70%, rgba(170,255,220,0.06) 70.2%, rgba(170,255,220,0.06) 70.6%, transparent 70.8%), radial-gradient(60% 50% at 8% 40%, rgba(70,60,140,0.35), transparent 70%)',
      }}
    />
  </>
);
