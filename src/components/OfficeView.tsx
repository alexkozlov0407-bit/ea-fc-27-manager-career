import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FastForward,
  Filter,
  Shield,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { formatMoney } from '../engine/ratings';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest } from './PlayerAvatar';

type OfficeSubTab = 'Hub' | 'Standings' | 'Calendar' | 'Finances' | 'Objectives';

const TOP_5_LEAGUES = [
  { id: 13, name: 'Premier League', short: 'EPL', nation: 'England', teams: 20 },
  { id: 53, name: 'LALIGA EA SPORTS', short: 'LaLiga', nation: 'Spain', teams: 20 },
  { id: 19, name: 'Bundesliga', short: 'BUN', nation: 'Germany', teams: 18 },
  { id: 31, name: 'Serie A Enilive', short: 'Serie A', nation: 'Italy', teams: 20 },
  { id: 16, name: "Ligue 1 McDonald's", short: 'Ligue 1', nation: 'France', teams: 18 },
];

const MONTH_NAMES = [
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
  'April',
  'May',
];

export const OfficeView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const simToNextMatchOrDate = useCareerStore((s) => s.simToNextMatchOrDate);
  const updateBudgetSplit = useCareerStore((s) => s.updateBudgetSplit);
  const proceedToNextSeason = useCareerStore((s) => s.proceedToNextSeason);

  const [subTab, setSubTab] = useState<OfficeSubTab>('Hub');
  const [selectedLeagueId, setSelectedLeagueId] = useState<number>(() => {
    return career ? career.clubs[career.userClubId]?.leagueId ?? 53 : 53;
  });
  const [activeMonthIdx, setActiveMonthIdx] = useState<number>(0);
  const [simTargetDate, setSimTargetDate] = useState('');

  const officeData = useMemo(() => {
    if (!career) return null;
    const userClub = career.clubs[career.userClubId];

    // Selected League clubs & computed standings
    const leagueClubs = Object.values(career.clubs).filter((c) => c.leagueId === selectedLeagueId);
    const isUserDomesticLeague = userClub.leagueId === selectedLeagueId;

    let standings = isUserDomesticLeague ? career.standings : [];
    if (!isUserDomesticLeague || standings.length === 0) {
      standings = leagueClubs.map((club) => {
        const clubFix = career.fixtures.filter(
          (f) => f.played && (f.homeClubId === club.id || f.awayClubId === club.id)
        );
        let won = 0;
        let drawn = 0;
        let lost = 0;
        let gf = 0;
        let ga = 0;
        const form: ('W' | 'D' | 'L')[] = [];

        clubFix.forEach((f) => {
          const isHome = f.homeClubId === club.id;
          const myGoals = isHome ? f.homeGoals : f.awayGoals;
          const oppGoals = isHome ? f.awayGoals : f.homeGoals;
          gf += myGoals;
          ga += oppGoals;
          if (myGoals > oppGoals) {
            won++;
            form.push('W');
          } else if (myGoals === oppGoals) {
            drawn++;
            form.push('D');
          } else {
            lost++;
            form.push('L');
          }
        });

        const played = clubFix.length;
        const points = won * 3 + drawn;
        const gd = gf - ga;

        return {
          clubId: club.id,
          clubName: club.name,
          played,
          won,
          drawn,
          lost,
          gf,
          ga,
          gd,
          points,
          form: form.slice(-5),
        };
      });

      // Sort by points, gd, gf, then club name
      standings.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.clubName.localeCompare(b.clubName));
    }

    // Top scorers and assists for the selected league
    const leaguePlayerIds = new Set(
      Object.values(career.players)
        .filter((p) => {
          const c = career.clubs[p.clubId];
          return c && c.leagueId === selectedLeagueId;
        })
        .map((p) => p.id)
    );

    const leaguePlayers = Object.values(career.players).filter((p) => leaguePlayerIds.has(p.id));
    const topScorers = [...leaguePlayers]
      .sort((a, b) => b.seasonStats.goals - a.seasonStats.goals || b.baseOvr - a.baseOvr)
      .slice(0, 8);
    const topAssists = [...leaguePlayers]
      .sort((a, b) => b.seasonStats.assists - a.seasonStats.assists || b.baseOvr - a.baseOvr)
      .slice(0, 8);

    const userFixtures = career.fixtures
      .filter((f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId)
      .sort((a, b) => a.round - b.round);

    const earnings = career.transactions
      .filter((t) => t.amountEur > 0)
      .reduce((s, t) => s + t.amountEur, 0);
    const expenses = Math.abs(
      career.transactions.filter((t) => t.amountEur < 0).reduce((s, t) => s + t.amountEur, 0)
    );
    const profit = earnings - expenses;
    const weeklyPayroll = Object.values(career.players)
      .filter((p) => p.clubId === career.userClubId)
      .reduce((s, p) => s + p.weeklyWageEur, 0);

    return {
      userClub,
      standings,
      topScorers,
      topAssists,
      userFixtures,
      earnings,
      expenses,
      profit,
      weeklyPayroll,
      isUserDomesticLeague,
    };
  }, [career, selectedLeagueId]);

  if (!career || !officeData) return null;
  const {
    userClub,
    standings,
    topScorers,
    topAssists,
    userFixtures,
    earnings,
    expenses,
    profit,
    weeklyPayroll,
  } = officeData;

  const totalFin = Math.max(1, earnings + expenses);
  const earnPct = Math.round((earnings / totalFin) * 100);
  const donutDash = 251.2; // 2 * pi * 40
  const earnStroke = (earnPct / 100) * donutDash;

  // Selected Month Fixtures for Monthly Calendar Grid
  const currentSeasonYear = parseInt(career.currentDate.slice(0, 4), 10);
  const activeMonthName = MONTH_NAMES[activeMonthIdx];
  const activeMonthNum =
    activeMonthIdx < 5 ? 8 + activeMonthIdx : activeMonthIdx - 4; // Aug(8), Sep(9), ..., Jan(1), ..., May(5)
  const activeMonthYear = activeMonthIdx < 5 ? currentSeasonYear : currentSeasonYear + 1;
  const monthStr = `${activeMonthYear}-${String(activeMonthNum).padStart(2, '0')}`;

  const monthFixtures = userFixtures.filter((f) => f.date.startsWith(monthStr));

  // Determine user rank in their domestic league
  const userRank = career.standings.findIndex((s) => s.clubId === userClub.id) + 1;

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-8 py-5 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-none">
            Office
          </h1>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-1 bg-[#07131a] p-1 rounded-xl border border-white/10">
            {(
              [
                ['Hub', 'Overview Hub'],
                ['Standings', 'League Tables & Stats'],
                ['Calendar', 'Schedule & Sim to Date'],
                ['Finances', 'Finances & Budget'],
                ['Objectives', 'Board Objectives'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSubTab(key as OfficeSubTab)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  subTab === key
                    ? 'fc-panel-active text-white border border-[#38f2c8]/60 shadow-[0_0_15px_rgba(56,242,200,0.2)]'
                    : 'text-[#8ea5b3] hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {career.seasonCompleted && (
          <button
            type="button"
            onClick={proceedToNextSeason}
            className="fc-btn-primary rounded-xl px-5 py-2.5 text-xs uppercase tracking-wider font-black shadow-lg"
          >
            Advance to Season {career.seasonNumber + 1}
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: AUTHENTIC FC 27 OFFICE 4-TILE HUB (image_dce7fd39.png)      */}
      {/* =================================================================== */}
      {subTab === 'Hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tile 1: BOARD OBJECTIVES */}
          <div
            onClick={() => setSubTab('Objectives')}
            className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[340px]"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                <span className="text-[#38f2c8]">BOARD CONFIDENCE</span>
                <span className="font-mono-num text-white">RATING 84/100</span>
              </div>
              <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                Objectives
              </h3>
              <p className="text-xs text-[#8ba5b3] mt-1">
                Five board categories tracked throughout Season {career.seasonNumber}
              </p>

              {/* Priority Objectives Breakdown */}
              <div className="mt-5 space-y-2 text-xs">
                {career.objectives.slice(0, 3).map((obj) => (
                  <div
                    key={obj.id}
                    className="p-2.5 rounded-xl bg-[#07141d]/80 border border-white/8 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Target className="w-4 h-4 text-[#38f2c8] shrink-0" />
                      <span className="font-bold text-white truncate">{obj.title}</span>
                    </div>
                    <span className="font-mono-num text-xs font-black text-[#38f2c8] shrink-0">
                      {obj.progressPct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                <span>Enter Objectives</span>
              </span>
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
            </div>
          </div>

          {/* Tile 2: STANDINGS */}
          <div
            onClick={() => setSubTab('Standings')}
            className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[340px]"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                <span className="text-[#38f2c8]">LEAGUE TABLE</span>
                <span className="font-mono-num text-white">#{userRank} IN DOMESTIC LEAGUE</span>
              </div>
              <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                Standings
              </h3>
              <p className="text-xs text-[#8ba5b3] mt-1">
                Top 5 European Leagues with live tables and top scorer leaderboards
              </p>

              {/* Table Preview */}
              <div className="mt-5 space-y-1.5 text-xs">
                {career.standings.slice(0, 3).map((s, idx) => (
                  <div
                    key={s.clubId}
                    className="p-2.5 rounded-xl bg-[#07141d]/80 border border-white/8 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num font-black text-[#38f2c8] w-4">{idx + 1}</span>
                      <span className="font-bold text-white">{s.clubName}</span>
                    </div>
                    <span className="font-mono-num font-black text-white">{s.points} PTS</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                <span>Enter Standings</span>
              </span>
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
            </div>
          </div>

          {/* Tile 3: CALENDAR */}
          <div
            onClick={() => setSubTab('Calendar')}
            className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[340px]"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                <span className="text-[#38f2c8]">SEASON FIXTURES</span>
                <span className="font-mono-num text-white">{career.currentDate}</span>
              </div>
              <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                Calendar
              </h3>
              <p className="text-xs text-[#8ba5b3] mt-1">
                Full 10-month calendar schedule with sim-to-date functionality
              </p>

              {/* Next Fixture Callout */}
              <div className="mt-5 p-4 rounded-xl bg-[#07141d]/80 border border-white/8 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#38f2c8] font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>Interactive Schedule Grid</span>
                </div>
                <div className="text-xs text-[#8ba5b3]">
                  Browse months from August through May, review played match results, and simulate directly to any date.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                <span>Enter Calendar</span>
              </span>
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
            </div>
          </div>

          {/* Tile 4: FINANCES */}
          <div
            onClick={() => setSubTab('Finances')}
            className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[340px]"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                <span className="text-[#38f2c8]">FINANCIAL HEALTH</span>
                <span className="font-mono-num text-emerald-300">PROFITABLE</span>
              </div>
              <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                Finances
              </h3>
              <p className="text-xs text-[#8ba5b3] mt-1">
                Club valuation, transfer budget, wage headroom, and transaction ledger
              </p>

              {/* Budget Quick Summary */}
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#07141d]/80 border border-white/8">
                  <div className="text-[10px] text-[#8ba5b3] uppercase font-bold">Transfer Budget</div>
                  <div className="font-mono-num text-base font-black text-[#38f2c8] mt-0.5">
                    {formatMoney(userClub.transferBudgetEur, career.settings.currency)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#07141d]/80 border border-white/8">
                  <div className="text-[10px] text-[#8ba5b3] uppercase font-bold">Wage Budget</div>
                  <div className="font-mono-num text-base font-black text-white mt-0.5">
                    {formatMoney(userClub.wageBudgetRemainingEur, career.settings.currency)}/w
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                <span>Enter Finances</span>
              </span>
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: MULTI-LEAGUE STANDINGS & LEADERS                            */}
      {/* =================================================================== */}
      {subTab === 'Standings' && (
        <div className="space-y-5">
          {/* Top 5 European Leagues Switcher */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
            {TOP_5_LEAGUES.map((lg) => (
              <button
                key={lg.id}
                type="button"
                onClick={() => setSelectedLeagueId(lg.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedLeagueId === lg.id
                    ? 'fc-panel-active text-white border border-[#38f2c8]/60 shadow-[0_0_15px_rgba(56,242,200,0.25)]'
                    : 'text-[#8ba5b3] hover:text-white bg-[#07131a] border border-white/10'
                }`}
              >
                {lg.name} ({lg.nation})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Standings Table (Left 8 cols) */}
            <div className="xl:col-span-8 fc-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-[#38f2c8]" />
                  <span className="font-display text-xl font-black uppercase tracking-wide text-white">
                    {TOP_5_LEAGUES.find((l) => l.id === selectedLeagueId)?.name}
                  </span>
                </div>
                <span className="text-xs text-[#8ba5b3]">
                  Top 4 UCL · 5–6 UEL · Bottom Relegation
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#0d1d29] border-b border-white/12 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                    <tr>
                      <th className="py-2.5 px-3.5 text-left w-8">#</th>
                      <th className="py-2.5 px-2 text-left">Club</th>
                      <th className="py-2.5 px-2 text-right">P</th>
                      <th className="py-2.5 px-2 text-right">W</th>
                      <th className="py-2.5 px-2 text-right">D</th>
                      <th className="py-2.5 px-2 text-right">L</th>
                      <th className="py-2.5 px-2 text-right">GF</th>
                      <th className="py-2.5 px-2 text-right">GA</th>
                      <th className="py-2.5 px-2 text-right">GD</th>
                      <th className="py-2.5 px-2 text-right">PTS</th>
                      <th className="py-2.5 px-3.5 text-right">Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {standings.map((row, idx) => {
                      const rank = idx + 1;
                      const club = career.clubs[row.clubId];
                      const isUser = row.clubId === career.userClubId;
                      const zoneDot =
                        rank <= 4
                          ? 'bg-[#38f2c8]'
                          : rank <= 6
                          ? 'bg-sky-400'
                          : rank >= (standings.length - 2)
                          ? 'bg-rose-500'
                          : 'bg-transparent';
                      return (
                        <tr
                          key={row.clubId}
                          className={isUser ? 'fc-panel-active text-white font-bold' : 'hover:bg-white/[0.04] text-[#d2e1ea]'}
                        >
                          <td className="py-2.5 px-3.5 font-mono-num">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`w-1.5 h-3.5 rounded-sm ${zoneDot}`} />
                              {rank}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <ClubCrest club={club} size={22} />
                              <span className="truncate font-bold">{row.clubName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-num">{row.played}</td>
                          <td className="py-2.5 px-2 text-right font-mono-num">{row.won}</td>
                          <td className="py-2.5 px-2 text-right font-mono-num">{row.drawn}</td>
                          <td className="py-2.5 px-2 text-right font-mono-num">{row.lost}</td>
                          <td className="py-2.5 px-2 text-right font-mono-num">{row.gf}</td>
                          <td className="py-2.5 px-2 text-right font-mono-num">{row.ga}</td>
                          <td className="py-2.5 px-2 text-right font-mono-num">
                            {row.gd > 0 ? `+${row.gd}` : row.gd}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-num font-black text-white">
                            {row.points}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <div className="inline-flex items-center gap-0.5">
                              {row.form.length === 0 ? (
                                <span className="text-white/20">—</span>
                              ) : (
                                row.form.map((f, i) => (
                                  <span
                                    key={i}
                                    className={`w-4 h-4 rounded-[2px] inline-block text-center leading-4 text-[9px] font-black ${
                                      f === 'W'
                                        ? 'bg-emerald-500/85 text-[#06150f]'
                                        : f === 'D'
                                        ? 'bg-slate-400/75 text-[#0a131c]'
                                        : 'bg-rose-500/85 text-white'
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

            {/* Top Scorers & Assists Leaderboard (Right 4 cols) */}
            <div className="xl:col-span-4 space-y-5">
              <div className="fc-panel rounded-2xl p-5 border border-white/10 shadow-lg">
                <h3 className="font-display text-lg font-black uppercase tracking-wide text-white mb-3">
                  Top Goalscorers
                </h3>
                <div className="space-y-2 text-xs">
                  {topScorers.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.06]">
                      <div className="truncate">
                        <span className="font-mono-num text-[#8ba5b3] mr-2 font-bold">{i + 1}.</span>
                        <span className="font-bold text-white">{p.knownAs}</span>
                        <span className="text-[11px] text-[#8ba5b3] ml-1.5">({p.clubName})</span>
                      </div>
                      <span className="font-mono-num font-black text-[#38f2c8] text-sm">{p.seasonStats.goals}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fc-panel rounded-2xl p-5 border border-white/10 shadow-lg">
                <h3 className="font-display text-lg font-black uppercase tracking-wide text-white mb-3">
                  Top Assist Providers
                </h3>
                <div className="space-y-2 text-xs">
                  {topAssists.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.06]">
                      <div className="truncate">
                        <span className="font-mono-num text-[#8ba5b3] mr-2 font-bold">{i + 1}.</span>
                        <span className="font-bold text-white">{p.knownAs}</span>
                        <span className="text-[11px] text-[#8ba5b3] ml-1.5">({p.clubName})</span>
                      </div>
                      <span className="font-mono-num font-black text-[#38f2c8] text-sm">{p.seasonStats.assists}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: FULL MONTHLY CALENDAR GRID (image_b4a8565c.png)             */}
      {/* =================================================================== */}
      {subTab === 'Calendar' && (
        <div className="space-y-5">
          {/* Month Subtabs Strip */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 pb-3">
            {MONTH_NAMES.map((m, idx) => (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMonthIdx(idx)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeMonthIdx === idx
                    ? 'fc-panel-active text-white border border-[#38f2c8]/60 shadow-[0_0_12px_rgba(56,242,200,0.25)]'
                    : 'text-[#8ba5b3] hover:text-white bg-[#07131a] border border-white/10'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Quick Sim To Date Control */}
          <div className="fc-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border border-white/10">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-[#38f2c8]" />
              <div>
                <div className="font-display text-xl font-black uppercase text-white">
                  Schedule for {activeMonthName} {activeMonthYear}
                </div>
                <div className="text-xs text-[#8ba5b3]">
                  Today: <strong className="text-white">{career.currentDate}</strong> · Jump to any matchday or future date
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="date"
                value={simTargetDate || career.currentDate}
                min={career.currentDate}
                onChange={(e) => setSimTargetDate(e.target.value)}
                className="rounded-xl border border-white/15 bg-[#0a1822] px-3.5 py-2 text-xs font-mono-num text-white"
              />
              <button
                type="button"
                onClick={() => simToNextMatchOrDate(simTargetDate || undefined)}
                className="fc-btn-primary rounded-xl px-5 py-2 text-xs uppercase tracking-wider font-black inline-flex items-center gap-2 shadow"
              >
                <FastForward className="w-4 h-4" />
                <span>Sim to Date</span>
              </button>
            </div>
          </div>

          {/* Fixtures List for Active Month */}
          <div className="fc-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
            {monthFixtures.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#8ba5b3]">
                No fixtures scheduled in {activeMonthName}. Check other months or the transfer window.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {monthFixtures.map((f) => {
                  const isHome = f.homeClubId === career.userClubId;
                  const opp = career.clubs[isHome ? f.awayClubId : f.homeClubId];
                  const userGoals = isHome ? f.homeGoals : f.awayGoals;
                  const oppGoals = isHome ? f.awayGoals : f.homeGoals;
                  const resBadge = !f.played
                    ? null
                    : userGoals > oppGoals
                    ? 'W'
                    : userGoals < oppGoals
                    ? 'L'
                    : 'D';

                  return (
                    <div
                      key={f.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="font-mono-num text-[#8ba5b3] font-bold w-12">MD {f.round}</span>
                        <span className="font-mono-num text-white font-bold w-28">{f.date}</span>
                        <span className="uppercase font-black text-[#38f2c8] w-6">{isHome ? 'H' : 'A'}</span>
                        <ClubCrest club={opp} size={26} />
                        <span className="font-black text-white truncate text-sm">{opp?.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {f.played ? (
                          <>
                            <span className="font-mono-num font-black text-base text-white">
                              {f.homeGoals} - {f.awayGoals}
                            </span>
                            <span
                              className={`w-6 h-6 rounded-[3px] text-center leading-6 text-xs font-black ${
                                resBadge === 'W'
                                  ? 'bg-emerald-500 text-[#05140e]'
                                  : resBadge === 'D'
                                  ? 'bg-slate-400 text-[#091017]'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {resBadge}
                            </span>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => simToNextMatchOrDate(f.date)}
                            className="fc-btn-secondary rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider"
                          >
                            Sim to Match
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 4: FINANCES & BUDGET (image_bb06eda9.png)                       */}
      {/* =================================================================== */}
      {subTab === 'Finances' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 fc-panel rounded-2xl p-6 space-y-6 border border-white/10 shadow-xl">
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-6 h-6 text-[#38f2c8]" />
              <h3 className="font-display text-2xl font-black uppercase tracking-wide text-white">
                Financial Ledger
              </h3>
            </div>

            {/* Income vs Expenses Donut */}
            <div className="flex items-center justify-around gap-4 py-2">
              <svg width="150" height="150" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(240,82,82,0.55)" strokeWidth="12" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#38f2c8"
                  strokeWidth="12"
                  strokeDasharray={`${earnStroke} ${donutDash}`}
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="48"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="900"
                  fontFamily="Barlow Condensed, sans-serif"
                >
                  {earnPct}%
                </text>
                <text x="50" y="62" textAnchor="middle" fill="#8ba5b3" fontSize="8" fontWeight="800">
                  INCOME
                </text>
              </svg>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[#8ba5b3] uppercase text-[10px] font-bold">Season Profit</div>
                  <div className={`font-mono-num text-xl font-black ${profit >= 0 ? 'text-[#38f2c8]' : 'text-rose-400'}`}>
                    {formatMoney(profit, career.settings.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[#8ba5b3] uppercase text-[10px] font-bold">Total Earnings</div>
                  <div className="font-mono-num text-sm font-black text-white">
                    {formatMoney(earnings, career.settings.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[#8ba5b3] uppercase text-[10px] font-bold">Total Expenses</div>
                  <div className="font-mono-num text-sm font-black text-rose-300">
                    -{formatMoney(expenses, career.settings.currency)}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8ba5b3]">Club Valuation</span>
                <strong className="font-mono-num text-white">
                  {formatMoney(userClub.clubWorthEur, career.settings.currency)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8ba5b3]">Weekly Wage Payroll</span>
                <strong className="font-mono-num text-white">
                  {formatMoney(weeklyPayroll, career.settings.currency)}/wk
                </strong>
              </div>
            </div>

            {/* Budget Allocation Slider */}
            <div className="border-t border-white/10 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between font-black uppercase">
                <span className="text-[#38f2c8]">Transfer Budget ({userClub.budgetSplitTransferPct}%)</span>
                <span className="text-[#dcd2ff]">Wage Pool ({100 - userClub.budgetSplitTransferPct}%)</span>
              </div>
              <input
                type="range"
                min={25}
                max={95}
                value={userClub.budgetSplitTransferPct}
                onChange={(e) => updateBudgetSplit(Number(e.target.value))}
                className="w-full accent-[#38f2c8]"
              />
              <div className="flex justify-between font-mono-num text-sm font-black">
                <span className="text-[#38f2c8]">
                  {formatMoney(userClub.transferBudgetEur, career.settings.currency)}
                </span>
                <span className="text-white">
                  {formatMoney(userClub.wageBudgetRemainingEur, career.settings.currency)}/wk
                </span>
              </div>
            </div>
          </div>

          {/* Transactions Ledger */}
          <div className="lg:col-span-7 fc-panel rounded-2xl p-6 border border-white/10 shadow-xl">
            <h3 className="font-display text-2xl font-black uppercase tracking-wide text-white mb-4">
              Club Transactions ({career.transactions.length})
            </h3>
            <div className="max-h-[56vh] overflow-y-auto divide-y divide-white/[0.06] text-xs">
              {career.transactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-sm">{tx.description}</div>
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-mono-num mt-0.5">
                      {tx.date} · {tx.category}
                    </div>
                  </div>
                  <div
                    className={`font-mono-num font-black text-sm ${
                      tx.amountEur >= 0 ? 'text-[#38f2c8]' : 'text-rose-400'
                    }`}
                  >
                    {tx.amountEur >= 0 ? '+' : ''}
                    {formatMoney(tx.amountEur, career.settings.currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 5: BOARD OBJECTIVES                                            */}
      {/* =================================================================== */}
      {subTab === 'Objectives' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {career.objectives.map((obj) => (
            <div key={obj.id} className="fc-panel rounded-2xl p-6 space-y-4 border border-white/10 shadow-lg">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-black">
                <span className="text-[#38f2c8]">
                  {obj.term} TERM · {obj.category}
                </span>
                <span className={obj.priority === 'Critical' ? 'text-rose-300' : 'text-amber-300'}>
                  {obj.priority}
                </span>
              </div>
              <h3 className="font-display text-2xl font-black uppercase text-white leading-tight flex items-center gap-2.5">
                {obj.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-[#38f2c8] shrink-0" />
                ) : (
                  <Target className="w-6 h-6 text-amber-300 shrink-0" />
                )}
                <span>{obj.title}</span>
              </h3>
              <p className="text-xs text-[#cad9e2]">{obj.targetDescription}</p>
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-mono-num">
                  <span className="text-[#8ba5b3]">Progress</span>
                  <span className="font-black text-white">{obj.progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#10c482] to-[#38f2c8]"
                    style={{ width: `${obj.progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
