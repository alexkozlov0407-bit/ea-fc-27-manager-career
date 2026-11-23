import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BatteryCharging,
  Check,
  Shield,
  Sliders,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { GROWTH_PROFILES } from '../engine/growth';
import {
  ALL_POSITIONS,
  FORMATIONS,
  formatMoney,
  positionToSector,
  TARGET_MINUTE_SHARE,
} from '../engine/ratings';
import {
  EnergyRecoveryPolicy,
  FormationId,
  Mentality,
  Player,
  Position,
  Sector,
  TacticalVision,
} from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { OvrDiamond, PlayerAvatar, positionColorClass } from './PlayerAvatar';

type SquadSubTab = 'TeamManagement' | 'SquadHub' | 'Coaches';

const VISIONS: TacticalVision[] = [
  'Gegenpressing',
  'Tiki-Taka',
  'Wing Play',
  'Counter-Attack',
  'Park the Bus',
  'Standard',
];

const MENTALITIES: Mentality[] = [
  'Ultra Defensive',
  'Defensive',
  'Balanced',
  'Attacking',
  'Ultra Attacking',
];

export const SquadView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const swapSquadPlayers = useCareerStore((s) => s.swapSquadPlayers);
  const changeFormation = useCareerStore((s) => s.changeFormation);
  const updateClubTactics = useCareerStore((s) => s.updateClubTactics);
  const setCaptain = useCareerStore((s) => s.setCaptain);
  const setSetPieceTaker = useCareerStore((s) => s.setSetPieceTaker);
  const updateDevelopmentPlan = useCareerStore((s) => s.updateDevelopmentPlan);
  const toggleTransferList = useCareerStore((s) => s.toggleTransferList);
  const toggleLoanList = useCareerStore((s) => s.toggleLoanList);
  const toggleCoachHire = useCareerStore((s) => s.toggleCoachHire);
  const startNegotiation = useCareerStore((s) => s.startNegotiation);
  const updateSettings = useCareerStore((s) => s.updateSettings);

  const [subTab, setSubTab] = useState<SquadSubTab>('TeamManagement');
  const [pitchPhase, setPitchPhase] = useState<'WITHOUT_BALL' | 'WITH_BALL'>('WITHOUT_BALL');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [swapSourceId, setSwapSourceId] = useState<number | null>(null);
  const [dragPlayerId, setDragPlayerId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<'DynamicOVR' | 'Attributes' | 'Development' | 'Actions'>('DynamicOVR');
  const [retrainPos, setRetrainPos] = useState<Position>('CM');
  const [showTacticsBar, setShowTacticsBar] = useState(false);

  const clubData = useMemo(() => {
    if (!career) return null;
    const club = career.clubs[career.userClubId];
    const squad = Object.values(career.players)
      .filter((p) => p.clubId === club.id)
      .sort((a, b) => b.dynamicOvr.dynamicOvr - a.dynamicOvr.dynamicOvr);
    const lineupIds = new Set(club.lineup.map((s) => s.playerId).filter(Boolean) as number[]);
    const benchSet = new Set(club.benchIds);
    const reserves = squad.filter((p) => !lineupIds.has(p.id) && !benchSet.has(p.id));
    const clubMatches = career.standings.find((s) => s.clubId === club.id)?.played ?? 0;
    return { club, squad, reserves, clubMatches };
  }, [career]);

  if (!career || !clubData) return null;
  const { club, squad, reserves, clubMatches } = clubData;

  const activePlayer: Player | undefined =
    (selectedPlayerId ? career.players[selectedPlayerId] : undefined) ??
    (club.lineup[10]?.playerId ? career.players[club.lineup[10].playerId] : squad[0]);

  const handlePlayerClick = (playerId: number) => {
    setSelectedPlayerId(playerId);
    if (swapSourceId !== null) {
      if (swapSourceId !== playerId) {
        swapSquadPlayers(swapSourceId, playerId);
      }
      setSwapSourceId(null);
    }
  };

  const renderFitnessColor = (fit: number) =>
    fit >= 78 ? 'bg-[#10c482]' : fit >= 58 ? 'bg-amber-400' : 'bg-rose-500';

  const formatDelta = (val: number) => (val > 0 ? `+${val}` : `${val}`);

  const deltaColor = (val: number) =>
    val > 0 ? 'text-[#38f2c8]' : val < 0 ? 'text-rose-400' : 'text-[#8ba5b3]';

  return (
    <div className="mx-auto max-w-[1520px] px-4 lg:px-6 py-4 space-y-4">
      {/* Sub-Navigation Breadcrumb Header matching FC 27 screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            Squad
          </h2>
          <div className="h-5 w-px bg-white/15" />
          <div className="flex items-center gap-1.5">
            {(
              [
                ['TeamManagement', 'Team Management'],
                ['SquadHub', 'Squad Hub & Growth'],
                ['Coaches', 'Coaches & Energy Recovery'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSubTab(key)}
                className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                  subTab === key
                    ? 'fc-panel-active text-white'
                    : 'text-[#8ea5b3] hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#9cb4c2]">
          <span>Energy Recovery:</span>
          <strong className="text-[#38f2c8] uppercase">{career.settings.energyRecovery}</strong>
          <span>·</span>
          <span>Formation:</span>
          <strong className="text-white">{club.formation}</strong>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: TEAM MANAGEMENT (2D Perspective Pitch + FC 27 Inspector) */}
      {/* =================================================================== */}
      {subTab === 'TeamManagement' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left 8 cols: Tactical Bar + Perspective Pitch + Substitutes/Reserves */}
          <div className="xl:col-span-8 space-y-3">
            {/* Compact Formation & Tactical Controls */}
            <div className="fc-panel rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="text-[11px] uppercase tracking-wider text-[#8ba5b3] font-bold">
                  Formation
                </label>
                <select
                  aria-label="Formation"
                  value={club.formation}
                  onChange={(e) => changeFormation(e.target.value as FormationId)}
                  className="rounded border border-white/15 bg-[#0a1822] px-2.5 py-1.5 text-xs font-bold text-white focus:border-[#38f2c8] focus:outline-none"
                >
                  {(Object.keys(FORMATIONS) as FormationId[]).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Tactical Vision"
                  value={club.tacticalVision}
                  onChange={(e) =>
                    updateClubTactics(e.target.value as TacticalVision, club.mentality, club.defensiveLineHeight)
                  }
                  className="rounded border border-white/15 bg-[#0a1822] px-2.5 py-1.5 text-xs font-bold text-[#b8fff0] focus:border-[#38f2c8] focus:outline-none"
                >
                  {VISIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowTacticsBar((v) => !v)}
                  className="fc-btn-secondary rounded px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#38f2c8]" />
                  Tactics &amp; Roles
                </button>
              </div>

              <div className="flex items-center gap-2">
                {swapSourceId !== null ? (
                  <button
                    type="button"
                    onClick={() => setSwapSourceId(null)}
                    className="rounded bg-amber-400/20 border border-amber-300/60 px-3 py-1.5 text-xs font-bold text-amber-200"
                  >
                    Swapping {career.players[swapSourceId]?.knownAs} — Click target (Cancel)
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!activePlayer}
                    onClick={() => activePlayer && setSwapSourceId(activePlayer.id)}
                    className="fc-btn-secondary rounded px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-[#38f2c8]" />
                    Swap Selected Player
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Mentality / Line Height / Set Pieces */}
            {showTacticsBar && (
              <div className="fc-panel rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">
                    Mentality
                  </label>
                  <select
                    value={club.mentality}
                    onChange={(e) =>
                      updateClubTactics(club.tacticalVision, e.target.value as Mentality, club.defensiveLineHeight)
                    }
                    className="w-full rounded border border-white/15 bg-[#0a1822] px-2.5 py-1.5 text-white"
                  >
                    {MENTALITIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">
                    Defensive Line Height ({club.defensiveLineHeight})
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    value={club.defensiveLineHeight}
                    onChange={(e) =>
                      updateClubTactics(club.tacticalVision, club.mentality, Number(e.target.value))
                    }
                    className="w-full accent-[#38f2c8]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">
                    Club Captain
                  </label>
                  <select
                    value={club.captainId ?? ''}
                    onChange={(e) => setCaptain(Number(e.target.value))}
                    className="w-full rounded border border-white/15 bg-[#0a1822] px-2.5 py-1.5 text-white"
                  >
                    {club.lineup.map((s) =>
                      s.playerId && career.players[s.playerId] ? (
                        <option key={s.playerId} value={s.playerId}>
                          {career.players[s.playerId].knownAs}
                        </option>
                      ) : null
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">
                    Penalty Taker
                  </label>
                  <select
                    value={club.penaltyTakerId ?? ''}
                    onChange={(e) => setSetPieceTaker('penalty', Number(e.target.value))}
                    className="w-full rounded border border-white/15 bg-[#0a1822] px-2.5 py-1.5 text-white"
                  >
                    {club.lineup.map((s) =>
                      s.playerId && career.players[s.playerId] ? (
                        <option key={s.playerId} value={s.playerId}>
                          {career.players[s.playerId].knownAs} ({career.players[s.playerId].attributes.penalties} PEN)
                        </option>
                      ) : null
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* Interactive 2D Pitch */}
            <div className="relative rounded-lg fc-pitch-surface h-[475px] overflow-hidden select-none">
              {/* Pitch markings SVG */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
              >
                <rect x="3" y="3" width="94" height="94" fill="none" stroke="#c8f7dc" strokeWidth="0.45" />
                <line x1="3" y1="50" x2="97" y2="50" stroke="#c8f7dc" strokeWidth="0.45" />
                <circle cx="50" cy="50" r="11" fill="none" stroke="#c8f7dc" strokeWidth="0.45" />
                <rect x="26" y="3" width="48" height="15" fill="none" stroke="#c8f7dc" strokeWidth="0.45" />
                <rect x="26" y="82" width="48" height="15" fill="none" stroke="#c8f7dc" strokeWidth="0.45" />
              </svg>

              {/* 11 Starting XI Nodes */}
              {club.lineup.map((slot) => {
                const p = slot.playerId ? career.players[slot.playerId] : null;
                if (!p) return null;
                const leftPct = pitchPhase === 'WITH_BALL' ? slot.withBallX : slot.x;
                const topPct = pitchPhase === 'WITH_BALL' ? slot.withBallY : slot.y;
                const isSelected = activePlayer?.id === p.id;
                const isSwapSrc = swapSourceId === p.id;
                const isCaptain = club.captainId === p.id;
                const dyn = p.dynamicOvr;

                return (
                  <button
                    key={slot.slotIndex}
                    type="button"
                    draggable
                    onDragStart={() => setDragPlayerId(p.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragPlayerId && dragPlayerId !== p.id) {
                        swapSquadPlayers(dragPlayerId, p.id);
                      }
                      setDragPlayerId(null);
                    }}
                    onClick={() => handlePlayerClick(p.id)}
                    style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 group focus:outline-none ${
                      isSelected ? 'z-20 scale-105' : 'z-10 hover:scale-105'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] font-extrabold uppercase drop-shadow ${
                          dyn.positionPenalty < 0 ? 'text-amber-300' : 'text-white/90'
                        }`}
                      >
                        {slot.position}
                      </span>
                      <div
                        className={`relative rounded-full p-[2px] ${
                          isSwapSrc
                            ? 'ring-2 ring-amber-300'
                            : isSelected
                            ? 'ring-2 ring-[#b8fff0] shadow-[0_0_16px_rgba(56,242,200,0.6)]'
                            : ''
                        }`}
                      >
                        <PlayerAvatar player={p} clubColor={club.primaryColor} size="sm" />
                        {p.injury && (
                          <span
                            title={`${p.injury.type} (${p.injury.aggravationRiskPct}% risk)`}
                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[#121212] text-[10px] font-black"
                          >
                            !
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-display text-lg font-extrabold tabular-nums leading-none drop-shadow ${
                          dyn.totalDelta > 0
                            ? 'text-[#b8fff0]'
                            : dyn.totalDelta < 0
                            ? 'text-rose-300'
                            : 'text-white'
                        }`}
                      >
                        {dyn.dynamicOvr}
                      </span>
                    </div>

                    {/* Player Name Pill + Captain [C] */}
                    <div
                      className={`mt-0.5 px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 max-w-[106px] truncate ${
                        isSelected
                          ? 'bg-white text-[#071117]'
                          : 'bg-[#07141b]/85 text-white border border-white/15'
                      }`}
                    >
                      {isCaptain && (
                        <span className="inline-block px-1 rounded-[2px] bg-amber-300 text-[#071117] text-[9px] font-black">
                          C
                        </span>
                      )}
                      <span className="truncate">{p.jerseyName || p.knownAs}</span>
                    </div>

                    {/* Match Fitness green bar */}
                    <div className="mt-0.5 w-14 h-1 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className={`h-full ${renderFitnessColor(p.matchFitness)}`}
                        style={{ width: `${p.matchFitness}%` }}
                      />
                    </div>
                  </button>
                );
              })}

              {/* Bottom-left With Ball / Without Ball Switch matching FC 27 */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded bg-[#07141b]/85 border border-white/15 p-1">
                <button
                  type="button"
                  onClick={() => setPitchPhase('WITHOUT_BALL')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                    pitchPhase === 'WITHOUT_BALL' ? 'bg-white text-[#071117]' : 'text-[#9bb4c2] hover:text-white'
                  }`}
                >
                  Without Ball
                </button>
                <button
                  type="button"
                  onClick={() => setPitchPhase('WITH_BALL')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                    pitchPhase === 'WITH_BALL' ? 'bg-white text-[#071117]' : 'text-[#9bb4c2] hover:text-white'
                  }`}
                >
                  With Ball
                </button>
              </div>

              <div className="absolute bottom-3 right-3 text-[11px] text-white/75 bg-[#07141b]/75 px-2.5 py-1 rounded border border-white/10">
                Drag or click Swap to switch XI &amp; Subs
              </div>
            </div>

            {/* Substitutes & Reserves Tray */}
            <div className="fc-panel rounded-lg p-3.5 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#38f2c8]">
                    Substitutes ({club.benchIds.length})
                  </span>
                  <span className="text-[11px] text-[#8ba5b3]">
                    Drag onto any pitch player or use Swap Selected
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                  {club.benchIds.map((bid) => {
                    const p = career.players[bid];
                    if (!p) return null;
                    const isSel = activePlayer?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        draggable
                        onDragStart={() => setDragPlayerId(p.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragPlayerId && dragPlayerId !== p.id) {
                            swapSquadPlayers(dragPlayerId, p.id);
                          }
                          setDragPlayerId(null);
                        }}
                        onClick={() => handlePlayerClick(p.id)}
                        className={`rounded p-2 text-center border transition-all ${
                          isSel
                            ? 'fc-panel-active'
                            : 'border-white/10 bg-[#0a1822]/75 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className={positionColorClass(p.primaryPosition)}>{p.primaryPosition}</span>
                          <span className="font-mono-num text-white">{p.dynamicOvr.dynamicOvr}</span>
                        </div>
                        <div className="my-1 flex justify-center relative">
                          <PlayerAvatar player={p} clubColor={club.primaryColor} size="xs" />
                          {p.injury && (
                            <span className="absolute -top-0.5 right-1 h-3.5 w-3.5 rounded-full bg-amber-400 text-[#091017] text-[9px] font-black leading-[14px]">
                              !
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-white truncate">{p.jerseyName || p.knownAs}</div>
                        <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full ${renderFitnessColor(p.matchFitness)}`}
                            style={{ width: `${p.matchFitness}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {reserves.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8ba5b3] mb-1.5">
                    Reserves ({reserves.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reserves.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePlayerClick(p.id)}
                        className={`rounded px-2.5 py-1 text-[11px] flex items-center gap-1.5 border ${
                          activePlayer?.id === p.id
                            ? 'fc-panel-active text-white'
                            : 'border-white/10 bg-[#0a1720]/70 text-[#b7cbd6] hover:text-white'
                        }`}
                      >
                        <span className={`font-bold ${positionColorClass(p.primaryPosition)}`}>
                          {p.primaryPosition}
                        </span>
                        <span className="font-semibold">{p.knownAs}</span>
                        <span className="font-mono-num font-bold text-white">{p.dynamicOvr.dynamicOvr}</span>
                        {p.injury && <span className="text-amber-300 font-bold">({p.injury.daysRemaining}d)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right 4 cols: Authentic EA FC 27 Player Inspector Card */}
          {activePlayer && (
            <div className="xl:col-span-4 fc-panel rounded-lg p-5 space-y-4">
              {/* Header: Avatar + Name + Positions + OVR Diamond */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar player={activePlayer} clubColor={club.primaryColor} size="lg" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#9db6c4]">
                      {[activePlayer.primaryPosition, ...activePlayer.otherPositions].join(' · ')}
                    </div>
                    <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white truncate">
                      {activePlayer.knownAs}
                    </h3>
                    <div className="text-xs text-[#9cb4c2] font-mono-num">
                      Baseline OVR <strong className="text-white">{activePlayer.baseOvr}</strong> | Potential{' '}
                      <strong className="text-[#38f2c8]">{activePlayer.potential}</strong>
                    </div>
                  </div>
                </div>
                <OvrDiamond
                  ovr={activePlayer.dynamicOvr.dynamicOvr}
                  delta={activePlayer.dynamicOvr.totalDelta}
                  size="lg"
                />
              </div>

              {/* 3-Column Dynamic OVR Breakdown matching FC 27 screenshot */}
              <div className="grid grid-cols-3 gap-2 rounded-md border border-white/10 bg-[#0a1822]/80 p-3 text-center">
                <div>
                  <div className="text-[10px] uppercase text-[#8ba5b3]">Form</div>
                  <div className={`font-mono-num text-xs font-extrabold ${deltaColor(activePlayer.dynamicOvr.formDelta)}`}>
                    {formatDelta(activePlayer.dynamicOvr.formDelta)} OVR
                  </div>
                  <div className="text-[11px] font-bold text-white mt-0.5">{activePlayer.dynamicOvr.formLabel}</div>
                </div>
                <div className="border-x border-white/10">
                  <div className="text-[10px] uppercase text-[#8ba5b3]">Morale</div>
                  <div className={`font-mono-num text-xs font-extrabold ${deltaColor(activePlayer.dynamicOvr.moraleDelta)}`}>
                    {formatDelta(activePlayer.dynamicOvr.moraleDelta)} OVR
                  </div>
                  <div className="text-[11px] font-bold text-white mt-0.5">{activePlayer.dynamicOvr.moraleLabel}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-[#8ba5b3]">Match Fitness</div>
                  <div className={`font-mono-num text-xs font-extrabold ${deltaColor(activePlayer.dynamicOvr.fitnessDelta)}`}>
                    {formatDelta(activePlayer.dynamicOvr.fitnessDelta)} OVR
                  </div>
                  <div className="text-[11px] font-bold text-white mt-0.5">
                    {activePlayer.dynamicOvr.fitnessLabel} ({activePlayer.matchFitness}%)
                  </div>
                </div>
              </div>

              {/* Ready to Play OR Recovering Injury Risk Banner */}
              {activePlayer.injury ? (
                <div className="rounded-md border border-amber-400/50 bg-amber-500/15 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-200 uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                    {activePlayer.injury.recovering
                      ? `Playable With Risk — ${activePlayer.injury.aggravationRiskPct}% Aggravation Risk`
                      : `Unavailable — ${activePlayer.injury.type}`}
                  </div>
                  <div className="text-[11px] text-amber-100/85 mt-0.5">
                    {activePlayer.injury.type} · {activePlayer.injury.daysRemaining} days left · Injury OVR{' '}
                    <span className="font-mono-num font-bold text-rose-300">
                      {activePlayer.dynamicOvr.injuryDelta}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded bg-[#102c2c]/70 border border-[#38f2c8]/25 py-1.5 text-center text-xs font-bold text-[#b8fff0] tracking-wide">
                  Ready to Play · Playtime Delta {formatDelta(activePlayer.dynamicOvr.playtimeDelta)} OVR
                </div>
              )}

              {/* 6 Face Stats with live green/red +delta + Right Meta Column */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                <div className="space-y-2 border-r border-white/10 pr-3">
                  {(
                    [
                      ['Pace', activePlayer.cardFacets.pac, activePlayer.dynamicOvr.facetDeltas.pac],
                      ['Shooting', activePlayer.cardFacets.sho, activePlayer.dynamicOvr.facetDeltas.sho],
                      ['Passing', activePlayer.cardFacets.pas, activePlayer.dynamicOvr.facetDeltas.pas],
                      ['Dribbling', activePlayer.cardFacets.dri, activePlayer.dynamicOvr.facetDeltas.dri],
                      ['Defending', activePlayer.cardFacets.def, activePlayer.dynamicOvr.facetDeltas.def],
                      ['Physical', activePlayer.cardFacets.phy, activePlayer.dynamicOvr.facetDeltas.phy],
                    ] as const
                  ).map(([label, base, d]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[#9bb4c2]">{label}</span>
                      <span className="font-mono-num font-bold text-white">
                        {base}{' '}
                        {d !== 0 && (
                          <span className={`text-[11px] ml-1 ${d > 0 ? 'text-[#38f2c8]' : 'text-rose-400'}`}>
                            {d > 0 ? `+${d}` : d}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#9bb4c2]">Age</span>
                    <span className="font-mono-num font-bold text-white">{activePlayer.age}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9bb4c2]">Height</span>
                    <span className="font-mono-num font-bold text-white">{activePlayer.heightCm} cm</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#9bb4c2] shrink-0">Role</span>
                    <span className="font-bold text-[#38f2c8] truncate">
                      {activePlayer.roleTitle} {activePlayer.roleFamiliarity === 'Role++' ? '++' : activePlayer.roleFamiliarity === 'Role+' ? '+' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9bb4c2]">Profile</span>
                    <span className="font-bold text-white truncate">
                      {GROWTH_PROFILES[activePlayer.growthProfile].label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9bb4c2]">Squad Role</span>
                    <span className="font-bold text-white">{activePlayer.squadRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9bb4c2]">Foot</span>
                    <span className="font-bold text-white">{activePlayer.preferredFoot}</span>
                  </div>
                </div>
              </div>

              {/* Skill Moves & Weak Foot */}
              <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#9bb4c2]">Skill Moves</span>
                  <span className="text-amber-300 tracking-tighter">
                    {'★'.repeat(activePlayer.skillMoves)}
                    <span className="text-white/20">{'★'.repeat(5 - activePlayer.skillMoves)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9bb4c2]">Weak Foot</span>
                  <span className="text-amber-300 tracking-tighter">
                    {'★'.repeat(activePlayer.weakFoot)}
                    <span className="text-white/20">{'★'.repeat(5 - activePlayer.weakFoot)}</span>
                  </span>
                </div>
              </div>

              {/* PlayStyles */}
              <div className="border-t border-white/10 pt-3">
                <div className="text-[11px] uppercase tracking-wider text-[#8ba5b3] font-bold mb-1.5">
                  PlayStyles
                </div>
                {activePlayer.playStyles.length === 0 ? (
                  <div className="text-xs text-[#7f9aa8]">Standard Profile</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {activePlayer.playStyles.map((ps) => (
                      <span
                        key={ps}
                        className="rounded-sm border border-[#38f2c8]/30 bg-[#102c32]/80 px-2 py-0.5 text-[11px] font-semibold text-[#d2f7ee]"
                      >
                        {ps}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: SQUAD HUB (Full Roster + Dynamic OVR & 6 Growth Profiles)*/}
      {/* =================================================================== */}
      {subTab === 'SquadHub' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-8 fc-panel rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[68vh]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0d1d29] border-b border-white/12 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Player</th>
                    <th className="py-2.5 px-2 text-center">Pos</th>
                    <th className="py-2.5 px-2 text-center">Age</th>
                    <th className="py-2.5 px-2 text-center">Base</th>
                    <th className="py-2.5 px-2 text-center">Live OVR</th>
                    <th className="py-2.5 px-2 text-center">POT</th>
                    <th className="py-2.5 px-2 text-left">Growth Profile</th>
                    <th className="py-2.5 px-2 text-center">Fit</th>
                    <th className="py-2.5 px-2 text-right">Value (xTV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {squad.map((p) => {
                    const isSel = activePlayer?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPlayerId(p.id)}
                        className={`cursor-pointer transition-colors ${
                          isSel ? 'fc-panel-active text-white' : 'hover:bg-white/[0.05] text-[#d6e4ec]'
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2.5">
                            <PlayerAvatar player={p} clubColor={club.primaryColor} size="xs" />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {p.knownAs}
                                {p.injury && (
                                  <span className="text-[10px] text-amber-300 font-semibold">
                                    ({p.injury.recovering ? `${p.injury.aggravationRiskPct}% risk` : `${p.injury.daysRemaining}d out`})
                                  </span>
                                )}
                                {p.transferListed && (
                                  <span className="text-[10px] text-rose-300 font-bold uppercase">Listed</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#8ba5b3]">
                                {p.squadRole} · {formatMoney(p.weeklyWageEur, career.settings.currency)}/wk · Ends {p.contractEndYear}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-2 px-2 text-center font-bold ${positionColorClass(p.primaryPosition)}`}>
                          {p.primaryPosition}
                        </td>
                        <td className="py-2 px-2 text-center font-mono-num">{p.age}</td>
                        <td className="py-2 px-2 text-center font-mono-num text-[#9bb4c2]">{p.baseOvr}</td>
                        <td className="py-2 px-2 text-center font-mono-num font-extrabold">
                          <span className="text-white">{p.dynamicOvr.dynamicOvr}</span>
                          <span className={`ml-1 text-[10px] ${deltaColor(p.dynamicOvr.totalDelta)}`}>
                            ({formatDelta(p.dynamicOvr.totalDelta)})
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono-num text-[#38f2c8] font-bold">
                          {p.potential}
                        </td>
                        <td className="py-2 px-2">
                          <div className="font-semibold text-white">
                            {GROWTH_PROFILES[p.growthProfile].label}
                          </div>
                          <div className="text-[10px] text-[#8ba5b3] font-mono-num">
                            Mom {p.developmentPlan.momentum}% · XP {Math.round(p.xpProgress)}%
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono-num">
                          <span className={p.matchFitness >= 75 ? 'text-[#38f2c8]' : 'text-amber-300'}>
                            {p.matchFitness}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono-num font-bold text-[#b8fff0]">
                          {formatMoney(p.expectedTransferValue, career.settings.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 4 cols: 4-Tab Player Detail Drawer */}
          {activePlayer && (
            <div className="xl:col-span-4 fc-panel rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar player={activePlayer} clubColor={club.primaryColor} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl font-extrabold uppercase text-white truncate">
                      {activePlayer.knownAs}
                    </h3>
                    <div className="text-xs text-[#8ba5b3]">
                      {activePlayer.nationality} · {activePlayer.age} yrs · {activePlayer.primaryPosition}
                    </div>
                  </div>
                </div>
                <OvrDiamond ovr={activePlayer.dynamicOvr.dynamicOvr} delta={activePlayer.dynamicOvr.totalDelta} />
              </div>

              <div className="grid grid-cols-4 gap-1 border-b border-white/10 pb-2">
                {(['DynamicOVR', 'Attributes', 'Development', 'Actions'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDrawerTab(t)}
                    className={`py-1.5 rounded text-[11px] font-bold uppercase ${
                      drawerTab === t ? 'bg-white text-[#071117]' : 'text-[#8ea5b3] hover:text-white'
                    }`}
                  >
                    {t === 'DynamicOVR' ? 'Dyn OVR' : t}
                  </button>
                ))}
              </div>

              {drawerTab === 'DynamicOVR' && (
                <div className="space-y-3 text-xs">
                  <div className="rounded border border-white/10 bg-[#0a1822]/80 p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Baseline OVR ({activePlayer.dynamicOvr.deployedPosition})</span>
                      <span className="font-mono-num font-bold text-white">{activePlayer.dynamicOvr.baseOvr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Form ({activePlayer.formScore.toFixed(1)} avg · {activePlayer.dynamicOvr.formLabel})</span>
                      <span className={`font-mono-num font-bold ${deltaColor(activePlayer.dynamicOvr.formDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.formDelta)} OVR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Morale ({activePlayer.morale}/100 · {activePlayer.dynamicOvr.moraleLabel})</span>
                      <span className={`font-mono-num font-bold ${deltaColor(activePlayer.dynamicOvr.moraleDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.moraleDelta)} OVR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">
                        Playtime vs {activePlayer.squadRole} (Target {Math.round(TARGET_MINUTE_SHARE[activePlayer.squadRole] * 100)}%)
                      </span>
                      <span className={`font-mono-num font-bold ${deltaColor(activePlayer.dynamicOvr.playtimeDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.playtimeDelta)} OVR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Match Fitness ({activePlayer.matchFitness}%)</span>
                      <span className={`font-mono-num font-bold ${deltaColor(activePlayer.dynamicOvr.fitnessDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.fitnessDelta)} OVR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Injury / Recovering</span>
                      <span className={`font-mono-num font-bold ${deltaColor(activePlayer.dynamicOvr.injuryDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.injuryDelta)} OVR
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-extrabold">
                      <span className="text-white">Live Dynamic OVR</span>
                      <span className="font-mono-num text-[#b8fff0]">{activePlayer.dynamicOvr.dynamicOvr}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#8ba5b3]">
                    Season Stats: {activePlayer.seasonStats.appearances} apps · {activePlayer.seasonStats.minutes} mins ·{' '}
                    {activePlayer.seasonStats.goals}G / {activePlayer.seasonStats.assists}A
                    {clubMatches > 0 ? ` (${Math.round((activePlayer.seasonStats.minutes / (clubMatches * 90)) * 100)}% of club minutes)` : ''}
                  </div>
                </div>
              )}

              {drawerTab === 'Attributes' && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-[340px] overflow-y-auto pr-1 text-[11px]">
                  {Object.entries(activePlayer.attributes).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between border-b border-white/[0.05] py-1">
                      <span className="capitalize text-[#9bb4c2]">{key}</span>
                      <span
                        className={`font-mono-num font-bold ${
                          val >= 82 ? 'text-[#38f2c8]' : val >= 70 ? 'text-white' : 'text-[#8ea5b3]'
                        }`}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {drawerTab === 'Development' && (
                <div className="space-y-3 text-xs">
                  <div className="rounded border border-white/10 bg-[#0a1822]/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#38f2c8] uppercase">
                        {GROWTH_PROFILES[activePlayer.growthProfile].label}
                      </span>
                      <span className="font-mono-num text-[#9bb4c2]">
                        Peak {GROWTH_PROFILES[activePlayer.growthProfile].peakStartAge}–
                        {GROWTH_PROFILES[activePlayer.growthProfile].peakEndAge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#a7becb] mt-1">
                      {GROWTH_PROFILES[activePlayer.growthProfile].summary}
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#8ba5b3]">Development Momentum</span>
                        <span className="font-mono-num font-bold text-white">
                          {activePlayer.developmentPlan.momentum}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#10c482] to-[#38f2c8]"
                          style={{ width: `${activePlayer.developmentPlan.momentum}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase text-[#8ba5b3]">Development Plan 2.0</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateDevelopmentPlan(activePlayer.id, 'Balanced')}
                        className={`rounded py-2 px-2.5 text-xs font-bold border ${
                          activePlayer.developmentPlan.mode === 'Balanced'
                            ? 'fc-panel-active text-white'
                            : 'border-white/12 bg-[#0a1822] text-[#a4bcc8]'
                        }`}
                      >
                        Balanced
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDevelopmentPlan(activePlayer.id, 'RoleFocus')}
                        className={`rounded py-2 px-2.5 text-xs font-bold border ${
                          activePlayer.developmentPlan.mode === 'RoleFocus'
                            ? 'fc-panel-active text-white'
                            : 'border-white/12 bg-[#0a1822] text-[#a4bcc8]'
                        }`}
                      >
                        Role Focus ({activePlayer.roleTitle})
                      </button>
                    </div>

                    <div className="rounded border border-white/10 bg-[#0a1822]/70 p-2.5 space-y-2">
                      <div className="text-[11px] font-bold text-white">Position Retraining (up to 7 positions)</div>
                      <div className="flex gap-2">
                        <select
                          value={retrainPos}
                          onChange={(e) => setRetrainPos(e.target.value as Position)}
                          className="flex-1 rounded border border-white/15 bg-[#08131b] px-2 py-1.5 text-xs text-white"
                        >
                          {ALL_POSITIONS.filter(
                            (pos) => pos !== activePlayer.primaryPosition && !activePlayer.otherPositions.includes(pos)
                          ).map((pos) => (
                            <option key={pos} value={pos}>
                              Learn {pos}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => updateDevelopmentPlan(activePlayer.id, 'PositionRetrain', retrainPos)}
                          className="fc-btn-primary rounded px-3 py-1.5 text-[11px] uppercase"
                        >
                          Start
                        </button>
                      </div>
                      {activePlayer.developmentPlan.mode === 'PositionRetrain' && (
                        <div className="text-[11px] text-[#38f2c8]">
                          Retraining for {activePlayer.developmentPlan.targetPosition}:{' '}
                          {Math.round(activePlayer.developmentPlan.weeksCompleted)}/
                          {activePlayer.developmentPlan.weeksRequired} weeks
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'Actions' && (
                <div className="space-y-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => startNegotiation(activePlayer.id, 'CONTRACT')}
                    className="fc-btn-primary w-full rounded py-2.5 uppercase tracking-wider"
                  >
                    Negotiate Contract Renewal
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTransferList(activePlayer.id)}
                    className="fc-btn-secondary w-full rounded py-2 font-bold uppercase tracking-wider"
                  >
                    {activePlayer.transferListed ? 'Remove from Transfer List' : 'Add to Transfer List'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLoanList(activePlayer.id)}
                    className="fc-btn-secondary w-full rounded py-2 font-bold uppercase tracking-wider"
                  >
                    {activePlayer.loanListed ? 'Remove from Loan List' : 'Add to Loan List'}
                  </button>
                  <div className="rounded border border-white/10 bg-[#0a1822]/75 p-3 space-y-1 text-[11px] text-[#9bb4c2]">
                    <div className="flex justify-between">
                      <span>TransferRoom xTV</span>
                      <strong className="font-mono-num text-[#b8fff0]">
                        {formatMoney(activePlayer.expectedTransferValue, career.settings.currency)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Release Clause</span>
                      <strong className="font-mono-num text-white">
                        {formatMoney(activePlayer.releaseClauseEur, career.settings.currency)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Weekly Wage</span>
                      <strong className="font-mono-num text-white">
                        {formatMoney(activePlayer.weeklyWageEur, career.settings.currency)}/wk
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: COACHES & ENERGY RECOVERY                                */}
      {/* =================================================================== */}
      {subTab === 'Coaches' && (
        <div className="space-y-5">
          {/* Energy Recovery Policy Selector (replaces legacy training drills) */}
          <div className="fc-panel rounded-lg p-5">
            <div className="flex items-center gap-2 mb-1">
              <BatteryCharging className="w-5 h-5 text-[#38f2c8]" />
              <h3 className="font-display text-xl font-extrabold uppercase tracking-wide">
                Match Fitness &amp; Energy Recovery Policy
              </h3>
            </div>
            <p className="text-xs text-[#9cb4c2] mb-4">
              FC 27 replaces repetitive training drills with club-wide Energy Recovery management. Balance recovery speed against match sharpness to protect Dynamic OVR and avoid injury aggravation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: 'Aggressive',
                    title: 'Aggressive Recovery',
                    desc: '+7 Energy / day · -1 Sharpness / day. Best during fixture congestion or when protecting recovering injuries.',
                  },
                  {
                    id: 'Balanced',
                    title: 'Balanced Recovery',
                    desc: '+5 Energy / day · +1 Sharpness / day. Keeps starting XI in Peak Match Fitness without overworking.',
                  },
                  {
                    id: 'Conservative',
                    title: 'High Intensity / Match Sharp',
                    desc: '+3 Energy / day · +2 Sharpness / day. Maximizes sharpness for weekly LaLiga fixtures.',
                  },
                ] as const
              ).map((opt) => {
                const active = career.settings.energyRecovery === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSettings({ energyRecovery: opt.id as EnergyRecoveryPolicy })}
                    className={`rounded-lg p-4 text-left border transition-all ${
                      active ? 'fc-panel-active text-white' : 'border-white/10 bg-[#0b1822]/75 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-extrabold uppercase">{opt.title}</span>
                      {active && <Check className="w-4 h-4 text-[#b8fff0]" />}
                    </div>
                    <p className="text-xs text-[#a9c0cc] mt-1">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Department Ideal Quality Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(['ATK', 'MID', 'DEF', 'GK'] as Sector[]).map((dept) => {
              const deptPlayers = squad.filter((p) => positionToSector(p.primaryPosition) === dept);
              const avgOvr =
                deptPlayers.length > 0
                  ? Math.round(deptPlayers.reduce((s, p) => s + p.baseOvr, 0) / deptPlayers.length)
                  : 0;
              const hiredCoaches = club.coaches.filter((c) => c.hired && c.department === dept);
              const totalStars = hiredCoaches.reduce((s, c) => s + c.stars, 0);
              return (
                <div key={dept} className="fc-panel rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-extrabold uppercase text-[#38f2c8]">
                      {dept} Department
                    </span>
                    <span className="font-mono-num text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-300" /> {totalStars} / 5★
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#9cb4c2] flex justify-between">
                    <span>{deptPlayers.length} Players · Avg {avgOvr} OVR</span>
                  </div>
                  <div className="mt-2 text-[11px] text-[#b8fff0] flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {totalStars >= 4 ? 'Elite XP boost & Potential clarity' : 'Hire additional coaches to boost XP'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 12-Coach Pool Management */}
          <div className="fc-panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#38f2c8]" />
                <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
                  Coaching Staff ({club.coaches.filter((c) => c.hired).length}/8 Hired)
                </h3>
              </div>
              <span className="text-xs text-[#8ba5b3]">Coaches accelerate weekly Growth Profile XP &amp; Position Retraining</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {club.coaches.map((coach) => (
                <div
                  key={coach.id}
                  className={`rounded-md border p-3.5 flex items-center justify-between gap-3 ${
                    coach.hired ? 'border-[#38f2c8]/40 bg-[#102e2e]/50' : 'border-white/10 bg-[#0b1822]/75'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase text-[#38f2c8]">{coach.department}</span>
                      <span className="text-sm font-bold text-white">{coach.name}</span>
                    </div>
                    <div className="text-xs text-amber-300 mt-0.5">{'★'.repeat(coach.stars)}</div>
                    <div className="text-[11px] text-[#8ba5b3] mt-0.5">
                      {coach.tacticalStyle} · {formatMoney(coach.weeklySalaryEur, career.settings.currency)}/wk
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCoachHire(coach.id)}
                    className={`rounded px-3 py-1.5 text-xs font-bold uppercase ${
                      coach.hired ? 'fc-btn-secondary text-rose-300' : 'fc-btn-primary'
                    }`}
                  >
                    {coach.hired ? 'Release' : 'Hire'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
