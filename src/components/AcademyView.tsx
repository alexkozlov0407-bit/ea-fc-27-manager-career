import React, { useState } from 'react';
import { Award, Compass, GraduationCap, Shield, Trophy, UserPlus, X } from 'lucide-react';
import { GROWTH_PROFILES } from '../engine/growth';
import { ALL_POSITIONS, formatMoney } from '../engine/ratings';
import { Position } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { positionColorClass } from './PlayerAvatar';

const SCOUT_COUNTRIES = ['Spain', 'Brazil', 'Argentina', 'France', 'Portugal', 'England'];

export const AcademyView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const hireYouthScout = useCareerStore((s) => s.hireYouthScout);
  const sendYouthScoutMission = useCareerStore((s) => s.sendYouthScoutMission);
  const signYouthProspect = useCareerStore((s) => s.signYouthProspect);
  const rejectYouthProspect = useCareerStore((s) => s.rejectYouthProspect);
  const promoteYouthProspect = useCareerStore((s) => s.promoteYouthProspect);
  const playYouthRushTournament = useCareerStore((s) => s.playYouthRushTournament);

  const [subTab, setSubTab] = useState<'Squad' | 'Scouts' | 'Reports'>('Squad');
  const [missionScoutId, setMissionScoutId] = useState<string | null>(null);
  const [missionCountry, setMissionCountry] = useState('Spain');
  const [missionPos, setMissionPos] = useState<Position | 'ANY'>('ANY');
  const [missionMonths, setMissionMonths] = useState(3);
  const [rushResult, setRushResult] = useState<{ won: boolean; score: string; mvpName: string } | null>(null);

  if (!career) return null;

  const academySquad = career.youthProspects.filter((p) => p.inAcademy);
  const scoutedReports = career.youthProspects.filter((p) => !p.inAcademy);

  return (
    <div className="mx-auto max-w-[1520px] px-4 lg:px-6 py-4 space-y-4">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            Youth Academy
          </h2>
          <div className="h-5 w-px bg-white/15" />
          {(
            [
              ['Squad', `Youth Squad (${academySquad.length}/16)`],
              ['Scouts', `Youth Scouts (${career.youthScouts.filter((s) => s.hired).length}/3)`],
              ['Reports', `Scout Reports (${scoutedReports.length})`],
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

        <button
          type="button"
          onClick={() => setRushResult(playYouthRushTournament())}
          disabled={academySquad.length === 0}
          className="fc-btn-primary rounded px-4 py-2 text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
        >
          <Trophy className="w-3.5 h-3.5" />
          Play Youth Rush 5v5 Tournament
        </button>
      </div>

      {rushResult && (
        <div className="fc-panel-active rounded-lg px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#b8fff0]" />
            <span>
              <strong>Youth Rush 5v5 Final:</strong> {rushResult.won ? 'WIN' : 'LOSS'} ({rushResult.score}) · MVP:{' '}
              <strong>{rushResult.mvpName}</strong> — Academy prospects sharpened their potential ranges!
            </span>
          </div>
          <button type="button" onClick={() => setRushResult(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUB-TAB 1: YOUTH SQUAD */}
      {subTab === 'Squad' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {academySquad.length === 0 ? (
            <div className="col-span-full fc-panel rounded-lg p-10 text-center text-sm text-[#8ba5b3]">
              Your Youth Academy has no signed prospects yet. Check Scout Reports or dispatch a Youth Scout.
            </div>
          ) : (
            academySquad.map((yp) => (
              <div key={yp.id} className="fc-panel rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold ${positionColorClass(yp.primaryPosition)}`}>
                        {yp.primaryPosition}
                      </span>
                      <span className="text-xs text-[#8ba5b3]">{yp.nationality}</span>
                      {yp.unsettled && (
                        <span className="text-[10px] font-bold uppercase text-amber-300">Unsettled</span>
                      )}
                    </div>
                    <h3 className="font-display text-2xl font-extrabold uppercase text-white leading-tight">
                      {yp.name}
                    </h3>
                    <div className="text-xs text-[#9bb4c2] font-mono-num">
                      Age {yp.age} · {yp.heightCm} cm · {GROWTH_PROFILES[yp.growthProfile].label}
                    </div>
                  </div>
                  <div className="text-right font-mono-num">
                    <div className="text-[10px] uppercase text-[#8ba5b3]">OVR / POT Range</div>
                    <div className="text-sm font-extrabold text-white">
                      {yp.ovrRange[0]}–{yp.ovrRange[1]}{' '}
                      <span className="text-[#38f2c8]">/ {yp.potRange[0]}–{yp.potRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Ranged 6 stats matching FC 27 Youth Prospect screenshot */}
                <div className="grid grid-cols-3 gap-2 rounded border border-white/10 bg-[#0a1822]/80 p-2.5 text-[11px] font-mono-num">
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
                    <div key={k} className="flex justify-between">
                      <span className="text-[#8ba5b3]">{k}</span>
                      <span className="font-bold text-white">
                        {lo}-{hi}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={yp.age < 16}
                    onClick={() => promoteYouthProspect(yp.id)}
                    className="fc-btn-primary flex-1 rounded py-2 text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    {yp.age < 16 ? 'Promote at Age 16' : 'Promote to Senior'}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectYouthProspect(yp.id)}
                    className="fc-btn-secondary rounded px-3 py-2 text-xs font-bold text-rose-300"
                  >
                    Release
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-TAB 2: YOUTH SCOUT NETWORK (3-column matching screenshot) */}
      {subTab === 'Scouts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {career.youthScouts.map((scout) => (
            <div key={scout.id} className="fc-panel rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-[#38f2c8] font-bold">
                      {scout.hired ? 'Active Youth Scout' : 'Available to Hire'}
                    </div>
                    <h3 className="font-display text-2xl font-extrabold uppercase text-white">
                      {scout.name}
                    </h3>
                    <div className="text-xs text-[#9bb4c2]">{scout.nationality}</div>
                  </div>
                  <Compass className="w-7 h-7 text-[#38f2c8]/70" />
                </div>

                <div className="space-y-1.5 text-xs border-y border-white/10 py-3">
                  <div className="flex justify-between">
                    <span className="text-[#8ba5b3]">Experience</span>
                    <span className="text-amber-300">{'★'.repeat(scout.experience)}{'☆'.repeat(5 - scout.experience)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8ba5b3]">Judgement</span>
                    <span className="text-amber-300">{'★'.repeat(scout.judgement)}{'☆'.repeat(5 - scout.judgement)}</span>
                  </div>
                  {!scout.hired && (
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Hire Fee</span>
                      <span className="font-mono-num font-bold text-[#b8fff0]">
                        {formatMoney(scout.costEur, career.settings.currency)}
                      </span>
                    </div>
                  )}
                </div>

                {scout.mission ? (
                  <div className="rounded border border-[#38f2c8]/30 bg-[#102d2f]/60 p-3 text-xs space-y-1">
                    <div className="font-bold text-[#b8fff0] uppercase">Active Scouting Mission</div>
                    <div>Location: <strong>{scout.mission.country}</strong></div>
                    <div>Target Position: <strong>{scout.mission.targetPosition}</strong></div>
                    <div>Report Ready in: <strong className="font-mono-num">{scout.mission.daysRemaining} days</strong></div>
                  </div>
                ) : scout.hired ? (
                  <div className="text-xs text-[#8ba5b3]">
                    Scout is idle at the club. Assign a country &amp; target position mission below.
                  </div>
                ) : null}
              </div>

              {!scout.hired ? (
                <button
                  type="button"
                  onClick={() => hireYouthScout(scout.id)}
                  className="fc-btn-primary w-full rounded py-2.5 text-xs uppercase tracking-wider"
                >
                  Hire Youth Scout ({formatMoney(scout.costEur, career.settings.currency)})
                </button>
              ) : !scout.mission ? (
                missionScoutId === scout.id ? (
                  <div className="space-y-2.5 rounded border border-white/15 bg-[#0a1822] p-3 text-xs">
                    <select
                      value={missionCountry}
                      onChange={(e) => setMissionCountry(e.target.value)}
                      className="w-full rounded border border-white/15 bg-[#071117] px-2.5 py-1.5 text-white"
                    >
                      {SCOUT_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      value={missionPos}
                      onChange={(e) => setMissionPos(e.target.value as Position | 'ANY')}
                      className="w-full rounded border border-white/15 bg-[#071117] px-2.5 py-1.5 text-white"
                    >
                      <option value="ANY">Any Position</option>
                      {ALL_POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          Target: {p}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      {[1, 3, 6].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMissionMonths(m)}
                          className={`flex-1 rounded py-1 font-bold ${
                            missionMonths === m ? 'bg-white text-[#071117]' : 'bg-white/10 text-white'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sendYouthScoutMission(scout.id, missionCountry, missionPos, missionMonths);
                          setMissionScoutId(null);
                        }}
                        className="fc-btn-primary flex-1 rounded py-2 text-xs uppercase"
                      >
                        Dispatch ({formatMoney(missionMonths * 110_000, career.settings.currency)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMissionScoutId(null)}
                        className="fc-btn-secondary rounded px-3 py-2 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMissionScoutId(scout.id)}
                    className="fc-btn-primary w-full rounded py-2.5 text-xs uppercase tracking-wider"
                  >
                    Set Up Scouting Network
                  </button>
                )
              ) : (
                <div className="text-center text-xs font-bold uppercase text-[#38f2c8] py-2">
                  On Assignment ({scout.mission.daysRemaining}d left)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: INCOMING SCOUT REPORTS (Sign / Reject Prospects) */}
      {subTab === 'Reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scoutedReports.length === 0 ? (
            <div className="col-span-full fc-panel rounded-lg p-10 text-center text-sm text-[#8ba5b3]">
              No pending Youth Scout reports. Dispatch a Youth Scout and advance the calendar to discover new wonderkids.
            </div>
          ) : (
            scoutedReports.map((yp) => (
              <div key={yp.id} className="fc-panel rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xs font-extrabold ${positionColorClass(yp.primaryPosition)}`}>
                      {yp.primaryPosition} · {yp.nationality}
                    </div>
                    <h4 className="font-display text-2xl font-extrabold uppercase text-white">{yp.name}</h4>
                    <div className="text-xs text-[#8ba5b3]">
                      Age {yp.age} · {yp.heightCm} cm · {yp.preferredFoot} Foot
                    </div>
                  </div>
                  <Shield className="w-7 h-7 text-[#38f2c8]/60" />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded border border-white/10 bg-[#0a1822]/80 p-2.5 text-xs font-mono-num">
                  <div>
                    <div className="text-[10px] text-[#8ba5b3] uppercase">Est. OVR</div>
                    <div className="font-extrabold text-white">
                      {yp.ovrRange[0]}–{yp.ovrRange[1]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#8ba5b3] uppercase">Est. Potential</div>
                    <div className="font-extrabold text-[#38f2c8]">
                      {yp.potRange[0]}–{yp.potRange[1]}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => signYouthProspect(yp.id)}
                    className="fc-btn-primary flex-1 rounded py-2 text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Sign to Academy
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectYouthProspect(yp.id)}
                    className="fc-btn-secondary rounded px-3 py-2 text-xs font-bold text-rose-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
