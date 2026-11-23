import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, DollarSign, FastForward, Target, Trophy } from 'lucide-react';
import { formatMoney } from '../engine/ratings';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest } from './PlayerAvatar';

type OfficeSubTab = 'Standings' | 'Calendar' | 'Finances' | 'Objectives';

export const OfficeView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const simToNextMatchOrDate = useCareerStore((s) => s.simToNextMatchOrDate);
  const updateBudgetSplit = useCareerStore((s) => s.updateBudgetSplit);
  const proceedToNextSeason = useCareerStore((s) => s.proceedToNextSeason);

  const [subTab, setSubTab] = useState<OfficeSubTab>('Standings');
  const [simTargetDate, setSimTargetDate] = useState('');

  const officeData = useMemo(() => {
    if (!career) return null;
    const userClub = career.clubs[career.userClubId];
    const allPlayers = Object.values(career.players).filter((p) => !p.isExternalClub);
    const topScorers = [...allPlayers]
      .sort((a, b) => b.seasonStats.goals - a.seasonStats.goals || b.baseOvr - a.baseOvr)
      .slice(0, 8);
    const topAssists = [...allPlayers]
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

    return { userClub, topScorers, topAssists, userFixtures, earnings, expenses, profit, weeklyPayroll };
  }, [career]);

  if (!career || !officeData) return null;
  const { userClub, topScorers, topAssists, userFixtures, earnings, expenses, profit, weeklyPayroll } = officeData;

  const totalFin = Math.max(1, earnings + expenses);
  const earnPct = Math.round((earnings / totalFin) * 100);
  const donutDash = 251.2; // 2 * pi * 40
  const earnStroke = (earnPct / 100) * donutDash;

  return (
    <div className="mx-auto max-w-[1520px] px-4 lg:px-6 py-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            Office
          </h2>
          <div className="h-5 w-px bg-white/15" />
          {(
            [
              ['Standings', 'Standings & Stats'],
              ['Calendar', 'Schedule & Sim to Date'],
              ['Finances', 'Finances & Budget'],
              ['Objectives', 'Board Objectives'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubTab(key)}
              className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider ${
                subTab === key ? 'fc-panel-active text-white' : 'text-[#8ea5b3] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {career.seasonCompleted && (
          <button
            type="button"
            onClick={proceedToNextSeason}
            className="fc-btn-primary rounded px-4 py-2 text-xs uppercase tracking-wider"
          >
            Start Season {career.seasonNumber + 1}
          </button>
        )}
      </div>

      {/* SUB-TAB 1: FULL 20-TEAM LALIGA STANDINGS & LEADERS */}
      {subTab === 'Standings' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-8 fc-panel rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#38f2c8]" />
                <span className="font-display text-lg font-extrabold uppercase tracking-wide">
                  LALIGA EA SPORTS — Season {career.seasonNumber}
                </span>
              </div>
              <span className="text-[11px] text-[#8ba5b3]">Top 4 UCL · 5–6 UEL · 18–20 Relegation</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#0d1d29] border-b border-white/12 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                  <tr>
                    <th className="py-2 px-3 text-left w-8">#</th>
                    <th className="py-2 px-2 text-left">Club</th>
                    <th className="py-2 px-2 text-right">P</th>
                    <th className="py-2 px-2 text-right">W</th>
                    <th className="py-2 px-2 text-right">D</th>
                    <th className="py-2 px-2 text-right">L</th>
                    <th className="py-2 px-2 text-right">GF</th>
                    <th className="py-2 px-2 text-right">GA</th>
                    <th className="py-2 px-2 text-right">GD</th>
                    <th className="py-2 px-2 text-right">PTS</th>
                    <th className="py-2 px-3 text-right">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {career.standings.map((row, idx) => {
                    const rank = idx + 1;
                    const club = career.clubs[row.clubId];
                    const isUser = row.clubId === career.userClubId;
                    const zoneDot =
                      rank <= 4
                        ? 'bg-[#38f2c8]'
                        : rank <= 6
                        ? 'bg-sky-400'
                        : rank >= 18
                        ? 'bg-rose-500'
                        : 'bg-transparent';
                    return (
                      <tr
                        key={row.clubId}
                        className={isUser ? 'fc-panel-active text-white font-bold' : 'hover:bg-white/[0.04] text-[#d2e1ea]'}
                      >
                        <td className="py-2 px-3 font-mono-num">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-1.5 h-3 rounded-sm ${zoneDot}`} />
                            {rank}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <ClubCrest club={club} size={20} />
                            <span className="truncate">{row.clubName}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono-num">{row.played}</td>
                        <td className="py-2 px-2 text-right font-mono-num">{row.won}</td>
                        <td className="py-2 px-2 text-right font-mono-num">{row.drawn}</td>
                        <td className="py-2 px-2 text-right font-mono-num">{row.lost}</td>
                        <td className="py-2 px-2 text-right font-mono-num">{row.gf}</td>
                        <td className="py-2 px-2 text-right font-mono-num">{row.ga}</td>
                        <td className="py-2 px-2 text-right font-mono-num">
                          {row.gd > 0 ? `+${row.gd}` : row.gd}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-num font-extrabold text-white">
                          {row.points}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-0.5">
                            {row.form.length === 0 ? (
                              <span className="text-white/25">—</span>
                            ) : (
                              row.form.map((f, i) => (
                                <span
                                  key={i}
                                  className={`w-4 h-4 rounded-[2px] inline-block text-center leading-4 text-[9px] font-bold ${
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

          <div className="xl:col-span-4 space-y-4">
            <div className="fc-panel rounded-lg p-4">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wide mb-2.5">
                Pichichi Top Scorers
              </h3>
              <div className="space-y-1.5 text-xs">
                {topScorers.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-1 border-b border-white/[0.06]">
                    <div className="truncate">
                      <span className="font-mono-num text-[#8ba5b3] mr-2">{i + 1}.</span>
                      <span className="font-bold text-white">{p.knownAs}</span>
                      <span className="text-[11px] text-[#8ba5b3] ml-1.5">({p.clubName})</span>
                    </div>
                    <span className="font-mono-num font-extrabold text-[#38f2c8]">{p.seasonStats.goals}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="fc-panel rounded-lg p-4">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wide mb-2.5">
                Top Assist Providers
              </h3>
              <div className="space-y-1.5 text-xs">
                {topAssists.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-1 border-b border-white/[0.06]">
                    <div className="truncate">
                      <span className="font-mono-num text-[#8ba5b3] mr-2">{i + 1}.</span>
                      <span className="font-bold text-white">{p.knownAs}</span>
                      <span className="text-[11px] text-[#8ba5b3] ml-1.5">({p.clubName})</span>
                    </div>
                    <span className="font-mono-num font-extrabold text-[#b8fff0]">{p.seasonStats.assists}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SCHEDULE & SIM TO DATE */}
      {subTab === 'Calendar' && (
        <div className="space-y-4">
          <div className="fc-panel rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#38f2c8]" />
              <div>
                <div className="font-display text-xl font-extrabold uppercase text-white">
                  Current Date: {career.currentDate}
                </div>
                <div className="text-xs text-[#8ba5b3]">
                  Select any future date or fixture to simulate directly to that matchday (up to 60 days per jump).
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={simTargetDate || career.currentDate}
                min={career.currentDate}
                onChange={(e) => setSimTargetDate(e.target.value)}
                className="rounded border border-white/15 bg-[#0a1822] px-3 py-2 text-xs font-mono-num text-white"
              />
              <button
                type="button"
                onClick={() => simToNextMatchOrDate(simTargetDate || undefined)}
                className="fc-btn-primary rounded px-4 py-2 text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
              >
                <FastForward className="w-3.5 h-3.5" />
                Sim to Date
              </button>
            </div>
          </div>

          <div className="fc-panel rounded-lg overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/[0.06]">
              {userFixtures.map((f) => {
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
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono-num text-[#8ba5b3] w-10">MD {f.round}</span>
                      <span className="font-mono-num text-[#9bb4c2] w-24">{f.date}</span>
                      <span className="uppercase font-bold text-[#38f2c8] w-6">{isHome ? 'H' : 'A'}</span>
                      <ClubCrest club={opp} size={22} />
                      <span className="font-bold text-white truncate">{opp?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {f.played ? (
                        <>
                          <span className="font-mono-num font-extrabold text-sm text-white">
                            {f.homeGoals} - {f.awayGoals}
                          </span>
                          <span
                            className={`w-5 h-5 rounded-[3px] text-center leading-5 text-[10px] font-black ${
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
                          className="fc-btn-secondary rounded px-2.5 py-1 text-[10px] font-bold uppercase"
                        >
                          Sim to Match
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FINANCES (SVG Donut + Budget Slider + Transactions Ledger) */}
      {subTab === 'Finances' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 fc-panel rounded-lg p-5 space-y-5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#38f2c8]" />
              <h3 className="font-display text-xl font-extrabold uppercase tracking-wide">
                Financial Overview
              </h3>
            </div>

            <div className="flex items-center justify-around gap-4">
              <svg width="140" height="140" viewBox="0 0 100 100">
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
                  fontSize="13"
                  fontWeight="800"
                  fontFamily="Barlow Condensed, sans-serif"
                >
                  {earnPct}%
                </text>
                <text x="50" y="61" textAnchor="middle" fill="#8ba5b3" fontSize="7.5" fontWeight="700">
                  INCOME
                </text>
              </svg>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="text-[#8ba5b3] uppercase text-[10px]">Season Profit</div>
                  <div className={`font-mono-num text-lg font-extrabold ${profit >= 0 ? 'text-[#38f2c8]' : 'text-rose-400'}`}>
                    {formatMoney(profit, career.settings.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[#8ba5b3] uppercase text-[10px]">Total Earnings</div>
                  <div className="font-mono-num text-sm font-bold text-white">
                    {formatMoney(earnings, career.settings.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[#8ba5b3] uppercase text-[10px]">Total Expenses</div>
                  <div className="font-mono-num text-sm font-bold text-rose-300">
                    -{formatMoney(expenses, career.settings.currency)}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#9bb4c2]">Club Valuation</span>
                <strong className="font-mono-num text-white">
                  {formatMoney(userClub.clubWorthEur, career.settings.currency)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9bb4c2]">Weekly Wage Bill</span>
                <strong className="font-mono-num text-white">
                  {formatMoney(weeklyPayroll, career.settings.currency)}/wk
                </strong>
              </div>
            </div>

            {/* Budget Allocation Slider */}
            <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
              <div className="flex justify-between font-bold">
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
              <div className="flex justify-between font-mono-num text-sm font-extrabold">
                <span className="text-[#b8fff0]">
                  {formatMoney(userClub.transferBudgetEur, career.settings.currency)}
                </span>
                <span className="text-white">
                  {formatMoney(userClub.wageBudgetRemainingEur, career.settings.currency)}/wk
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 fc-panel rounded-lg p-5">
            <h3 className="font-display text-xl font-extrabold uppercase tracking-wide mb-3">
              Club Transactions Ledger ({career.transactions.length})
            </h3>
            <div className="max-h-[54vh] overflow-y-auto divide-y divide-white/[0.06] text-xs">
              {career.transactions.map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">{tx.description}</div>
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-mono-num">
                      {tx.date} · {tx.category}
                    </div>
                  </div>
                  <div
                    className={`font-mono-num font-extrabold ${
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

      {/* SUB-TAB 4: BOARD OBJECTIVES */}
      {subTab === 'Objectives' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {career.objectives.map((obj) => (
            <div key={obj.id} className="fc-panel rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold">
                <span className="text-[#38f2c8]">
                  {obj.term} TERM · {obj.category}
                </span>
                <span className={obj.priority === 'Critical' ? 'text-rose-300' : 'text-amber-300'}>
                  {obj.priority}
                </span>
              </div>
              <h3 className="font-display text-2xl font-extrabold uppercase text-white leading-tight flex items-center gap-2">
                {obj.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-[#38f2c8] shrink-0" />
                ) : (
                  <Target className="w-5 h-5 text-amber-300 shrink-0" />
                )}
                {obj.title}
              </h3>
              <p className="text-xs text-[#9bb4c2]">{obj.targetDescription}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono-num">
                  <span className="text-[#8ba5b3]">Progress</span>
                  <span className="font-bold text-white">{obj.progressPct}%</span>
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
