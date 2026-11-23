import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, PhoneCall, Shirt } from 'lucide-react';
import { InboxMessage } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { PlayerAvatar } from './PlayerAvatar';

export const NotificationsView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const markInboxRead = useCareerStore((s) => s.markInboxRead);
  const resolveInboxChoice = useCareerStore((s) => s.resolveInboxChoice);
  const setActiveTab = useCareerStore((s) => s.setActiveTab);
  const setActiveNegotiationId = useCareerStore((s) => s.setActiveNegotiationId);

  const [categoryFilter, setCategoryFilter] = useState<InboxMessage['category'] | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!career) return null;

  const filtered = career.inbox.filter((m) => categoryFilter === 'ALL' || m.category === categoryFilter);
  const activeMsg = filtered.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  const handleSelect = (msg: InboxMessage) => {
    setSelectedId(msg.id);
    if (!msg.read) markInboxRead(msg.id);
  };

  return (
    <div className="mx-auto max-w-[1520px] px-4 lg:px-6 py-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            Notifications &amp; Inbox
          </h2>
          <div className="h-5 w-px bg-white/15" />
          {(['ALL', 'BOARD', 'TRANSFER', 'PLAYER', 'EVENT', 'PRESS', 'YOUTH'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                categoryFilter === cat ? 'fc-panel-active text-white' : 'text-[#8ea5b3] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#9bb4c2] font-mono-num">
          {career.inbox.filter((m) => !m.read).length} Unread · {career.inbox.length} Total
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Message List */}
        <div className="lg:col-span-5 fc-panel rounded-lg overflow-hidden max-h-[68vh] overflow-y-auto divide-y divide-white/[0.06]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8ba5b3]">No messages in this category.</div>
          ) : (
            filtered.map((msg) => {
              const isSel = activeMsg?.id === msg.id;
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    isSel ? 'fc-panel-active text-white' : 'hover:bg-white/[0.05] text-[#cbdce6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
                    <span className="font-extrabold text-[#38f2c8] flex items-center gap-1.5">
                      {!msg.read && <span className="h-2 w-2 rounded-full bg-[#38f2c8]" />}
                      {msg.category} · {msg.sender}
                    </span>
                    <span className="font-mono-num text-[#8ba5b3]">{msg.date}</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5 truncate">{msg.subject}</div>
                  <div className="text-xs text-[#9bb4c2] line-clamp-1 mt-0.5">{msg.body}</div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Reader Pane */}
        <div className="lg:col-span-7 fc-panel rounded-lg p-6 min-h-[420px]">
          {activeMsg ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#38f2c8]">
                    {activeMsg.category} · FROM {activeMsg.sender}
                  </div>
                  <h3 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white mt-1">
                    {activeMsg.subject}
                  </h3>
                </div>
                <span className="font-mono-num text-xs text-[#8ba5b3]">{activeMsg.date}</span>
              </div>

              {activeMsg.playerId && career.players[activeMsg.playerId] && (
                <div className="flex items-center gap-3 rounded-md border border-white/10 bg-[#0a1822]/75 p-3">
                  <PlayerAvatar
                    player={career.players[activeMsg.playerId]}
                    clubColor={career.clubs[career.userClubId]?.primaryColor}
                    size="md"
                  />
                  <div>
                    <div className="font-bold text-white text-sm">
                      {career.players[activeMsg.playerId].knownAs}
                    </div>
                    <div className="text-xs text-[#8ba5b3]">
                      {career.players[activeMsg.playerId].primaryPosition} · Dynamic OVR{' '}
                      {career.players[activeMsg.playerId].dynamicOvr.dynamicOvr} · Morale{' '}
                      {career.players[activeMsg.playerId].morale}/100
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-[#d6e4ec] leading-relaxed">{activeMsg.body}</p>

              {/* Direct Negotiation Link for Incoming Transfer Offers */}
              {activeMsg.negotiationId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('Transfers');
                    setActiveNegotiationId(activeMsg.negotiationId!);
                  }}
                  className="fc-btn-primary rounded px-5 py-2.5 text-xs uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  Open 2D Transfer Negotiation
                </button>
              )}

              {/* Interactive Manager Decision Choices (Press Conferences / Playtime / Events) */}
              {activeMsg.choices && activeMsg.choices.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#38f2c8] flex items-center gap-1.5">
                    {activeMsg.resolvedChoiceId ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Decision Recorded
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" /> Choose Manager Response
                      </>
                    )}
                  </div>

                  {activeMsg.choices.map((ch) => {
                    const chosen = activeMsg.resolvedChoiceId === ch.id;
                    const disabled = Boolean(activeMsg.resolvedChoiceId);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => resolveInboxChoice(activeMsg.id, ch.id)}
                        className={`w-full text-left rounded-md border p-3.5 transition-all ${
                          chosen
                            ? 'fc-panel-active text-white'
                            : disabled
                            ? 'border-white/5 bg-white/[0.02] text-[#6d8593] cursor-not-allowed'
                            : 'border-white/15 bg-[#0a1822]/85 hover:border-[#38f2c8]/60 text-white'
                        }`}
                      >
                        <div className="font-bold text-sm">{ch.label}</div>
                        <div className="text-xs text-[#38f2c8] mt-1">{ch.effectSummary}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#8ba5b3] gap-2 py-20">
              <Mail className="w-8 h-8 opacity-40" />
              <div className="text-sm">Select a notification to read</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DRAMATIC UNEXPECTED EVENT MODAL (matches FC 27 "STAR ASKS FOR BREAK.")
// ============================================================================

export const UnexpectedEventModal: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const resolveInboxChoice = useCareerStore((s) => s.resolveInboxChoice);
  const dismissEventModal = useCareerStore((s) => s.dismissEventModal);

  if (!career?.pendingEventModalId) return null;
  const msg = career.inbox.find((m) => m.id === career.pendingEventModalId);
  if (!msg || msg.resolvedChoiceId) return null;

  const player = msg.playerId ? career.players[msg.playerId] : null;
  const userClub = career.clubs[career.userClubId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040c12]/90 backdrop-blur-md p-4">
      <div className="w-full max-w-[680px] fc-panel rounded-xl p-8 text-center space-y-6 border border-[#38f2c8]/30">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 border border-white/20">
            <Shirt className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-4xl font-extrabold uppercase tracking-wider text-white">
            {msg.subject}
          </h2>
          <p className="text-sm text-[#c7d9e3] max-w-xl mx-auto leading-relaxed">{msg.body}</p>
        </div>

        {player && (
          <div className="mx-auto w-44 rounded-lg border border-white/15 bg-gradient-to-b from-[#1a222b] to-[#0b1117] p-4 flex flex-col items-center">
            <div className="text-xs font-bold text-white mb-2">{player.knownAs}</div>
            <PlayerAvatar player={player} clubColor={userClub.primaryColor} size="lg" />
            <div className="mt-2.5 text-xs font-bold text-[#38f2c8]">{player.primaryPosition}</div>
            <div className="text-[11px] text-[#9bb4c2]">{player.squadRole}</div>
          </div>
        )}

        <div className="space-y-2 text-left">
          {msg.choices?.map((ch, idx) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => resolveInboxChoice(msg.id, ch.id)}
              className={`w-full rounded-md px-4 py-3 text-left transition-all ${
                idx === 0
                  ? 'fc-btn-primary text-[#071117]'
                  : 'fc-btn-secondary text-white hover:border-[#38f2c8]/50'
              }`}
            >
              <div className="text-xs font-extrabold uppercase tracking-wide">{ch.label}</div>
              <div className={`text-[11px] mt-0.5 ${idx === 0 ? 'text-[#0c2e28] font-semibold' : 'text-[#38f2c8]'}`}>
                {ch.effectSummary}
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={dismissEventModal}
          className="text-xs text-[#8ba5b3] hover:text-white underline"
        >
          Defer to Notifications Inbox
        </button>
      </div>
    </div>
  );
};
