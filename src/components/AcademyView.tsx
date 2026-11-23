import React, { useState } from 'react';
import {
  Award,
  ChevronRight,
  Compass,
  GraduationCap,
  Plus,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { GROWTH_PROFILES } from '../engine/growth';
import { ALL_POSITIONS, formatMoney } from '../engine/ratings';
import { Position } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { positionColorClass } from './PlayerAvatar';

type AcademySubTab = 'Hub' | 'Squad' | 'Scouts' | 'Reports' | 'Development';

const SCOUT_COUNTRIES = [
  'Spain',
  'Brazil',
  'Argentina',
  'France',
  'Portugal',
  'England',
  'Germany',
  'Italy',
  'Netherlands',
];

export const AcademyView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const hireYouthScout = useCareerStore((s) => s.hireYouthScout);
  const sendYouthScoutMission = useCareerStore((s) => s.sendYouthScoutMission);
  const signYouthProspect = useCareerStore((s) => s.signYouthProspect);
  const rejectYouthProspect = useCareerStore((s) => s.rejectYouthProspect);
  const promoteYouthProspect = useCareerStore((s) => s.promoteYouthProspect);
  const playYouthRushTournament = useCareerStore((s) => s.playYouthRushTournament);

  const [subTab, setSubTab] = useState<AcademySubTab>('Hub');
  const [missionScoutId, setMissionScoutId] = useState<string | null>(null);
  const [missionCountry, setMissionCountry] = useState('Spain');
  const [missionPos, setMissionPos] = useState<Position | 'ANY'>('ANY');
  const [missionMonths, setMissionMonths] = useState(3);
  const [rushResult, setRushResult] = useState<{ won: boolean; score: string; mvpName: string } | null>(null);

  if (!career) return null;

  const academySquad = career.youthProspects.filter((p) => p.inAcademy);
  const scoutedReports = career.youthProspects.filter((p) => !p.inAcademy);
  const topProspects = [...academySquad].sort((a, b) => b.potRange[1] - a.potRange[1]).slice(0, 3);
  const activeScouts = career.youthScouts.filter((s) => s.hired);

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-8 py-5 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-none">
            Youth Academy
          </h1>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-1 bg-[#07131a] p-1 rounded-xl border border-white/10">
            {(
              [
                ['Hub', 'Overview Hub'],
                ['Squad', `Youth Squad (${academySquad.length}/16)`],
                ['Scouts', `Youth Staff (${activeScouts.length}/3)`],
                ['Reports', `Scout Reports (${scoutedReports.length})`],
                ['Development', 'Development Plans'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSubTab(key as AcademySubTab)}
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

        {/* Youth Rush 5v5 Button */}
        <button
          type="button"
          onClick={() => setRushResult(playYouthRushTournament())}
          disabled={academySquad.length === 0}
          className="fc-btn-primary rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <Trophy className="w-4 h-4 text-[#07131a]" />
          <span>Youth Rush 5v5 Tournament</span>
        </button>
      </div>

      {/* Youth Rush Result Banner */}
      {rushResult && (
        <div className="relative rounded-2xl overflow-hidden border border-[#38f2c8]/60 shadow-[0_0_30px_rgba(56,242,200,0.25)] p-5">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen pointer-events-none"
            style={{ backgroundImage: `url('/assets/art/academy-pitch.png')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07191d] via-[#092227]/90 to-[#07131a]/85 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#38f2c8]/20 border border-[#38f2c8]/40 flex items-center justify-center text-[#38f2c8] shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="font-display text-xl font-black uppercase tracking-wide text-white">
                  Youth Rush 5v5: {rushResult.won ? 'Tournament Champions!' : 'Finalist'} ({rushResult.score})
                </div>
                <div className="text-xs text-[#b8fff0] mt-0.5">
                  Tournament MVP: <strong className="text-white">{rushResult.mvpName}</strong> · All Academy prospects earned bonus XP and tightened their potential bounds!
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRushResult(null)}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 1: AUTHENTIC FC 27 ACADEMY 3-TILE HUB (image_49b674d7.png)     */}
      {/* =================================================================== */}
      {subTab === 'Hub' && (
        <div className="space-y-6">
          {/* Academy Atmosphere Showcase Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl p-6 min-h-[140px] flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35 pointer-events-none"
              style={{ backgroundImage: `url('/assets/art/academy-pitch.png')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071117] via-[#071117]/80 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-[#38f2c8] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#38f2c8]" />
                  <span>FC ACADEMY COMPLEX · FLOODLIT TWILIGHT PITCH</span>
                </div>
                <h2 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-tight text-white mt-1 leading-none">
                  Next-Gen Talent Development Center
                </h2>
                <p className="text-xs text-[#a4c0ce] mt-1.5 max-w-xl">
                  Scout wonderkids across 9 global football hubs, assign tailored growth profiles, and compete in bi-monthly Youth Rush 5v5 tournaments to unlock breakthrough development.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRushResult(playYouthRushTournament())}
                  disabled={academySquad.length === 0}
                  className="fc-btn-primary rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                  <Trophy className="w-4 h-4 text-[#07131a]" />
                  <span>Launch Youth Rush 5v5</span>
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tile 1: YOUTH SQUAD (Highest Potential) */}
            <div
              onClick={() => setSubTab('Squad')}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">HIGHEST POTENTIAL</span>
                  <span className="font-mono-num">{academySquad.length}/16 PROSPECTS</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Youth Squad
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Active wonderkids training in your academy setup
                </p>

                {/* Top 3 Prospects List */}
                <div className="mt-5 space-y-2.5">
                  {topProspects.length === 0 ? (
                    <div className="text-xs text-[#8ba5b3] py-8 text-center">
                      No signed academy players. Scout wonderkids in Youth Staff to fill your ranks.
                    </div>
                  ) : (
                    topProspects.map((yp) => (
                      <div
                        key={yp.id}
                        className="p-3 rounded-xl bg-[#07141d]/80 border border-white/8 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${positionColorClass(yp.primaryPosition)}`}>
                            {yp.primaryPosition}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white truncate">{yp.name}</div>
                            <div className="text-[10px] text-[#8ba5b3]">
                              Age {yp.age} · {yp.nationality}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 font-mono-num">
                          <div className="text-[10px] text-[#8ba5b3] uppercase">POT</div>
                          <div className="text-xs font-black text-[#38f2c8]">
                            {yp.potRange[0]}–{yp.potRange[1]}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Enter Youth Squad</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>

            {/* Tile 2: YOUTH SCOUTS (image_49b674d7.png center tile) */}
            <div
              onClick={() => setSubTab('Scouts')}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">SCOUT NETWORK</span>
                  <span className="font-mono-num">{activeScouts.length}/3 SCOUTS</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Youth Scouts
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Global talent search network targeting wonderkids
                </p>

                {/* 3 Scout Network Slots */}
                <div className="mt-5 space-y-2.5">
                  {career.youthScouts.map((scout, idx) => (
                    <div
                      key={scout.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        scout.hired
                          ? scout.mission
                            ? 'bg-[#0e272a]/70 border-[#38f2c8]/40'
                            : 'bg-[#07141d]/80 border-white/10'
                          : 'bg-white/5 border-dashed border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-display font-black text-xs text-[#38f2c8]">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">
                            {scout.hired ? scout.name : 'Open Scout Slot'}
                          </div>
                          <div className="text-[10px] text-[#8ba5b3]">
                            {scout.hired
                              ? scout.mission
                                ? `Scouting in ${scout.mission.country}`
                                : 'Available for Mission'
                              : 'Hire Scout from Pool'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {scout.hired ? (
                          <div className="text-amber-300 text-xs font-mono-num">
                            {'★'.repeat(scout.judgement)}
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-[#38f2c8]">
                            HIRE
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Enter Youth Staff</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>

            {/* Tile 3: YOUTH DEVELOPMENT PLAN */}
            <div
              onClick={() => setSubTab('Development')}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">GROWING PROSPECTS</span>
                  <span className="text-emerald-300 font-bold">DEVELOPMENT 2.0</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Youth Development
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Position retraining, role focuses and growth ETA curves
                </p>

                {/* Growth Highlights */}
                <div className="mt-5 space-y-2.5">
                  {academySquad.slice(0, 3).map((yp) => (
                    <div
                      key={yp.id}
                      className="p-3 rounded-xl bg-[#07141d]/80 border border-white/8 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white truncate">{yp.name}</span>
                        <span className="font-mono-num text-[#38f2c8]">
                          {GROWTH_PROFILES[yp.growthProfile].label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#8ba5b3]">
                        <span>ETA to Senior: {Math.max(1, 16 - yp.age)}y</span>
                        <span className="font-mono-num text-white">Range {yp.ovrRange[0]}–{yp.ovrRange[1]}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#10c482] to-[#38f2c8]"
                          style={{ width: `${Math.min(100, (yp.age / 18) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Enter Development Plan</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: YOUTH SQUAD ROSTER (Full Detail)                            */}
      {/* =================================================================== */}
      {subTab === 'Squad' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {academySquad.length === 0 ? (
            <div className="col-span-full fc-panel rounded-2xl p-12 text-center text-sm text-[#8ba5b3] border border-white/10">
              Your Youth Academy has no signed prospects yet. Check Scout Reports or dispatch a Youth Scout to find future stars.
            </div>
          ) : (
            academySquad.map((yp) => (
              <div key={yp.id} className="fc-panel rounded-2xl p-5 space-y-4 border border-white/10 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-black ${positionColorClass(yp.primaryPosition)}`}>
                        {yp.primaryPosition}
                      </span>
                      <span className="text-xs text-[#8ba5b3] font-semibold">{yp.nationality}</span>
                      {yp.unsettled && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          Unsettled
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-2xl font-black uppercase text-white mt-1 leading-tight">
                      {yp.name}
                    </h3>
                    <div className="text-xs text-[#8ba5b3] font-mono-num mt-0.5">
                      Age {yp.age} · {yp.heightCm} cm · {GROWTH_PROFILES[yp.growthProfile].label}
                    </div>
                  </div>
                  <div className="text-right font-mono-num">
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">OVR / POT Range</div>
                    <div className="text-base font-black text-white">
                      {yp.ovrRange[0]}–{yp.ovrRange[1]}{' '}
                      <span className="text-[#38f2c8]">/ {yp.potRange[0]}–{yp.potRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* 6 Attribute Range Bands */}
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-[#0a1822]/90 p-3 text-xs font-mono-num">
                  {(
                    [
                      ['PAC', yp.statRanges.pac],
                      ['SHO', yp.statRanges.sho],
                      ['PAS', yp.statRanges.pas],
                      ['DRI', yp.statRanges.dri],
                      ['DEF', yp.statRanges.def],
                      ['PHY', yp.statRanges.phy],
                    ] as const
                  ).map(([k, [lo, hi]]) => (
                    <div key={k} className="flex justify-between p-1">
                      <span className="text-[#8ba5b3] font-bold">{k}</span>
                      <span className="font-black text-white">
                        {lo}-{hi}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    disabled={yp.age < 16}
                    onClick={() => promoteYouthProspect(yp.id)}
                    className="fc-btn-primary flex-1 rounded-xl py-2.5 text-xs uppercase tracking-wider font-black inline-flex items-center justify-center gap-2 shadow"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>{yp.age < 16 ? 'Promote at 16' : 'Promote to Senior'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectYouthProspect(yp.id)}
                    className="fc-btn-secondary rounded-xl px-4 py-2.5 text-xs font-black text-rose-300 border border-white/10 hover:border-rose-400/50"
                  >
                    Release
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: YOUTH STAFF & SCOUT NETWORK (image_7eec3e50.png)           */}
      {/* =================================================================== */}
      {subTab === 'Scouts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {career.youthScouts.map((scout) => (
            <div key={scout.id} className="fc-panel rounded-2xl p-6 flex flex-col justify-between space-y-5 border border-white/10 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-[#38f2c8] font-black">
                      {scout.hired ? 'Active Youth Scout' : 'Available for Hire'}
                    </div>
                    <h3 className="font-display text-2xl font-black uppercase text-white mt-0.5">
                      {scout.name}
                    </h3>
                    <div className="text-xs text-[#8ba5b3] font-semibold">{scout.nationality}</div>
                  </div>
                  <Compass className="w-8 h-8 text-[#38f2c8]/80" />
                </div>

                <div className="space-y-2 text-xs border-y border-white/10 py-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8ba5b3] font-bold">Experience</span>
                    <span className="text-amber-300 text-sm">{'★'.repeat(scout.experience)}{'☆'.repeat(5 - scout.experience)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#8ba5b3] font-bold">Judgement</span>
                    <span className="text-amber-300 text-sm">{'★'.repeat(scout.judgement)}{'☆'.repeat(5 - scout.judgement)}</span>
                  </div>
                  {!scout.hired && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#8ba5b3] font-bold">Hire Fee</span>
                      <span className="font-mono-num font-black text-[#38f2c8]">
                        {formatMoney(scout.costEur, career.settings.currency)}
                      </span>
                    </div>
                  )}
                </div>

                {scout.mission ? (
                  <div className="rounded-xl border border-[#38f2c8]/40 bg-[#0e2a2c]/70 p-4 text-xs space-y-1.5">
                    <div className="font-black text-[#38f2c8] uppercase flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      <span>Active Scouting Mission</span>
                    </div>
                    <div className="text-white">Location: <strong>{scout.mission.country}</strong></div>
                    <div className="text-white">Target Position: <strong>{scout.mission.targetPosition}</strong></div>
                    <div className="text-[#8ba5b3]">Report Ready in: <strong className="font-mono-num text-[#38f2c8]">{scout.mission.daysRemaining} days</strong></div>
                  </div>
                ) : scout.hired ? (
                  <div className="text-xs text-[#8ba5b3] bg-white/5 p-3 rounded-xl border border-white/8">
                    Scout is ready for assignment. Dispatch to scout Europe or South America wonderkids.
                  </div>
                ) : null}
              </div>

              {!scout.hired ? (
                <button
                  type="button"
                  onClick={() => hireYouthScout(scout.id)}
                  className="fc-btn-primary w-full rounded-xl py-3 text-xs uppercase tracking-wider font-black shadow"
                >
                  Hire Youth Scout ({formatMoney(scout.costEur, career.settings.currency)})
                </button>
              ) : !scout.mission ? (
                missionScoutId === scout.id ? (
                  <div className="space-y-3 rounded-xl border border-white/15 bg-[#0a1822] p-4 text-xs">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#8ba5b3] block mb-1">Target Country</label>
                      <select
                        value={missionCountry}
                        onChange={(e) => setMissionCountry(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-[#071117] px-3 py-2 text-white"
                      >
                        {SCOUT_COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#8ba5b3] block mb-1">Target Position</label>
                      <select
                        value={missionPos}
                        onChange={(e) => setMissionPos(e.target.value as Position | 'ANY')}
                        className="w-full rounded-lg border border-white/15 bg-[#071117] px-3 py-2 text-white"
                      >
                        <option value="ANY">Any Position</option>
                        {ALL_POSITIONS.map((p) => (
                          <option key={p} value={p}>
                            Target: {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#8ba5b3] block mb-1">Duration</label>
                      <div className="flex gap-2">
                        {[1, 3, 6].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMissionMonths(m)}
                            className={`flex-1 rounded-lg py-1.5 font-bold ${
                              missionMonths === m ? 'bg-white text-[#071117]' : 'bg-white/10 text-white'
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          sendYouthScoutMission(scout.id, missionCountry, missionPos, missionMonths);
                          setMissionScoutId(null);
                        }}
                        className="fc-btn-primary flex-1 rounded-lg py-2 text-xs uppercase font-black"
                      >
                        Dispatch ({formatMoney(missionMonths * 110_000, career.settings.currency)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMissionScoutId(null)}
                        className="fc-btn-secondary rounded-lg px-3 py-2 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMissionScoutId(scout.id)}
                    className="fc-btn-primary w-full rounded-xl py-3 text-xs uppercase tracking-wider font-black shadow"
                  >
                    Set Up Scouting Mission
                  </button>
                )
              ) : (
                <div className="text-center text-xs font-black uppercase text-[#38f2c8] py-2 bg-[#0a2024] rounded-xl border border-[#38f2c8]/30">
                  On Assignment ({scout.mission.daysRemaining}d left)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 4: SCOUT REPORTS                                               */}
      {/* =================================================================== */}
      {subTab === 'Reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scoutedReports.length === 0 ? (
            <div className="col-span-full fc-panel rounded-2xl p-12 text-center text-sm text-[#8ba5b3] border border-white/10">
              No pending Youth Scout reports. Dispatch a Youth Scout and advance days to discover new wonderkids.
            </div>
          ) : (
            scoutedReports.map((yp) => (
              <div key={yp.id} className="fc-panel rounded-2xl p-5 space-y-4 border border-white/10 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xs font-extrabold ${positionColorClass(yp.primaryPosition)}`}>
                      {yp.primaryPosition} · {yp.nationality}
                    </div>
                    <h4 className="font-display text-2xl font-black uppercase text-white mt-0.5">{yp.name}</h4>
                    <div className="text-xs text-[#8ba5b3]">
                      Age {yp.age} · {yp.heightCm} cm · {yp.preferredFoot} Foot
                    </div>
                  </div>
                  <Shield className="w-8 h-8 text-[#38f2c8]/70" />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0a1822]/90 p-3 text-xs font-mono-num">
                  <div>
                    <div className="text-[10px] text-[#8ba5b3] uppercase font-bold">Est. OVR</div>
                    <div className="font-black text-white text-base">
                      {yp.ovrRange[0]}–{yp.ovrRange[1]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#8ba5b3] uppercase font-bold">Est. Potential</div>
                    <div className="font-black text-[#38f2c8] text-base">
                      {yp.potRange[0]}–{yp.potRange[1]}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => signYouthProspect(yp.id)}
                    className="fc-btn-primary flex-1 rounded-xl py-2.5 text-xs uppercase tracking-wider font-black inline-flex items-center justify-center gap-2 shadow"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Sign to Academy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectYouthProspect(yp.id)}
                    className="fc-btn-secondary rounded-xl px-4 py-2.5 text-xs font-black text-rose-300 border border-white/10 hover:border-rose-400/50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 5: DEVELOPMENT PLANS                                           */}
      {/* =================================================================== */}
      {subTab === 'Development' && (
        <div className="fc-panel rounded-2xl p-6 border border-white/10 space-y-6">
          <div>
            <h3 className="font-display text-2xl font-black uppercase text-white">
              Youth Development Plans
            </h3>
            <p className="text-xs text-[#8ba5b3] mt-1">
              Guide growth velocity, role specialisation, and position retrain trajectories
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {academySquad.map((yp) => (
              <div key={yp.id} className="rounded-xl border border-white/10 bg-[#091a24]/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-base font-black uppercase text-white">{yp.name}</div>
                    <div className="text-xs text-[#8ba5b3]">{yp.primaryPosition} · Age {yp.age}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#38f2c8]/20 text-[#38f2c8]">
                    {GROWTH_PROFILES[yp.growthProfile].label}
                  </span>
                </div>

                <div className="text-xs text-[#a4bcc8]">
                  {GROWTH_PROFILES[yp.growthProfile].summary}
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-num">
                  <span className="text-[#8ba5b3]">Peak Bracket:</span>
                  <span className="text-[#38f2c8] font-bold">
                    {GROWTH_PROFILES[yp.growthProfile].peakStartAge}–{GROWTH_PROFILES[yp.growthProfile].peakEndAge} yrs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
