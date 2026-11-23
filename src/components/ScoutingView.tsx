import React, { useMemo, useState } from 'react';
import { Bookmark, Eye, Filter, PhoneCall, Search, UserCheck } from 'lucide-react';
import { GROWTH_PROFILES } from '../engine/growth';
import { ALL_POSITIONS, calculatePlayerInterest, formatMoney } from '../engine/ratings';
import { Position } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest, OvrDiamond, PlayerAvatar, positionColorClass } from './PlayerAvatar';

export const ScoutingView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const toggleShortlist = useCareerStore((s) => s.toggleShortlist);
  const assignSeniorScout = useCareerStore((s) => s.assignSeniorScout);
  const startNegotiation = useCareerStore((s) => s.startNegotiation);

  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Position | 'ANY'>('ANY');
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
      .slice(0, 80);
  }, [career, query, posFilter, minOvr, maxAge, maxXtvM, onlyListed, activeInstructionIdx]);

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

  return (
    <div className="mx-auto max-w-[1520px] px-4 lg:px-6 py-4 space-y-4">
      {/* Header + Preset Scout Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            Scouting Hub
          </h2>
          <div className="h-5 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => setActiveInstructionIdx(null)}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider ${
              activeInstructionIdx === null ? 'fc-panel-active text-white' : 'text-[#8ea5b3] hover:text-white'
            }`}
          >
            Global Search
          </button>
          {career.scoutInstructions.map((inst, idx) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => setActiveInstructionIdx(idx)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider ${
                activeInstructionIdx === idx ? 'fc-panel-active text-white' : 'text-[#8ea5b3] hover:text-white'
              }`}
            >
              {inst.name}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#9bb4c2] font-mono-num">
          {results.length} Players Found · Instant Attribute Visibility
        </div>
      </div>

      {/* Filter Bar (active in Global Search mode) */}
      {activeInstructionIdx === null && (
        <div className="fc-panel rounded-lg p-3.5 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
          <div className="col-span-2">
            <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">
              Player / Club / Nationality
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8ba5b3] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Lamine Yamal, Pedri, Villarreal..."
                className="w-full rounded border border-white/15 bg-[#0a1822] pl-8 pr-3 py-1.5 text-white placeholder:text-[#6e8795] focus:border-[#38f2c8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">Position</label>
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value as Position | 'ANY')}
              className="w-full rounded border border-white/15 bg-[#0a1822] px-2.5 py-1.5 text-white"
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
              max={90}
              value={minOvr}
              onChange={(e) => setMinOvr(Number(e.target.value))}
              className="w-full accent-[#38f2c8]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-[#8ba5b3] font-bold mb-1">
              Max Age ({maxAge}) · Max xTV ({maxXtvM}M)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={16}
                max={42}
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value) || 35)}
                className="w-1/2 rounded border border-white/15 bg-[#0a1822] px-2 py-1 text-white font-mono-num"
              />
              <input
                type="number"
                min={1}
                max={250}
                value={maxXtvM}
                onChange={(e) => setMaxXtvM(Number(e.target.value) || 200)}
                className="w-1/2 rounded border border-white/15 bg-[#0a1822] px-2 py-1 text-white font-mono-num"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-[#c7d9e2] cursor-pointer">
              <input
                type="checkbox"
                checked={onlyListed}
                onChange={(e) => setOnlyListed(e.target.checked)}
                className="accent-[#38f2c8]"
              />
              Listed Only
            </label>
            <Filter className="w-4 h-4 text-[#38f2c8]" />
          </div>
        </div>
      )}

      {/* Main Split: Left Table (matching Scouting Instructions screenshot) + Right Player Spotlight */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-7 fc-panel rounded-lg overflow-hidden">
          <div className="overflow-y-auto max-h-[64vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d1d29] border-b border-white/12 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                <tr>
                  <th className="py-2.5 px-3 text-left">Pos</th>
                  <th className="py-2.5 px-2 text-left">Club</th>
                  <th className="py-2.5 px-2 text-left">Name</th>
                  <th className="py-2.5 px-2 text-center">OVR</th>
                  <th className="py-2.5 px-2 text-center">Age</th>
                  <th className="py-2.5 px-3 text-right">Value (xTV)</th>
                  <th className="py-2.5 px-3 text-center">Scout</th>
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
                      <td className={`py-2 px-3 font-bold ${positionColorClass(p.primaryPosition)}`}>
                        {p.primaryPosition}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <ClubCrest club={club} size={20} />
                          <span className="truncate max-w-[100px] text-[11px]">{p.clubName}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar player={p} clubColor={club?.primaryColor} size="xs" />
                          <span className="font-bold text-white truncate max-w-[150px]">{p.knownAs}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono-num font-extrabold text-white">
                        {p.dynamicOvr.dynamicOvr}
                      </td>
                      <td className="py-2 px-2 text-center font-mono-num">{p.age}</td>
                      <td className="py-2 px-3 text-right font-mono-num font-bold text-[#b8fff0]">
                        {formatMoney(p.expectedTransferValue, career.settings.currency)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono-num text-[11px]">
                        {rep ? (
                          <span className="text-[#38f2c8] font-bold">{rep.stage}/4</span>
                        ) : (
                          <span className="text-white/35">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Spotlight Panel matching FC 27 Scouting screenshot */}
        {selectedPlayer && interest && (
          <div className="xl:col-span-5 fc-panel rounded-lg p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <PlayerAvatar player={selectedPlayer} clubColor={selectedClub?.primaryColor} size="xl" />
                <div>
                  <div className="text-xs font-bold uppercase text-[#38f2c8]">
                    {selectedPlayer.primaryPosition}{' '}
                    {selectedPlayer.otherPositions.length > 0 && `· ${selectedPlayer.otherPositions.join(', ')}`}
                  </div>
                  <h3 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white leading-tight">
                    {selectedPlayer.knownAs}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#9cb4c2] mt-1">
                    <ClubCrest club={selectedClub} size={18} />
                    <span>{selectedPlayer.clubName}</span>
                    <span>·</span>
                    <span>{selectedPlayer.nationality}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[#8ba5b3]">Player Interest</div>
                <div
                  className={`font-display text-lg font-extrabold uppercase ${
                    interest.label === 'VERY HIGH' || interest.label === 'HIGH'
                      ? 'text-[#38f2c8]'
                      : interest.label === 'MEDIUM'
                      ? 'text-amber-300'
                      : 'text-rose-400'
                  }`}
                >
                  {interest.label}
                </div>
                <OvrDiamond ovr={selectedPlayer.dynamicOvr.dynamicOvr} delta={selectedPlayer.dynamicOvr.totalDelta} size="md" />
              </div>
            </div>

            {/* TransferRoom xTV Metrics Strip */}
            <div className="grid grid-cols-4 gap-2 rounded-md border border-white/10 bg-[#0a1822]/80 p-3 text-xs">
              <div>
                <div className="text-[10px] uppercase text-[#8ba5b3]">Age</div>
                <div className="font-mono-num text-sm font-bold text-white">{selectedPlayer.age}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#8ba5b3]">Value (xTV)</div>
                <div className="font-mono-num text-sm font-bold text-[#b8fff0]">
                  {formatMoney(selectedPlayer.expectedTransferValue, career.settings.currency)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#8ba5b3]">Weekly Wage</div>
                <div className="font-mono-num text-sm font-bold text-white">
                  {formatMoney(selectedPlayer.weeklyWageEur, career.settings.currency)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#8ba5b3]">Contract</div>
                <div className="font-mono-num text-sm font-bold text-white">{selectedPlayer.contractEndYear}</div>
              </div>
            </div>

            {/* 6 Instant Card Attributes (FC 27 Instant Visibility) */}
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
                    className={`font-display text-2xl font-extrabold tabular-nums ${
                      val >= 80 ? 'text-[#38f2c8]' : val >= 70 ? 'text-white' : 'text-[#9bb4c2]'
                    }`}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* 4-Stage Senior Scout Report */}
            <div className="rounded-md border border-white/10 bg-[#0b1822]/75 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#38f2c8]" />
                  4-Stage Scout Dossier
                </span>
                <span className="text-[11px] font-mono-num text-[#38f2c8]">
                  {scoutRep ? `Stage ${scoutRep.stage}/4` : 'Unscouted (Basic View)'}
                </span>
              </div>
              {scoutRep ? (
                <div className="space-y-1 text-[11px] text-[#bfd2dc]">
                  <div><strong>1. Tactical Fit:</strong> {scoutRep.tacticalFit}</div>
                  <div><strong>2. Future:</strong> {scoutRep.futureVerdict}</div>
                  <div><strong>3. Financial:</strong> {scoutRep.financialEstimate}</div>
                  <div><strong>4. Status:</strong> {scoutRep.statusNote}</div>
                </div>
              ) : (
                <div className="text-[11px] text-[#9bb4c2]">
                  Growth Profile: <strong className="text-white">{GROWTH_PROFILES[selectedPlayer.growthProfile].label}</strong> ·{' '}
                  {interest.reason}. Assign a Senior Scout to unlock complete tactical &amp; financial recommendations.
                </div>
              )}
              <div className="text-[10px] text-right text-[#7f9aa8]">Enhanced by TransferRoom</div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => startNegotiation(selectedPlayer.id, 'BUY')}
                className="fc-btn-primary sm:col-span-2 rounded py-2.5 px-4 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                Approach to Buy (2D Talks)
              </button>
              <button
                type="button"
                onClick={() => toggleShortlist(selectedPlayer.id)}
                className="fc-btn-secondary rounded py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${
                    career.shortlistIds.includes(selectedPlayer.id) ? 'fill-[#38f2c8] text-[#38f2c8]' : ''
                  }`}
                />
                {career.shortlistIds.includes(selectedPlayer.id) ? 'Saved' : 'Shortlist'}
              </button>
            </div>
            {!scoutRep && (
              <button
                type="button"
                onClick={() => assignSeniorScout(selectedPlayer.id)}
                className="fc-btn-secondary w-full rounded py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#38f2c8]" />
                Assign Senior Scout (4-Stage Report)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
