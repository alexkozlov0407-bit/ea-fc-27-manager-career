import React, { useEffect, useRef, useState } from 'react';
import { Check, Smile, Zap } from 'lucide-react';
import { formatMoney } from '../../engine/ratings';
import { CareerState, Player } from '../../engine/types';
import { useCareerStore } from '../../store/careerStore';
import { PadGlyph } from '../fc/HubCarousel';
import { contractMonthsLeft, deltaTone, signedOvr, splitName } from './playerFormat';

/**
 * Player Actions (Action List) — 1:1 with the Squad Hub "Harry Maguire" capture:
 * dark-red stage, name header, action list (focused frosted row), shield card with the headshot,
 * Dynamic OVR + form/morale/fitness deltas, Age / Weekly Wage / Value and "△ View Player Profile".
 * Keys: W/S · ✕ Space/Enter select · ◯ Esc back · △ T view profile.
 */

type View = 'list' | 'dev' | 'kit' | 'release';
const DEV_OPTIONS = [
  { mode: 'Balanced' as const, label: 'Balanced', desc: 'Even attribute growth across the whole profile.' },
  { mode: 'RoleFocus' as const, label: 'Role Focus', desc: 'Prioritise the attributes that drive the current FC IQ role.' },
];

interface Props {
  career: CareerState;
  player: Player;
  onClose: () => void;
  onViewProfile: () => void;
}

export const PlayerActionsScreen: React.FC<Props> = ({ career, player, onClose, onViewProfile }) => {
  const startNegotiation = useCareerStore((s) => s.startNegotiation);
  const delegateRenewal = useCareerStore((s) => s.delegateContractRenewal);
  const toggleTransferList = useCareerStore((s) => s.toggleTransferList);
  const toggleLoanList = useCareerStore((s) => s.toggleLoanList);
  const toggleBlockOffers = useCareerStore((s) => s.toggleBlockOffers);
  const releasePlayer = useCareerStore((s) => s.releasePlayer);
  const cancelNegotiation = useCareerStore((s) => s.cancelNegotiation);
  const updateDevelopmentPlan = useCareerStore((s) => s.updateDevelopmentPlan);
  const setJerseyNumber = useCareerStore((s) => s.setJerseyNumber);

  const [view, setView] = useState<View>('list');
  const [idx, setIdx] = useState(0);
  const [kit, setKit] = useState(player.jerseyNumber);
  const cur = career.settings.currency;

  const renewal = career.negotiations.find(
    (n) => n.type === 'CONTRACT' && n.playerId === player.id && !['COMPLETED', 'COLLAPSED', 'REJECTED'].includes(n.stage)
  );
  const squad = Object.values(career.players).filter((p) => p.clubId === player.clubId);
  const kitOwner = squad.find((p) => p.id !== player.id && p.jerseyNumber === kit);
  const compensation = Math.round(player.weeklyWageEur * Math.min(52, contractMonthsLeft(player.contractEndYear, career.currentDate) * 4.33) * 0.5);

  const actions: { id: string; label: string; run: () => void }[] = [
    { id: 'negotiate', label: renewal ? 'Continue Contract Negotiation' : 'Negotiate Contract', run: () => { onClose(); startNegotiation(player.id, 'CONTRACT'); } },
    ...(renewal?.stage === 'DELEGATED'
      ? []
      : [{ id: 'delegate', label: 'Delegate Contract Negotiation', run: () => { delegateRenewal(player.id); onClose(); } }]),
    { id: 'transfer', label: player.transferListed ? 'Remove from Transfer List' : 'Add to Transfer List', run: () => toggleTransferList(player.id) },
    { id: 'loan', label: player.loanListed ? 'Remove from Loan List' : 'Add to Loan List', run: () => toggleLoanList(player.id) },
    { id: 'block', label: player.offersBlocked ? 'Unblock Offers' : 'Block Offers', run: () => toggleBlockOffers(player.id) },
    { id: 'release', label: 'Release Player', run: () => { setView('release'); setIdx(1); } },
    ...(renewal ? [{ id: 'dismiss', label: 'Dismiss Renewal', run: () => cancelNegotiation(renewal.id) }] : []),
    { id: 'dev', label: 'Development Plan', run: () => { setView('dev'); setIdx(Math.max(0, DEV_OPTIONS.findIndex((o) => o.mode === player.developmentPlan.mode))); } },
    { id: 'kit', label: 'Change Kit Number', run: () => { setView('kit'); setKit(player.jerseyNumber); } },
  ];

  const releaseOptions = [
    { id: 'confirm', label: `Release for ${formatMoney(compensation, cur)}`, run: () => { releasePlayer(player.id); onClose(); } },
    { id: 'cancel', label: 'Keep Player', run: () => { setView('list'); setIdx(actions.findIndex((a) => a.id === 'release')); } },
  ];

  const backToList = (id: string) => {
    setView('list');
    setIdx(Math.max(0, actions.findIndex((a) => a.id === id)));
  };

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    e.preventDefault();
    e.stopImmediatePropagation();
    const up = k === 'w' || k === 'ArrowUp';
    const down = k === 's' || k === 'ArrowDown';
    const confirm = (k === ' ' || k === 'Enter') && !e.repeat;
    const back = k === 'Escape' || k === 'b';
    if (k === 't') return onViewProfile();
    if (view === 'kit') {
      if (back) backToList('kit');
      else if (k === 'a' || k === 'ArrowLeft' || down) setKit((n) => ((n - 2 + 99) % 99) + 1);
      else if (k === 'd' || k === 'ArrowRight' || up) setKit((n) => (n % 99) + 1);
      else if (confirm && !kitOwner) {
        setJerseyNumber(player.id, kit);
        backToList('kit');
      }
      return;
    }
    const list = view === 'list' ? actions : view === 'dev' ? DEV_OPTIONS : releaseOptions;
    if (back) {
      if (view === 'list') onClose();
      else backToList(view === 'dev' ? 'dev' : 'release');
    } else if (up) setIdx((i) => Math.max(0, i - 1));
    else if (down) setIdx((i) => Math.min(list.length - 1, i + 1));
    else if (confirm) {
      if (view === 'list') actions[idx]?.run();
      else if (view === 'dev') {
        updateDevelopmentPlan(player.id, DEV_OPTIONS[idx].mode);
        backToList('dev');
      } else releaseOptions[idx]?.run();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const { first, last } = splitName(player);
  const d = player.dynamicOvr;
  const rowCls = (focused: boolean) =>
    `relative block w-full text-left px-[1.3vw] h-[7.55vh] text-[clamp(13px,1.18vw,22px)] ${focused ? 'font-bold rounded-[6px]' : 'text-white/75 border-b border-white/15'}`;
  const focusedStyle = {
    background: 'linear-gradient(100deg, rgba(96,150,150,0.62) 0%, rgba(70,86,106,0.7) 60%, rgba(96,90,138,0.62) 100%)',
    border: '1.5px solid rgba(214,232,255,0.65)',
    boxShadow: '0 0 22px rgba(160,200,230,0.18)',
  };

  return (
    <div className="fixed inset-0 z-50 text-white select-none" role="dialog" aria-modal="true" aria-label={`Actions for ${player.knownAs}`}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(55% 45% at 50% 0%, #4a1d19 0%, #2a1514 45%, #171313 78%, #131212 100%)' }} />

      {/* Left: name + actions */}
      <div className="absolute left-[12.6vw] top-[10vh] w-[25.8vw]">
        <div className="uppercase tracking-[0.04em] text-white/70 text-[clamp(13px,1.22vw,23px)]">{first}</div>
        <div className="font-expanded font-black uppercase text-[clamp(26px,2.45vw,46px)] leading-tight truncate">{last}</div>
      </div>
      <div className="absolute left-[11.4vw] top-[21.9vh] w-[25.8vw]">
        {view === 'list' &&
          actions.map((a, i) => (
            <button key={a.id} type="button" onMouseEnter={() => setIdx(i)} onClick={a.run} className={rowCls(i === idx)} style={i === idx ? focusedStyle : undefined}>
              {a.label}
            </button>
          ))}
        {view === 'dev' &&
          DEV_OPTIONS.map((o, i) => (
            <button
              key={o.mode}
              type="button"
              onMouseEnter={() => setIdx(i)}
              onClick={() => { updateDevelopmentPlan(player.id, o.mode); backToList('dev'); }}
              className={`${rowCls(i === idx)} h-auto py-[1.6vh]`}
              style={i === idx ? focusedStyle : undefined}
            >
              <span className="flex items-center justify-between">
                {o.label}
                {player.developmentPlan.mode === o.mode && <Check className="w-[1.2vw] h-[1.2vw] min-w-[14px]" />}
              </span>
              <span className="mt-[0.4vh] block text-[0.78em] font-normal text-white/65">{o.desc}</span>
            </button>
          ))}
        {view === 'release' && (
          <>
            <p className="mb-[2vh] text-white/80 text-[clamp(12px,1.05vw,20px)] leading-snug">
              Release {player.knownAs}? Half of his remaining contract ({formatMoney(compensation, cur)}) is paid off and he leaves on a free transfer.
            </p>
            {releaseOptions.map((o, i) => (
              <button key={o.id} type="button" onMouseEnter={() => setIdx(i)} onClick={o.run} className={rowCls(i === idx)} style={i === idx ? focusedStyle : undefined}>
                {o.label}
              </button>
            ))}
          </>
        )}
        {view === 'kit' && (
          <div className="rounded-[6px] px-[1.3vw] py-[3vh]" style={focusedStyle}>
            <div className="font-bold text-[clamp(13px,1.18vw,22px)]">Change Kit Number</div>
            <div className="mt-[2vh] flex items-center justify-center gap-[2vw]">
              <button type="button" aria-label="Previous number" onClick={() => setKit((n) => ((n - 2 + 99) % 99) + 1)} className="text-[1.6vw]">◀</button>
              <span className="font-expanded font-black tabular-nums text-[clamp(40px,4.6vw,88px)] w-[8vw] text-center">{kit}</span>
              <button type="button" aria-label="Next number" onClick={() => setKit((n) => (n % 99) + 1)} className="text-[1.6vw]">▶</button>
            </div>
            <div className={`mt-[1.4vh] text-center text-[clamp(11px,0.98vw,18px)] ${kitOwner ? 'text-amber-300' : 'text-white/70'}`}>
              {kitOwner ? `Worn by ${kitOwner.knownAs}` : 'Available · ✕ to confirm'}
            </div>
          </div>
        )}
      </div>

      {/* Right: shield card */}
      <div className="absolute left-[62vw] top-[25vh] w-[14.6vw] h-[29.4vh]" aria-hidden>
        <svg viewBox="0 0 264 294" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pa-shield" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(120,64,60,0.55)" />
              <stop offset="100%" stopColor="rgba(40,24,26,0.75)" />
            </linearGradient>
          </defs>
          <path d="M2 16 L132 2 L262 16 V244 L132 292 L2 244 Z" fill="url(#pa-shield)" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
        </svg>
        <div className="absolute inset-x-0 top-[9%] h-[56%] flex items-end justify-center overflow-hidden">
          {player.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="h-full w-auto object-contain object-bottom" />
          ) : (
            <svg viewBox="0 0 100 92" className="h-[80%] w-auto">
              <ellipse cx="50" cy="34" rx="19" ry="23" fill="rgba(214,222,234,0.3)" />
              <path d="M8 92 C10 66 28 58 50 58 C72 58 90 66 92 92 Z" fill="rgba(214,222,234,0.22)" />
            </svg>
          )}
        </div>
        <div className="absolute inset-x-0 top-[70%] text-center">
          <div className="uppercase tracking-[0.04em] text-white/55 text-[clamp(11px,1.02vw,19px)]">{first}</div>
          <div className="font-expanded font-black uppercase text-[clamp(16px,1.65vw,31px)] leading-tight truncate px-[0.5vw]">{last}</div>
        </div>
      </div>

      {/* crosshair marks */}
      {['left-[56vw] top-[57.6vh]', 'left-[82.4vw] top-[57.6vh]', 'left-[56vw] top-[79.4vh]', 'left-[82.4vw] top-[79.4vh]'].map((c) => (
        <span key={c} className={`absolute ${c} text-white/40 text-[clamp(14px,1.4vw,26px)] leading-none -translate-x-1/2 -translate-y-1/2`}>+</span>
      ))}

      <div className="absolute left-[57.2vw] w-[24vw] top-[59.6vh]">
        <div className="flex items-center justify-center gap-[0.6vw] text-[clamp(12px,1.12vw,21px)]">
          <span className="relative inline-flex items-center justify-center w-[2.9vw] h-[2.9vw] min-w-[34px] min-h-[34px]">
            <span className="absolute inset-[16%] rotate-45 rounded-[2px] border border-white/30" />
            <span className="relative font-expanded font-black text-[clamp(14px,1.45vw,27px)]">{d.dynamicOvr}</span>
          </span>
          <DeltaChip icon="form" d={d.formDelta} />
          <span className="text-white/30">|</span>
          <DeltaChip icon="morale" d={d.moraleDelta} />
          <span className="text-white/30">|</span>
          <DeltaChip icon="fitness" d={d.fitnessDelta} />
        </div>
        <div className="mt-[2.4vh] text-[clamp(12px,1.12vw,21px)]">
          {(
            [
              ['Age', String(player.age)],
              ['Weekly Wage', formatMoney(player.weeklyWageEur, cur)],
              ['Value (xTV)', formatMoney(player.expectedTransferValue, cur)],
            ] as const
          ).map(([label, value], i) => (
            <div key={label} className={`flex items-center justify-between px-[0.5vw] py-[0.7vh] ${i < 2 ? 'border-b border-white/15' : ''}`}>
              <span className="text-white/80">{label}</span>
              <span className="font-expanded font-black">{value}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={onViewProfile} className="mx-auto mt-[3.6vh] flex items-center gap-[0.5vw] text-[clamp(12px,1.12vw,21px)]">
          <PadGlyph shape="triangle" /> View Player Profile
        </button>
      </div>

      <div className="absolute left-[2vw] bottom-[2.2vh] flex items-center gap-[2vw] text-white/90 text-[clamp(12px,1.1vw,21px)]">
        <span className="flex items-center gap-[0.5vw]"><PadGlyph shape="cross" /> Select</span>
        <button type="button" onClick={onClose} className="flex items-center gap-[0.5vw]"><PadGlyph shape="circle" /> Back</button>
      </div>
    </div>
  );
};

/** "🏃 ○ OVR" / "😊 +1 OVR" / "⚡ ○ OVR" delta chips. */
export const DeltaChip: React.FC<{ icon: 'form' | 'morale' | 'fitness'; d: number }> = ({ icon, d }) => (
  <span className="flex items-center gap-[0.3vw]">
    {icon === 'form' && (
      <svg viewBox="0 0 24 24" className="w-[1.05vw] h-[1.05vw] min-w-[13px] min-h-[13px]" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="14" cy="4" r="2" />
        <path d="M7 21 L10 14 L13 16 L15 10 L19 12 M10 14 L8 11 L12 8 L15 10" />
      </svg>
    )}
    {icon === 'morale' && <Smile className="w-[1.05vw] h-[1.05vw] min-w-[13px] min-h-[13px] text-[#45e07c]" strokeWidth={2.4} />}
    {icon === 'fitness' && <Zap className="w-[1.05vw] h-[1.05vw] min-w-[13px] min-h-[13px] fill-[#45e07c] text-[#45e07c]" />}
    <span style={{ color: deltaTone(d) }}>{d === 0 ? '○' : signedOvr(d)}</span>
    <span>OVR</span>
  </span>
);
