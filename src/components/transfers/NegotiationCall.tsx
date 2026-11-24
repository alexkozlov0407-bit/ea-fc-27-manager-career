import React, { useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import { formatMoney } from '../../engine/ratings';
import { computeOfferPayments } from '../../engine/transfers';
import { NegotiationOffer, SquadRole, TransferNegotiation } from '../../engine/types';
import { useCareerStore } from '../../store/careerStore';
import { PadGlyph, PlayerBust } from '../fc/HubCarousel';

/**
 * 2D Live Negotiation Call — 1:1 with inputs/screenshots/411fdc61-….png.
 * Left: offer terms (focused row is the frosted card with ◂ value ▸ and EDIT), payment summary, Make Offer.
 * Right: "On call with" card, tension gauge + pill, manager dialogue, tilted player card, hold-to-end phone.
 *
 * Keys: W/S row · A/D adjust · F edit terms (type an amount) · Space/Enter submit ·
 *       Esc tap = leave call (talks stay open) · hold Esc = walk away (end negotiation) ·
 *       hold R = reset offer · T = delegate to director (club talks when buying).
 */

const CURRENCY_RATE = { EUR: 1, USD: 1.1, GBP: 0.85 } as const;
const ACHIEVEMENT_BONUS = [0, 2_000_000, 5_000_000, 10_000_000];
const SIGNING_BONUS = [0, 500_000, 1_500_000, 3_000_000];
const ROLES: SquadRole[] = ['Crucial', 'Important', 'Rotation', 'Sporadic', 'Prospect'];
const HOLD_MS = 800;

type RowId = 'start' | 'fee' | 'instalments' | 'exchange' | 'bonus' | 'sellOn' | 'clauses' | 'wage' | 'role' | 'years' | 'signing';
interface Row {
  id: RowId;
  label: string;
  value: string;
  adjust?: (dir: -1 | 1) => void;
  /** Free amount entry via ▢ Edit Terms (EUR). */
  amount?: { get: () => number; set: (eur: number) => void };
}

const cycle = <T,>(list: readonly T[], cur: T, dir: -1 | 1): T => {
  const i = Math.max(0, list.indexOf(cur));
  return list[(i + dir + list.length) % list.length];
};

export const NegotiationCall: React.FC<{ negotiation: TransferNegotiation; onClose: () => void }> = ({ negotiation, onClose }) => {
  const career = useCareerStore((s) => s.career);
  const submitClub = useCareerStore((s) => s.submitClubNegotiationOffer);
  const submitContract = useCareerStore((s) => s.submitContractNegotiationOffer);
  const delegate = useCareerStore((s) => s.delegateNegotiation);
  const cancel = useCareerStore((s) => s.cancelNegotiation);

  const [draft, setDraft] = useState<NegotiationOffer>(negotiation.currentOffer);
  const [rowIdx, setRowIdx] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [holding, setHolding] = useState<'end' | 'reset' | null>(null);
  const holdTimer = useRef<number | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(negotiation.currentOffer);
  }, [negotiation.id, negotiation.stage, negotiation.askingFeeEur, negotiation.currentOffer]);

  useEffect(() => {
    if (editing !== null) editRef.current?.focus();
  }, [editing]);

  const player = career ? career.players[negotiation.playerId] : undefined;
  const userClub = career ? career.clubs[career.userClubId] : undefined;
  const cur = career?.settings.currency ?? 'EUR';
  const rate = CURRENCY_RATE[cur];

  const isPlayerTalks = negotiation.stage === 'PLAYER_TALKS' || negotiation.type === 'CONTRACT';
  const isClosed = ['COMPLETED', 'COLLAPSED', 'REJECTED', 'AGREED'].includes(negotiation.stage);
  const isBuying = negotiation.type === 'BUY' || negotiation.type === 'LOAN_IN';
  const exchangeOptions: (number | null)[] = career && userClub && player
    ? [
        null,
        ...Object.values(career.players)
          .filter((p) => p.clubId === userClub.id && p.id !== player.id)
          .sort((a, b) => b.baseOvr - a.baseOvr)
          .slice(0, 12)
          .map((p) => p.id),
      ]
    : [null];

  const feeStep = draft.transferFeeEur >= 20_000_000 ? 1_000_000 : draft.transferFeeEur >= 5_000_000 ? 500_000 : 100_000;
  const wageStep = draft.wageEur >= 100_000 ? 5_000 : 2_000;
  const full = (eur: number) => formatMoney(eur, cur, false);

  const rows: Row[] = isPlayerTalks
    ? [
        {
          id: 'wage',
          label: 'Weekly Wage',
          value: full(draft.wageEur),
          adjust: (d) => setDraft((o) => ({ ...o, wageEur: Math.max(3_000, o.wageEur + d * wageStep) })),
          amount: { get: () => draft.wageEur, set: (v) => setDraft((o) => ({ ...o, wageEur: Math.max(3_000, v) })) },
        },
        { id: 'role', label: 'Squad Role', value: draft.squadRole.toUpperCase(), adjust: (d) => setDraft((o) => ({ ...o, squadRole: cycle(ROLES, o.squadRole, d) })) },
        {
          id: 'years',
          label: 'Contract Length',
          value: `${draft.contractYears} ${draft.contractYears === 1 ? 'YEAR' : 'YEARS'}`,
          adjust: (d) => setDraft((o) => ({ ...o, contractYears: Math.min(5, Math.max(1, o.contractYears + d)) })),
        },
        {
          id: 'signing',
          label: 'Signing Bonus',
          value: draft.signingBonusEur ? full(draft.signingBonusEur) : 'NONE',
          adjust: (d) => setDraft((o) => ({ ...o, signingBonusEur: cycle(SIGNING_BONUS, o.signingBonusEur, d) })),
        },
        { id: 'clauses', label: 'Other Clauses', value: 'INCLUDED' },
      ]
    : [
        {
          id: 'start',
          label: 'Start Date',
          value: draft.startDate === 'IMMEDIATE' ? 'IMMEDIATE' : 'NEXT WINDOW',
          adjust: () => setDraft((o) => ({ ...o, startDate: o.startDate === 'IMMEDIATE' ? 'NEXT_WINDOW' : 'IMMEDIATE' })),
        },
        {
          id: 'fee',
          label: 'Transfer Fee',
          value: full(draft.transferFeeEur),
          adjust: (d) => setDraft((o) => ({ ...o, transferFeeEur: Math.max(100_000, o.transferFeeEur + d * feeStep) })),
          amount: { get: () => draft.transferFeeEur, set: (v) => setDraft((o) => ({ ...o, transferFeeEur: Math.max(100_000, v) })) },
        },
        {
          id: 'instalments',
          label: 'Instalments',
          value: `${draft.instalments} INSTALMENTS`,
          adjust: (d) => setDraft((o) => ({ ...o, instalments: Math.min(3, Math.max(1, o.instalments + d)) as 1 | 2 | 3 })),
        },
        ...(isBuying
          ? [
              {
                id: 'exchange' as const,
                label: 'Exchange Player',
                value: draft.exchangePlayerId && career ? career.players[draft.exchangePlayerId]?.knownAs.toUpperCase() ?? 'NONE' : 'NONE',
                adjust: (d: -1 | 1) => setDraft((o) => ({ ...o, exchangePlayerId: cycle(exchangeOptions, o.exchangePlayerId, d) })),
              },
            ]
          : []),
        {
          id: 'bonus',
          label: 'Achievement Bonus',
          value: draft.achievementBonusEur ? full(draft.achievementBonusEur) : 'NONE',
          adjust: (d) => setDraft((o) => ({ ...o, achievementBonusEur: cycle(ACHIEVEMENT_BONUS, o.achievementBonusEur, d) })),
        },
        {
          id: 'sellOn',
          label: 'Sell-On Clause',
          value: `${draft.sellOnClausePct}%`,
          adjust: (d) => setDraft((o) => ({ ...o, sellOnClausePct: Math.min(25, Math.max(0, o.sellOnClausePct + d * 5)) })),
        },
        { id: 'clauses', label: 'Other Clauses', value: 'INCLUDED' },
      ];
  const focusedRow = rows[Math.min(rowIdx, rows.length - 1)];

  const { paidNowEur, futurePaymentsEur } = computeOfferPayments(draft.transferFeeEur, draft.instalments);
  const budgetAfter = userClub
    ? negotiation.type === 'SELL'
      ? userClub.transferBudgetEur + paidNowEur
      : userClub.transferBudgetEur - paidNowEur
    : 0;
  const wageDelta = player && userClub && player.clubId === userClub.id ? draft.wageEur - player.weeklyWageEur : draft.wageEur;

  // ---- actions --------------------------------------------------------------
  const submit = () => {
    if (isClosed) return;
    if (isPlayerTalks) submitContract(negotiation.id, draft);
    else submitClub(negotiation.id, { ...draft, paidNowEur, futurePaymentsEur });
  };
  const startEdit = () => {
    const row = focusedRow;
    if (row.amount) setEditing(String(Math.round(row.amount.get() * rate)));
    else row.adjust?.(1);
  };
  const applyEdit = () => {
    if (editing !== null && focusedRow.amount) {
      const n = Number(editing.replace(/[^\d.]/g, ''));
      if (Number.isFinite(n) && n > 0) focusedRow.amount.set(Math.round(n / rate));
    }
    setEditing(null);
  };
  const startHold = (kind: 'end' | 'reset') => {
    if (holdTimer.current) return;
    setHolding(kind);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setHolding(null);
      if (kind === 'end') {
        if (!isClosed) cancel(negotiation.id);
        onClose();
      } else setDraft(negotiation.currentOffer);
    }, HOLD_MS);
  };
  /** Returns true when the hold was released early (i.e. it was a tap). */
  const endHold = () => {
    const wasPending = holdTimer.current !== null;
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(null);
    return wasPending;
  };
  useEffect(() => () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }, []);

  // ---- keyboard (capture: nothing reaches the tab bar while on the call) -----
  const keyRef = useRef<{ down: (e: KeyboardEvent) => void; up: (e: KeyboardEvent) => void }>({ down: () => {}, up: () => {} });
  keyRef.current = {
    down: (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (editing !== null) {
        if (k === 'Enter') {
          e.preventDefault();
          applyEdit();
        } else if (k === 'Escape') {
          e.preventDefault();
          setEditing(null);
        }
        e.stopImmediatePropagation();
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) {
        if (k === 'a' || k === 'd' || k === 'ArrowLeft' || k === 'ArrowRight') focusedRow.adjust?.(k === 'a' || k === 'ArrowLeft' ? -1 : 1);
        return;
      }
      if (k === 'w' || k === 'ArrowUp') setRowIdx((i) => Math.max(0, Math.min(rows.length - 1, i) - 1));
      else if (k === 's' || k === 'ArrowDown') setRowIdx((i) => Math.min(rows.length - 1, i + 1));
      else if (k === 'a' || k === 'ArrowLeft') focusedRow.adjust?.(-1);
      else if (k === 'd' || k === 'ArrowRight') focusedRow.adjust?.(1);
      else if (k === 'f') startEdit();
      else if (k === ' ' || k === 'Enter') submit();
      else if (k === 'Escape' || k === 'b') startHold('end');
      else if (k === 'r') startHold('reset');
      else if (k === 't' && isBuying && !isPlayerTalks && !isClosed) delegate(negotiation.id, Math.round(negotiation.askingFeeEur * 1.02));
    },
    up: (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ((k === 'Escape' || k === 'b') && holding === 'end') {
        e.stopImmediatePropagation();
        if (endHold()) onClose(); // tap = leave the call, talks stay open
      } else if (k === 'r' && holding === 'reset') {
        e.stopImmediatePropagation();
        endHold();
      }
    },
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyRef.current.down(e);
    const up = (e: KeyboardEvent) => keyRef.current.up(e);
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
    };
  }, []);

  if (!career || !player || !userClub) return null;

  const title =
    negotiation.type === 'CONTRACT'
      ? 'RENEW CONTRACT'
      : negotiation.type === 'SELL'
      ? 'SELL PLAYER'
      : isPlayerTalks
      ? 'CONTRACT OFFER'
      : negotiation.type === 'LOAN_IN'
      ? 'LOAN PLAYER'
      : 'TRANSFER PLAYER';
  const callSubtitle = negotiation.type === 'CONTRACT' || negotiation.stage === 'PLAYER_TALKS'
    ? `${player.knownAs}'s Representative`
    : `${negotiation.counterpartClubName} Manager`;
  const tension = negotiation.tension;
  const tone = tension < 35 ? '#45e07c' : tension < 70 ? '#f5c344' : '#ff5a4f';
  const statusPill =
    negotiation.stage === 'COMPLETED' || negotiation.stage === 'AGREED'
      ? 'Deal Agreed'
      : negotiation.stage === 'COLLAPSED' || negotiation.stage === 'REJECTED'
      ? 'Talks Ended'
      : tension < 35
      ? 'Low Tension'
      : tension < 70
      ? 'Moderate Tension'
      : 'High Tension';
  const [first, ...rest] = player.knownAs.split(' ');
  const surname = rest.length ? rest.join(' ') : first;
  const firstName = rest.length ? player.firstName || first : player.firstName;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden text-white select-none" role="dialog" aria-modal="true" aria-label="Live negotiation call">
      {/* Backdrop: dark navy with a lit glass slab on the right */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #0f1823 0%, #132131 42%, #1a3145 68%, #213e4e 86%, #2b5263 100%)' }} />
      <div className="absolute inset-y-0 right-0 w-[8.5vw]" style={{ background: 'linear-gradient(180deg, rgba(130,180,200,0.42), rgba(70,110,130,0.25))', filter: 'blur(2px)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(40% 55% at 74% 48%, rgba(120,170,200,0.16), transparent 70%)' }} />

      {/* ------------------------------------------------ Left: terms */}
      <h2 className="absolute left-[7.1vw] top-[8vh] font-expanded font-black tracking-[0.01em] text-[clamp(18px,1.68vw,32px)]">{title}</h2>
      <div className="absolute left-[7.1vw] top-[14.6vh] w-[42.8vw]">
        {rows.map((row, i) => {
          const focused = row === focusedRow;
          if (focused) {
            return (
              <div
                key={row.id}
                className="relative -mx-[0.55vw] my-[0.4vh] h-[11vh] rounded-[6px] px-[1.6vw] flex items-center justify-between"
                style={{
                  background: 'linear-gradient(100deg, rgba(56,106,104,0.72) 0%, rgba(58,74,98,0.72) 55%, rgba(98,88,136,0.66) 100%)',
                  border: '1.5px solid rgba(214,232,255,0.65)',
                  boxShadow: '0 0 24px rgba(160,200,230,0.18)',
                }}
              >
                <span className="font-bold text-[clamp(15px,1.48vw,28px)]">{row.label}</span>
                <div className="text-right">
                  {editing !== null && row.amount ? (
                    <input
                      ref={editRef}
                      value={editing}
                      inputMode="numeric"
                      onChange={(e) => setEditing(e.target.value)}
                      onBlur={applyEdit}
                      aria-label={`${row.label} amount`}
                      className="w-[14vw] rounded bg-black/40 px-[0.6vw] py-[0.4vh] text-right font-expanded font-black text-[clamp(14px,1.3vw,24px)] outline-none ring-1 ring-white/40"
                    />
                  ) : (
                    <div className="flex items-center justify-end gap-[1.3vw] font-expanded font-black text-[clamp(14px,1.3vw,24px)]">
                      {row.adjust && (
                        <button type="button" aria-label={`Decrease ${row.label}`} onClick={() => row.adjust?.(-1)} className="text-[0.6em] text-white/85">◀</button>
                      )}
                      <span>{row.value}</span>
                      {row.adjust && (
                        <button type="button" aria-label={`Increase ${row.label}`} onClick={() => row.adjust?.(1)} className="text-[0.6em] text-white/85">▶</button>
                      )}
                    </div>
                  )}
                  {row.amount && (
                    <button type="button" onClick={editing !== null ? applyEdit : startEdit} className="mt-[0.5vh] text-[clamp(10px,0.95vw,17px)] font-semibold text-white/90">
                      {editing !== null ? 'APPLY' : 'EDIT'}
                    </button>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div
              key={row.id}
              role="button"
              tabIndex={-1}
              onClick={() => setRowIdx(i)}
              className={`mx-[0.55vw] h-[5.95vh] flex items-center justify-between cursor-pointer ${rows[i + 1] && rows[i + 1] !== focusedRow ? 'border-b border-white/15' : ''}`}
            >
              <span className="text-[#b8c2cf] text-[clamp(12px,1.18vw,22px)]">{row.label}</span>
              <span className="font-expanded font-black tracking-[0.01em] text-[clamp(12px,1.18vw,22px)] truncate max-w-[60%] text-right">{row.value}</span>
            </div>
          );
        })}
      </div>

      {/* Summary + Make Offer */}
      <div className="absolute left-[7.1vw] w-[42.8vw] top-[75.4vh] text-[clamp(11px,1.02vw,19px)]">
        {isPlayerTalks ? (
          <>
            <SummaryRow label="Weekly Wage" sub=" / Total Contract" value={`${formatMoney(draft.wageEur, cur)} / ${formatMoney(draft.wageEur * 52 * draft.contractYears + draft.signingBonusEur, cur)}`} />
            <SummaryRow label="Signing Bonus" value={formatMoney(draft.signingBonusEur, cur)} divider />
            <SummaryRow label="Wage Budget Remaining" value={`${formatMoney(userClub.wageBudgetRemainingEur - wageDelta, cur)}/wk`} />
          </>
        ) : (
          <>
            <SummaryRow label="Paid Now" sub=" / Future Payments" value={`${formatMoney(paidNowEur, cur)}`} valueSub={` / ${formatMoney(futurePaymentsEur, cur)}`} />
            <SummaryRow label="Potential Add-Ons" value={formatMoney(draft.achievementBonusEur, cur)} divider />
            <SummaryRow label="Budget Remaining" value={formatMoney(budgetAfter, cur)} negative={budgetAfter < 0} />
          </>
        )}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={isClosed}
        className="absolute left-[28.5vw] top-[85.8vh] -translate-x-1/2 h-[5.9vh] min-h-[40px] px-[2.4vw] rounded-[5px] font-bold text-[#141824] text-[clamp(13px,1.18vw,22px)] disabled:opacity-40"
        style={{ background: 'linear-gradient(90deg, #d4fff4 0%, #ece2ff 60%, #e6d9ff 100%)', boxShadow: '0 0 26px rgba(214,200,255,0.55)' }}
      >
        Make Offer
      </button>

      {/* Controller prompts */}
      <div className="absolute left-[4.4vw] bottom-[2.4vh] flex flex-wrap items-center gap-[1.8vw] text-[clamp(10px,0.95vw,17px)] text-white/90">
        <span className="flex items-center gap-[0.45vw]"><PadGlyph shape="cross" /> Submit Offer</span>
        <span className="flex items-center gap-[0.45vw]"><PadGlyph shape="square" /> Edit Terms</span>
        <span className="flex items-center gap-[0.45vw]"><PadGlyph shape="circle" /> Back · Hold to Walk Away</span>
        {isBuying && !isPlayerTalks && !isClosed && (
          <button type="button" onClick={() => delegate(negotiation.id, Math.round(negotiation.askingFeeEur * 1.02))} className="flex items-center gap-[0.45vw]">
            <PadGlyph shape="triangle" /> Delegate
          </button>
        )}
        <span className={`uppercase tracking-[0.06em] ${holding === 'reset' ? 'text-[#8ff0cd]' : 'text-white/70'}`}>Hold R to Reset Offer</span>
      </div>

      {/* ------------------------------------------------ Right: the call */}
      <div className="absolute left-[60.2vw] w-[30.7vw] top-[3vh] text-center">
        <div className="tracking-[0.04em] text-[clamp(11px,1.15vw,21px)]">SCOUT RECOMMENDATION</div>
        <div className="mt-[0.4vh] truncate text-white/55 text-[clamp(9px,0.8vw,15px)]">{negotiation.scoutRecommendation}</div>
      </div>

      <div
        className="absolute left-[60.2vw] w-[30.7vw] top-[9.7vh] h-[16vh] rounded-[1.4vw] flex items-center gap-[1.3vw] px-[1.5vw]"
        style={{ background: 'linear-gradient(180deg, rgba(150,168,196,0.32), rgba(110,128,156,0.28))', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)' }}
      >
        <div className="shrink-0 w-[6.3vw] h-[6.3vw] rounded-[0.9vw] overflow-hidden flex items-end justify-center" style={{ background: 'linear-gradient(180deg, #8fa3c0, #56677f)', boxShadow: '0 0 0 3px rgba(220,205,255,0.85)' }}>
          {/* Manager portrait placeholder (no manager renders in the data set) */}
          <PlayerBust alt={`${negotiation.counterpartManager} (portrait placeholder)`} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[#45e07c] text-[clamp(10px,1vw,18px)]">On call with</div>
          <div className="truncate font-bold text-[clamp(15px,1.72vw,32px)] leading-tight">{negotiation.counterpartManager}</div>
          <div className="truncate text-white/75 text-[clamp(10px,1.08vw,20px)]">{callSubtitle}</div>
        </div>
        <span className="shrink-0 flex items-center gap-[3px] rounded-full bg-[#1b2433] px-[0.8vw] py-[1vh]" aria-hidden>
          {[0.5, 0.9, 0.65, 1, 0.55].map((h, i) => (
            <span key={i} className="w-[3px] rounded-full bg-white/90 animate-pulse" style={{ height: `${h * 1.6}vh`, animationDelay: `${i * 120}ms` }} />
          ))}
        </span>
      </div>

      {/* Tension gauge + pill */}
      <div className="absolute left-[74.6vw] top-[27vh] -translate-x-1/2 w-[15vw] flex flex-col items-center">
        <TensionArc value={tension} tone={tone} />
        <div
          className="-mt-[3.4vh] h-[6.7vh] min-h-[38px] w-[14vw] rounded-full flex items-center justify-center text-[clamp(12px,1.18vw,22px)]"
          style={{ background: 'rgba(14,22,34,0.55)', border: `1.5px solid ${tone}88`, boxShadow: `0 0 18px ${tone}33` }}
        >
          {statusPill}
        </div>
      </div>

      {/* Dialogue */}
      <p className="absolute left-[61.5vw] w-[28vw] top-[41.6vh] text-center leading-[1.4] text-[clamp(12px,1.33vw,25px)]">
        {negotiation.managerDialogue}
        {negotiation.rivalClubName && negotiation.rivalBidEur && !isClosed && (
          <span className="mt-[0.8vh] block text-[0.8em] text-amber-200">
            {negotiation.rivalClubName} have bid {formatMoney(negotiation.rivalBidEur, cur)}.
          </span>
        )}
      </p>

      {/* Tilted player card */}
      <div className="absolute left-[61.7vw] w-[25.8vw] top-[51.4vh] h-[28.6vh]" style={{ transform: 'rotate(2.4deg)' }}>
        <div
          className="absolute inset-0 rounded-[1vw]"
          style={{
            background: 'linear-gradient(170deg, rgba(150,164,188,0.42), rgba(104,118,142,0.4))',
            border: '1px solid rgba(255,255,255,0.28)',
            clipPath: 'polygon(0 0, 66% 0, 70% 6%, 100% 6%, 100% 100%, 0 100%)',
            backdropFilter: 'blur(10px)',
          }}
        />
        <span className="absolute right-[1.6vw] top-[3.6vh] font-expanded font-black text-white/10 text-[clamp(30px,3.6vw,68px)] leading-none">{player.primaryPosition}</span>
        <div className="relative px-[1.6vw] pt-[2.3vh]">
          <div className="uppercase tracking-[0.06em] text-white/60 text-[clamp(10px,1vw,18px)]">{firstName}</div>
          <div className="flex items-center gap-[0.6vw]">
            <NationStripe nation={player.nationality} />
            <span className="font-expanded font-black uppercase text-[clamp(16px,1.72vw,32px)] truncate">{surname}</span>
          </div>
          <div className="mt-[2.4vh] flex items-center justify-between text-[clamp(11px,1.15vw,21px)]">
            <span className="text-white/75">Age <span className="mx-[0.3vw] text-white/30">|</span><b className="text-white">{player.age}</b></span>
            <span className="text-white/75">POS <span className="mx-[0.3vw] text-white/30">|</span><b className="text-white">{player.primaryPosition}</b></span>
            <span className="flex items-center gap-[0.4vw] text-white/75">
              OVR <span className="text-white/30">|</span>
              <span className="relative inline-flex items-center justify-center w-[2.6vw] h-[2.6vw] min-w-[30px] min-h-[30px]">
                <span className="absolute inset-[16%] rotate-45 border border-white/40 rounded-[2px]" />
                <b className="relative text-white font-expanded font-black">{player.dynamicOvr.dynamicOvr}</b>
              </span>
            </span>
          </div>
          {(
            [
              ['Value (xTV)', formatMoney(player.expectedTransferValue, cur)],
              ['Weekly Wage:', formatMoney(player.weeklyWageEur, cur)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="mt-[0.9vh] flex items-center justify-between rounded-[3px] bg-black/15 px-[0.4vw] py-[0.5vh] text-[clamp(11px,1.15vw,21px)]">
              <span className="text-white/80">{label}</span>
              <span className="font-expanded font-black">{value}</span>
            </div>
          ))}
        </div>
        {/* corner brackets */}
        {['left-[0.6vw] top-[5.2vh] border-l border-t', 'right-[0.6vw] top-[5.2vh] border-r border-t', 'left-[0.6vw] bottom-[0.8vh] border-l border-b', 'right-[0.6vw] bottom-[0.8vh] border-r border-b'].map((c) => (
          <span key={c} className={`absolute w-[0.7vw] h-[0.7vw] border-white/40 ${c}`} />
        ))}
      </div>

      {/* Hold to end negotiation */}
      <div className="absolute left-[73.9vw] top-[82.4vh] -translate-x-1/2 flex flex-col items-center" style={{ transform: 'translateX(-50%) rotate(2deg)' }}>
        <button
          type="button"
          aria-label="Hold to end negotiation"
          onPointerDown={() => startHold('end')}
          onPointerUp={() => endHold()}
          onPointerLeave={() => endHold()}
          className="relative flex items-center justify-center w-[3.6vw] h-[3.6vw] min-w-[42px] min-h-[42px] rounded-full bg-[#e8412f] shadow-[0_0_18px_rgba(232,65,47,0.55)]"
        >
          <Phone className="w-1/2 h-1/2 rotate-[135deg] fill-white text-white" />
          {holding === 'end' && (
            <svg viewBox="0 0 40 40" className="absolute -inset-[0.35vw] w-[calc(100%+0.7vw)] h-[calc(100%+0.7vw)] -rotate-90">
              <circle cx="20" cy="20" r="18" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="113" strokeDashoffset="113" style={{ animation: `negHold ${HOLD_MS}ms linear forwards` }} />
            </svg>
          )}
        </button>
        <span className="mt-[1.5vh] tracking-[0.05em] text-[clamp(11px,1.15vw,21px)]">HOLD TO END NEGOTIATION</span>
      </div>
      <style>{'@keyframes negHold { to { stroke-dashoffset: 0; } }'}</style>
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; sub?: string; value: string; valueSub?: string; divider?: boolean; negative?: boolean }> = ({
  label,
  sub,
  value,
  valueSub,
  divider,
  negative,
}) => (
  <div className={`flex items-center justify-between py-[0.35vh] ${divider ? 'border-b border-white/20' : ''}`}>
    <span>
      {label}
      {sub && <span className="text-white/60">{sub}</span>}
    </span>
    <span className={`font-expanded font-black ${negative ? 'text-[#ff5a4f]' : ''}`}>
      {value}
      {valueSub && <span className="text-white/60">{valueSub}</span>}
    </span>
  </div>
);

/** Half-ellipse gauge: grey track, fill + marker coloured by tension band. */
const TensionArc: React.FC<{ value: number; tone: string }> = ({ value, tone }) => {
  const t = Math.min(100, Math.max(0, value)) / 100;
  const rx = 90;
  const ry = 46;
  const pt = (f: number) => {
    const a = Math.PI * (1 - f);
    return [100 + rx * Math.cos(a), 56 - ry * Math.sin(a)];
  };
  const [ex, ey] = pt(t);
  return (
    <svg viewBox="0 0 200 64" className="w-full h-auto" aria-label={`Tension ${Math.round(value)} of 100`}>
      <path d={`M10 56 A${rx} ${ry} 0 0 1 190 56`} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="5" strokeLinecap="round" />
      {[0.35, 0.7].map((f) => {
        const [x, y] = pt(f);
        return <circle key={f} cx={x} cy={y} r="1.6" fill="rgba(255,255,255,0.45)" />;
      })}
      {t > 0 && <path d={`M10 56 A${rx} ${ry} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round" style={{ transition: 'stroke 400ms' }} />}
      <circle cx={ex} cy={ey} r="5" fill="#fff" stroke={tone} strokeWidth="2.5" />
    </svg>
  );
};

/** Small nation chip (flag placeholder: nation initials on a neutral stripe). */
const NationStripe: React.FC<{ nation: string }> = ({ nation }) => (
  <span className="inline-flex items-center justify-center rounded-[2px] bg-white/85 px-[0.25vw] text-[#1a2230] font-bold text-[clamp(8px,0.62vw,12px)]" title={nation}>
    {nation.slice(0, 3).toUpperCase()}
  </span>
);
