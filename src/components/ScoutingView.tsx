import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  Eye,
  Filter,
  Layers,
  PhoneCall,
  Search,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { GROWTH_PROFILES } from '../engine/growth';
import { ALL_POSITIONS, calculatePlayerInterest, formatMoney } from '../engine/ratings';
import { Position } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest, OvrDiamond, PlayerAvatar, positionColorClass } from './PlayerAvatar';

type ScoutingSubTab = 'Hub' | 'Reports' | 'Scouts' | 'Search';

const LEAGUE_FILTERS = [
  { id: 'ALL', name: 'All Leagues' },
  { id: '13', name: 'Premier League' },
  { id: '53', name: 'LaLiga' },
  { id: '19', name: 'Bundesliga' },
  { id: '31', name: 'Serie A' },
  { id: '16', name: 'Ligue 1' },
];

export const ScoutingView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const toggleShortlist = useCareerStore((s) => s.toggleShortlist);
  const assignSeniorScout = useCareerStore((s) => s.assignSeniorScout);
  const startNegotiation = useCareerStore((s) => s.startNegotiation);

  const [subTab, setSubTab] = useState<ScoutingSubTab>('Hub');
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Position | 'ANY'>('ANY');
  const [leagueFilter, setLeagueFilter] = useState('ALL');
  const [minOvr, setMinOvr] = useState(72);
  const [maxAge, setMaxAge] = useState(35);
  const [maxXtvM, setMaxXtvM] = useState(200);
  const [onlyListed, setOnlyListed] = useState(false);
  const [activeInstructionIdx, setActiveInstructionIdx] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const results = useMemo(() => {
    if (!career) return [];
    const userClubId = career.userClubId;
    const q = query.trim().toLowerCase();
    const inst = activeInstructionIdx !== null ? career.scoutInstructions[activeInstructionIdx] : null;

    return Object.values(career.players)
      .filter((p) => {
        if (p.clubId === userClubId) return false;
        if (q && !p.knownAs.toLowerCase().includes(q) && !p.clubName.toLowerCase().includes(q) && !p.nationality.toLowerCase().includes(q)) {
          return false;
        }
        if (leagueFilter !== 'ALL') {
          const club = career.clubs[p.clubId];
          if (club && String(club.leagueId) !== leagueFilter) return false;
        }
        if (inst) {
          if (inst.position !== 'ANY' && p.primaryPosition !== inst.position) return false;
          if (p.age < inst.minAge || p.age > inst.maxAge) return false;
          if (p.baseOvr < inst.minOvr) return false;
          if (p.expectedTransferValue > inst.maxValueM * 1_000_000) return false;
          return true;
        }
        if (posFilter !== 'ANY' && p.primaryPosition !== posFilter && !p.otherPositions.includes(posFilter)) {
          return false;
        }
        if (p.baseOvr < minOvr) return false;
        if (p.age > maxAge) return false;
        if (p.expectedTransferValue > maxXtvM * 1_000_000) return false;
        if (onlyListed && !p.transferListed) return false;
        return true;
      })
      .sort((a, b) => b.dynamicOvr.dynamicOvr - a.dynamicOvr.dynamicOvr)
      .slice(0, 90);
  }, [career, query, posFilter, leagueFilter, minOvr, maxAge, maxXtvM, onlyListed, activeInstructionIdx]);

  if (!career) return null;
  const userClub = career.clubs[career.userClubId];
  const selectedPlayer = (selectedId ? career.players[selectedId] : undefined) ?? results[0];
  const selectedClub = selectedPlayer ? career.clubs[selectedPlayer.clubId] : undefined;
  const scoutRep = selectedPlayer ? career.scoutReports[selectedPlayer.id] : undefined;
  const interest = selectedPlayer
    ? calculatePlayerInterest(
        selectedPlayer,
        userClub,
        selectedClub,
        selectedPlayer.baseOvr >= 82 ? 'Crucial' : 'Important',
        Math.round(selectedPlayer.weeklyWageEur * 1.15)
      )
    : null;

  // Top scouted players with 4-stage reports
  const scoutedList = Object.keys(career.scoutReports)
    .map((id) => career.players[Number(id)])
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-8 py-5 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-none">
            Scouting
          </h1>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-1 bg-[#07131a] p-1 rounded-xl border border-white/10">
            {(
              [
                ['Hub', 'Overview Hub'],
                ['Reports', `Scout Reports (${scoutedList.length})`],
                ['Scouts', 'Senior Scouts (3)'],
                ['Search', `Search Players (${results.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSubTab(key as ScoutingSubTab)}
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

        <div className="text-xs text-[#8ba5b3] font-mono-num flex items-center gap-2">
          <span>Shortlist: <strong className="text-[#38f2c8]">{career.shortlistIds.length} targets</strong></span>
          <span className="text-white/30">·</span>
          <span>Deeper Sim: <strong className="text-white">Top 5 European Leagues</strong></span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: AUTHENTIC FC 27 SCOUTING 3-TILE HUB (image_bc8a3b50.png)    */}
      {/* =================================================================== */}
      {subTab === 'Hub' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tile 1: SCOUT REPORT */}
            <div
              onClick={() => setSubTab('Reports')}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">4-STAGE DOSSIERS</span>
                  <span className="font-mono-num">{scoutedList.length} REPORTS</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Scout Report
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Tactical Fit, Future Potential, TransferRoom xTV &amp; Club Status
                </p>

                {/* Top Scouted Preview */}
                <div className="mt-5 space-y-2.5">
                  {scoutedList.length === 0 ? (
                    <div className="text-xs text-[#8ba5b3] py-8 text-center">
                      No active dossiers. Assign Senior Scouts from Search Players to track targets.
                    </div>
                  ) : (
                    scoutedList.slice(0, 3).map((p) => {
                      const rep = career.scoutReports[p.id];
                      return (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-[#07141d]/80 border border-white/8 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar player={p} size="xs" />
                            <div className="min-w-0">
                              <div className="text-xs font-black text-white truncate">{p.knownAs}</div>
                              <div className="text-[10px] text-[#8ba5b3]">{p.primaryPosition} · {p.clubName}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#38f2c8]/20 text-[#38f2c8] border border-[#38f2c8]/40">
                              Stage {rep?.stage ?? 1}/4
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Enter Scout Report</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>

            {/* Tile 2: SCOUTS */}
            <div
              onClick={() => setSubTab('Scouts')}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">SENIOR NETWORK</span>
                  <span className="font-mono-num">3 ACTIVE SCOUTS</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Scouts
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Global scouting presence across the Top 5 European leagues
                </p>

                {/* Senior Scouts Summary */}
                <div className="mt-5 space-y-2.5">
                  {[
                    { name: 'Mateo Fernandez', region: 'Spain & Portugal', exp: 5, judge: 5, targets: 14 },
                    { name: 'David Wilson', region: 'United Kingdom', exp: 5, judge: 4, targets: 12 },
                    { name: 'Julian Richter', region: 'Germany & Central Europe', exp: 4, judge: 5, targets: 9 },
                  ].map((scout, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#07141d]/80 border border-white/8 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-black text-white">{scout.name}</div>
                        <div className="text-[10px] text-[#8ba5b3]">{scout.region}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-300 text-xs font-mono-num">{'★'.repeat(scout.judge)}</div>
                        <div className="text-[10px] font-mono-num text-[#38f2c8] font-bold">{scout.targets} Found</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Enter Scouts</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>

            {/* Tile 3: SEARCH PLAYERS */}
            <div
              onClick={() => setSubTab('Search')}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">GLOBAL DATABASE</span>
                  <span className="font-mono-num">2,600+ PLAYERS</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Search Players
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Filter by Position, Age, League, xTV and Transfer Status
                </p>

                {/* Big Search Callout */}
                <div className="mt-5 p-4 rounded-xl bg-[#07141d]/80 border border-white/8 space-y-3">
                  <div className="flex items-center gap-2.5 text-[#38f2c8]">
                    <Search className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">Instant Attribute Reveal</span>
                  </div>
                  <p className="text-xs text-[#8ba5b3]">
                    Search wonderkids and established superstars across Premier League, LaLiga, Bundesliga, Serie A, and Ligue 1.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Search Players</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2 & 4: SCOUT REPORTS / SEARCH PLAYERS (image_0822b203.png)     */}
      {/* =================================================================== */}
      {(subTab === 'Reports' || subTab === 'Search') && (
        <div className="space-y-4">
          {/* Scout Instructions Sub-bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveInstructionIdx(null)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeInstructionIdx === null
                    ? 'fc-panel-active text-white border border-[#38f2c8]/50'
                    : 'text-[#8ba5b3] hover:text-white hover:bg-white/5'
                }`}
              >
                All Results
              </button>
              {career.scoutInstructions.map((inst, idx) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => setActiveInstructionIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeInstructionIdx === idx
                      ? 'fc-panel-active text-white border border-[#38f2c8]/50'
                      : 'text-[#8ba5b3] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {inst.name}
                </button>
              ))}
            </div>

            <div className="text-xs text-[#8ba5b3] font-mono-num">
              {results.length} Players Available
            </div>
          </div>

          {/* Search Filter Controls Bar */}
          <div className="fc-panel rounded-2xl p-4 border border-white/10 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
            <div className="col-span-2">
              <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">
                Player / Club / Nationality
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8ba5b3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Mbappe, Haaland, Pedri, Arsenal..."
                  className="w-full rounded-xl border border-white/15 bg-[#0a1822] pl-9 pr-3 py-2 text-white placeholder:text-[#6e8795] focus:border-[#38f2c8] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">League</label>
              <select
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0a1822] px-3 py-2 text-white"
              >
                {LEAGUE_FILTERS.map((lf) => (
                  <option key={lf.id} value={lf.id}>
                    {lf.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">Position</label>
              <select
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value as Position | 'ANY')}
                className="w-full rounded-xl border border-white/15 bg-[#0a1822] px-3 py-2 text-white"
              >
                <option value="ANY">Any Position</option>
                {ALL_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">
                Min OVR ({minOvr})
              </label>
              <input
                type="range"
                min={55}
                max={92}
                value={minOvr}
                onChange={(e) => setMinOvr(Number(e.target.value))}
                className="w-full accent-[#38f2c8]"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-[#c7d9e2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyListed}
                  onChange={(e) => setOnlyListed(e.target.checked)}
                  className="accent-[#38f2c8]"
                />
                <span className="font-bold">Listed Only</span>
              </label>
              <Filter className="w-4 h-4 text-[#38f2c8]" />
            </div>
          </div>

          {/* Split View: Table on Left + Spotlight Inspector on Right (image_0822b203.png) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Table (Left 7 cols) */}
            <div className="xl:col-span-7 fc-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
              <div className="overflow-y-auto max-h-[66vh]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0d1d29] border-b border-white/12 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                    <tr>
                      <th className="py-3 px-3.5 text-left">Pos</th>
                      <th className="py-3 px-2 text-left">Club</th>
                      <th className="py-3 px-2 text-left">Player</th>
                      <th className="py-3 px-2 text-center">OVR</th>
                      <th className="py-3 px-2 text-center">Age</th>
                      <th className="py-3 px-3 text-right">Value (xTV)</th>
                      <th className="py-3 px-3 text-center">Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {results.map((p) => {
                      const isSel = selectedPlayer?.id === p.id;
                      const rep = career.scoutReports[p.id];
                      const club = career.clubs[p.clubId];
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedId(p.id)}
                          className={`cursor-pointer transition-colors ${
                            isSel ? 'fc-panel-active text-white' : 'hover:bg-white/[0.05] text-[#d6e4ec]'
                          }`}
                        >
                          <td className={`py-2.5 px-3.5 font-black ${positionColorClass(p.primaryPosition)}`}>
                            {p.primaryPosition}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1.5">
                              <ClubCrest club={club} size={22} />
                              <span className="truncate max-w-[110px] text-xs font-semibold">{p.clubName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <PlayerAvatar player={p} clubColor={club?.primaryColor} size="xs" />
                              <span className="font-bold text-white truncate max-w-[150px]">{p.knownAs}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono-num font-black text-white">
                            {p.dynamicOvr.dynamicOvr}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono-num">{p.age}</td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-black text-[#38f2c8]">
                            {formatMoney(p.expectedTransferValue, career.settings.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono-num text-xs">
                            {rep ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#38f2c8]/20 text-[#38f2c8] border border-[#38f2c8]/40">
                                {rep.stage}/4
                              </span>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Spotlight Inspector (Right 5 cols) */}
            {selectedPlayer && interest && (
              <div className="xl:col-span-5 fc-panel rounded-2xl p-6 border border-white/10 space-y-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <PlayerAvatar player={selectedPlayer} clubColor={selectedClub?.primaryColor} size="xl" />
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase text-[#38f2c8]">
                        {selectedPlayer.primaryPosition}{' '}
                        {selectedPlayer.otherPositions.length > 0 && `· ${selectedPlayer.otherPositions.join(', ')}`}
                      </div>
                      <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white leading-tight truncate">
                        {selectedPlayer.knownAs}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[#8ba5b3] mt-1">
                        <ClubCrest club={selectedClub} size={18} />
                        <span className="truncate">{selectedPlayer.clubName}</span>
                        <span>·</span>
                        <span>{selectedPlayer.nationality}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-[#8ba5b3]">Player Interest</div>
                    <div
                      className={`font-display text-lg font-black uppercase ${
                        interest.label === 'VERY HIGH' || interest.label === 'HIGH'
                          ? 'text-[#38f2c8]'
                          : interest.label === 'MEDIUM'
                          ? 'text-amber-300'
                          : 'text-rose-400'
                      }`}
                    >
                      {interest.label}
                    </div>
                    <div className="mt-1 flex justify-end">
                      <OvrDiamond ovr={selectedPlayer.dynamicOvr.dynamicOvr} delta={selectedPlayer.dynamicOvr.totalDelta} size="md" />
                    </div>
                  </div>
                </div>

                {/* TransferRoom Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-[#0a1822]/90 p-3 text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">Age</div>
                    <div className="font-mono-num text-sm font-black text-white">{selectedPlayer.age}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">Value (xTV)</div>
                    <div className="font-mono-num text-sm font-black text-[#38f2c8]">
                      {formatMoney(selectedPlayer.expectedTransferValue, career.settings.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">Wage</div>
                    <div className="font-mono-num text-sm font-black text-white">
                      {formatMoney(selectedPlayer.weeklyWageEur, career.settings.currency)}/w
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">Contract</div>
                    <div className="font-mono-num text-sm font-black text-white">{selectedPlayer.contractEndYear}</div>
                  </div>
                </div>

                {/* 6 Face Attributes */}
                <div className="grid grid-cols-6 gap-2 text-center border-y border-white/10 py-3">
                  {(
                    [
                      ['PAC', selectedPlayer.cardFacets.pac],
                      ['SHO', selectedPlayer.cardFacets.sho],
                      ['PAS', selectedPlayer.cardFacets.pas],
                      ['DRI', selectedPlayer.cardFacets.dri],
                      ['DEF', selectedPlayer.cardFacets.def],
                      ['PHY', selectedPlayer.cardFacets.phy],
                    ] as const
                  ).map(([label, val]) => (
                    <div key={label}>
                      <div className="text-[10px] font-bold text-[#8ba5b3]">{label}</div>
                      <div
                        className={`font-display text-2xl font-black tabular-nums mt-0.5 ${
                          val >= 80 ? 'text-[#38f2c8]' : val >= 70 ? 'text-white' : 'text-[#8ba5b3]'
                        }`}
                      >
                        {val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 4-Stage Senior Scout Dossier */}
                <div className="rounded-xl border border-white/10 bg-[#0b1822]/90 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-[#38f2c8]" />
                      <span>4-Stage Scout Dossier</span>
                    </span>
                    <span className="text-xs font-mono-num text-[#38f2c8] font-black">
                      {scoutRep ? `Stage ${scoutRep.stage}/4` : 'Basic Preview'}
                    </span>
                  </div>

                  {scoutRep ? (
                    <div className="space-y-1.5 text-xs text-[#cad9e2] pt-1">
                      <div><strong className="text-white">1. Tactical Fit:</strong> {scoutRep.tacticalFit}</div>
                      <div><strong className="text-white">2. Future:</strong> {scoutRep.futureVerdict}</div>
                      <div><strong className="text-white">3. Financial:</strong> {scoutRep.financialEstimate}</div>
                      <div><strong className="text-white">4. Status:</strong> {scoutRep.statusNote}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#8ba5b3]">
                      Growth Profile: <strong className="text-white">{GROWTH_PROFILES[selectedPlayer.growthProfile].label}</strong> ·{' '}
                      {interest.reason}. Assign a Senior Scout to reveal full tactical fit and release clauses.
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => startNegotiation(selectedPlayer.id, 'BUY')}
                      className="fc-btn-primary sm:col-span-2 rounded-xl py-3 px-4 text-xs uppercase tracking-wider font-black flex items-center justify-center gap-2 shadow"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Approach to Buy (2D Talks)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleShortlist(selectedPlayer.id)}
                      className="fc-btn-secondary rounded-xl py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/15 hover:border-[#38f2c8]/50"
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${
                          career.shortlistIds.includes(selectedPlayer.id) ? 'fill-[#38f2c8] text-[#38f2c8]' : ''
                        }`}
                      />
                      <span>{career.shortlistIds.includes(selectedPlayer.id) ? 'Saved' : 'Shortlist'}</span>
                    </button>
                  </div>

                  {!scoutRep && (
                    <button
                      type="button"
                      onClick={() => assignSeniorScout(selectedPlayer.id)}
                      className="fc-btn-secondary w-full rounded-xl py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-white/15 hover:border-[#38f2c8]/50"
                    >
                      <UserCheck className="w-4 h-4 text-[#38f2c8]" />
                      <span>Assign Senior Scout (4-Stage Report)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: SENIOR SCOUTS                                               */}
      {/* =================================================================== */}
      {subTab === 'Scouts' && (
        <div className="fc-panel rounded-2xl p-6 border border-white/10 space-y-6">
          <div>
            <h3 className="font-display text-2xl font-black uppercase text-white">
              Senior Scout Network
            </h3>
            <p className="text-xs text-[#8ba5b3] mt-1">
              Experienced scouts monitoring target leagues and providing TransferRoom evaluations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Mateo Fernandez', region: 'Spain & Portugal (LaLiga)', exp: 5, judge: 5, activeTargets: 14, wage: '€12,500/wk' },
              { name: 'David Wilson', region: 'United Kingdom (Premier League)', exp: 5, judge: 4, activeTargets: 12, wage: '€11,000/wk' },
              { name: 'Julian Richter', region: 'Germany & Italy (Bundesliga / Serie A)', exp: 4, judge: 5, activeTargets: 9, wage: '€9,800/wk' },
            ].map((sc, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-[#091a24]/80 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase text-[#38f2c8]">Senior Scout</div>
                    <div className="font-display text-xl font-black uppercase text-white mt-0.5">{sc.name}</div>
                  </div>
                  <Compass className="w-7 h-7 text-[#38f2c8]/70" />
                </div>
                <div className="space-y-1.5 text-xs border-y border-white/10 py-3">
                  <div className="flex justify-between">
                    <span className="text-[#8ba5b3]">Assigned Region</span>
                    <span className="font-bold text-white">{sc.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8ba5b3]">Judgement</span>
                    <span className="text-amber-300">{'★'.repeat(sc.judge)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8ba5b3]">Active Dossiers</span>
                    <span className="font-mono-num font-bold text-[#38f2c8]">{sc.activeTargets}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
