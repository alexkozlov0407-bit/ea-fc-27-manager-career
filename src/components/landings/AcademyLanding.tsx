import React from 'react';
import { GROWTH_PROFILES } from '../../engine/growth';
import { positionToSector } from '../../engine/ratings';
import { CareerState, YouthProspect } from '../../engine/types';
import {
  AcademyShieldIcon,
  CardBody,
  CardSubtitle,
  CardTitle,
  FlagTile,
  HubCarousel,
  PlayerBust,
  PlayersFoundRing,
  StarRating,
} from '../fc/HubCarousel';
import { SECTOR_COLORS } from './ScoutingLanding';

export type AcademyTarget = 'Squad' | 'Scouts' | 'Development';

const shortProspectName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : name;
};

/** Scouted (visible) OVR: midpoint of the revealed range. */
const visibleOvr = (p: YouthProspect) => Math.round((p.ovrRange[0] + p.ovrRange[1]) / 2);

/**
 * Next development milestone for the Development Plan card: the next OVR point and an ETA
 * derived from the prospect's growth-profile early rate (faster profiles reach it sooner).
 */
function nextMilestone(p: YouthProspect) {
  const curve = GROWTH_PROFILES[p.growthProfile];
  const weeks = Math.max(3, Math.round(8 / Math.max(0.4, curve.earlyRate)) + Math.max(0, p.age - 16));
  return { target: Math.min(p.potRange[1], visibleOvr(p) + 1), weeks, progress: Math.max(0.15, Math.min(0.9, 1 - weeks / 16)) };
}

interface Props {
  career: CareerState;
  focus: number;
  onFocus: (i: number) => void;
  onEnter: (target: AcademyTarget) => void;
}

export const AcademyLanding: React.FC<Props> = ({ career, focus, onFocus, onEnter }) => {
  const academy = career.youthProspects.filter((p) => p.inAcademy);
  const reports = career.youthProspects.filter((p) => !p.inAcademy);
  const topPotential = [...academy].sort((a, b) => b.potRange[1] - a.potRange[1]).slice(0, 3);

  const scoutIndex = Math.max(0, career.youthScouts.findIndex((s) => s.hired));
  const scout = career.youthScouts[scoutIndex];
  const scoutStatus = !scout?.hired
    ? 'No Scouts Hired'
    : scout.mission
    ? `Scout ${scoutIndex + 1} setting up the network`
    : 'Available';
  const foundSegments = (['GK', 'DEF', 'MID', 'ATK'] as const).map((sec) => ({
    value: reports.filter((p) => positionToSector(p.primaryPosition) === sec).length,
    color: SECTOR_COLORS[sec],
  }));

  const rowCls = 'flex items-end gap-[1.6vw] border-b border-white/20 h-[12.6vh]';
  const nameCls = 'text-white font-medium truncate text-[clamp(14px,1.18vw,22px)]';
  const metaCls = 'text-[#aab5c4] text-[clamp(11px,1.05vw,20px)]';

  const cards = [
    {
      id: 'youth-squad',
      cta: 'Enter Youth Squad',
      render: () =>
        academy.length === 0 ? (
          <>
            <CardTitle>Youth Squad</CardTitle>
            <CardSubtitle>No Youth Players</CardSubtitle>
            <div className="mt-[6.4vh] flex justify-center"><AcademyShieldIcon /></div>
            <CardBody className="mt-[5vh]">
              There are no youth players in the Academy, currently. Go to Youth Scouting to start recruiting.
            </CardBody>
          </>
        ) : (
          <>
            <CardTitle>Youth Squad</CardTitle>
            <CardSubtitle>Highest Potential</CardSubtitle>
            <div className="mt-[1.4vh] px-[10%]">
              {topPotential.map((p) => (
                <div key={p.id} className={rowCls}>
                  <PlayerBust alt={p.name} />
                  <div className="flex-1 min-w-0 self-center pt-[1vh]">
                    <div className={nameCls}>{shortProspectName(p.name)}</div>
                    <div className={metaCls}>
                      {p.primaryPosition}
                      <span className="mx-[0.3em] text-white/30">|</span>
                      Pot: <span className="text-[#4a8fe8]">{p.potRange[0]}-{p.potRange[1]}</span>
                    </div>
                  </div>
                  <span className="self-center font-light text-white tabular-nums text-[clamp(22px,1.9vw,36px)]">
                    {visibleOvr(p)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ),
    },
    {
      id: 'youth-scouts',
      cta: 'Enter Youth Staff',
      secondary: { label: 'Set up Scout Network', onAction: () => onEnter('Scouts') },
      render: () => (
        <>
          <CardTitle>Youth Scouts</CardTitle>
          <CardSubtitle>{scoutStatus}</CardSubtitle>
          {scout && (
            <>
              <div className="mt-[3.4vh] text-center text-white font-medium text-[clamp(16px,1.4vw,27px)]">{scout.name}</div>
              <div className="mt-[1.6vh] grid grid-cols-2 px-[8%] text-center">
                <div>
                  <div className="text-[#aab5c4] text-[clamp(12px,1.08vw,20px)]">Judgement</div>
                  <div className="mt-[0.6vh]"><StarRating value={scout.judgement} /></div>
                </div>
                <div>
                  <div className="text-[#aab5c4] text-[clamp(12px,1.08vw,20px)]">Experience</div>
                  <div className="mt-[0.6vh]"><StarRating value={scout.experience} /></div>
                </div>
              </div>
              <div className="mt-[4.4vh] grid grid-cols-2 px-[8%] text-center items-start">
                <div className="flex flex-col items-center">
                  <div className="text-white font-semibold text-[clamp(12px,1.08vw,20px)]">
                    {scout.mission ? 'Area Scouted' : 'Scouting'}
                  </div>
                  {scout.mission ? (
                    <>
                      <div className="mt-[3.4vh]"><FlagTile country={scout.mission.country} /></div>
                      <div className="mt-[2.6vh] text-white text-[clamp(12px,1.08vw,20px)]">{scout.mission.country}</div>
                    </>
                  ) : (
                    <>
                      <div className="mt-[4.6vh] font-light text-[#c6ccd6] text-[clamp(30px,2.6vw,50px)] leading-none tracking-wider">
                        N/A
                      </div>
                      <div className="mt-[4.6vh] text-[#aab5c4] font-semibold text-[clamp(11px,1vw,19px)]">No scouting criteria</div>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-white font-semibold text-[clamp(12px,1.08vw,20px)]">Players Found</div>
                  <div className="mt-[2.6vh]">
                    <PlayersFoundRing segments={foundSegments} label={String(reports.length)} />
                  </div>
                  <div className="mt-[2.2vh] text-[#aab5c4] font-semibold text-[clamp(11px,1vw,19px)]">
                    {reports.length === 0 ? 'No Players Found' : `${reports.length} awaiting decision`}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ),
    },
    {
      id: 'youth-dev',
      cta: 'Enter Youth Development Plan',
      secondary: { label: 'Youth Staff', onAction: () => onEnter('Scouts') },
      render: () =>
        academy.length === 0 ? (
          <>
            <CardTitle>Youth Development Plan</CardTitle>
            <CardSubtitle>No youth players</CardSubtitle>
            <div className="mt-[6.4vh] flex justify-center"><AcademyShieldIcon /></div>
            <CardBody className="mt-[5vh]">
              Sign contracts with youth players and come back to set their development plans.
            </CardBody>
          </>
        ) : (
          <>
            <CardTitle>Youth Development Plan</CardTitle>
            <div className="mt-[1.4vh] px-[8%] pt-[2.4vh]">
              {academy.slice(0, 3).map((p) => {
                const m = nextMilestone(p);
                return (
                  <div key={p.id} className={rowCls}>
                    <PlayerBust alt={p.name} />
                    <div className="flex-1 min-w-0 self-center pt-[1vh]">
                      <div className={nameCls}>{shortProspectName(p.name)}</div>
                      <div className={metaCls}>Growing to {m.target}</div>
                      <div className="mt-[1vh] h-[5px] w-[72%] rounded-full bg-white/25 overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${m.progress * 100}%` }} />
                      </div>
                    </div>
                    <div className="self-center text-right">
                      <div className="text-[#aab5c4] text-[clamp(10px,0.92vw,17px)]">ETA</div>
                      <div className="text-white font-medium text-[clamp(16px,1.35vw,26px)]">{m.weeks} w</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ),
    },
  ];

  return (
    <HubCarousel
      cards={cards}
      focus={focus}
      onFocus={onFocus}
      onActivate={(i) => onEnter((['Squad', 'Scouts', 'Development'] as const)[i])}
    />
  );
};
