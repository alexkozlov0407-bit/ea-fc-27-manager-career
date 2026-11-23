import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Play, Shield, Trophy } from 'lucide-react';
import { computeSectorRatings } from '../engine/matchSim';
import { formatMoney } from '../engine/ratings';
import { CurrencyCode, EnergyRecoveryPolicy } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest, PlayerAvatar } from './PlayerAvatar';

export const ClubSelectScreen: React.FC = () => {
  const database = useCareerStore((s) => s.database);
  const startNewCareer = useCareerStore((s) => s.startNewCareer);
  const resumeSavedCareer = useCareerStore((s) => s.resumeSavedCareer);
  const savedSlots = useCareerStore((s) => s.savedSlots);
  const loadFromSlot = useCareerStore((s) => s.loadFromSlot);

  const [selectedClubId, setSelectedClubId] = useState<number>(243);
  const [energyRecovery, setEnergyRecovery] = useState<EnergyRecoveryPolicy>('Balanced');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');

  const laLigaClubs = useMemo(() => {
    if (!database) return [];
    return database.laLigaClubIds.map((id) => database.clubs[id]).filter(Boolean);
  }, [database]);

  const selectedClub = database?.clubs[selectedClubId] ?? laLigaClubs[0];

  const hasAutoSave = useMemo(() => {
    try {
      return Boolean(localStorage.getItem('fc27_career_active_v1'));
    } catch {
      return false;
    }
  }, []);

  const selectedClubStats = useMemo(() => {
    if (!database || !selectedClub) return null;
    const roster = Object.values(database.players)
      .filter((p) => p.clubId === selectedClub.id)
      .sort((a, b) => b.baseOvr - a.baseOvr);
    const sectors = computeSectorRatings(selectedClub, database.players);
    return {
      rosterCount: roster.length,
      stars: roster.slice(0, 4),
      atk: Math.round(sectors.atk),
      mid: Math.round(sectors.mid),
      def: Math.round(sectors.def),
      avgAge: (roster.reduce((s, p) => s + p.age, 0) / Math.max(1, roster.length)).toFixed(1),
    };
  }, [database, selectedClub]);

  const handleStart = () => {
    if (!selectedClub) return;
    startNewCareer(selectedClub.id, { energyRecovery, currency });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!database || !selectedClub || !selectedClubStats) return null;

  return (
    <div className="min-h-screen fc-backdrop fc-facet-overlay text-white flex flex-col">
      {/* Top Hero Lockup */}
      <div className="border-b border-white/10 bg-[#07131a]/80">
        <div className="mx-auto max-w-[1440px] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#b8fff0] bg-[#0d222d] font-display text-xl font-extrabold italic tracking-tight text-white">
              MC
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider leading-none text-white">
                EA SPORTS FC 27 <span className="text-[#38f2c8]">MANAGER CAREER</span>
              </h1>
              <p className="text-xs text-[#9cb4c2] mt-0.5">
                LALIGA EA SPORTS · 20 Real Clubs · 550 Licensed Players · Dynamic OVR &amp; TransferRoom xTV
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {hasAutoSave && (
              <button
                type="button"
                onClick={() => resumeSavedCareer()}
                className="fc-btn-secondary inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-bold uppercase tracking-wider"
              >
                <Play className="w-3.5 h-3.5 text-[#38f2c8]" />
                Resume Active Career
              </button>
            )}
            <button
              type="button"
              data-start="true"
              onClick={handleStart}
              className="fc-btn-primary inline-flex items-center gap-2 rounded px-5 py-2 text-xs uppercase tracking-wider"
            >
              Take Charge of {selectedClub.shortName}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Selection Grid */}
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 20 Real LaLiga Clubs List */}
        <div className="lg:col-span-7 fc-panel rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#38f2c8]" />
              <span className="font-display text-lg font-bold uppercase tracking-wide">
                Select Club — LALIGA EA SPORTS (20 Clubs)
              </span>
            </div>
            <span className="text-xs text-[#8ba5b3] font-mono-num">550 Players Loaded</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 max-h-[68vh] overflow-y-auto">
            {laLigaClubs.map((club) => {
              const isSelected = club.id === selectedClub.id;
              return (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => setSelectedClubId(club.id)}
                  className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'fc-panel-active text-white'
                      : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] text-[#d3e2ea]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ClubCrest club={club} size={32} />
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{club.name}</div>
                      <div className="text-[11px] text-[#8ba6b5] flex items-center gap-2">
                        <span>{club.tacticalVision}</span>
                        <span>·</span>
                        <span className="font-mono-num text-[#b8fff0]">
                          {formatMoney(club.transferBudgetEur, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase text-[#7f9aa8]">Prestige</div>
                    <div className="font-mono-num text-xs font-bold text-amber-300">
                      {club.domesticPrestige}/10
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Club Showcase & Career Setup */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="fc-panel rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <ClubCrest club={selectedClub} size={56} />
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-[#38f2c8] font-bold">
                    LALIGA EA SPORTS
                  </div>
                  <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide leading-tight">
                    {selectedClub.name}
                  </h2>
                  <div className="text-xs text-[#9cb4c2] mt-0.5">
                    Default Setup: {selectedClub.formation} · {selectedClub.tacticalVision}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[#8ba5b3]">Transfer Budget</div>
                <div className="font-mono-num text-xl font-extrabold text-[#b8fff0]">
                  {formatMoney(selectedClub.transferBudgetEur, currency)}
                </div>
              </div>
            </div>

            {/* Sector Ratings */}
            <div className="grid grid-cols-4 gap-2.5 mt-5">
              {[
                { label: 'ATT', val: selectedClubStats.atk },
                { label: 'MID', val: selectedClubStats.mid },
                { label: 'DEF', val: selectedClubStats.def },
                { label: 'AVG AGE', val: selectedClubStats.avgAge },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded border border-white/10 bg-[#0a1822]/75 py-2.5 text-center"
                >
                  <div className="text-[10px] uppercase tracking-wider text-[#7f9aa8] font-bold">
                    {s.label}
                  </div>
                  <div className="font-display text-2xl font-extrabold tabular-nums text-white mt-0.5">
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Key Stars */}
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wider text-[#8ba5b3] font-bold mb-2">
                Key Squad Leaders ({selectedClubStats.rosterCount} Players)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {selectedClubStats.stars.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 rounded border border-white/10 bg-[#0a1720]/70 px-2.5 py-2"
                  >
                    <PlayerAvatar player={p} clubColor={selectedClub.primaryColor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate text-white">{p.knownAs}</div>
                      <div className="text-[10px] text-[#8ba5b3] flex items-center gap-1.5">
                        <span className="font-bold text-[#38f2c8]">{p.primaryPosition}</span>
                        <span>·</span>
                        <span>Age {p.age}</span>
                      </div>
                    </div>
                    <div className="font-display text-xl font-extrabold tabular-nums text-white">
                      {p.baseOvr}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Career Setup Options */}
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8ba5b3] font-bold mb-1.5">
                  Energy Recovery Plan
                </label>
                <select
                  value={energyRecovery}
                  onChange={(e) => setEnergyRecovery(e.target.value as EnergyRecoveryPolicy)}
                  className="w-full rounded border border-white/15 bg-[#0b1822] px-3 py-2 text-xs font-semibold text-white focus:border-[#38f2c8] focus:outline-none"
                >
                  <option value="Balanced">Balanced (+5 Energy / +1 Sharp)</option>
                  <option value="Aggressive">Aggressive (+7 Energy / -1 Sharp)</option>
                  <option value="Conservative">Conservative (+3 Energy / +2 Sharp)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8ba5b3] font-bold mb-1.5">
                  Currency Display
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full rounded border border-white/15 bg-[#0b1822] px-3 py-2 text-xs font-semibold text-white focus:border-[#38f2c8] focus:outline-none"
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="fc-btn-primary mt-5 w-full rounded py-3 text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Start Manager Career with {selectedClub.name}
            </button>
          </div>

          {savedSlots.length > 0 && (
            <div className="fc-panel rounded-lg p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#8ba5b3] mb-2">
                Saved Career Slots
              </div>
              <div className="space-y-1.5">
                {savedSlots.slice(0, 3).map((slot) => (
                  <button
                    key={slot.slotId}
                    type="button"
                    onClick={() => loadFromSlot(slot.slotId)}
                    className="w-full flex items-center justify-between rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-xs hover:bg-white/[0.08]"
                  >
                    <span className="font-bold text-white">{slot.saveName}</span>
                    <span className="font-mono-num text-[#8ba5b3]">
                      S{slot.seasonNumber} · {slot.currentDate}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clean single-line bottom hint */}
      <div className="border-t border-white/10 py-2.5 text-center text-[11px] text-[#7e98a7]">
        Click a club to inspect squad leaders · Press Enter to start · Auto-saves locally after every action
      </div>
    </div>
  );
};
