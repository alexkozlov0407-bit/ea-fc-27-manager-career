import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  FastForward,
  Mail,
  Play,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { computeSectorRatings } from '../engine/matchSim';
import { formatMoney } from '../engine/ratings';
import { addDays, diffDays } from '../engine/season';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest, OvrDiamond, PlayerAvatar } from './PlayerAvatar';

export const CentralHub: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const setActiveTab = useCareerStore((s) => s.setActiveTab);
  const advanceDay = useCareerStore((s) => s.advanceDay);
  const simToNextMatchOrDate = useCareerStore((s) => s.simToNextMatchOrDate);
  const skipDeadlineHours = useCareerStore((s) => s.skipDeadlineHours);
  const quickSimNextMatch = useCareerStore((s) => s.quickSimNextMatch);
  const startLiveMatch = useCareerStore((s) => s.startLiveMatch);
  const proceedToNextSeason = useCareerStore((s) => s.proceedToNextSeason);

  const computed = useMemo(() => {
    if (!career) return null;
    const userClub = career.clubs[career.userClubId];
    const nextMatch = career.fixtures
      .filter((f) => !f.played && (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId))
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    const userSquad = Object.values(career.players).filter((p) => p.clubId === career.userClubId);
    const movers = [...userSquad]
      .sort(
        (a, b) =>
          Math.abs(b.dynamicOvr.totalDelta) - Math.abs(a.dynamicOvr.totalDelta) || b.baseOvr - a.baseOvr
      )
      .slice(0, 5);

    const riskyPlayers = userSquad.filter((p) => p.injury?.recovering);
    const unreadInbox = career.inbox.filter((m) => !m.read).slice(0, 4);
    const daysToClose = Math.max(0, diffDays(career.currentDate, career.transferWindowClosesDate));

    const calendarStrip = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(career.currentDate, i);
      const userFix = career.fixtures.find(
        (f) => f.date === date && (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId)
      );
      return { date, userFix, isToday: i === 0 };
    });

    const userStandingIdx = career.standings.findIndex((s) => s.clubId === career.userClubId);
    const compactTable = career.standings.slice(
      Math.max(0, Math.min(userStandingIdx - 2, career.standings.length - 6)),
      Math.max(6, Math.min(userStandingIdx + 4, career.standings.length))
    );

    const homeClub = nextMatch ? career.clubs[nextMatch.homeClubId] : null;
    const awayClub = nextMatch ? career.clubs[nextMatch.awayClubId] : null;
    const homeSectors = homeClub ? computeSectorRatings(homeClub, career.players) : null;
    const awaySectors = awayClub ? computeSectorRatings(awayClub, career.players) : null;

    return {
      userClub,
      nextMatch,
      homeClub,
      awayClub,
      homeSectors,
      awaySectors,
      movers,
      riskyPlayers,
      unreadInbox,
      daysToClose,
      calendarStrip,
      compactTable,
      userRank: userStandingIdx + 1,
    };
  }, [career]);

  if (!career || !computed) return null;
  const {
    userClub,
    nextMatch,
    homeClub,
    awayClub,
    homeSectors,
    awaySectors,
    movers,
    riskyPlayers,
    unreadInbox,
    daysToClose,
    calendarStrip,
    compactTable,
    userRank,
  } = computed;

  const isMatchDay = nextMatch?.date === career.currentDate;

  return (
    <div className="mx-auto max-w-[1520px] px-4 lg:px-6 py-5 space-y-5">
      {/* Transfer Deadline Day 20-Hour Special Banner */}
      {career.deadlineDayHoursRemaining !== null && (
        <div className="fc-panel-active rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-[#b8fff0]" />
            <div>
              <div className="font-display text-2xl font-extrabold uppercase tracking-wider text-white leading-none">
                TRANSFER DEADLINE DAY — {career.deadlineDayHoursRemaining} HOURS REMAINING
              </div>
              <div className="text-xs text-[#d6f5ee] mt-0.5">
                AI clubs are making last-minute bids and hijack offers. Close active deals before the window slams shut.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => skipDeadlineHours(1)}
              className="fc-btn-secondary rounded px-3.5 py-2 text-xs font-bold uppercase tracking-wider"
            >
              Skip +1 Hour
            </button>
            <button
              type="button"
              onClick={() => skipDeadlineHours(2)}
              className="fc-btn-primary rounded px-4 py-2 text-xs uppercase tracking-wider"
            >
              Skip +2 Hours
            </button>
          </div>
        </div>
      )}

      {/* Season Completed Banner -> Season 2 Progression */}
      {career.seasonCompleted && (
        <div className="fc-panel-active rounded-lg px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#b8fff0]">
              LALIGA EA SPORTS SEASON {career.seasonNumber} COMPLETE
            </div>
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white mt-0.5">
              Finished #{userRank} in LALIGA EA SPORTS
            </h2>
            <p className="text-xs text-[#d2e8e4] mt-1">
              Proceed to Season {career.seasonNumber + 1} to collect prize money, settle deferred transfer instalments, trigger Dynamic Potential, retire veterans, and generate FC 27 Randomized Regens.
            </p>
          </div>
          <button
            type="button"
            onClick={proceedToNextSeason}
            className="fc-btn-primary rounded px-6 py-3 text-sm uppercase tracking-wider"
          >
            Advance to Season {career.seasonNumber + 1}
          </button>
        </div>
      )}

      {/* Top Row: Calendar & Advance Controls + Next Fixture Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 cols: Next Match Hero + 7-Day Calendar Strip */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Calendar Strip & Advance Buttons */}
          <div className="fc-panel rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#38f2c8]" />
                <span className="font-display text-xl font-extrabold uppercase tracking-wide text-white">
                  {career.currentDate}
                </span>
                <span className="text-xs text-[#8aa5b4]">
                  Season {career.seasonNumber} ·{' '}
                  {career.transferWindowOpen
                    ? `Transfer Window closes in ${daysToClose}d`
                    : `Next Window opens ${career.transferWindowClosesDate}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={advanceDay}
                  disabled={career.seasonCompleted || isMatchDay}
                  className="fc-btn-primary rounded px-4 py-2 text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Advance Day
                </button>
                <button
                  type="button"
                  onClick={() => simToNextMatchOrDate()}
                  disabled={career.seasonCompleted || isMatchDay}
                  className="fc-btn-secondary rounded px-3.5 py-2 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  <FastForward className="w-3.5 h-3.5 text-[#38f2c8]" />
                  Sim to Matchday
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarStrip.map(({ date, userFix, isToday }) => {
                const oppId = userFix
                  ? userFix.homeClubId === career.userClubId
                    ? userFix.awayClubId
                    : userFix.homeClubId
                  : null;
                const opp = oppId ? career.clubs[oppId] : null;
                const dayLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
                  weekday: 'short',
                  timeZone: 'UTC',
                });
                const dayNum = date.slice(8);

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      if (!isToday) simToNextMatchOrDate(date);
                    }}
                    className={`rounded-md p-2 text-center border transition-colors ${
                      isToday
                        ? 'fc-panel-active'
                        : userFix
                        ? 'border-[#38f2c8]/40 bg-[#102e2c]/55 hover:bg-[#143c38]/70'
                        : 'border-white/8 bg-[#0b1822]/70 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-semibold">{dayLabel}</div>
                    <div className="font-mono-num text-sm font-extrabold text-white">{dayNum}</div>
                    <div className="mt-1 h-5 flex items-center justify-center">
                      {opp ? (
                        <span className="text-[10px] font-bold text-[#b8fff0] uppercase truncate">
                          {userFix?.homeClubId === career.userClubId ? 'vs ' : '@ '}
                          {opp.shortName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/25">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Match Hero Card */}
          {nextMatch && homeClub && awayClub && homeSectors && awaySectors && (
            <div className="fc-panel rounded-lg p-5">
              <div className="flex items-center justify-between text-xs text-[#91abb9] mb-4">
                <span className="font-bold uppercase tracking-wider text-[#38f2c8]">
                  LALIGA EA SPORTS · Matchday {nextMatch.round}
                </span>
                <span className="font-mono-num">
                  {nextMatch.date} · {nextMatch.weather}
                </span>
              </div>

              <div className="grid grid-cols-3 items-center gap-3">
                <div className="flex flex-col items-center text-center">
                  <ClubCrest club={homeClub} size={56} />
                  <div className="font-display text-2xl font-extrabold uppercase tracking-wide mt-2 leading-none">
                    {homeClub.name}
                  </div>
                  <div className="text-[11px] text-[#8ba5b3] mt-1 font-mono-num">
                    ATK {Math.round(homeSectors.atk)} · MID {Math.round(homeSectors.mid)} · DEF {Math.round(homeSectors.def)}
                  </div>
                </div>

                <div className="text-center">
                  <div className="font-display text-4xl font-extrabold text-white/90 tracking-widest">VS</div>
                  <div className="text-[11px] uppercase tracking-wider text-[#8ba5b3] mt-1">
                    {nextMatch.homeClubId === career.userClubId ? 'Home Fixture' : 'Away Fixture'}
                  </div>
                  <div className="mt-2 text-[11px] text-[#b8fff0] font-semibold">
                    {userClub.formation} · {userClub.tacticalVision}
                  </div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <ClubCrest club={awayClub} size={56} />
                  <div className="font-display text-2xl font-extrabold uppercase tracking-wide mt-2 leading-none">
                    {awayClub.name}
                  </div>
                  <div className="text-[11px] text-[#8ba5b3] mt-1 font-mono-num">
                    ATK {Math.round(awaySectors.atk)} · MID {Math.round(awaySectors.mid)} · DEF {Math.round(awaySectors.def)}
                  </div>
                </div>
              </div>

              {/* Risky Recovering Injury Pre-Match Warning */}
              {riskyPlayers.length > 0 && (
                <div className="mt-4 rounded border border-amber-400/35 bg-amber-500/10 px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
                    <span>
                      <strong>{riskyPlayers[0].knownAs}</strong> is recovering ({riskyPlayers[0].injury?.type}) —{' '}
                      <span className="font-mono-num font-bold text-amber-300">
                        {riskyPlayers[0].injury?.aggravationRiskPct}% aggravation risk
                      </span>{' '}
                      if played.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Squad')}
                    className="shrink-0 font-bold text-amber-200 underline hover:text-white"
                  >
                    Review XI
                  </button>
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={startLiveMatch}
                  className="fc-btn-primary rounded py-2.5 px-4 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Live Tactical Sim
                </button>
                <button
                  type="button"
                  onClick={quickSimNextMatch}
                  className="fc-btn-secondary rounded py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#38f2c8]" />
                  Quick Sim Match
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('Squad')}
                  className="fc-btn-secondary rounded py-2.5 px-4 text-xs font-bold uppercase tracking-wider"
                >
                  Team Management
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 cols: Actionable Notifications & Compact LaLiga Standings */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Inbox / Tasks */}
          <div className="fc-panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#38f2c8]" />
                <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
                  Notifications &amp; Tasks
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('Notifications')}
                className="text-xs font-bold text-[#38f2c8] hover:underline"
              >
                Open Inbox ({career.inbox.length})
              </button>
            </div>

            {unreadInbox.length === 0 ? (
              <div className="text-xs text-[#8ba5b3] py-4 text-center">
                All manager notifications reviewed. Advance the calendar for new updates.
              </div>
            ) : (
              <div className="space-y-2">
                {unreadInbox.map((msg) => (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => setActiveTab('Notifications')}
                    className="w-full text-left rounded border border-white/10 bg-[#0b1822]/75 px-3 py-2.5 hover:border-[#38f2c8]/45 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                      <span className="font-bold text-[#38f2c8]">{msg.category}</span>
                      <span className="font-mono-num">{msg.date}</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5 truncate">{msg.subject}</div>
                    <div className="text-[11px] text-[#9eb6c4] line-clamp-1 mt-0.5">{msg.body}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compact League Standings */}
          <div className="fc-panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
                LALIGA EA SPORTS Standings
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('Office')}
                className="text-xs font-bold text-[#38f2c8] hover:underline"
              >
                Full Table
              </button>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase text-[#7f9aa8]">
                  <th className="py-1.5 text-left w-6">#</th>
                  <th className="py-1.5 text-left">Club</th>
                  <th className="py-1.5 text-right w-8">P</th>
                  <th className="py-1.5 text-right w-9">GD</th>
                  <th className="py-1.5 text-right w-10">PTS</th>
                  <th className="py-1.5 text-right w-20">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {compactTable.map((row) => {
                  const rank = career.standings.findIndex((s) => s.clubId === row.clubId) + 1;
                  const isUser = row.clubId === career.userClubId;
                  return (
                    <tr key={row.clubId} className={isUser ? 'bg-[#194640]/55 text-white font-bold' : 'text-[#cad9e2]'}>
                      <td className="py-1.5 font-mono-num">{rank}</td>
                      <td className="py-1.5 truncate max-w-[140px]">{row.clubName}</td>
                      <td className="py-1.5 text-right font-mono-num">{row.played}</td>
                      <td className="py-1.5 text-right font-mono-num">
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </td>
                      <td className="py-1.5 text-right font-mono-num font-bold text-white">{row.points}</td>
                      <td className="py-1.5 text-right">
                        <div className="inline-flex items-center gap-0.5">
                          {row.form.length === 0 ? (
                            <span className="text-[10px] text-white/30">—</span>
                          ) : (
                            row.form.slice(-4).map((f, idx) => (
                              <span
                                key={idx}
                                className={`inline-block w-3.5 h-3.5 rounded-[2px] text-[9px] font-bold leading-[14px] text-center ${
                                  f === 'W'
                                    ? 'bg-emerald-500/80 text-[#05140e]'
                                    : f === 'D'
                                    ? 'bg-slate-400/70 text-[#0b131c]'
                                    : 'bg-rose-500/80 text-white'
                                }`}
                              >
                                {f}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Dynamic OVR Movers & Live Transfer Market Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Dynamic OVR Watch */}
        <div className="lg:col-span-7 fc-panel rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
                Dynamic OVR Pulse — {userClub.shortName}
              </h3>
              <p className="text-[11px] text-[#8aa5b4]">
                Live OVR shifts driven by Form, Morale Sweet Spot, Playtime, Match Fitness &amp; Injuries
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('Squad')}
              className="text-xs font-bold text-[#38f2c8] hover:underline"
            >
              Open Squad Hub
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {movers.map((p) => (
              <div
                key={p.id}
                className="rounded-md border border-white/10 bg-[#0b1822]/80 p-3 flex flex-col items-center text-center"
              >
                <PlayerAvatar player={p} clubColor={userClub.primaryColor} size="md" />
                <div className="text-xs font-bold text-white truncate w-full mt-2">{p.knownAs}</div>
                <div className="text-[10px] text-[#8ba5b3]">{p.primaryPosition} · Base {p.baseOvr}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <OvrDiamond ovr={p.dynamicOvr.dynamicOvr} delta={p.dynamicOvr.totalDelta} size="sm" />
                  <span
                    className={`font-mono-num text-xs font-bold inline-flex items-center gap-0.5 ${
                      p.dynamicOvr.totalDelta > 0
                        ? 'text-[#38f2c8]'
                        : p.dynamicOvr.totalDelta < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {p.dynamicOvr.totalDelta > 0 ? (
                      <>
                        <TrendingUp className="w-3 h-3" />+{p.dynamicOvr.totalDelta}
                      </>
                    ) : p.dynamicOvr.totalDelta < 0 ? (
                      <>
                        <TrendingDown className="w-3 h-3" />
                        {p.dynamicOvr.totalDelta}
                      </>
                    ) : (
                      '±0'
                    )}
                  </span>
                </div>
                <div className="mt-1.5 text-[10px] text-[#9ab3c1]">
                  Fit {p.matchFitness}% · {p.dynamicOvr.moraleLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live TransferRoom Feed */}
        <div className="lg:col-span-5 fc-panel rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
                TransferRoom Market Feed
              </h3>
              <p className="text-[11px] text-[#8aa5b4]">
                Completed LaLiga deals &amp; active negotiations across AI clubs
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('Transfers')}
              className="text-xs font-bold text-[#38f2c8] hover:underline"
            >
              Transfer Hub
            </button>
          </div>

          {career.transferHistory.length === 0 ? (
            <div className="rounded border border-white/8 bg-[#0b1822]/60 p-4 text-xs text-[#8ba5b3]">
              Transfer window is open. Scout players in the Scouting Hub or advance days to see AI clubs completing signings across LaLiga.
            </div>
          ) : (
            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
              {career.transferHistory.slice(0, 6).map((tr) => (
                <div
                  key={tr.id}
                  className="rounded border border-white/10 bg-[#0b1822]/75 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      {tr.playerName} <span className="text-[#38f2c8]">({tr.position} · {tr.ovr})</span>
                    </div>
                    <div className="text-[11px] text-[#8ba5b3] truncate">
                      {tr.fromClubName} → <span className="text-white">{tr.toClubName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-num font-bold text-[#b8fff0]">
                      {formatMoney(tr.feeEur, career.settings.currency)}
                    </div>
                    <div className="text-[10px] text-[#7f9aa8] font-mono-num">{tr.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
