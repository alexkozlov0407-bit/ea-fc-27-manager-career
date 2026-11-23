import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  FastForward,
  Pause,
  Play,
  Sliders,
  Trophy,
} from 'lucide-react';
import { Mentality, TacticalVision } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest } from './PlayerAvatar';

const MENTALITIES: Mentality[] = [
  'Ultra Defensive',
  'Defensive',
  'Balanced',
  'Attacking',
  'Ultra Attacking',
];
const VISIONS: TacticalVision[] = [
  'Gegenpressing',
  'Tiki-Taka',
  'Wing Play',
  'Counter-Attack',
  'Park the Bus',
  'Standard',
];

export const LiveMatchModal: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const liveMatch = useCareerStore((s) => s.liveMatch);
  const stepLiveMinute = useCareerStore((s) => s.stepLiveMinute);
  const makeLiveSub = useCareerStore((s) => s.makeLiveSub);
  const updateLiveTactics = useCareerStore((s) => s.updateLiveTactics);
  const finishLiveMatch = useCareerStore((s) => s.finishLiveMatch);

  const [playing, setPlaying] = useState(true);
  const [speedMult, setSpeedMult] = useState<1 | 2 | 4>(1);
  const [subOutId, setSubOutId] = useState<number | null>(null);

  useEffect(() => {
    if (!liveMatch || !playing || liveMatch.isFinished) return;
    const baseMs = career?.settings.liveSimSpeedMs ?? 360;
    const delay = Math.max(90, Math.round(baseMs / speedMult));
    const id = window.setInterval(() => {
      stepLiveMinute();
    }, delay);
    return () => window.clearInterval(id);
  }, [liveMatch?.isFinished, playing, speedMult, career?.settings.liveSimSpeedMs, stepLiveMinute]);

  if (!career || !liveMatch) return null;

  const homeClub = career.clubs[liveMatch.homeClubId];
  const awayClub = career.clubs[liveMatch.awayClubId];
  const isUserHome = liveMatch.homeClubId === career.userClubId;
  const userLineupIds = isUserHome ? liveMatch.homeLineupIds : liveMatch.awayLineupIds;
  const userBenchIds = isUserHome ? liveMatch.homeBenchIds : liveMatch.awayBenchIds;
  const userStamina = isUserHome ? liveMatch.homeStamina : liveMatch.awayStamina;
  const userSubsUsed = isUserHome ? liveMatch.homeSubsUsed : liveMatch.awaySubsUsed;
  const userMentality = isUserHome ? liveMatch.homeMentality : liveMatch.awayMentality;
  const userVision = isUserHome ? liveMatch.homeVision : liveMatch.awayVision;

  const simToEnd = () => {
    setPlaying(false);
    let safety = 0;
    while (safety < 95) {
      const cur = useCareerStore.getState().liveMatch;
      if (!cur || cur.isFinished) break;
      useCareerStore.getState().stepLiveMinute();
      safety++;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 lg:p-5 overflow-y-auto">
      <div className="w-full max-w-[1220px] fc-panel rounded-xl overflow-hidden border border-[#38f2c8]/30 flex flex-col max-h-[94vh]">
        {/* Scoreboard Header */}
        <div className="bg-gradient-to-r from-[#0a1d28] via-[#103235] to-[#0a1d28] px-6 py-4 border-b border-white/10">
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="flex items-center gap-3">
              <ClubCrest club={homeClub} size={42} />
              <div>
                <div className="font-display text-2xl font-extrabold uppercase text-white leading-none">
                  {homeClub.name}
                </div>
                <div className="text-[11px] font-mono-num text-[#8ba5b3] mt-0.5">
                  ATK {liveMatch.homeSectors.atk} · MID {liveMatch.homeSectors.mid} · DEF {liveMatch.homeSectors.def}
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-block rounded bg-[#071117]/80 border border-[#38f2c8]/40 px-3 py-0.5 font-mono-num text-xs font-extrabold text-[#38f2c8]">
                {liveMatch.isFinished ? 'FULL TIME' : `${liveMatch.minute}'`}
              </div>
              <div className="font-display text-5xl font-extrabold tabular-nums text-white leading-none mt-1">
                {liveMatch.homeGoals} <span className="text-white/40">-</span> {liveMatch.awayGoals}
              </div>
              <div className="text-[11px] font-mono-num text-[#9bb4c2] mt-1">
                xG {liveMatch.homeXg.toFixed(2)} — {liveMatch.awayXg.toFixed(2)} · Poss {liveMatch.homePossession}% /{' '}
                {100 - liveMatch.homePossession}%
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 text-right">
              <div>
                <div className="font-display text-2xl font-extrabold uppercase text-white leading-none">
                  {awayClub.name}
                </div>
                <div className="text-[11px] font-mono-num text-[#8ba5b3] mt-0.5">
                  ATK {liveMatch.awaySectors.atk} · MID {liveMatch.awaySectors.mid} · DEF {liveMatch.awaySectors.def}
                </div>
              </div>
              <ClubCrest club={awayClub} size={42} />
            </div>
          </div>

          {/* Live Pitch Momentum Meter */}
          <div className="mt-3 flex items-center gap-3 text-[10px] font-mono-num text-[#8ba5b3]">
            <span>{homeClub.shortName}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 left-1/2 bg-[#38f2c8]"
                style={{
                  width: `${Math.abs(liveMatch.momentum) / 2}%`,
                  left: liveMatch.momentum >= 0 ? '50%' : `${50 - Math.abs(liveMatch.momentum) / 2}%`,
                  backgroundColor: liveMatch.momentum >= 0 ? '#38f2c8' : '#f05252',
                }}
              />
            </div>
            <span>{awayClub.shortName}</span>
          </div>
        </div>

        {/* Body Grid: Commentary + Stats + Live Tactics & Substitutions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left 7 cols: Minute-by-Minute 2D Match Feed & Match Stats */}
          <div className="lg:col-span-7 p-4 flex flex-col gap-3 overflow-y-auto border-r border-white/10">
            {/* Playback Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a1822]/85 rounded-md border border-white/10 p-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={liveMatch.isFinished}
                  onClick={() => setPlaying((p) => !p)}
                  className="fc-btn-primary rounded px-3.5 py-1.5 text-xs uppercase inline-flex items-center gap-1.5"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {playing ? 'Pause' : 'Resume'}
                </button>
                {([1, 2, 4] as const).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSpeedMult(sp)}
                    className={`rounded px-2.5 py-1.5 text-xs font-mono-num font-bold ${
                      speedMult === sp ? 'bg-white text-[#071117]' : 'bg-white/10 text-[#b7cbd6]'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>

              {!liveMatch.isFinished ? (
                <button
                  type="button"
                  onClick={simToEnd}
                  className="fc-btn-secondary rounded px-3 py-1.5 text-xs font-bold uppercase inline-flex items-center gap-1"
                >
                  <FastForward className="w-3.5 h-3.5 text-[#38f2c8]" /> Sim to Full Time
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishLiveMatch}
                  className="fc-btn-primary rounded px-5 py-1.5 text-xs uppercase tracking-wider"
                >
                  Confirm Full-Time Result
                </button>
              )}
            </div>

            {/* Live Stats Strip */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#0a1822]/60 rounded border border-white/10 p-2.5 font-mono-num">
              <div>
                <div className="text-[10px] text-[#8ba5b3] uppercase">Shots (On Target)</div>
                <div className="font-bold text-white">
                  {liveMatch.homeShots} ({liveMatch.homeShotsOnTarget}) — {liveMatch.awayShots} (
                  {liveMatch.awayShotsOnTarget})
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8ba5b3] uppercase">Expected Goals (xG)</div>
                <div className="font-bold text-[#38f2c8]">
                  {liveMatch.homeXg.toFixed(2)} — {liveMatch.awayXg.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8ba5b3] uppercase">Possession</div>
                <div className="font-bold text-white">
                  {liveMatch.homePossession}% — {100 - liveMatch.homePossession}%
                </div>
              </div>
            </div>

            {/* Live Commentary Feed */}
            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[370px] pr-1">
              {[...liveMatch.events].reverse().map((ev, idx) => (
                <div
                  key={idx}
                  className={`rounded border px-3 py-2 text-xs flex items-start gap-2.5 ${
                    ev.type === 'GOAL'
                      ? 'border-[#38f2c8]/60 bg-[#103835]/65 text-white font-bold'
                      : ev.type === 'AGGRAVATION' || ev.type === 'RED'
                      ? 'border-rose-500/60 bg-rose-500/15 text-rose-200 font-semibold'
                      : ev.type === 'YELLOW'
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                      : 'border-white/8 bg-[#0b1822]/75 text-[#c8dae3]'
                  }`}
                >
                  <span className="font-mono-num font-extrabold text-[#38f2c8] w-8 shrink-0">
                    {ev.minute}&apos;
                  </span>
                  <span>{ev.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right 5 cols: Live Tactical Adjustments & Substitutions */}
          <div className="lg:col-span-5 p-4 space-y-4 overflow-y-auto max-h-[540px]">
            {/* In-Match Tactics */}
            <div className="rounded-md border border-white/10 bg-[#0a1822]/85 p-3 space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#38f2c8]">
                <Sliders className="w-3.5 h-3.5" /> Live Touchline Tactics
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase text-[#8ba5b3] mb-1">Mentality</label>
                  <select
                    value={userMentality}
                    onChange={(e) => updateLiveTactics(e.target.value as Mentality, userVision)}
                    className="w-full rounded border border-white/15 bg-[#071117] px-2 py-1.5 text-white"
                  >
                    {MENTALITIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-[#8ba5b3] mb-1">Tactical Vision</label>
                  <select
                    value={userVision}
                    onChange={(e) => updateLiveTactics(userMentality, e.target.value as TacticalVision)}
                    className="w-full rounded border border-white/15 bg-[#071117] px-2 py-1.5 text-white"
                  >
                    {VISIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Live Pitch Stamina & Substitutions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#38f2c8]" />
                  On-Pitch Stamina &amp; Subs ({userSubsUsed}/5)
                </span>
                {subOutId && (
                  <span className="text-[11px] text-amber-300 font-bold">Select bench player below</span>
                )}
              </div>

              <div className="space-y-1 max-h-[210px] overflow-y-auto pr-1">
                {userLineupIds.map((pid) => {
                  const p = career.players[pid];
                  if (!p) return null;
                  const stam = Math.round(userStamina[pid] ?? p.energy);
                  const aggravated = liveMatch.aggravatedPlayerIds.includes(pid);
                  return (
                    <button
                      key={pid}
                      type="button"
                      disabled={userSubsUsed >= 5 || liveMatch.isFinished}
                      onClick={() => setSubOutId(subOutId === pid ? null : pid)}
                      className={`w-full rounded border px-2.5 py-1.5 text-left text-xs flex items-center justify-between gap-2 ${
                        subOutId === pid
                          ? 'fc-panel-active text-white'
                          : aggravated
                          ? 'border-rose-500/60 bg-rose-500/15 text-rose-200'
                          : 'border-white/8 bg-[#0b1822]/75 text-[#d4e2ea] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-[#38f2c8] w-7">{p.primaryPosition}</span>
                        <span className="font-semibold truncate">{p.knownAs}</span>
                        {aggravated && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={stam >= 65 ? 'h-full bg-[#38f2c8]' : stam >= 45 ? 'h-full bg-amber-400' : 'h-full bg-rose-500'}
                            style={{ width: `${stam}%` }}
                          />
                        </div>
                        <span className="font-mono-num w-8 text-right">{stam}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bench selector */}
              {subOutId && userSubsUsed < 5 && !liveMatch.isFinished && (
                <div className="rounded border border-[#38f2c8]/40 bg-[#0d282c]/60 p-2.5 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-[#b8fff0]">
                    Bring on Replacement for {career.players[subOutId]?.knownAs}:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {userBenchIds.map((bid) => {
                      const bp = career.players[bid];
                      if (!bp) return null;
                      return (
                        <button
                          key={bid}
                          type="button"
                          onClick={() => {
                            makeLiveSub(subOutId, bid);
                            setSubOutId(null);
                          }}
                          className="rounded border border-white/15 bg-[#091822] px-2 py-1.5 text-left text-[11px] hover:border-[#38f2c8]"
                        >
                          <span className="font-bold text-[#38f2c8] mr-1">{bp.primaryPosition}</span>
                          <span className="font-semibold text-white">{bp.knownAs}</span>{' '}
                          <span className="font-mono-num text-[#8ba5b3]">({bp.dynamicOvr.dynamicOvr})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// POST-MATCH SUMMARY MODAL (Quick Sim & Live Sim)
// ============================================================================

export const PostMatchSummaryModal: React.FC = () => {
  const summary = useCareerStore((s) => s.postMatchSummary);
  const dismissPostMatchSummary = useCareerStore((s) => s.dismissPostMatchSummary);

  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-[540px] fc-panel rounded-xl p-6 text-center space-y-5 border border-[#38f2c8]/35">
        <div className="text-xs font-bold uppercase tracking-widest text-[#38f2c8]">
          LALIGA EA SPORTS · FULL-TIME RESULT
        </div>

        <div className="grid grid-cols-3 items-center gap-2">
          <div className="font-display text-2xl font-extrabold uppercase text-white">{summary.homeName}</div>
          <div className="font-display text-5xl font-extrabold tabular-nums text-[#b8fff0]">
            {summary.homeGoals} - {summary.awayGoals}
          </div>
          <div className="font-display text-2xl font-extrabold uppercase text-white">{summary.awayName}</div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-md border border-white/10 bg-[#0a1822]/80 p-3 text-xs font-mono-num">
          <div>
            <div className="text-[10px] text-[#8ba5b3] uppercase">Expected Goals</div>
            <div className="font-bold text-white">
              {summary.homeXg.toFixed(2)} – {summary.awayXg.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#8ba5b3] uppercase">Possession</div>
            <div className="font-bold text-white">
              {summary.homePossession}% – {100 - summary.homePossession}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#8ba5b3] uppercase">Man of the Match</div>
            <div className="font-bold text-[#38f2c8] truncate flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 shrink-0" /> {summary.motmName}
            </div>
          </div>
        </div>

        {summary.aggravatedNames.length > 0 && (
          <div className="rounded border border-rose-500/50 bg-rose-500/15 p-3 text-xs text-rose-200 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>
              <strong>Recovering Injury Aggravated:</strong> {summary.aggravatedNames.join(', ')} suffered a setback!
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={dismissPostMatchSummary}
          className="fc-btn-primary w-full rounded py-2.5 text-xs uppercase tracking-wider"
        >
          Continue to Central Hub
        </button>
      </div>
    </div>
  );
};
