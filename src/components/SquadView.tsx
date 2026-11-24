import React, { useMemo, useState } from 'react';
import {
  Star,
} from 'lucide-react';
import {
  positionToSector,
} from '../engine/ratings';
import {
  Mentality,
  Player,
  Sector,
  TacticalVision,
} from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { PlayerAvatar } from './PlayerAvatar';
import { CardTitle, HubCarousel } from './fc/HubCarousel';
import { TeamManagementScreen } from './landings/TeamManagementScreen';
import { idealStars } from './landings/squadMetrics';
import { CoachManagementScreen } from './landings/CoachManagementScreen';
import { SquadHubScreen } from './squad/SquadHubScreen';

type SquadSubTab = 'Hub' | 'TeamManagement' | 'SquadHub' | 'Coaches';
type MgmtSection = 'Squad' | 'Tactics' | 'Assignments';

const VISIONS: TacticalVision[] = [
  'Gegenpressing',
  'Tiki-Taka',
  'Wing Play',
  'Counter-Attack',
  'Park the Bus',
  'Standard',
];

const MENTALITIES: Mentality[] = [
  'Ultra Defensive',
  'Defensive',
  'Balanced',
  'Attacking',
  'Ultra Attacking',
];

const BUILD_UP_STYLES = ['Short Passing', 'Balanced', 'Direct Passing', 'Long Ball'] as const;


// ---------------------------------------------------------------------------
// Squad landing carousel — 1:1 with inputs/screenshots/image (11).png
// Ideal Quality · Team Management · Team Sheets · (peeking) Squad Hub
// ---------------------------------------------------------------------------
type LandingCardId = 'IdealQuality' | 'TeamManagement' | 'TeamSheets' | 'SquadHub';
const LANDING_CARDS: { id: LandingCardId; cta: string }[] = [
  { id: 'IdealQuality', cta: 'Enter Team Strategy' },
  { id: 'TeamManagement', cta: 'Enter Team Management' },
  { id: 'TeamSheets', cta: 'Enter Team Sheets' },
  { id: 'SquadHub', cta: 'Enter Squad Hub' },
];



/** Projects flat pitch coords (x 0..100 L→R, y 0..100 attack→goal) onto the perspective trapezoid. */
function projectPitch(x: number, y: number): [number, number] {
  const t = y / 100;
  const py = 12 + t * 216;
  const half = 152 + t * (209 - 152);
  return [230 + (x / 100 - 0.5) * 2 * half, py];
}

const pitchPath = (pts: [number, number][], close = false) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${projectPitch(x, y).map((n) => n.toFixed(1)).join(' ')}`).join(' ') +
  (close ? ' Z' : '');

const arcPoints = (cx: number, cy: number, r: number, from: number, to: number, aspect = 1): [number, number][] =>
  Array.from({ length: 25 }, (_, i) => {
    const a = from + ((to - from) * i) / 24;
    return [cx + r * Math.cos(a), cy + r * aspect * Math.sin(a)];
  });

const PerspectivePitch: React.FC<{ dots: { x: number; y: number }[] }> = ({ dots }) => (
  <svg viewBox="0 0 460 240" className="w-full h-auto" aria-hidden>
    <g fill="none" stroke="rgba(214,224,238,0.32)" strokeWidth="1.6" strokeLinejoin="round">
      <path d={pitchPath([[0, 0], [100, 0], [100, 100], [0, 100]], true)} />
      <path d={pitchPath([[0, 50], [100, 50]])} />
      <path d={pitchPath(arcPoints(50, 50, 13, 0, Math.PI * 2, 1.15), true)} />
      {/* Top (attacking) end */}
      <path d={pitchPath([[28, 0], [28, 15], [72, 15], [72, 0]])} />
      <path d={pitchPath([[40, 0], [40, 5.5], [60, 5.5], [60, 0]])} />
      <path d={pitchPath(arcPoints(50, 15, 9, 0, Math.PI, 0.55))} />
      {/* Bottom (own goal) end */}
      <path d={pitchPath([[28, 100], [28, 85], [72, 85], [72, 100]])} />
      <path d={pitchPath([[40, 100], [40, 94.5], [60, 94.5], [60, 100]])} />
      <path d={pitchPath(arcPoints(50, 85, 9, Math.PI, Math.PI * 2, 0.55))} />
    </g>
    {dots.map((d, i) => {
      const [cx, cy] = projectPitch(8 + d.x * 0.84, 6 + d.y * 0.88);
      return <circle key={i} cx={cx} cy={cy} r={8.5} fill="#c9d0d9" fillOpacity={0.86} />;
    })}
  </svg>
);

/** White pitch glyph from the Team Sheets card (lines are knocked out in the card colour). */
const TeamSheetGlyph: React.FC = () => (
  <svg viewBox="0 0 160 128" className="w-[clamp(96px,8.6vw,156px)] h-auto" aria-hidden>
    <rect x="0" y="0" width="160" height="128" rx="3" fill="#eceef1" />
    <g fill="none" stroke="#33445c" strokeWidth="9">
      <path d="M0 30 H30 V98 H0" />
      <path d="M160 30 H130 V98 H160" />
      <line x1="80" y1="0" x2="80" y2="128" />
      <circle cx="80" cy="64" r="20" />
    </g>
  </svg>
);

interface SquadLandingProps {
  clubName: string;
  squad: Player[];
  lineupDots: { x: number; y: number }[];
  focus: number;
  onFocus: (i: number) => void;
  onActivate: (i: number) => void;
}

const SquadLanding: React.FC<SquadLandingProps> = ({ clubName, squad, lineupDots, focus, onFocus, onActivate }) => {
  const departments = (['ATK', 'MID', 'DEF', 'GK'] as Sector[]).map((sector) => {
    const players = squad.filter((p) => positionToSector(p.primaryPosition) === sector);
    const ovr = players.length
      ? Math.round(players.reduce((sum, p) => sum + p.dynamicOvr.dynamicOvr, 0) / players.length)
      : 0;
    return {
      label: { ATK: 'Attack', MID: 'Midfield', DEF: 'Defence', GK: 'Goalkeeping' }[sector],
      players: players.length,
      ovr,
      stars: idealStars(players.length, ovr),
    };
  });

  const subCls = 'mt-[1.2vh] text-center font-bold text-[#8ff0cd] text-[clamp(12px,0.98vw,19px)]';

  const renderCard = (id: LandingCardId) => {
    switch (id) {
      case 'IdealQuality':
        return (
          <>
            <CardTitle>Ideal Quality</CardTitle>
            <div className="mt-[5.6vh] px-[7%]">
              {departments.map((d) => (
                <div key={d.label} className="flex items-center justify-between border-b border-white/20 py-[1.55vh]">
                  <div className="min-w-0">
                    <div className="text-white font-medium text-[clamp(16px,1.42vw,27px)] leading-tight">{d.label}</div>
                    <div className="text-[#aab5c4] text-[clamp(11px,1.05vw,20px)] leading-snug mt-0.5">
                      Players: {d.players}
                      <span className="mx-[0.45em] text-white/30">|</span>
                      OVR: {d.ovr}
                    </div>
                  </div>
                  <div className="flex items-center gap-[0.35vw] shrink-0">
                    <span className="font-light text-white tabular-nums text-[clamp(26px,2.25vw,44px)] leading-none">
                      {d.stars}
                    </span>
                    <Star className="w-[clamp(20px,1.85vw,36px)] h-[clamp(20px,1.85vw,36px)] fill-[#e6b64c] text-[#e6b64c] -mt-[0.6vh]" />
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case 'TeamManagement':
        return (
          <>
            <CardTitle>Team Management</CardTitle>
            <div className={`${subCls} uppercase`}>
              {clubName} <span className="normal-case">Default</span>
            </div>
            <div className="mt-[9.4vh] px-[3.5%]">
              <PerspectivePitch dots={lineupDots} />
            </div>
          </>
        );
      case 'TeamSheets':
        return (
          <>
            <CardTitle>Team Sheets</CardTitle>
            <div className={subCls}>Created Team Sheets: 1</div>
            <div className="mt-[9vh] flex justify-center">
              <TeamSheetGlyph />
            </div>
            <p className="mt-[6.6vh] mx-auto w-[78%] text-center text-[#cbd3de] text-[clamp(12px,1.05vw,20px)] leading-[1.52]">
              Use multiple team sheets to bring out the best in your squad. Switch between sheets to keep flexible
              against various opposition and give all your players a chance to play.
            </p>
          </>
        );
      case 'SquadHub':
        return (
          <>
            <CardTitle>Squad Hub</CardTitle>
            <div className={subCls}>Players: {squad.length}</div>
            <div className="mt-[6.5vh] px-[7%] space-y-[1.2vh]">
              {squad.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 border-b border-white/15 pb-[1.2vh]">
                  <PlayerAvatar player={p} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate text-[clamp(13px,1.1vw,21px)]">{p.knownAs}</div>
                    <div className="text-[#aab5c4] text-[clamp(11px,0.9vw,17px)]">{p.primaryPosition}</div>
                  </div>
                  <span className="font-light text-white tabular-nums text-[clamp(18px,1.6vw,30px)]">
                    {p.dynamicOvr.dynamicOvr}
                  </span>
                </div>
              ))}
            </div>
          </>
        );
    }
  };

  return (
    <HubCarousel
      cards={LANDING_CARDS.map((c) => ({ id: c.id, cta: c.cta, render: () => renderCard(c.id) }))}
      focus={focus}
      onFocus={onFocus}
      onActivate={onActivate}
    />
  );
};

export const SquadView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const swapSquadPlayers = useCareerStore((s) => s.swapSquadPlayers);
  const changeFormation = useCareerStore((s) => s.changeFormation);
  const updateClubTactics = useCareerStore((s) => s.updateClubTactics);
  const setCaptain = useCareerStore((s) => s.setCaptain);
  const setSetPieceTaker = useCareerStore((s) => s.setSetPieceTaker);
  const toggleCoachHire = useCareerStore((s) => s.toggleCoachHire);

  const [subTab, setSubTab] = useState<SquadSubTab>('Hub');
  const [mgmtSection, setMgmtSection] = useState<MgmtSection>('Squad');
  const [buildUpStyle, setBuildUpStyle] = useState<string>('Short Passing');
  const tacticCode = 'SYq8wc1YsaoP';

  const [hubFocus, setHubFocus] = useState(0);

  const clubData = useMemo(() => {
    if (!career) return null;
    const club = career.clubs[career.userClubId];
    const squad = Object.values(career.players)
      .filter((p) => p.clubId === club.id)
      .sort((a, b) => b.dynamicOvr.dynamicOvr - a.dynamicOvr.dynamicOvr);
    const lineupIds = new Set(club.lineup.map((s) => s.playerId).filter(Boolean) as number[]);
    const benchSet = new Set(club.benchIds);
    const reserves = squad.filter((p) => !lineupIds.has(p.id) && !benchSet.has(p.id));
    const clubMatches = career.standings.find((s) => s.clubId === club.id)?.played ?? 0;

    // Compute Sector Quality Stars
    const atkPlayers = squad.filter((p) => positionToSector(p.primaryPosition) === 'ATK');
    const midPlayers = squad.filter((p) => positionToSector(p.primaryPosition) === 'MID');
    const defPlayers = squad.filter((p) => positionToSector(p.primaryPosition) === 'DEF');
    const gkPlayers = squad.filter((p) => positionToSector(p.primaryPosition) === 'GK');

    const avgAtk = atkPlayers.length ? Math.round(atkPlayers.reduce((s, p) => s + p.baseOvr, 0) / atkPlayers.length) : 75;
    const avgMid = midPlayers.length ? Math.round(midPlayers.reduce((s, p) => s + p.baseOvr, 0) / midPlayers.length) : 75;
    const avgDef = defPlayers.length ? Math.round(defPlayers.reduce((s, p) => s + p.baseOvr, 0) / defPlayers.length) : 75;
    const avgGk = gkPlayers.length ? Math.round(gkPlayers.reduce((s, p) => s + p.baseOvr, 0) / gkPlayers.length) : 75;

    const starsAtk = (avgAtk / 20).toFixed(1);
    const starsMid = (avgMid / 20).toFixed(1);
    const starsDef = (avgDef / 20).toFixed(1);
    const starsGk = (avgGk / 20).toFixed(1);

    // Compute FC IQ Tactical Radar Metrics (0 to 100)
    const lineupPlayers = club.lineup
      .map((s) => (s.playerId ? career.players[s.playerId] : null))
      .filter(Boolean) as Player[];

    const radarAtk = Math.min(99, Math.max(40, avgAtk + (club.tacticalVision === 'Gegenpressing' ? 5 : 0)));
    const radarDef = Math.min(99, Math.max(40, avgDef + (club.tacticalVision === 'Park the Bus' ? 10 : 0)));
    const radarWid = club.formation.includes('4-3-3') || club.formation.includes('3-4-3') || club.formation.includes('4-2-3-1') ? 85 : 55;
    const radarEnd = Math.round(lineupPlayers.length ? lineupPlayers.reduce((s, p) => s + p.attributes.stamina, 0) / lineupPlayers.length : 78);
    const radarLen = club.tacticalVision === 'Counter-Attack' ? 84 : club.tacticalVision === 'Tiki-Taka' ? 40 : 62;
    const radarBld = club.tacticalVision === 'Gegenpressing' ? 88 : club.tacticalVision === 'Tiki-Taka' ? 68 : 55;

    const radarStats = [
      { key: 'ATK', label: 'Attacking Threat', value: radarAtk },
      { key: 'LEN', label: 'Direct Length', value: radarLen },
      { key: 'WID', label: 'Flank Width', value: radarWid },
      { key: 'DEF', label: 'Defensive Solidity', value: radarDef },
      { key: 'END', label: 'Endurance', value: radarEnd },
      { key: 'BLD', label: 'Build-Up Speed', value: radarBld },
    ];

    return {
      club,
      squad,
      reserves,
      clubMatches,
      starsAtk,
      starsMid,
      starsDef,
      starsGk,
      radarStats,
    };
  }, [career]);

  if (!career || !clubData) return null;
  const { club, squad, radarStats } = clubData;

  // Radar polygon calculation (Hexagon: 6 axes)
  const cx = 110;
  const cy = 110;
  const radius = 80;
  const radarPoints = radarStats
    .map((st, i) => {
      const angle = (i * 60 - 90) * (Math.PI / 180);
      const r = (st.value / 100) * radius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');

  const activateHubCard = (i: number) => {
    setHubFocus(i);
    const id = LANDING_CARDS[i].id;
    if (id === 'IdealQuality') setSubTab('Coaches');
    else if (id === 'TeamManagement') {
      setSubTab('TeamManagement');
      setMgmtSection('Squad');
    } else if (id === 'TeamSheets') {
      setSubTab('TeamManagement');
      setMgmtSection('Tactics');
    } else setSubTab('SquadHub');
  };

  if (subTab === 'Hub') {
    return (
      <SquadLanding
        clubName={club.name}
        squad={squad}
        lineupDots={club.lineup.map((s) => ({ x: s.x, y: s.y }))}
        focus={hubFocus}
        onFocus={setHubFocus}
        onActivate={activateHubCard}
      />
    );
  }

  if (subTab === 'Coaches') {
    return (
      <CoachManagementScreen
        career={career}
        club={club}
        squad={squad}
        onToggleCoach={toggleCoachHire}
        onBack={() => setSubTab('Hub')}
      />
    );
  }

  if (subTab === 'TeamManagement') {
    const tacticsSection = (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left 6 cols: Radar Chart & Tactical Analytics */}
              <div className="xl:col-span-6 fc-panel rounded-2xl p-6 border border-white/10 space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                    <span className="text-[#38f2c8]">TACTICAL ANALYSIS</span>
                    <span>6 CORE METRICS</span>
                  </div>
                  <h3 className="font-display text-2xl font-black uppercase text-white mt-1">
                    Team Tactical Profile
                  </h3>
                </div>

                {/* Authentic Hexagonal Spider / Radar Chart (SVG) */}
                <div className="flex justify-center items-center py-2">
                  <svg width="240" height="240" viewBox="0 0 220 220" className="overflow-visible">
                    {/* Concentric rings at 25%, 50%, 75%, 100% */}
                    {[0.25, 0.5, 0.75, 1.0].map((step) => {
                      const r = step * radius;
                      const ringPoints = [0, 1, 2, 3, 4, 5]
                        .map((i) => {
                          const angle = (i * 60 - 90) * (Math.PI / 180);
                          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                        })
                        .join(' ');
                      return (
                        <polygon
                          key={step}
                          points={ringPoints}
                          fill="none"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Radial axis lines */}
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const angle = (i * 60 - 90) * (Math.PI / 180);
                      const x2 = cx + radius * Math.cos(angle);
                      const y2 = cy + radius * Math.sin(angle);
                      return (
                        <line
                          key={i}
                          x1={cx}
                          y1={cy}
                          x2={x2}
                          y2={y2}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Glowing Tactical Profile Polygon */}
                    <polygon
                      points={radarPoints}
                      fill="#38f2c8"
                      fillOpacity="0.25"
                      stroke="#38f2c8"
                      strokeWidth="2.5"
                      className="filter drop-shadow-[0_0_8px_rgba(56,242,200,0.6)]"
                    />

                    {/* Vertex nodes */}
                    {radarStats.map((st, i) => {
                      const angle = (i * 60 - 90) * (Math.PI / 180);
                      const r = (st.value / 100) * radius;
                      const x = cx + r * Math.cos(angle);
                      const y = cy + r * Math.sin(angle);
                      return <circle key={st.key} cx={x} cy={y} r="3.5" fill="#38f2c8" stroke="#ffffff" strokeWidth="1.5" />;
                    })}

                    {/* Axis Labels */}
                    {radarStats.map((st, i) => {
                      const angle = (i * 60 - 90) * (Math.PI / 180);
                      const labelR = radius + 22;
                      const lx = cx + labelR * Math.cos(angle);
                      const ly = cy + labelR * Math.sin(angle);
                      return (
                        <text
                          key={st.key}
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="font-mono text-[10px] font-black fill-white uppercase"
                        >
                          {st.key}
                        </text>
                      );
                    })}
                  </svg>
                </div>

                {/* Metric Readouts */}
                <div className="grid grid-cols-3 gap-2.5">
                  {radarStats.map((st) => (
                    <div key={st.key} className="rounded-xl bg-white/5 border border-white/8 p-2.5 text-center">
                      <div className="text-[10px] text-[#8ba5b3] font-bold uppercase">{st.label}</div>
                      <div className="font-mono-num text-lg font-black text-[#38f2c8] mt-0.5">{st.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 6 cols: Tactical Vision, Build-Up Style, Line Height */}
              <div className="xl:col-span-6 fc-panel rounded-2xl p-6 border border-white/10 space-y-5">
                <div>
                  <h3 className="font-display text-2xl font-black uppercase text-white">
                    Tactical Parameters
                  </h3>
                  <p className="text-xs text-[#8ba5b3] mt-1">
                    Calibrate your tactical vision and in-game tactical instructions
                  </p>
                </div>

                {/* Tactical Vision Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#38f2c8]">
                    Tactical Vision
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {VISIONS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateClubTactics(v, club.mentality, club.defensiveLineHeight)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          club.tacticalVision === v
                            ? 'fc-panel-active border-[#38f2c8] shadow-[0_0_12px_rgba(56,242,200,0.3)]'
                            : 'border-white/10 bg-[#0a1822]/80 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="text-xs font-black uppercase text-white">{v}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Build-Up Style */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#38f2c8]">
                    Build-Up Passing Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUILD_UP_STYLES.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBuildUpStyle(b)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          buildUpStyle === b
                            ? 'fc-panel-active border-[#38f2c8]'
                            : 'border-white/10 bg-[#0a1822]/80 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="text-xs font-black uppercase text-white">{b}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Defensive Line Height Slider */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-black uppercase">
                    <span className="text-[#38f2c8]">Defensive Line Height</span>
                    <span className="font-mono-num text-white">{club.defensiveLineHeight} / 100</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    value={club.defensiveLineHeight}
                    onChange={(e) =>
                      updateClubTactics(club.tacticalVision, club.mentality, Number(e.target.value))
                    }
                    className="w-full accent-[#38f2c8]"
                  />
                  <div className="flex justify-between text-[10px] text-[#8ba5b3] font-bold uppercase">
                    <span>Deep Block (30)</span>
                    <span>Balanced (60)</span>
                    <span>High Press (90)</span>
                  </div>
                </div>
              </div>
            </div>
    );
    const assignmentsSection = (
            <div className="fc-panel rounded-2xl p-6 border border-white/10 space-y-6">
              <div>
                <h3 className="font-display text-2xl font-black uppercase text-white">
                  Matchday Assignments
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Designate leaders and set-piece specialists for free kicks, penalties, and corners
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Captain */}
                <div className="rounded-xl border border-white/10 bg-[#0a1822]/90 p-4 space-y-2.5">
                  <div className="text-xs font-black uppercase text-[#38f2c8]">Club Captain</div>
                  <select
                    value={club.captainId ?? ''}
                    onChange={(e) => setCaptain(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#08131b] px-3 py-2 text-xs font-bold text-white focus:border-[#38f2c8] focus:outline-none"
                  >
                    {club.lineup.map((s) =>
                      s.playerId && career.players[s.playerId] ? (
                        <option key={s.playerId} value={s.playerId}>
                          {career.players[s.playerId].knownAs} ({career.players[s.playerId].dynamicOvr.dynamicOvr} OVR)
                        </option>
                      ) : null
                    )}
                  </select>
                </div>

                {/* Penalties */}
                <div className="rounded-xl border border-white/10 bg-[#0a1822]/90 p-4 space-y-2.5">
                  <div className="text-xs font-black uppercase text-[#38f2c8]">Penalty Taker</div>
                  <select
                    value={club.penaltyTakerId ?? ''}
                    onChange={(e) => setSetPieceTaker('penalty', Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#08131b] px-3 py-2 text-xs font-bold text-white focus:border-[#38f2c8] focus:outline-none"
                  >
                    {club.lineup.map((s) =>
                      s.playerId && career.players[s.playerId] ? (
                        <option key={s.playerId} value={s.playerId}>
                          {career.players[s.playerId].knownAs} ({career.players[s.playerId].attributes.penalties} PEN)
                        </option>
                      ) : null
                    )}
                  </select>
                </div>

                {/* Free Kicks */}
                <div className="rounded-xl border border-white/10 bg-[#0a1822]/90 p-4 space-y-2.5">
                  <div className="text-xs font-black uppercase text-[#38f2c8]">Free Kick Specialist</div>
                  <select
                    value={club.freeKickTakerId ?? ''}
                    onChange={(e) => setSetPieceTaker('freekick', Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#08131b] px-3 py-2 text-xs font-bold text-white focus:border-[#38f2c8] focus:outline-none"
                  >
                    {club.lineup.map((s) =>
                      s.playerId && career.players[s.playerId] ? (
                        <option key={s.playerId} value={s.playerId}>
                          {career.players[s.playerId].knownAs} ({career.players[s.playerId].attributes.freekickaccuracy} FK)
                        </option>
                      ) : null
                    )}
                  </select>
                </div>

                {/* Corners */}
                <div className="rounded-xl border border-white/10 bg-[#0a1822]/90 p-4 space-y-2.5">
                  <div className="text-xs font-black uppercase text-[#38f2c8]">Corner Specialist</div>
                  <select
                    value={club.cornerTakerId ?? ''}
                    onChange={(e) => setSetPieceTaker('corner', Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#08131b] px-3 py-2 text-xs font-bold text-white focus:border-[#38f2c8] focus:outline-none"
                  >
                    {club.lineup.map((s) =>
                      s.playerId && career.players[s.playerId] ? (
                        <option key={s.playerId} value={s.playerId}>
                          {career.players[s.playerId].knownAs} ({career.players[s.playerId].attributes.crossing} CRO)
                        </option>
                      ) : null
                    )}
                  </select>
                </div>
              </div>
            </div>
    );
    return (
      <TeamManagementScreen
        career={career}
        club={club}
        squad={squad}
        section={mgmtSection}
        onSection={setMgmtSection}
        tacticCode={tacticCode}
        tacticsContent={tacticsSection}
        assignmentsContent={assignmentsSection}
        onSwap={swapSquadPlayers}
        onFormation={changeFormation}
        onBack={() => setSubTab('Hub')}
        onGoSquadHub={() => setSubTab('SquadHub')}
      />
    );
  }

  return (
    <SquadHubScreen
      career={career}
      squad={squad}
      onBack={() => setSubTab('Hub')}
      onTeamManagement={() => {
        setSubTab('TeamManagement');
        setMgmtSection('Squad');
      }}
    />
  );
};
