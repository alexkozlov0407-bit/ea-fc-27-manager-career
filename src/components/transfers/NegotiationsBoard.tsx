import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Clock, Info } from 'lucide-react';
import { calculatePlayerInterest, formatMoney } from '../../engine/ratings';
import { computeOfferPayments } from '../../engine/transfers';
import { CareerState, Player, TransferNegotiation } from '../../engine/types';
import { useCareerStore } from '../../store/careerStore';
import { ClubCrest } from '../PlayerAvatar';
import { PadGlyph, PlayerBust } from '../fc/HubCarousel';

/**
 * Transfers › Negotiations — 1:1 with inputs/screenshots/3ef1e889-….png (list + player render + status card)
 * and inputs/screenshots/image (1).png (Transfer Action popup).
 */

export type NegotiationTab = 'Buying' | 'Selling' | 'LoansIn' | 'LoansOut' | 'Contracts';
export const NEGOTIATION_TABS: { id: NegotiationTab; label: string }[] = [
  { id: 'Buying', label: 'Buying' },
  { id: 'Selling', label: 'Selling' },
  { id: 'LoansIn', label: 'Incoming Loans' },
  { id: 'LoansOut', label: 'Outgoing Loans' },
  { id: 'Contracts', label: 'Contract Renewals' },
];

export function negotiationsForTab(career: CareerState, tab: NegotiationTab): TransferNegotiation[] {
  const types = { Buying: ['BUY'], Selling: ['SELL'], LoansIn: ['LOAN_IN'], LoansOut: ['LOAN_OUT'], Contracts: ['CONTRACT'] }[tab];
  return career.negotiations.filter((n) => types.includes(n.type));
}

/** Deals waiting on the manager (yellow "!" — counted in the tab badge). */
export const needsResponse = (n: TransferNegotiation) => n.stage === 'CLUB_TALKS' || n.stage === 'HIJACKED';

type SortKey = 'Default' | 'Club' | 'OVR' | 'Age' | 'Value';
const SORTS: SortKey[] = ['Default', 'Club', 'OVR', 'Age', 'Value'];
const CLOSED = ['COMPLETED', 'COLLAPSED', 'REJECTED', 'AGREED'];

const shortName = (p: Player) => {
  const parts = p.knownAs.split(' ');
  return parts.length > 1 ? `${(p.firstName || parts[0])[0]}. ${parts.slice(1).join(' ')}` : p.knownAs;
};

function statusTitle(n: TransferNegotiation): string {
  switch (n.stage) {
    case 'ENQUIRY':
      return 'AWAITING RESPONSE';
    case 'CLUB_TALKS':
      return n.type === 'SELL' || n.type === 'LOAN_OUT' ? 'OFFER RECEIVED' : 'CLUB NEGOTIATION';
    case 'PLAYER_TALKS':
      return n.type === 'CONTRACT' ? 'CONTRACT RENEWAL' : 'PLAYER NEGOTIATION';
    case 'DELEGATED':
      return 'AWAITING RESPONSE';
    case 'HIJACKED':
      return 'RIVAL BID RECEIVED';
    case 'AGREED':
      return 'DEAL AGREED';
    case 'COMPLETED':
      return n.type === 'CONTRACT' ? 'CONTRACT SIGNED' : 'TRANSFER COMPLETED';
    case 'COLLAPSED':
      return 'TALKS COLLAPSED';
    case 'REJECTED':
      return 'ENQUIRY REJECTED';
  }
}

/**
 * Status column glyph (FC 27 set): yellow ! = your move · orange ! = rival bid · blue shield + clock = awaiting
 * the other side · blue person + clock = player talks · green shield ✓ = agreed · grey shield − = ended.
 */
export const StatusGlyph: React.FC<{ n: TransferNegotiation; size?: string }> = ({ n, size = 'w-[1.9vw] h-[1.9vw] min-w-[22px] min-h-[22px]' }) => {
  const shield = (fill: string, inner: React.ReactNode) => (
    <span className={`relative inline-flex items-center justify-center ${size}`}>
      <svg viewBox="0 0 24 28" className="absolute inset-0 w-full h-full"><path d="M2 3 C8 1 16 1 22 3 V15 C22 21 16 25 12 27 C8 25 2 21 2 15 Z" fill={fill} /></svg>
      {inner}
    </span>
  );
  const clockBadge = (
    <span className="absolute -right-[18%] -bottom-[12%] inline-flex items-center justify-center w-[58%] h-[58%] rounded-full bg-white border-2 border-[#3d8ef0]">
      <Clock className="w-[80%] h-[80%] text-[#3d8ef0]" strokeWidth={3} />
    </span>
  );
  if (n.stage === 'COMPLETED' || n.stage === 'AGREED') return shield('#2fbf5b', <Check className="relative w-[55%] h-[55%] text-white" strokeWidth={3.5} />);
  if (n.stage === 'COLLAPSED' || n.stage === 'REJECTED') return shield('#8d949c', <span className="relative h-[12%] w-[46%] rounded bg-white" />);
  if (n.stage === 'ENQUIRY' || n.stage === 'DELEGATED') return shield('#2f86f0', clockBadge);
  if (n.stage === 'PLAYER_TALKS')
    return (
      <span className={`relative inline-flex items-center justify-center ${size}`}>
        <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full" aria-hidden>
          <circle cx="12" cy="7" r="5" fill="#2f86f0" />
          <path d="M2 23 C3 16 7 13.5 12 13.5 C17 13.5 21 16 22 23 Z" fill="#2f86f0" />
        </svg>
        {clockBadge}
      </span>
    );
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-black text-[#1a1606] ${n.stage === 'HIJACKED' ? 'bg-[#f08a3a]' : 'bg-[#f2d14a]'} ${size}`}>
      <span className="text-[clamp(11px,1vw,18px)] leading-none">!</span>
    </span>
  );
};

// ---------------------------------------------------------------------------
interface BoardProps {
  career: CareerState;
  tab: NegotiationTab;
  daysToClose: number;
  onOpenCall: (negId: string) => void;
}

export const NegotiationsBoard: React.FC<BoardProps> = ({ career, tab, daysToClose, onOpenCall }) => {
  const [row, setRow] = useState(0);
  const [sort, setSort] = useState<SortKey>('Default');
  const [popup, setPopup] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cur = career.settings.currency;
  const userClub = career.clubs[career.userClubId];

  /** Club on the other side of the deal (buyer when selling, seller when buying, own club for renewals). */
  const counterpartId = (n: TransferNegotiation) =>
    n.type === 'CONTRACT' ? career.userClubId : n.fromClubId === career.userClubId ? n.toClubId : n.fromClubId;
  const ownPlayers = tab === 'Selling' || tab === 'LoansOut' || tab === 'Contracts';

  const negs = negotiationsForTab(career, tab)
    .map((n) => ({ n, p: career.players[n.playerId] }))
    .filter((x): x is { n: TransferNegotiation; p: Player } => Boolean(x.p));
  if (sort !== 'Default') {
    negs.sort((a, b) =>
      sort === 'Club'
        ? (career.clubs[counterpartId(a.n)]?.name ?? '').localeCompare(career.clubs[counterpartId(b.n)]?.name ?? '')
        : sort === 'OVR'
        ? b.p.dynamicOvr.dynamicOvr - a.p.dynamicOvr.dynamicOvr
        : sort === 'Age'
        ? a.p.age - b.p.age
        : b.p.expectedTransferValue - a.p.expectedTransferValue
    );
  }
  const focusIdx = Math.min(row, Math.max(0, negs.length - 1));
  const focused = negs[focusIdx];

  useEffect(() => setRow(0), [tab]);
  useLayoutEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${focusIdx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx]);

  // List keys (bubble phase; the popup and the call capture their own keys).
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (popup !== null) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'w' || k === 'ArrowUp') {
      e.preventDefault();
      setRow(Math.max(0, focusIdx - 1));
    } else if (k === 's' || k === 'ArrowDown') {
      e.preventDefault();
      setRow(Math.min(negs.length - 1, focusIdx + 1));
    } else if ((k === ' ' || k === 'Enter') && !e.repeat && focused) {
      e.preventDefault();
      setPopup(focusIdx);
    } else if (k === 'f') {
      e.preventDefault();
      setSort((s) => SORTS[(SORTS.indexOf(s) + 1) % SORTS.length]);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sortArrow = (k: SortKey) => (sort === k ? ' ▲' : '');
  const grid = 'grid grid-cols-[4.6vw_6.2vw_minmax(0,1fr)_4.6vw_4vw_7.6vw_4.6vw] items-center whitespace-nowrap';
  const focusedClub = focused ? career.clubs[focused.p.clubId] : undefined;
  const counterpartClub = focused ? career.clubs[counterpartId(focused.n)] ?? focusedClub : undefined;
  const interest =
    focused && (focused.n.type === 'BUY' || focused.n.type === 'LOAN_IN')
      ? calculatePlayerInterest(focused.p, userClub, focusedClub, focused.n.desiredRole, focused.n.currentOffer.wageEur || focused.n.askingWageEur)
      : null;
  const interestTone = interest ? { 'VERY HIGH': '#45e07c', HIGH: '#9be26a', MEDIUM: '#f5c344', LOW: '#ff6b5a' }[interest.label] : undefined;

  return (
    <div className="relative h-[calc(100vh-75px-13vh)] min-h-[520px]">
      {/* ---------------------------------------------- List */}
      <div className="absolute left-[3.4vw] top-[2vh] w-[45.4vw]">
        <div className={`${grid} h-[4.6vh] border-b border-white/15 text-white/80 text-[clamp(11px,0.98vw,18px)]`}>
          <span className="pl-[0.6vw]">{tab === 'Selling' || tab === 'LoansOut' ? 'From' : 'Club'}{sortArrow('Club') || (sort === 'Default' ? ' ▲' : '')}</span>
          <span />
          <span>Name</span>
          <span className="text-center">OVR{sortArrow('OVR')}</span>
          <span className="text-center">Age{sortArrow('Age')}</span>
          <span className="text-center">Value (xTV){sortArrow('Value')}</span>
          <span className="text-center">Status</span>
        </div>
        <div ref={listRef} className="max-h-[61vh] overflow-y-auto pr-[0.3vw]">
          {negs.length === 0 && (
            <div className="py-[8vh] text-center text-white/60 text-[clamp(12px,1.05vw,20px)]">
              {tab === 'Contracts'
                ? 'No contract renewals in progress. Open Squad Hub › Player Actions › Contract Renewal to start one.'
                : tab === 'Buying'
                ? 'No active negotiations. Find targets in Scouting to make an approach.'
                : tab === 'Selling'
                ? 'No offers for your players. Transfer-list a player to attract bids.'
                : 'No loan negotiations in progress.'}
            </div>
          )}
          {negs.map(({ n, p }, i) => {
            const isFocused = i === focusIdx;
            return (
              <div
                key={n.id}
                data-row={i}
                role="button"
                tabIndex={-1}
                onMouseEnter={() => setRow(i)}
                onClick={() => (isFocused ? setPopup(i) : setRow(i))}
                className={`${grid} relative h-[7.4vh] cursor-pointer text-[clamp(12px,1.05vw,20px)] ${isFocused ? 'z-10' : 'border-b border-white/15'}`}
                style={
                  isFocused
                    ? {
                        background: 'linear-gradient(100deg, rgba(150,164,196,0.5), rgba(104,118,150,0.48) 60%, rgba(120,112,160,0.46))',
                        border: '1.5px solid rgba(226,234,255,0.75)',
                        borderRadius: 6,
                        boxShadow: '0 0 22px rgba(196,210,255,0.25)',
                        margin: '0 -0.5vw',
                        padding: '0 0.5vw',
                      }
                    : undefined
                }
              >
                <span className={`h-full flex items-center justify-center ${isFocused ? '' : 'bg-black/15'}`}>
                  <ClubCrest club={career.clubs[counterpartId(n)]} size={30} />
                </span>
                <span className="relative h-full flex items-end overflow-hidden">
                  {ownPlayers && (
                    <span className="absolute left-[0.4vw] top-1/2 -translate-y-1/2 font-display font-light text-white/20 text-[clamp(26px,2.6vw,50px)] leading-none">
                      {p.jerseyNumber}
                    </span>
                  )}
                  <span className="relative ml-auto"><PlayerBust src={p.headshotUrl} alt={p.knownAs} /></span>
                </span>
                <span className={`truncate pl-[0.6vw] ${isFocused ? 'font-bold' : ''}`}>{shortName(p)}</span>
                <span className="flex justify-center">
                  <span className="relative inline-flex items-center justify-center w-[2.6vw] h-[2.6vw] min-w-[30px] min-h-[30px]">
                    <span className="absolute inset-[18%] rotate-45 rounded-[2px] border border-white/25" />
                    <span className="relative font-expanded font-black">{p.dynamicOvr.dynamicOvr}</span>
                  </span>
                </span>
                <span className="text-center tabular-nums">{p.age}</span>
                <span className={`text-center tabular-nums ${isFocused ? 'font-bold' : ''}`}>{formatMoney(p.expectedTransferValue, cur)}</span>
                <span className="flex justify-center"><StatusGlyph n={n} /></span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------- Player render + status card */}
      {focused && (
        <>
          <div className="absolute right-[13vw] top-[2vh] h-[44vh] w-[26vw] flex items-end justify-center pointer-events-none" style={{ maskImage: 'linear-gradient(180deg, #000 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 70%, transparent 100%)' }}>
            <PlayerRender p={focused.p} />
          </div>
          <div className="absolute right-[4.2vw] top-[27vh] text-right">
            {interest ? (
              <>
                <div className="text-white/90 text-[clamp(12px,1.08vw,20px)]">Player Interest</div>
                <div className="font-expanded font-black text-[clamp(13px,1.2vw,22px)]" style={{ color: interestTone }}>{interest.label}</div>
              </>
            ) : (
              <>
                <div className="text-white/90 text-[clamp(12px,1.08vw,20px)]">Days Open</div>
                <div className="font-expanded font-black text-[clamp(13px,1.2vw,22px)]">{focused.n.daysOpen}</div>
              </>
            )}
            <div className="mt-[0.8vh] text-white/85 text-[clamp(11px,1vw,19px)]">Scout Recommendations</div>
          </div>

          <div className="absolute left-[52.2vw] right-[4.2vw] top-[44vh]">
            <div className="ml-auto w-fit rounded-t-[6px] bg-[#141c28]/90 px-[1vw] py-[0.6vh] text-[clamp(11px,0.98vw,18px)]">
              Transfer Window {career.transferWindowOpen ? <>Closes in: <span className="text-[#f5c344]">{daysToClose} Days</span></> : <span className="text-white/60">Closed</span>}
            </div>
            <div className="rounded-[10px] rounded-tr-none px-[2.4vw] py-[2.4vh]" style={{ background: 'linear-gradient(180deg, rgba(150,164,190,0.36), rgba(110,124,150,0.32))', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-[1.4vw]">
                <ClubCrest club={counterpartClub} size={58} />
                <div className="min-w-0">
                  <div className="text-white/75 text-[clamp(11px,1.02vw,19px)] truncate">{counterpartClub?.name || focused.n.counterpartClubName}</div>
                  <div className="flex items-center gap-[0.8vw]">
                    <StatusGlyph n={focused.n} size="w-[1.7vw] h-[1.7vw] min-w-[20px] min-h-[20px]" />
                    <span className="font-expanded font-black text-[clamp(15px,1.6vw,30px)] truncate">{statusTitle(focused.n)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-[2.4vh] grid grid-cols-2 gap-[2vw]">
                {(focused.n.type === 'CONTRACT' || focused.n.stage === 'PLAYER_TALKS'
                  ? ([
                      ['Wage Demand', `${formatMoney(focused.n.askingWageEur, cur)}/wk`],
                      ['Contract', `${focused.n.desiredYears} Years · ${focused.n.desiredRole}`],
                    ] as const)
                  : ([
                      [focused.n.type === 'SELL' || focused.n.type === 'LOAN_OUT' ? 'Transfer Offer' : 'Asking Price', formatMoney(focused.n.askingFeeEur, cur)],
                      [
                        'Bonuses',
                        [
                          focused.n.currentOffer.achievementBonusEur ? `${formatMoney(focused.n.currentOffer.achievementBonusEur, cur)} Add-Ons` : '',
                          focused.n.currentOffer.sellOnClausePct ? `${focused.n.currentOffer.sellOnClausePct}% Sell-On` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'No Bonuses',
                      ],
                    ] as const)
                ).map(([label, value], i) => (
                  <div key={label}>
                    <div className="text-white/85 text-[clamp(12px,1.12vw,21px)]">{label}</div>
                    <div className={`mt-[0.6vh] truncate ${i === 0 ? 'font-expanded font-black text-[clamp(22px,2.3vw,44px)]' : 'text-[clamp(16px,1.55vw,29px)]'}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---------------------------------------------- Controller bar */}
      <div className="absolute left-[2vw] bottom-[2vh] flex items-center gap-[2vw] text-white/90 text-[clamp(12px,1vw,19px)]">
        <span className="flex items-center gap-[0.5vw]"><PadGlyph shape="cross" /> Show Actions</span>
        <button type="button" onClick={() => setSort((s) => SORTS[(SORTS.indexOf(s) + 1) % SORTS.length])} className="flex items-center gap-[0.5vw]">
          <PadGlyph shape="square" /> Sort{sort !== 'Default' ? `: ${sort}` : ''}
        </button>
        <span className="flex items-center gap-[0.5vw] text-white/70">
          <span className="inline-flex gap-[3px]">
            {['A', 'D'].map((k) => (
              <kbd key={k} className="inline-flex items-center justify-center w-[clamp(18px,1.4vw,26px)] h-[clamp(18px,1.4vw,26px)] rounded bg-white/20 text-[clamp(9px,0.72vw,14px)] font-bold">{k}</kbd>
            ))}
          </span>
          Switch List
        </span>
      </div>

      {popup !== null && negs[popup] && (
        <TransferActionPopup
          career={career}
          negotiation={negs[popup].n}
          player={negs[popup].p}
          onClose={() => setPopup(null)}
          onOpenCall={(id) => {
            setPopup(null);
            onOpenCall(id);
          }}
        />
      )}
    </div>
  );
};

/** Large player render; uses the headshot when it loads, otherwise a silhouette placeholder. */
const PlayerRender: React.FC<{ p: Player }> = ({ p }) => {
  const [failed, setFailed] = useState(false);
  if (p.headshotUrl && !failed) {
    return <img src={p.headshotUrl} alt={p.knownAs} onError={() => setFailed(true)} className="h-[78%] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]" />;
  }
  return (
    <svg viewBox="0 0 200 220" className="h-[80%] w-auto" aria-label={`${p.knownAs} (render placeholder)`}>
      <ellipse cx="100" cy="78" rx="44" ry="54" fill="rgba(214,222,234,0.22)" />
      <path d="M10 220 C14 160 56 140 100 140 C144 140 186 160 190 220 Z" fill="rgba(214,222,234,0.16)" />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Transfer Action popup (image (1).png)
// ---------------------------------------------------------------------------
interface PopupAction {
  id: string;
  label: string;
  run: () => void;
}

const TransferActionPopup: React.FC<{
  career: CareerState;
  negotiation: TransferNegotiation;
  player: Player;
  onClose: () => void;
  onOpenCall: (negId: string) => void;
}> = ({ career, negotiation: n, player, onClose, onOpenCall }) => {
  const submitClub = useCareerStore((s) => s.submitClubNegotiationOffer);
  const submitContract = useCareerStore((s) => s.submitContractNegotiationOffer);
  const delegate = useCareerStore((s) => s.delegateNegotiation);
  const cancel = useCareerStore((s) => s.cancelNegotiation);
  const [idx, setIdx] = useState(0);
  const cur = career.settings.currency;
  const userClub = career.clubs[career.userClubId];
  const counterpart = career.clubs[n.fromClubId === career.userClubId ? n.toClubId : n.fromClubId];
  const closed = CLOSED.includes(n.stage);
  const selling = n.type === 'SELL' || n.type === 'LOAN_OUT';
  const acceptFee = () => {
    const { paidNowEur, futurePaymentsEur } = computeOfferPayments(n.askingFeeEur, n.currentOffer.instalments);
    submitClub(n.id, { ...n.currentOffer, transferFeeEur: n.askingFeeEur, paidNowEur, futurePaymentsEur });
  };
  const acceptContract = () =>
    submitContract(n.id, { ...n.currentOffer, wageEur: n.askingWageEur, contractYears: n.desiredYears, squadRole: n.desiredRole });

  const actions: PopupAction[] = closed
    ? [{ id: 'view', label: 'View Negotiation', run: () => onOpenCall(n.id) }]
    : n.stage === 'PLAYER_TALKS' || n.type === 'CONTRACT'
    ? [
        { id: 'accept-contract', label: 'Accept Contract Demands', run: () => { acceptContract(); onClose(); } },
        { id: 'neg-player', label: 'Negotiate with Player', run: () => onOpenCall(n.id) },
        { id: 'end', label: n.type === 'CONTRACT' ? 'End Contract Talks' : 'Withdraw Offer', run: () => { cancel(n.id); onClose(); } },
      ]
    : selling
    ? [
        { id: 'accept-offer', label: 'Accept Transfer Offer', run: () => { acceptFee(); onClose(); } },
        { id: 'neg-club', label: 'Negotiate with Club', run: () => onOpenCall(n.id) },
        { id: 'decline', label: 'Decline Offer', run: () => { cancel(n.id); onClose(); } },
      ]
    : n.stage === 'DELEGATED'
    ? [
        { id: 'view', label: 'View Negotiation', run: () => onOpenCall(n.id) },
        { id: 'withdraw', label: 'Withdraw Offer', run: () => { cancel(n.id); onClose(); } },
      ]
    : [
        { id: 'accept-demands', label: 'Accept Transfer Demands', run: () => { acceptFee(); onClose(); } },
        { id: 'neg-club', label: 'Negotiate with Club', run: () => onOpenCall(n.id) },
        { id: 'delegate', label: 'Delegate to Buy', run: () => { delegate(n.id, Math.round(n.askingFeeEur * 1.02)); onClose(); } },
        { id: 'withdraw', label: 'Withdraw Offer', run: () => { cancel(n.id); onClose(); } },
      ];

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (k === 'w' || k === 'ArrowUp') setIdx((i) => Math.max(0, i - 1));
    else if (k === 's' || k === 'ArrowDown') setIdx((i) => Math.min(actions.length - 1, i + 1));
    else if ((k === ' ' || k === 'Enter') && !e.repeat) actions[idx]?.run();
    else if (k === 'Escape' || k === 'b') onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const fee = n.askingFeeEur;
  const { paidNowEur } = computeOfferPayments(fee, n.currentOffer.instalments);
  const delta = n.type === 'CONTRACT' || n.stage === 'PLAYER_TALKS' ? -(n.askingWageEur * 52) : selling ? paidNowEur : -paidNowEur;
  const budgetAfter = userClub.transferBudgetEur + delta;
  const [first, ...rest] = player.knownAs.split(' ');
  const exchange = n.currentOffer.exchangePlayerId ? career.players[n.currentOffer.exchangePlayerId]?.knownAs : null;
  const statusLine = closed ? statusTitle(n) : n.stage === 'DELEGATED' ? 'DELEGATED TO DIRECTOR' : 'NEGOTIATION ONGOING';

  return (
    <div className="fixed inset-0 z-50 text-white select-none" role="dialog" aria-modal="true" aria-label="Transfer actions">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 55% at 52% 18%, #4a2422 0%, #2a1716 42%, #141012 75%, #0f0d0f 100%)' }} />
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />

      <div className="absolute left-[11.3vw] top-[11vh] w-[26.6vw]">
        <div className="uppercase tracking-[0.06em] text-white/75 text-[clamp(11px,1.1vw,21px)]">{rest.length ? player.firstName || first : player.firstName}</div>
        <div className="font-expanded font-black uppercase text-[clamp(20px,2.3vw,44px)] leading-tight truncate">{rest.length ? rest.join(' ') : first}</div>
        <div className="mt-[3.4vh]">
          {actions.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onMouseEnter={() => setIdx(i)}
              onClick={a.run}
              className={`relative block w-full text-left px-[1.6vw] h-[7.4vh] text-[clamp(12px,1.18vw,22px)] ${i === idx ? 'font-bold rounded-[5px]' : 'text-white/75 border-b border-white/15'}`}
              style={i === idx ? { background: 'linear-gradient(100deg, rgba(120,160,170,0.55), rgba(76,96,116,0.6))', border: '1.5px solid rgba(214,232,255,0.6)' } : undefined}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="mt-[5vh] text-[clamp(12px,1.18vw,22px)]">
          <div className="text-white/85">Potential Budget After Deal</div>
          <div className="flex items-center gap-[0.4vw] text-[clamp(14px,1.45vw,27px)]">
            <span style={{ color: delta < 0 ? '#ff5a3c' : '#45e07c' }}>{delta < 0 ? '▼' : '▲'}</span>
            <span>{formatMoney(budgetAfter, cur, false)}</span>
            <span style={{ color: delta < 0 ? '#ff5a3c' : '#45e07c' }}>({delta < 0 ? '-' : '+'}{formatMoney(Math.abs(delta), cur)})</span>
          </div>
        </div>
      </div>

      {/* Right: scout note, crest shield, terms, status */}
      <div className="absolute left-[50.6vw] top-[10.4vh] w-[38vw] -translate-x-[1vw] flex flex-col items-center text-center pointer-events-none">
        <div className="flex items-center gap-[0.4vw] text-[#3d8ef0] text-[clamp(11px,1.05vw,20px)]">
          <Info className="w-[1.2vw] h-[1.2vw] min-w-[14px] min-h-[14px] fill-[#3d8ef0] text-[#1b1414]" />
          Scout Recommends
        </div>
        <p className="mt-[1vh] w-[34vw] text-white/80 leading-snug text-[clamp(11px,1.05vw,20px)]">{n.scoutRecommendation}</p>
        <div className="relative mt-[3.4vh] w-[15vw] h-[30vh] min-w-[150px]">
          <svg viewBox="0 0 150 176" className="absolute inset-0 w-full h-full" aria-hidden>
            <defs>
              <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(150,70,64,0.85)" />
                <stop offset="100%" stopColor="rgba(60,26,26,0.85)" />
              </linearGradient>
            </defs>
            <path d="M4 18 C40 4 110 4 146 18 V110 C146 140 104 162 75 172 C46 162 4 140 4 110 Z" fill="url(#shieldFill)" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
          </svg>
          <div className="absolute inset-x-0 top-[12%] flex justify-center"><ClubCrest club={counterpart} size={86} /></div>
          <div className="absolute inset-x-0 top-[61%]">
            <div className="text-white/70 text-[clamp(11px,1.05vw,20px)]">{selling ? 'Transfer Offer' : n.type === 'CONTRACT' ? 'Wage Demand' : 'Asking Price'}</div>
            <div className="font-expanded font-black text-[clamp(20px,2.3vw,44px)] leading-none">
              {n.type === 'CONTRACT' || n.stage === 'PLAYER_TALKS' ? `${formatMoney(n.askingWageEur, cur)}/w` : formatMoney(fee, cur)}
            </div>
          </div>
        </div>
        <div className="mt-[4.4vh] font-expanded font-black uppercase text-[clamp(13px,1.3vw,24px)]">{counterpart?.name || n.counterpartClubName}</div>
        <div className="mt-[2.2vh] w-[24vw] text-[clamp(11px,1.05vw,20px)]">
          {(
            [
              ['Achievement Bonus', n.currentOffer.achievementBonusEur ? formatMoney(n.currentOffer.achievementBonusEur, cur) : 'NONE'],
              ['Other Clauses', n.currentOffer.sellOnClausePct ? `${n.currentOffer.sellOnClausePct}% SELL-ON` : 'ADDED'],
              ['Exchange Player', exchange ? exchange.toUpperCase() : 'NONE'],
            ] as const
          ).map(([label, value], i) => (
            <div key={label} className={`flex items-center justify-between py-[0.6vh] ${i < 2 ? 'border-b border-white/15' : ''}`}>
              <span className="text-white/80">{label}</span>
              <span className={`font-expanded font-black ${value === 'NONE' ? 'text-white/55' : ''}`}>{value}</span>
            </div>
          ))}
        </div>
        <div className={`mt-[3.6vh] font-expanded font-black text-[clamp(13px,1.3vw,24px)] ${closed ? (n.stage === 'COMPLETED' || n.stage === 'AGREED' ? 'text-[#45e07c]' : 'text-[#ff5a3c]') : 'text-[#2f8fff]'}`}>
          {statusLine}
        </div>
      </div>

      <div className="absolute left-[2vw] bottom-[2.4vh] flex items-center gap-[2vw] text-white/90 text-[clamp(12px,1vw,19px)] pointer-events-none">
        <span className="flex items-center gap-[0.5vw]"><PadGlyph shape="cross" /> Select</span>
        <span className="flex items-center gap-[0.5vw]"><PadGlyph shape="circle" /> Back</span>
      </div>
    </div>
  );
};
