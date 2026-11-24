import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import { formatMoney } from '../engine/ratings';
import { diffDays } from '../engine/season';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest, PlayerAvatar } from './PlayerAvatar';
import { NegotiationCall } from './transfers/NegotiationCall';
import { NEGOTIATION_TABS, NegotiationTab, NegotiationsBoard, negotiationsForTab } from './transfers/NegotiationsBoard';

type TransferSubTab = NegotiationTab | 'Shortlist' | 'History';
const TABS: { id: TransferSubTab; label: string }[] = [
  ...NEGOTIATION_TABS,
  { id: 'Shortlist', label: 'Shortlist' },
  { id: 'History', label: 'History' },
];

export const TransfersView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const activeNegotiationId = useCareerStore((s) => s.activeNegotiationId);
  const setActiveNegotiationId = useCareerStore((s) => s.setActiveNegotiationId);
  const startNegotiation = useCareerStore((s) => s.startNegotiation);
  const toggleShortlist = useCareerStore((s) => s.toggleShortlist);

  const [subTab, setSubTab] = useState<TransferSubTab>('Active');

  // A/D switch lists (the action popup and the live call capture their own keys).
  const tabRef = useRef(subTab);
  tabRef.current = subTab;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k !== 'a' && k !== 'd' && k !== 'ArrowLeft' && k !== 'ArrowRight') return;
      e.preventDefault();
      const i = TABS.findIndex((t) => t.id === tabRef.current);
      const dir = k === 'a' || k === 'ArrowLeft' ? -1 : 1;
      setSubTab(TABS[(i + dir + TABS.length) % TABS.length].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!career) return null;
  const daysToClose = Math.max(0, diffDays(career.currentDate, career.transferWindowClosesDate));
  const modalNeg = activeNegotiationId
    ? career.negotiations.find((n) => n.id === activeNegotiationId) ?? null
    : null;
  const isNegTab = NEGOTIATION_TABS.some((t) => t.id === subTab);
  const counts: Record<string, number> = {
    Shortlist: career.shortlistIds.length,
    History: career.transferHistory.length,
    ...Object.fromEntries(NEGOTIATION_TABS.map((t) => [t.id, negotiationsForTab(career, t.id).length])),
  };

  return (
    <div className="relative text-white">
      {/* Breadcrumb header: Transfers | <title> | list tabs (A / D) */}
      <div className="relative h-[13vh] min-h-[84px]">
        <div className="absolute left-[3.4vw] top-[4.6vh] flex items-center">
          <span className="text-[clamp(13px,1.1vw,21px)] text-white/75">Transfers</span>
          <span className="ml-[2.45vw] text-[clamp(17px,1.5vw,28px)] font-bold whitespace-nowrap">
            {isNegTab ? 'Active Negotiations' : subTab === 'Shortlist' ? 'Shortlist' : 'Transfer History'}
          </span>
          <span className="ml-[2.35vw] h-[4vh] w-px bg-white/30" />
          <nav className="relative ml-[2.3vw] flex items-center gap-[2vw]" aria-label="Transfer lists">
            <div className="absolute left-[0.4vw] -top-[4vh] flex gap-[0.5vw]">
              {['A', 'D'].map((b) => (
                <span key={b} className="rounded-md bg-white/15 px-[0.35vw] text-[clamp(8px,0.6vw,11px)] font-bold text-white/70">{b}</span>
              ))}
            </div>
            {TABS.map((t, i) => (
              <React.Fragment key={t.id}>
                {i === NEGOTIATION_TABS.length && <span className="h-[2.6vh] w-px bg-white/20" />}
                <button
                  type="button"
                  onClick={() => setSubTab(t.id)}
                  className={`whitespace-nowrap text-[clamp(12px,1.05vw,20px)] ${
                    subTab === t.id ? 'font-bold text-white' : counts[t.id] ? 'text-white/65 hover:text-white/90' : 'text-white/35 hover:text-white/70'
                  }`}
                >
                  {t.label}
                  {counts[t.id] > 0 && <span className="ml-[0.35vw] text-[0.78em] text-[#8ff0cd]">{counts[t.id]}</span>}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>

      {isNegTab && (
        <NegotiationsBoard
          career={career}
          tab={subTab as NegotiationTab}
          daysToClose={daysToClose}
          onOpenCall={(id) => setActiveNegotiationId(id)}
        />
      )}

      <div className="mx-auto max-w-[1520px] px-4 lg:px-6 pb-6 space-y-4">
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

      </div>

      {/* 2D Live Negotiation Call */}
      {modalNeg && <NegotiationCall negotiation={modalNeg} onClose={() => setActiveNegotiationId(null)} />}
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
