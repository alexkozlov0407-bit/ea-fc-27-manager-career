import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { positionToSector } from '../../engine/ratings';
import { CareerState, Player, ScoutInstruction } from '../../engine/types';
import {
  CardBody,
  CardSubtitle,
  CardTitle,
  FlagTile,
  HubCarousel,
  PlayerBust,
  PlayersFoundRing,
  StarRating,
  UnknownDiamond,
} from '../fc/HubCarousel';

/** Senior scouting network (mirrors the three scouts listed on the Scouts screen). */
export const SENIOR_SCOUTS = [
  { name: 'David Wilson', country: 'England', leagueId: 13, judgement: 4, experience: 4 },
  { name: 'Mateo Fernandez', country: 'Spain', leagueId: 53, judgement: 5, experience: 5 },
  { name: 'Julian Richter', country: 'Germany', leagueId: 19, judgement: 5, experience: 4 },
] as const;

export const SECTOR_COLORS = { GK: '#f0a030', DEF: '#f2d14a', MID: '#3ec46d', ATK: '#3d8ef0' } as const;

/** "O. Touré" style short name used on FC 27 list rows. */
export function shortName(p: Pick<Player, 'firstName' | 'lastName' | 'knownAs'>): string {
  if (p.firstName && p.lastName && p.knownAs.includes(' ')) return `${p.firstName[0]}. ${p.lastName}`;
  return p.knownAs;
}

export function matchesInstruction(p: Player, inst: ScoutInstruction, userClubId: number): boolean {
  return (
    p.clubId !== userClubId &&
    (inst.position === 'ANY' || p.primaryPosition === inst.position) &&
    p.age >= inst.minAge &&
    p.age <= inst.maxAge &&
    p.baseOvr >= inst.minOvr &&
    p.expectedTransferValue <= inst.maxValueM * 1_000_000
  );
}

interface Props {
  career: CareerState;
  focus: number;
  onFocus: (i: number) => void;
  onEnter: (target: 'Reports' | 'Scouts' | 'Search', instructionIdx?: number) => void;
}

export const ScoutingLanding: React.FC<Props> = ({ career, focus, onFocus, onEnter }) => {
  const [instIdx, setInstIdx] = useState(0);
  const [scoutIdx, setScoutIdx] = useState(0);
  const instructions = career.scoutInstructions;
  const inst = instructions[instIdx % Math.max(1, instructions.length)];
  const allPlayers = Object.values(career.players);

  const reportPlayers = inst
    ? allPlayers
        .filter((p) => matchesInstruction(p, inst, career.userClubId))
        .sort((a, b) => b.potential - a.potential)
        .slice(0, 3)
    : [];

  const scout = SENIOR_SCOUTS[scoutIdx % SENIOR_SCOUTS.length];
  const found = inst
    ? allPlayers.filter(
        (p) => matchesInstruction(p, inst, career.userClubId) && career.clubs[p.clubId]?.leagueId === scout.leagueId
      )
    : [];
  const bySector = (['GK', 'DEF', 'MID', 'ATK'] as const).map((sec) => ({
    value: found.filter((p) => positionToSector(p.primaryPosition) === sec).length,
    color: SECTOR_COLORS[sec],
  }));

  const instLabel = inst
    ? `${inst.position === 'ANY' ? 'Any Position' : inst.position} | ${inst.name}`
    : 'No Instruction';

  const cards = [
    {
      id: 'report',
      cta: 'Enter Scout Report',
      secondary: { label: 'View Instruction', onAction: () => onEnter('Reports', instIdx) },
      pager: {
        count: instructions.length,
        index: instIdx,
        onCycle: () => setInstIdx((i) => (i + 1) % Math.max(1, instructions.length)),
      },
      render: () => (
        <>
          <CardTitle>Scout Report</CardTitle>
          <CardSubtitle>{instLabel}</CardSubtitle>
          <div className="mt-[1.6vh] px-[10%]">
            {reportPlayers.length === 0 && (
              <CardBody className="mt-[8vh]">No players currently match this instruction.</CardBody>
            )}
            {reportPlayers.map((p) => {
              const rep = career.scoutReports[p.id];
              return (
                <div key={p.id} className="flex items-end gap-[1.6vw] border-b border-white/20 h-[13vh]">
                  <PlayerBust src={p.headshotUrl} alt={p.knownAs} />
                  <div className="flex-1 min-w-0 self-center pt-[1vh]">
                    <div className="text-white font-medium truncate text-[clamp(14px,1.18vw,22px)]">{shortName(p)}</div>
                    <div className="text-[#aab5c4] text-[clamp(11px,1vw,19px)]">
                      {p.primaryPosition}
                      <span className="mx-[0.3em] text-white/30">|</span>
                      {p.age}
                    </div>
                  </div>
                  <div className="self-center">
                    {rep?.stage === 4 ? (
                      <span className="font-light text-white text-[clamp(22px,1.9vw,36px)]">{p.baseOvr}</span>
                    ) : (
                      <UnknownDiamond />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ),
    },
    {
      id: 'scouts',
      cta: 'Enter Scouts',
      pager: { count: SENIOR_SCOUTS.length, index: scoutIdx, onCycle: () => setScoutIdx((i) => (i + 1) % SENIOR_SCOUTS.length) },
      render: () => (
        <>
          <CardTitle>Scouts</CardTitle>
          <CardSubtitle>Scouting</CardSubtitle>
          <div className="mt-[3.6vh] text-center text-white font-medium text-[clamp(16px,1.4vw,27px)]">{scout.name}</div>
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
              <div className="text-white font-semibold text-[clamp(12px,1.08vw,20px)]">Area Scouted</div>
              <div className="mt-[3.4vh]"><FlagTile country={scout.country} /></div>
              <div className="mt-[2.6vh] text-white text-[clamp(12px,1.08vw,20px)]">{scout.country}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-white font-semibold text-[clamp(12px,1.08vw,20px)]">Players Found</div>
              <div className="mt-[2.4vh]"><PlayersFoundRing segments={bySector} label={String(found.length)} /></div>
              <div className="mt-[1.8vh] flex items-center gap-[0.6vw] text-white/90 text-[clamp(10px,0.92vw,17px)]">
                {(['GK', 'DEF', 'MID', 'ATK'] as const).map((s) => (
                  <span key={s} className="flex items-center gap-[0.2vw]">
                    <span className="w-[5px] h-[5px] rounded-full" style={{ background: SECTOR_COLORS[s] }} />
                    {s === 'ATK' ? 'ATT' : s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'search',
      cta: 'Enter Search Players',
      render: () => (
        <>
          <CardTitle>Search Players</CardTitle>
          <div className="mt-[11.5vh] flex justify-center">
            <Search
              className="w-[clamp(84px,8.2vw,150px)] h-[clamp(84px,8.2vw,150px)] text-[#dcdfe4]"
              strokeWidth={2.6}
            />
          </div>
          <CardBody className="mt-[5.6vh] text-[#b9c2cf]">Search for a specific player you want to buy, loan or scout.</CardBody>
        </>
      ),
    },
  ];

  return (
    <HubCarousel
      cards={cards}
      focus={focus}
      onFocus={onFocus}
      onActivate={(i) => onEnter((['Reports', 'Scouts', 'Search'] as const)[i], i === 0 ? instIdx : undefined)}
    />
  );
};
