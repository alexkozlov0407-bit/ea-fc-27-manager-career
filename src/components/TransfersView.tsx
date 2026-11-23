import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react';
import { calculatePlayerInterest, formatMoney } from '../engine/ratings';
import { diffDays } from '../engine/season';
import { computeOfferPayments } from '../engine/transfers';
import { NegotiationOffer, SquadRole, TransferNegotiation } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest, OvrDiamond, PlayerAvatar, positionColorClass } from './PlayerAvatar';

type TransferSubTab = 'Buying' | 'Selling' | 'Contracts' | 'Shortlist' | 'History';

export const TransfersView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const activeNegotiationId = useCareerStore((s) => s.activeNegotiationId);
  const setActiveNegotiationId = useCareerStore((s) => s.setActiveNegotiationId);
  const startNegotiation = useCareerStore((s) => s.startNegotiation);
  const toggleShortlist = useCareerStore((s) => s.toggleShortlist);
  const setActiveTab = useCareerStore((s) => s.setActiveTab);

  const [subTab, setSubTab] = useState<TransferSubTab>('Buying');
  const [selectedNegId, setSelectedNegId] = useState<string | null>(null);

  const lists = useMemo(() => {
    if (!career) return null;
    return {
      buying: career.negotiations.filter((n) => n.type === 'BUY' || n.type === 'LOAN_IN'),
      selling: career.negotiations.filter((n) => n.type === 'SELL' || n.type === 'LOAN_OUT'),
      contracts: career.negotiations.filter((n) => n.type === 'CONTRACT'),
    };
  }, [career]);

  if (!career || !lists) return null;
  const userClub = career.clubs[career.userClubId];
  const daysToClose = Math.max(0, diffDays(career.currentDate, career.transferWindowClosesDate));

  const currentNegList =
    subTab === 'Buying' ? lists.buying : subTab === 'Selling' ? lists.selling : lists.contracts;
  const highlightedNeg =
    currentNegList.find((n) => n.id === selectedNegId) ?? currentNegList[0] ?? null;
  const modalNeg = activeNegotiationId
    ? career.negotiations.find((n) => n.id === activeNegotiationId) ?? null
    : null;

  return (
    <div className="mx-auto max-w-[1520px] px-4 lg:px-6 py-4 space-y-4">
      {/* Sub-navigation matching FC 27 Active Negotiations screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            Transfers
          </h2>
          <div className="h-5 w-px bg-white/15" />
          {(
            [
              ['Buying', `Buying (${lists.buying.length})`],
              ['Selling', `Selling (${lists.selling.length})`],
              ['Contracts', `Contract Renewals (${lists.contracts.length})`],
              ['Shortlist', `Shortlist (${career.shortlistIds.length})`],
              ['History', `History & Clauses (${career.transferHistory.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubTab(key)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider ${
                subTab === key ? 'fc-panel-active text-white' : 'text-[#8ea5b3] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono-num text-amber-300 font-bold">
          {career.transferWindowOpen
            ? `Transfer Window Closes in: ${daysToClose} Days`
            : `Window Closed — Opens ${career.transferWindowClosesDate}`}
        </div>
      </div>

      {/* Active Negotiations Split Layout (Buying / Selling / Contracts) */}
      {(subTab === 'Buying' || subTab === 'Selling' || subTab === 'Contracts') && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-7 fc-panel rounded-lg overflow-hidden">
            {currentNegList.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="font-display text-xl font-bold uppercase text-white">
                  No Active {subTab} Negotiations
                </div>
                <p className="text-xs text-[#9bb4c2] max-w-md mx-auto">
                  {subTab === 'Buying'
                    ? 'Visit the Scouting Hub to browse all 550 real players and initiate multi-stage 2D transfer talks.'
                    : subTab === 'Selling'
                    ? 'Transfer-list players in Squad Hub or advance days to receive incoming AI club offers.'
                    : 'Open Squad Hub and choose Negotiate Contract Renewal on any squad player.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab(subTab === 'Buying' ? 'Scouting' : 'Squad')}
                  className="fc-btn-primary rounded px-4 py-2 text-xs uppercase tracking-wider"
                >
                  {subTab === 'Buying' ? 'Open Scouting Hub' : 'Open Squad Hub'}
                </button>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-[#0d1d29] border-b border-white/12 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Pos</th>
                    <th className="py-2.5 px-2 text-left">Club</th>
                    <th className="py-2.5 px-2 text-left">Player</th>
                    <th className="py-2.5 px-2 text-center">OVR</th>
                    <th className="py-2.5 px-2 text-right">Value (xTV)</th>
                    <th className="py-2.5 px-3 text-right">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {currentNegList.map((neg) => {
                    const p = career.players[neg.playerId];
                    if (!p) return null;
                    const club = career.clubs[neg.fromClubId === career.userClubId ? neg.toClubId : neg.fromClubId];
                    const isSel = highlightedNeg?.id === neg.id;
                    return (
                      <tr
                        key={neg.id}
                        onClick={() => setSelectedNegId(neg.id)}
                        className={`cursor-pointer transition-colors ${
                          isSel ? 'fc-panel-active text-white' : 'hover:bg-white/[0.05] text-[#d6e4ec]'
                        }`}
                      >
                        <td className={`py-2.5 px-3 font-bold ${positionColorClass(p.primaryPosition)}`}>
                          {p.primaryPosition}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <ClubCrest club={club} size={20} />
                            <span className="truncate max-w-[110px]">{neg.counterpartClubName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-white">{p.knownAs}</td>
                        <td className="py-2.5 px-2 text-center font-mono-num font-bold">{p.dynamicOvr.dynamicOvr}</td>
                        <td className="py-2.5 px-2 text-right font-mono-num text-[#b8fff0]">
                          {formatMoney(p.expectedTransferValue, career.settings.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`text-[10px] font-extrabold uppercase ${
                              neg.stage === 'COMPLETED'
                                ? 'text-[#38f2c8]'
                                : neg.stage === 'COLLAPSED' || neg.stage === 'REJECTED'
                                ? 'text-rose-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {neg.stage.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Right Spotlight Card matching FC 27 Active Negotiations */}
          {highlightedNeg && career.players[highlightedNeg.playerId] && (() => {
            const p = career.players[highlightedNeg.playerId];
            const counterClub = career.clubs[
              highlightedNeg.fromClubId === career.userClubId ? highlightedNeg.toClubId : highlightedNeg.fromClubId
            ];
            const rel = counterClub?.relationships[career.userClubId] ?? 4;
            const interest = calculatePlayerInterest(
              p,
              userClub,
              counterClub,
              highlightedNeg.currentOffer.squadRole,
              highlightedNeg.currentOffer.wageEur
            );
            const canNegotiate =
              highlightedNeg.stage === 'CLUB_TALKS' ||
              highlightedNeg.stage === 'PLAYER_TALKS' ||
              highlightedNeg.stage === 'HIJACKED';

            return (
              <div className="xl:col-span-5 fc-panel rounded-lg p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <PlayerAvatar player={p} clubColor={counterClub?.primaryColor} size="xl" />
                    <div>
                      <div className="text-xs font-bold uppercase text-[#38f2c8]">{p.primaryPosition}</div>
                      <h3 className="font-display text-3xl font-extrabold uppercase text-white leading-none">
                        {p.knownAs}
                      </h3>
                      <div className="text-xs text-[#9bb4c2] mt-1">
                        {highlightedNeg.counterpartClubName} · Club Relation{' '}
                        <strong className={rel < 0 ? 'text-rose-400' : 'text-[#38f2c8]'}>{rel}/10</strong>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-[#8ba5b3]">Player Interest</div>
                    <div className="font-display text-lg font-extrabold uppercase text-[#38f2c8]">
                      {interest.label}
                    </div>
                    <OvrDiamond ovr={p.dynamicOvr.dynamicOvr} delta={p.dynamicOvr.totalDelta} size="sm" />
                  </div>
                </div>

                {/* Status Box */}
                <div className="rounded-md border border-white/12 bg-[#0a1822]/85 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClubCrest club={counterClub} size={24} />
                      <span className="font-display text-lg font-extrabold uppercase text-white">
                        {highlightedNeg.stage.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="font-mono-num text-sm font-bold text-[#b8fff0]">
                      {highlightedNeg.type === 'CONTRACT'
                        ? `${formatMoney(highlightedNeg.askingWageEur, career.settings.currency)}/wk`
                        : formatMoney(highlightedNeg.askingFeeEur, career.settings.currency)}
                    </span>
                  </div>
                  <p className="text-xs text-[#c7d9e3]">{highlightedNeg.managerDialogue}</p>
                  {highlightedNeg.rivalClubName && (
                    <div className="rounded border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
                      Rival Hijack Alert: <strong>{highlightedNeg.rivalClubName}</strong> bid{' '}
                      {formatMoney(highlightedNeg.rivalBidEur ?? 0, career.settings.currency)}!
                    </div>
                  )}
                  <div className="text-[10px] text-right text-[#7f9aa8]">Enhanced by TransferRoom</div>
                </div>

                {canNegotiate && (
                  <button
                    type="button"
                    onClick={() => setActiveNegotiationId(highlightedNeg.id)}
                    className="fc-btn-primary w-full rounded py-3 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4" />
                    Enter 2D Live Negotiation Call
                  </button>
                )}

                {/* History log */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto text-[11px] border-t border-white/10 pt-3">
                  {highlightedNeg.history.map((h, i) => (
                    <div key={i} className="text-[#9eb6c4]">
                      <span className="font-mono-num text-[#6f8a99] mr-1.5">{h.date}</span>
                      <strong className="text-white">{h.actor}:</strong> {h.message}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Shortlist Tab */}
      {subTab === 'Shortlist' && (
        <div className="fc-panel rounded-lg p-4">
          {career.shortlistIds.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8ba5b3]">
              Your transfer shortlist is empty. Add targets from the Scouting Hub.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {career.shortlistIds.map((id) => {
                const p = career.players[id];
                if (!p) return null;
                const club = career.clubs[p.clubId];
                return (
                  <div
                    key={id}
                    className="rounded-md border border-white/10 bg-[#0b1822]/80 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar player={p} clubColor={club?.primaryColor} size="md" />
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{p.knownAs}</div>
                        <div className="text-[11px] text-[#8ba5b3] truncate">
                          {p.primaryPosition} · {p.baseOvr} OVR · {p.clubName}
                        </div>
                        <div className="font-mono-num text-xs font-bold text-[#b8fff0] mt-0.5">
                          xTV {formatMoney(p.expectedTransferValue, career.settings.currency)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startNegotiation(p.id, 'BUY')}
                        className="fc-btn-primary rounded px-3 py-1.5 text-[11px] uppercase"
                      >
                        Approach
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleShortlist(p.id)}
                        className="fc-btn-secondary rounded px-3 py-1 text-[10px] uppercase"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History & Clauses/Installments Tab */}
      {subTab === 'History' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 fc-panel rounded-lg p-4">
            <h3 className="font-display text-lg font-extrabold uppercase tracking-wide mb-3">
              Completed Transfer Deals ({career.transferHistory.length})
            </h3>
            {career.transferHistory.length === 0 ? (
              <div className="text-xs text-[#8ba5b3] py-6 text-center">No completed transfers yet this season.</div>
            ) : (
              <div className="space-y-2 max-h-[58vh] overflow-y-auto">
                {career.transferHistory.map((tr) => (
                  <div
                    key={tr.id}
                    className="rounded border border-white/10 bg-[#0b1822]/75 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {tr.playerName}{' '}
                        <span className="text-[#38f2c8]">
                          ({tr.position} · {tr.ovr})
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8ba5b3]">
                        {tr.fromClubName} → <span className="text-white">{tr.toClubName}</span> · {tr.date}
                      </div>
                    </div>
                    <div className="text-right font-mono-num">
                      <div className="font-bold text-[#b8fff0]">
                        {formatMoney(tr.feeEur, career.settings.currency)}
                      </div>
                      {tr.futureDueEur > 0 && (
                        <div className="text-[10px] text-amber-300">
                          Deferred: {formatMoney(tr.futureDueEur, career.settings.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 fc-panel rounded-lg p-4">
            <h3 className="font-display text-lg font-extrabold uppercase tracking-wide mb-3">
              Active Instalments &amp; Sell-On Clauses
            </h3>
            {career.installments.length === 0 ? (
              <div className="text-xs text-[#8ba5b3] py-6 text-center">
                No deferred instalment obligations or sell-on clauses active. Use 2–4 instalments in 2D Negotiations to spread payments across seasons.
              </div>
            ) : (
              <div className="space-y-2">
                {career.installments.map((inst) => (
                  <div
                    key={inst.id}
                    className="rounded border border-white/10 bg-[#0b1822]/75 p-3 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">{inst.playerName}</div>
                      <div className="text-[11px] text-[#8ba5b3]">
                        {inst.direction === 'PAYABLE' ? 'Owed to' : 'Owed by'} {inst.counterpartClubName} ·{' '}
                        {inst.seasonsRemaining} season(s) left
                      </div>
                    </div>
                    <div className="text-right font-mono-num">
                      <div className={inst.direction === 'PAYABLE' ? 'text-rose-300 font-bold' : 'text-[#38f2c8] font-bold'}>
                        {inst.direction === 'PAYABLE' ? '-' : '+'}
                        {formatMoney(inst.amountPerSeasonEur, career.settings.currency)}/yr
                      </div>
                      {inst.sellOnPct > 0 && (
                        <div className="text-[10px] text-amber-300">{inst.sellOnPct}% Sell-On Clause</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2D Phone-Call Negotiation Modal */}
      {modalNeg && <NegotiationModal2D negotiation={modalNeg} onClose={() => setActiveNegotiationId(null)} />}
    </div>
  );
};

// ============================================================================
// AUTHENTIC EA FC 27 2D PHONE-CALL NEGOTIATION MODAL (matches image_3cb02f37)
// ============================================================================

const NegotiationModal2D: React.FC<{ negotiation: TransferNegotiation; onClose: () => void }> = ({
  negotiation,
  onClose,
}) => {
  const career = useCareerStore((s) => s.career);
  const submitClubNegotiationOffer = useCareerStore((s) => s.submitClubNegotiationOffer);
  const submitContractNegotiationOffer = useCareerStore((s) => s.submitContractNegotiationOffer);
  const delegateNegotiation = useCareerStore((s) => s.delegateNegotiation);
  const cancelNegotiation = useCareerStore((s) => s.cancelNegotiation);

  const [draft, setDraft] = useState<NegotiationOffer>(negotiation.currentOffer);
  const [editingFee, setEditingFee] = useState(false);

  useEffect(() => {
    setDraft(negotiation.currentOffer);
  }, [negotiation.id, negotiation.stage, negotiation.askingFeeEur]);

  if (!career) return null;
  const player = career.players[negotiation.playerId];
  const userClub = career.clubs[career.userClubId];
  if (!player || !userClub) return null;

  const userSquadForExchange = Object.values(career.players)
    .filter((p) => p.clubId === userClub.id && p.id !== player.id)
    .sort((a, b) => b.baseOvr - a.baseOvr);

  const isPlayerTalks = negotiation.stage === 'PLAYER_TALKS' || negotiation.type === 'CONTRACT';
  const isClosed =
    negotiation.stage === 'COMPLETED' ||
    negotiation.stage === 'COLLAPSED' ||
    negotiation.stage === 'REJECTED';

  const { paidNowEur, futurePaymentsEur } = computeOfferPayments(draft.transferFeeEur, draft.instalments);
  const budgetAfter =
    negotiation.type === 'SELL'
      ? userClub.transferBudgetEur + paidNowEur
      : userClub.transferBudgetEur - paidNowEur;

  const feeStep = draft.transferFeeEur >= 20_000_000 ? 1_000_000 : draft.transferFeeEur >= 5_000_000 ? 500_000 : 100_000;
  const wageStep = draft.wageEur >= 100_000 ? 5_000 : 2_000;

  const tensionLabel =
    negotiation.tension < 35 ? 'Low Tension' : negotiation.tension < 70 ? 'Medium Tension' : 'High Tension';
  const tensionClass =
    negotiation.tension < 35
      ? 'border-[#38f2c8]/40 text-[#b8fff0] bg-[#103634]/60'
      : negotiation.tension < 70
      ? 'border-amber-400/50 text-amber-200 bg-amber-500/15'
      : 'border-rose-500/60 text-rose-200 bg-rose-500/20';

  const handleSubmit = () => {
    if (isPlayerTalks) {
      submitContractNegotiationOffer(negotiation.id, draft);
    } else {
      submitClubNegotiationOffer(negotiation.id, { ...draft, paidNowEur, futurePaymentsEur });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-[1060px] rounded-xl border border-white/15 fc-backdrop shadow-2xl overflow-hidden">
        {/* Holographic Boardroom Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity pointer-events-none"
          style={{ backgroundImage: `url('/assets/art/boardroom.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07131a]/95 via-[#07131a]/90 to-[#07131a]/85 pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close negotiation screen"
          className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-[#0b1822]/80 p-1.5 text-[#9bb4c2] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT COLUMN: Structured Offer Form matching FC 27 screenshot */}
          <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-[#38f2c8] font-bold">
                {isPlayerTalks ? 'STAGE 2 · PERSONAL TERMS' : 'STAGE 1 · CLUB-TO-CLUB TALKS'}
              </div>
              <h2 className="font-display text-3xl font-extrabold uppercase tracking-wider text-white mt-0.5">
                {negotiation.type === 'CONTRACT'
                  ? 'RENEW CONTRACT'
                  : negotiation.type === 'SELL'
                  ? 'NEGOTIATE SALE'
                  : isPlayerTalks
                  ? 'CONTRACT NEGOTIATION'
                  : 'TRANSFER PLAYER'}
              </h2>

              {/* Offer Controls */}
              {!isPlayerTalks ? (
                <div className="mt-5 divide-y divide-white/10">
                  {/* Start Date */}
                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-[#a5bcc9]">Start Date</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          startDate: d.startDate === 'IMMEDIATE' ? 'NEXT_WINDOW' : 'IMMEDIATE',
                        }))
                      }
                      className="font-display text-lg font-extrabold uppercase tracking-wide text-white hover:text-[#38f2c8]"
                    >
                      {draft.startDate === 'IMMEDIATE' ? 'IMMEDIATE' : 'NEXT WINDOW'}
                    </button>
                  </div>

                  {/* Highlighted Transfer Fee Row */}
                  <div className="fc-panel-active -mx-3 px-4 py-3.5 rounded-md my-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white">Transfer Fee</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Decrease transfer fee"
                          onClick={() =>
                            setDraft((d) => ({ ...d, transferFeeEur: Math.max(100_000, d.transferFeeEur - feeStep) }))
                          }
                          className="rounded p-1 hover:bg-white/15 text-white"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {editingFee ? (
                          <input
                            type="number"
                            value={draft.transferFeeEur}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, transferFeeEur: Math.max(0, Number(e.target.value) || 0) }))
                            }
                            onBlur={() => setEditingFee(false)}
                            autoFocus
                            className="w-36 rounded bg-[#071117] border border-[#38f2c8] px-2 py-1 text-right font-mono-num text-sm font-bold text-white"
                          />
                        ) : (
                          <span className="font-mono-num text-xl font-extrabold text-white">
                            {formatMoney(draft.transferFeeEur, career.settings.currency, false)}
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label="Increase transfer fee"
                          onClick={() => setDraft((d) => ({ ...d, transferFeeEur: d.transferFeeEur + feeStep }))}
                          className="rounded p-1 hover:bg-white/15 text-white"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right mt-1">
                      <button
                        type="button"
                        onClick={() => setEditingFee((v) => !v)}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#d4f7ef] hover:underline"
                      >
                        {editingFee ? 'DONE' : 'EDIT AMOUNT'}
                      </button>
                    </div>
                  </div>

                  {/* Instalments */}
                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-[#a5bcc9]">Instalments</span>
                    <div className="flex items-center gap-2">
                      {([1, 2, 3, 4] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, instalments: n }))}
                          className={`px-2.5 py-1 rounded text-xs font-extrabold font-mono-num ${
                            draft.instalments === n
                              ? 'bg-white text-[#071117]'
                              : 'bg-white/10 text-[#b7cbd6] hover:bg-white/20'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exchange Player */}
                  {negotiation.type !== 'SELL' && (
                    <div className="flex items-center justify-between py-3 text-sm gap-4">
                      <span className="text-[#a5bcc9] shrink-0">Exchange Player</span>
                      <select
                        value={draft.exchangePlayerId ?? ''}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            exchangePlayerId: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        className="rounded border border-white/15 bg-[#0a1822] px-2.5 py-1 text-xs font-bold text-white max-w-[230px]"
                      >
                        <option value="">NONE</option>
                        {userSquadForExchange.slice(0, 18).map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.knownAs} ({sp.baseOvr} · {formatMoney(sp.expectedTransferValue, career.settings.currency)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Achievement Bonus */}
                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-[#a5bcc9]">Achievement Bonus</span>
                    <div className="flex items-center gap-2">
                      {[0, 2_000_000, 5_000_000, 10_000_000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, achievementBonusEur: amt }))}
                          className={`px-2 py-1 rounded text-[11px] font-bold font-mono-num ${
                            draft.achievementBonusEur === amt
                              ? 'bg-white text-[#071117]'
                              : 'bg-white/10 text-[#b7cbd6]'
                          }`}
                        >
                          {amt === 0 ? 'NONE' : formatMoney(amt, career.settings.currency)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sell-On Clause */}
                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-[#a5bcc9]">Sell-On Clause</span>
                    <div className="flex items-center gap-2">
                      {[0, 5, 10, 15].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, sellOnClausePct: pct }))}
                          className={`px-2 py-1 rounded text-[11px] font-bold font-mono-num ${
                            draft.sellOnClausePct === pct
                              ? 'bg-white text-[#071117]'
                              : 'bg-white/10 text-[#b7cbd6]'
                          }`}
                        >
                          {pct === 0 ? 'NONE' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* STAGE 2: PLAYER / AGENT CONTRACT TALKS */
                <div className="mt-5 divide-y divide-white/10">
                  <div className="fc-panel-active -mx-3 px-4 py-3.5 rounded-md my-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Weekly Wage</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, wageEur: Math.max(3000, d.wageEur - wageStep) }))}
                          className="rounded p-1 hover:bg-white/15"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-mono-num text-xl font-extrabold text-white">
                          {formatMoney(draft.wageEur, career.settings.currency, false)}/wk
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, wageEur: d.wageEur + wageStep }))}
                          className="rounded p-1 hover:bg-white/15"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-[#a5bcc9]">Squad Role</span>
                    <select
                      value={draft.squadRole}
                      onChange={(e) => setDraft((d) => ({ ...d, squadRole: e.target.value as SquadRole }))}
                      className="rounded border border-white/15 bg-[#0a1822] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      {(['Crucial', 'Important', 'Rotation', 'Sporadic', 'Prospect'] as SquadRole[]).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-[#a5bcc9]">Contract Length</span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, contractYears: yr }))}
                          className={`px-2.5 py-1 rounded text-xs font-bold font-mono-num ${
                            draft.contractYears === yr ? 'bg-white text-[#071117]' : 'bg-white/10 text-[#b7cbd6]'
                          }`}
                        >
                          {yr}Y
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-[#a5bcc9]">Signing Bonus</span>
                    <div className="flex items-center gap-1.5">
                      {[0, 500_000, 1_500_000, 3_000_000].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, signingBonusEur: b }))}
                          className={`px-2 py-1 rounded text-[11px] font-bold font-mono-num ${
                            draft.signingBonusEur === b ? 'bg-white text-[#071117]' : 'bg-white/10 text-[#b7cbd6]'
                          }`}
                        >
                          {b === 0 ? 'NONE' : formatMoney(b, career.settings.currency)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Footer & Action Buttons matching screenshot */}
            <div className="space-y-4 border-t border-white/10 pt-4">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#9bb4c2]">Paid Now / Future Payments</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatMoney(paidNowEur, career.settings.currency)} /{' '}
                    <span className="text-[#8ba5b3]">{formatMoney(futurePaymentsEur, career.settings.currency)}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9bb4c2]">Potential Add-Ons</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatMoney(draft.achievementBonusEur, career.settings.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9bb4c2]">Budget Remaining</span>
                  <span
                    className={`font-mono-num font-extrabold ${
                      budgetAfter < 0 ? 'text-rose-400' : 'text-[#b8fff0]'
                    }`}
                  >
                    {formatMoney(budgetAfter, career.settings.currency)}
                  </span>
                </div>
              </div>

              {!isClosed ? (
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDraft(negotiation.currentOffer)}
                    className="text-xs font-bold uppercase tracking-wider text-[#9bb4c2] hover:text-white inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Offer
                  </button>

                  <div className="flex items-center gap-2">
                    {negotiation.type === 'BUY' && !isPlayerTalks && (
                      <button
                        type="button"
                        onClick={() =>
                          delegateNegotiation(negotiation.id, Math.round(negotiation.askingFeeEur * 1.02))
                        }
                        className="fc-btn-secondary rounded px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-[#38f2c8]" />
                        Delegate to Director
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="fc-btn-primary rounded px-6 py-2.5 text-xs uppercase tracking-wider"
                    >
                      {isPlayerTalks ? 'Submit Contract Offer' : 'Make Offer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="fc-btn-primary rounded px-6 py-2.5 text-xs uppercase tracking-wider"
                  >
                    Return to Transfers
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Smartphone Call UI with Tension Meter & TransferRoom xTV Card */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#0b2732]/90 via-[#0a212a]/95 to-[#07151c] border-l border-white/10 p-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="text-center text-[11px] font-bold uppercase tracking-widest text-[#9bb4c2]">
                SCOUT RECOMMENDATION
              </div>

              {/* On Call Header Pill */}
              <div className="rounded-xl border border-white/15 bg-white/[0.06] p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-[#143742] border border-[#38f2c8]/40 flex items-center justify-center font-display text-lg font-extrabold text-[#b8fff0] shrink-0">
                    {negotiation.counterpartManager
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-[#38f2c8]">On call with</div>
                    <div className="font-bold text-white text-sm truncate">{negotiation.counterpartManager}</div>
                    <div className="text-[11px] text-[#9bb4c2] truncate">
                      {negotiation.counterpartClubName} Manager
                    </div>
                  </div>
                </div>
                {/* Animated audio waveform bars */}
                <div className="flex items-center gap-0.5 pr-1">
                  {[12, 22, 16, 26, 14].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-[#b8fff0]/80"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
              </div>

              {/* Tension Meter */}
              <div className="flex flex-col items-center gap-2">
                <div className={`rounded-full border px-4 py-1 text-xs font-bold tracking-wide ${tensionClass}`}>
                  {tensionLabel} ({negotiation.tension}%)
                </div>
                <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      negotiation.tension < 35
                        ? 'bg-[#38f2c8]'
                        : negotiation.tension < 70
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${negotiation.tension}%` }}
                  />
                </div>
              </div>

              {/* Manager Spoken Dialogue */}
              <p className="text-center text-sm font-medium text-white leading-relaxed px-2">
                “{negotiation.managerDialogue}”
              </p>

              {/* Scout tip */}
              <div className="rounded border border-white/10 bg-[#07151c]/70 px-3 py-2 text-[11px] text-[#9bb4c2] text-center">
                {negotiation.scoutRecommendation}
              </div>

              {/* TransferRoom Player Card matching screenshot */}
              <div className="rounded-xl border border-white/15 bg-gradient-to-br from-[#163640]/85 to-[#0b1b24]/95 p-4 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#9bb4c2]">{player.firstName}</div>
                    <div className="font-display text-2xl font-extrabold uppercase text-white leading-none">
                      {player.lastName || player.knownAs}
                    </div>
                  </div>
                  <div className="font-display text-3xl font-extrabold text-white/25 uppercase">
                    {player.primaryPosition}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-y border-white/10 py-2">
                  <span>
                    Age <strong className="font-mono-num text-white">{player.age}</strong>
                  </span>
                  <span>
                    POS <strong className="text-[#38f2c8]">{player.primaryPosition}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    OVR <strong className="font-mono-num text-white">{player.dynamicOvr.dynamicOvr}</strong>
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#9bb4c2]">Value (xTV)</span>
                    <span className="font-mono-num font-bold text-[#b8fff0]">
                      {formatMoney(player.expectedTransferValue, career.settings.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9bb4c2]">Weekly Wage:</span>
                    <span className="font-mono-num font-bold text-white">
                      {formatMoney(player.weeklyWageEur, career.settings.currency)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[10px] text-[#8ba5b3]">
                  Enhanced by <strong className="text-[#38f2c8]">TransferRoom</strong>
                </div>
              </div>
            </div>

            {/* Red Hang Up Button */}
            <div className="mt-6 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => cancelNegotiation(negotiation.id)}
                disabled={isClosed}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-500 disabled:opacity-40 transition-colors"
                title="End Negotiation"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9bb4c2]">
                END NEGOTIATION
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TRANSFER REVEAL SHOWCASE MODAL (replaces A-F grading)
// ============================================================================

export const TransferRevealModal: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const dismissTransferReveal = useCareerStore((s) => s.dismissTransferReveal);

  if (!career?.pendingRevealTransfer) return null;
  const tr = career.pendingRevealTransfer;
  const fromClub = career.clubs[tr.fromClubId];
  const toClub = career.clubs[tr.toClubId];
  const player = career.players[tr.playerId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-[880px] fc-panel rounded-xl overflow-hidden border border-[#38f2c8]/40">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left: Official Club Transfer Graphic */}
          <div className="md:col-span-6 bg-gradient-to-br from-[#10383a] via-[#0c1e2a] to-[#08121a] p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#38f2c8]">
              <Sparkles className="w-4 h-4" />
              OFFICIAL TRANSFER REVEAL
            </div>

            {player && <PlayerAvatar player={player} clubColor={toClub?.primaryColor} size="xl" />}

            <div>
              <h3 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white">
                {tr.playerName}
              </h3>
              <div className="text-xs text-[#9bb4c2]">
                {tr.position} · {tr.ovr} OVR
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <ClubCrest club={fromClub} size={42} />
                <span className="text-[10px] font-bold text-[#9bb4c2] mt-1">{fromClub?.shortName}</span>
              </div>
              <span className="font-display text-2xl font-extrabold text-[#38f2c8]">→</span>
              <div className="flex flex-col items-center">
                <ClubCrest club={toClub} size={48} />
                <span className="text-[10px] font-bold text-white mt-1">{toClub?.shortName}</span>
              </div>
            </div>

            <div className="rounded-md border border-[#38f2c8]/35 bg-[#091c22]/80 px-5 py-2">
              <div className="text-[10px] uppercase tracking-wider text-[#8ba5b3]">Agreed Fee</div>
              <div className="font-mono-num text-2xl font-extrabold text-[#b8fff0]">
                {formatMoney(tr.feeEur, career.settings.currency, false)}
              </div>
            </div>
          </div>

          {/* Right: Press Headline & Fan Social Reactions */}
          <div className="md:col-span-6 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#38f2c8]">
                <CheckCircle2 className="w-4 h-4" />
                TransferRoom Verified Announcement
              </div>
              <h4 className="font-display text-2xl font-extrabold uppercase leading-tight text-white">
                {tr.pressHeadline}
              </h4>

              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8ba5b3]">
                  Supporter &amp; Pundit Reactions
                </div>
                {tr.socialComments.map((c, idx) => (
                  <div key={idx} className="rounded border border-white/10 bg-[#0b1822]/80 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#38f2c8]">{c.handle}</span>
                      <span className="text-[10px] text-[#8ba5b3] inline-flex items-center gap-1 font-mono-num">
                        <ThumbsUp className="w-3 h-3" /> {c.likes.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[#d3e2ea] mt-1">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={dismissTransferReveal}
              className="fc-btn-primary w-full rounded py-2.5 text-xs uppercase tracking-wider"
            >
              Continue Career
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
