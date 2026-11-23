import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BatteryCharging,
  Check,
  ChevronRight,
  Copy,
  Layers,
  Maximize2,
  Share2,
  Shield,
  Sliders,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { GROWTH_PROFILES } from '../engine/growth';
import {
  ALL_POSITIONS,
  FORMATIONS,
  formatMoney,
  positionToSector,
  TARGET_MINUTE_SHARE,
} from '../engine/ratings';
import {
  EnergyRecoveryPolicy,
  FormationId,
  Mentality,
  Player,
  Position,
  Sector,
  TacticalVision,
} from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { OvrDiamond, PlayerAvatar, positionColorClass } from './PlayerAvatar';

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

// FC IQ Role Pros and Cons mapping
const ROLE_PROS_CONS: Record<string, { pros: string[]; cons: string[] }> = {
  'Inside Forward': {
    pros: ['Cuts inside onto stronger foot to attack the box', 'Direct attacking runs beyond defensive line'],
    cons: ['Leaves wide flank exposed during transition', 'Demands high agility and shooting composure'],
  },
  'Deep-Lying Playmaker': {
    pros: ['Dictates passing tempo from deep midfield pivot', 'Exceptional vision and diagonal distribution'],
    cons: ['Slower recovery against aggressive fast breaks', 'Minimal goalscoring presence inside 18-yard box'],
  },
  'Inverted Wingback': {
    pros: ['Tucks into central midfield With Ball for overloads', 'Protects against central counter-attacks'],
    cons: ['Leaves wide flanks susceptible to overlap crosses', 'High stamina and tactical awareness required'],
  },
  'Box Crasher': {
    pros: ['Aggressive late surges into 18-yard box', 'Aerial and second-ball poacher threat'],
    cons: ['Elevated match stamina consumption', 'Can leave defensive midfield pocket exposed'],
  },
  'Ball-Playing Keeper': {
    pros: ['Sweeper-keeper positioning off the goal-line', 'Initiates quick build-up under high press'],
    cons: ['Vulnerable to speculative long-range chips', 'Requires high composure and passing accuracy'],
  },
  'Poacher': {
    pros: ['Clinical finishing on the shoulder of last defender', 'Pure focus on converting box chances'],
    cons: ['Zero contribution to deeper build-up play', 'Easily isolated if midfield is pinned back'],
  },
  'Target Forward': {
    pros: ['Aerial dominance and hold-up outlet for teammates', 'Brings wingers and attacking midfielders into play'],
    cons: ['Lower mobility against pacey centre-backs', 'Less effective in rapid counter-attack transitions'],
  },
  'Half Winger': {
    pros: ['Operates between central midfield and wide flank', 'Generates creative overloads in half-spaces'],
    cons: ['High tactical stamina demand across 90 mins', 'Defensive coverage requires coordinated fullback'],
  },
};

export const SquadView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const swapSquadPlayers = useCareerStore((s) => s.swapSquadPlayers);
  const changeFormation = useCareerStore((s) => s.changeFormation);
  const updateClubTactics = useCareerStore((s) => s.updateClubTactics);
  const setCaptain = useCareerStore((s) => s.setCaptain);
  const setSetPieceTaker = useCareerStore((s) => s.setSetPieceTaker);
  const updateDevelopmentPlan = useCareerStore((s) => s.updateDevelopmentPlan);
  const toggleTransferList = useCareerStore((s) => s.toggleTransferList);
  const toggleLoanList = useCareerStore((s) => s.toggleLoanList);
  const toggleCoachHire = useCareerStore((s) => s.toggleCoachHire);
  const startNegotiation = useCareerStore((s) => s.startNegotiation);
  const updateSettings = useCareerStore((s) => s.updateSettings);

  const [subTab, setSubTab] = useState<SquadSubTab>('Hub');
  const [mgmtSection, setMgmtSection] = useState<MgmtSection>('Squad');
  const [pitchPhase, setPitchPhase] = useState<'WITHOUT_BALL' | 'WITH_BALL'>('WITHOUT_BALL');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [swapSourceId, setSwapSourceId] = useState<number | null>(null);
  const [dragPlayerId, setDragPlayerId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<'DynamicOVR' | 'Attributes' | 'Development' | 'Actions'>('DynamicOVR');
  const [retrainPos, setRetrainPos] = useState<Position>('CM');
  const [buildUpStyle, setBuildUpStyle] = useState<string>('Short Passing');
  const [tacticCode, setTacticCode] = useState<string>('SYq8wc1YsaoP');
  const [codeCopied, setCodeCopied] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState('');

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
  const { club, squad, reserves, clubMatches, starsAtk, starsMid, starsDef, starsGk, radarStats } = clubData;

  const activePlayer: Player | undefined =
    (selectedPlayerId ? career.players[selectedPlayerId] : undefined) ??
    (club.lineup[10]?.playerId ? career.players[club.lineup[10].playerId] : squad[0]);

  const handlePlayerClick = (playerId: number) => {
    setSelectedPlayerId(playerId);
    if (swapSourceId !== null) {
      if (swapSourceId !== playerId) {
        swapSquadPlayers(swapSourceId, playerId);
      }
      setSwapSourceId(null);
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(tacticCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleImport = () => {
    if (!importInput.trim()) return;
    setTacticCode(importInput.trim().toUpperCase());
    setShowImportModal(false);
    setImportInput('');
  };

  const renderFitnessColor = (fit: number) =>
    fit >= 78 ? 'bg-[#38f2c8]' : fit >= 58 ? 'bg-amber-400' : 'bg-rose-500';

  const formatDelta = (val: number) => (val > 0 ? `+${val}` : `${val}`);

  const deltaColor = (val: number) =>
    val > 0 ? 'text-[#38f2c8]' : val < 0 ? 'text-rose-400' : 'text-[#8ba5b3]';

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

  const currentRoleNotes = activePlayer
    ? ROLE_PROS_CONS[activePlayer.roleTitle] || {
        pros: ['Maintains tactical positional discipline', 'Supports structured phase transitions'],
        cons: ['Restricted roaming movement', 'Performance tied to team match fitness'],
      }
    : null;

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-8 py-5 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-none">
            Squad
          </h1>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-1 bg-[#07131a] p-1 rounded-xl border border-white/10">
            {(
              [
                ['Hub', 'Overview Hub'],
                ['TeamManagement', 'Team Management & FC IQ'],
                ['SquadHub', 'Squad Hub & Growth'],
                ['Coaches', 'Coaching Staff & Energy'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSubTab(key)}
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

        <div className="flex items-center gap-3 text-xs text-[#8ba5b3]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#38f2c8]" />
            <span>Energy Recovery:</span>
            <strong className="text-[#38f2c8] uppercase">{career.settings.energyRecovery}</strong>
          </span>
          <span className="text-white/30">·</span>
          <span>
            Formation: <strong className="text-white">{club.formation}</strong>
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: AUTHENTIC FC 27 SQUAD 3-TILE HUB (image_bf4c7fee.png)      */}
      {/* =================================================================== */}
      {subTab === 'Hub' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tile 1: IDEAL QUALITY */}
            <div
              onClick={() => {
                setSubTab('TeamManagement');
                setMgmtSection('Tactics');
              }}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[380px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">SQUAD ASSESSMENT</span>
                  <span>STAR RATINGS</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Ideal Quality
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Department balance across attack, midfield, defence and goalkeeping
                </p>

                {/* Star Ratings Grid */}
                <div className="mt-6 space-y-3.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#07141d]/70 border border-white/8">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Attack</span>
                    <span className="text-amber-300 font-mono-num font-black text-sm flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-300" /> {starsAtk} / 5.0
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#07141d]/70 border border-white/8">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Midfield</span>
                    <span className="text-amber-300 font-mono-num font-black text-sm flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-300" /> {starsMid} / 5.0
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#07141d]/70 border border-white/8">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Defence</span>
                    <span className="text-amber-300 font-mono-num font-black text-sm flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-300" /> {starsDef} / 5.0
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#07141d]/70 border border-white/8">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Goalkeeping</span>
                    <span className="text-amber-300 font-mono-num font-black text-sm flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-300" /> {starsGk} / 5.0
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Enter Team Strategy</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>

            {/* Tile 2: TEAM MANAGEMENT */}
            <div
              onClick={() => {
                setSubTab('TeamManagement');
                setMgmtSection('Squad');
              }}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[380px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">TACTICAL SYSTEM</span>
                  <span className="font-mono-num text-white">{club.formation}</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Team Management
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  {club.tacticalVision} · Line Height {club.defensiveLineHeight} · {club.mentality}
                </p>

                {/* Mini Pitch Preview */}
                <div className="mt-5 rounded-xl fc-pitch-surface h-36 relative overflow-hidden border border-white/10">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-30">
                    <rect x="3" y="3" width="94" height="94" fill="none" stroke="#c8f7dc" strokeWidth="0.5" />
                    <line x1="3" y1="50" x2="97" y2="50" stroke="#c8f7dc" strokeWidth="0.5" />
                    <circle cx="50" cy="50" r="12" fill="none" stroke="#c8f7dc" strokeWidth="0.5" />
                  </svg>
                  {club.lineup.map((s) => (
                    <div
                      key={s.slotIndex}
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#38f2c8] border border-white shadow-[0_0_6px_#38f2c8]"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Enter Team Management</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>

            {/* Tile 3: TEAM SHEETS */}
            <div
              onClick={() => {
                setSubTab('TeamManagement');
                setMgmtSection('Tactics');
              }}
              className="fc-panel rounded-2xl p-6 border border-white/10 hover:border-[#38f2c8]/60 cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[380px]"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8ba5b3]">
                  <span className="text-[#38f2c8]">TACTIC PRESETS</span>
                  <span className="text-emerald-300 font-bold">3 SHEETS</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-2">
                  Team Sheets
                </h3>
                <p className="text-xs text-[#8ba5b3] mt-1">
                  Manage active game plans and export 11-digit tactic share codes
                </p>

                {/* Team Sheets Stack */}
                <div className="mt-5 space-y-2.5">
                  <div className="p-3 rounded-xl bg-[#122e2a] border border-[#38f2c8]/40 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                        <span>Sheet 1 — Default</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#38f2c8] text-[#07131a]">
                          ACTIVE
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8ba5b3] mt-0.5 font-mono">
                        {club.formation} · {club.tacticalVision}
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-[#38f2c8]" />
                  </div>

                  <div className="p-3 rounded-xl bg-[#07141d]/70 border border-white/8 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white uppercase">Sheet 2 — Cup Rotation</div>
                      <div className="text-[11px] text-[#8ba5b3] mt-0.5 font-mono">4-2-3-1 · Gegenpressing</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07141d]/70 border border-white/8 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white uppercase">Sheet 3 — Defensive Lock</div>
                      <div className="text-[11px] text-[#8ba5b3] mt-0.5 font-mono">5-3-2 · Park the Bus</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-[#38f2c8] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">✕</kbd>
                  <span>Enter Team Sheets</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#38f2c8] transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: TEAM MANAGEMENT & FC IQ TACTICAL BOARD (image_6e08edbc.png) */}
      {/* =================================================================== */}
      {subTab === 'TeamManagement' && (
        <div className="space-y-5">
          {/* Internal Subtabs: Squad | Tactics | Assignments */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              {(
                [
                  ['Squad', 'Squad & Pitch'],
                  ['Tactics', 'Tactical Radar & Presets'],
                  ['Assignments', 'Set-Piece Assignments'],
                ] as const
              ).map(([sec, label]) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setMgmtSection(sec)}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all ${
                    mgmtSection === sec
                      ? 'fc-panel-active text-white border border-[#38f2c8]/50'
                      : 'text-[#8ba5b3] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 11-digit Tactic Share Code pill */}
            <div className="flex items-center gap-2 bg-[#091a24] px-3 py-1.5 rounded-lg border border-white/15 text-xs">
              <span className="text-[#8ba5b3]">Tactic Code:</span>
              <span className="font-mono font-bold text-[#38f2c8]">{tacticCode}</span>
              <button
                type="button"
                onClick={copyCode}
                className="hover:text-white text-[#8ba5b3] transition-colors"
                title="Copy Code"
              >
                {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="text-[10px] font-black uppercase text-[#38f2c8] hover:underline ml-1"
              >
                Import
              </button>
            </div>
          </div>

          {/* SECTION A: SQUAD & 2D PITCH WITH FC IQ ROLES */}
          {mgmtSection === 'Squad' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Pitch & Substitutes (Left 8 cols) */}
              <div className="xl:col-span-8 space-y-4">
                {/* Tactical Selector Bar */}
                <div className="fc-panel rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 border border-white/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-[11px] uppercase tracking-wider text-[#8ba5b3] font-bold">
                      Formation
                    </label>
                    <select
                      aria-label="Formation"
                      value={club.formation}
                      onChange={(e) => changeFormation(e.target.value as FormationId)}
                      className="rounded-lg border border-white/15 bg-[#0a1822] px-3 py-1.5 text-xs font-bold text-white focus:border-[#38f2c8] focus:outline-none"
                    >
                      {(Object.keys(FORMATIONS) as FormationId[]).map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Tactical Vision"
                      value={club.tacticalVision}
                      onChange={(e) =>
                        updateClubTactics(e.target.value as TacticalVision, club.mentality, club.defensiveLineHeight)
                      }
                      className="rounded-lg border border-white/15 bg-[#0a1822] px-3 py-1.5 text-xs font-bold text-[#38f2c8] focus:border-[#38f2c8] focus:outline-none"
                    >
                      {VISIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {swapSourceId !== null ? (
                      <button
                        type="button"
                        onClick={() => setSwapSourceId(null)}
                        className="rounded-lg bg-amber-400/20 border border-amber-300/60 px-3 py-1.5 text-xs font-bold text-amber-200"
                      >
                        Swapping {career.players[swapSourceId]?.knownAs} — Click target (Cancel)
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!activePlayer}
                        onClick={() => activePlayer && setSwapSourceId(activePlayer.id)}
                        className="fc-btn-secondary rounded-lg px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 border border-white/15 hover:border-[#38f2c8]/50"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-[#38f2c8]" />
                        <span>Swap Selected</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2D Interactive Pitch */}
                <div className="relative rounded-2xl fc-pitch-surface h-[490px] overflow-hidden select-none border border-white/15 shadow-2xl">
                  {/* Pitch markings SVG */}
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
                  >
                    <rect x="3" y="3" width="94" height="94" fill="none" stroke="#c8f7dc" strokeWidth="0.45" />
                    <line x1="3" y1="50" x2="97" y2="50" stroke="#c8f7dc" strokeWidth="0.45" />
                    <circle cx="50" cy="50" r="11" fill="none" stroke="#c8f7dc" strokeWidth="0.45" />
                    <rect x="26" y="3" width="48" height="15" fill="none" stroke="#c8f7dc" strokeWidth="0.45" />
                    <rect x="26" y="82" width="48" height="15" fill="none" stroke="#c8f7dc" strokeWidth="0.45" />
                  </svg>

                  {/* 11 Starting XI Nodes */}
                  {club.lineup.map((slot) => {
                    const p = slot.playerId ? career.players[slot.playerId] : null;
                    if (!p) return null;
                    const leftPct = pitchPhase === 'WITH_BALL' ? slot.withBallX : slot.x;
                    const topPct = pitchPhase === 'WITH_BALL' ? slot.withBallY : slot.y;
                    const isSelected = activePlayer?.id === p.id;
                    const isSwapSrc = swapSourceId === p.id;
                    const isCaptain = club.captainId === p.id;
                    const dyn = p.dynamicOvr;

                    return (
                      <button
                        key={slot.slotIndex}
                        type="button"
                        draggable
                        onDragStart={() => setDragPlayerId(p.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragPlayerId && dragPlayerId !== p.id) {
                            swapSquadPlayers(dragPlayerId, p.id);
                          }
                          setDragPlayerId(null);
                        }}
                        onClick={() => handlePlayerClick(p.id)}
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 group focus:outline-none ${
                          isSelected ? 'z-20 scale-110' : 'z-10 hover:scale-105'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[10px] font-black uppercase drop-shadow ${
                              dyn.positionPenalty < 0 ? 'text-amber-300' : 'text-white/90'
                            }`}
                          >
                            {slot.position}
                          </span>
                          <div
                            className={`relative rounded-full p-[2px] transition-all ${
                              isSwapSrc
                                ? 'ring-2 ring-amber-300'
                                : isSelected
                                ? 'ring-2 ring-[#38f2c8] shadow-[0_0_20px_rgba(56,242,200,0.8)]'
                                : ''
                            }`}
                          >
                            <PlayerAvatar player={p} clubColor={club.primaryColor} size="sm" />
                            {p.injury && (
                              <span
                                title={`${p.injury.type} (${p.injury.aggravationRiskPct}% risk)`}
                                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[#121212] text-[10px] font-black"
                              >
                                !
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-display text-lg font-black tabular-nums leading-none drop-shadow ${
                              dyn.totalDelta > 0
                                ? 'text-[#38f2c8]'
                                : dyn.totalDelta < 0
                                ? 'text-rose-300'
                                : 'text-white'
                            }`}
                          >
                            {dyn.dynamicOvr}
                          </span>
                        </div>

                        {/* Player Name Pill + Captain [C] */}
                        <div
                          className={`mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide flex items-center gap-1 max-w-[110px] truncate shadow ${
                            isSelected
                              ? 'bg-white text-[#071117]'
                              : 'bg-[#07141b]/90 text-white border border-white/15'
                          }`}
                        >
                          {isCaptain && (
                            <span className="inline-block px-1 rounded-[2px] bg-amber-300 text-[#071117] text-[9px] font-black">
                              C
                            </span>
                          )}
                          <span className="truncate">{p.jerseyName || p.knownAs}</span>
                        </div>

                        {/* Match Fitness Bar */}
                        <div className="mt-0.5 w-14 h-1 rounded-full bg-black/60 overflow-hidden">
                          <div
                            className={`h-full ${renderFitnessColor(p.matchFitness)}`}
                            style={{ width: `${p.matchFitness}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}

                  {/* With Ball / Without Ball Toggle matching FC 27 */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl bg-[#07141b]/90 border border-white/15 p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => setPitchPhase('WITHOUT_BALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        pitchPhase === 'WITHOUT_BALL'
                          ? 'bg-white text-[#071117]'
                          : 'text-[#9bb4c2] hover:text-white'
                      }`}
                    >
                      Without Ball
                    </button>
                    <button
                      type="button"
                      onClick={() => setPitchPhase('WITH_BALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        pitchPhase === 'WITH_BALL'
                          ? 'bg-white text-[#071117]'
                          : 'text-[#9bb4c2] hover:text-white'
                      }`}
                    >
                      With Ball
                    </button>
                  </div>
                </div>

                {/* Substitutes Tray */}
                <div className="fc-panel rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-[#38f2c8]">
                      Substitutes ({club.benchIds.length})
                    </span>
                    <span className="text-[11px] text-[#8ba5b3]">
                      Drag onto pitch or click Swap Selected
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                    {club.benchIds.map((bid) => {
                      const p = career.players[bid];
                      if (!p) return null;
                      const isSel = activePlayer?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          draggable
                          onDragStart={() => setDragPlayerId(p.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragPlayerId && dragPlayerId !== p.id) {
                              swapSquadPlayers(dragPlayerId, p.id);
                            }
                            setDragPlayerId(null);
                          }}
                          onClick={() => handlePlayerClick(p.id)}
                          className={`rounded-xl p-2 text-center border transition-all ${
                            isSel
                              ? 'fc-panel-active border-[#38f2c8]'
                              : 'border-white/10 bg-[#0a1822]/80 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={positionColorClass(p.primaryPosition)}>{p.primaryPosition}</span>
                            <span className="font-mono-num text-white">{p.dynamicOvr.dynamicOvr}</span>
                          </div>
                          <div className="my-1.5 flex justify-center relative">
                            <PlayerAvatar player={p} clubColor={club.primaryColor} size="xs" />
                            {p.injury && (
                              <span className="absolute -top-1 right-0.5 h-3.5 w-3.5 rounded-full bg-amber-400 text-[#091017] text-[9px] font-black leading-[14px]">
                                !
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-white truncate">{p.jerseyName || p.knownAs}</div>
                          <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full ${renderFitnessColor(p.matchFitness)}`}
                              style={{ width: `${p.matchFitness}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* FC IQ Player Inspector with Role Checklist (Right 4 cols) */}
              {activePlayer && (
                <div className="xl:col-span-4 fc-panel rounded-2xl p-5 border border-white/10 space-y-4">
                  {/* Player Banner */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar player={activePlayer} clubColor={club.primaryColor} size="lg" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-wider text-[#38f2c8]">
                          {[activePlayer.primaryPosition, ...activePlayer.otherPositions].join(' · ')}
                        </div>
                        <h3 className="font-display text-2xl font-black uppercase tracking-wide text-white truncate">
                          {activePlayer.knownAs}
                        </h3>
                        <div className="text-xs text-[#8ba5b3] font-mono-num">
                          Baseline OVR <strong className="text-white">{activePlayer.baseOvr}</strong> · Potential{' '}
                          <strong className="text-[#38f2c8]">{activePlayer.potential}</strong>
                        </div>
                      </div>
                    </div>
                    <OvrDiamond
                      ovr={activePlayer.dynamicOvr.dynamicOvr}
                      delta={activePlayer.dynamicOvr.totalDelta}
                      size="lg"
                    />
                  </div>

                  {/* FC IQ Role & Focus Checklist matching image_8a05a206.png */}
                  <div className="rounded-xl border border-[#38f2c8]/30 bg-[#091f24]/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-[#38f2c8] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#38f2c8]" />
                        <span>FC IQ Role &amp; Focus</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#38f2c8]/20 text-[#38f2c8] border border-[#38f2c8]/40">
                        {activePlayer.roleFamiliarity}
                      </span>
                    </div>

                    <div className="text-sm font-black text-white uppercase">
                      {activePlayer.roleTitle}
                    </div>

                    {/* Role Pros & Cons checklist */}
                    {currentRoleNotes && (
                      <div className="space-y-1.5 pt-1 text-xs">
                        {currentRoleNotes.pros.map((pro, i) => (
                          <div key={i} className="flex items-start gap-2 text-[#b8fff0]">
                            <span className="text-[#38f2c8] font-black shrink-0">✓</span>
                            <span>{pro}</span>
                          </div>
                        ))}
                        {currentRoleNotes.cons.map((con, i) => (
                          <div key={i} className="flex items-start gap-2 text-[#e2b7b7]">
                            <span className="text-rose-400 font-black shrink-0">!</span>
                            <span>{con}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3-Pillar Dynamic OVR Breakdown */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-[#0a1822]/90 p-3 text-center">
                    <div>
                      <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">Form</div>
                      <div className={`font-mono-num text-xs font-black ${deltaColor(activePlayer.dynamicOvr.formDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.formDelta)} OVR
                      </div>
                      <div className="text-[11px] font-bold text-white mt-0.5">{activePlayer.dynamicOvr.formLabel}</div>
                    </div>
                    <div className="border-x border-white/10">
                      <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">Morale</div>
                      <div className={`font-mono-num text-xs font-black ${deltaColor(activePlayer.dynamicOvr.moraleDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.moraleDelta)} OVR
                      </div>
                      <div className="text-[11px] font-bold text-white mt-0.5">{activePlayer.dynamicOvr.moraleLabel}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">Fitness</div>
                      <div className={`font-mono-num text-xs font-black ${deltaColor(activePlayer.dynamicOvr.fitnessDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.fitnessDelta)} OVR
                      </div>
                      <div className="text-[11px] font-bold text-white mt-0.5">{activePlayer.matchFitness}%</div>
                    </div>
                  </div>

                  {/* 6 Face Attributes */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    {(
                      [
                        ['PAC', activePlayer.cardFacets.pac, activePlayer.dynamicOvr.facetDeltas.pac],
                        ['SHO', activePlayer.cardFacets.sho, activePlayer.dynamicOvr.facetDeltas.sho],
                        ['PAS', activePlayer.cardFacets.pas, activePlayer.dynamicOvr.facetDeltas.pas],
                        ['DRI', activePlayer.cardFacets.dri, activePlayer.dynamicOvr.facetDeltas.dri],
                        ['DEF', activePlayer.cardFacets.def, activePlayer.dynamicOvr.facetDeltas.def],
                        ['PHY', activePlayer.cardFacets.phy, activePlayer.dynamicOvr.facetDeltas.phy],
                      ] as const
                    ).map(([label, base, d]) => (
                      <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <span className="font-bold text-[#8ba5b3]">{label}</span>
                        <span className="font-mono-num font-black text-white">
                          {base}{' '}
                          {d !== 0 && (
                            <span className={`text-[10px] ml-1 ${d > 0 ? 'text-[#38f2c8]' : 'text-rose-400'}`}>
                              {d > 0 ? `+${d}` : d}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION B: TACTICS PRESETS & FC IQ RADAR CHART */}
          {mgmtSection === 'Tactics' && (
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
          )}

          {/* SECTION C: ASSIGNMENTS (CAPTAIN & SET PIECES) */}
          {mgmtSection === 'Assignments' && (
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
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: SQUAD HUB (Full Roster + Dynamic OVR & 6 Growth Profiles)   */}
      {/* =================================================================== */}
      {subTab === 'SquadHub' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 fc-panel rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0d1d29] border-b border-white/12 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                  <tr>
                    <th className="py-3 px-3.5 text-left">Player</th>
                    <th className="py-3 px-2 text-center">Pos</th>
                    <th className="py-3 px-2 text-center">Age</th>
                    <th className="py-3 px-2 text-center">Base</th>
                    <th className="py-3 px-2 text-center">Live OVR</th>
                    <th className="py-3 px-2 text-center">POT</th>
                    <th className="py-3 px-2 text-left">Growth Profile</th>
                    <th className="py-3 px-2 text-center">Fit</th>
                    <th className="py-3 px-2 text-right">Value (xTV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {squad.map((p) => {
                    const isSel = activePlayer?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPlayerId(p.id)}
                        className={`cursor-pointer transition-colors ${
                          isSel ? 'fc-panel-active text-white' : 'hover:bg-white/[0.05] text-[#d6e4ec]'
                        }`}
                      >
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <PlayerAvatar player={p} clubColor={club.primaryColor} size="xs" />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {p.knownAs}
                                {p.injury && (
                                  <span className="text-[10px] text-amber-300 font-semibold">
                                    ({p.injury.recovering ? `${p.injury.aggravationRiskPct}% risk` : `${p.injury.daysRemaining}d out`})
                                  </span>
                                )}
                                {p.transferListed && (
                                  <span className="text-[10px] text-rose-300 font-bold uppercase">Listed</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#8ba5b3]">
                                {p.squadRole} · {formatMoney(p.weeklyWageEur, career.settings.currency)}/wk · Ends {p.contractEndYear}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-2.5 px-2 text-center font-bold ${positionColorClass(p.primaryPosition)}`}>
                          {p.primaryPosition}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono-num">{p.age}</td>
                        <td className="py-2.5 px-2 text-center font-mono-num text-[#9bb4c2]">{p.baseOvr}</td>
                        <td className="py-2.5 px-2 text-center font-mono-num font-extrabold">
                          <span className="text-white">{p.dynamicOvr.dynamicOvr}</span>
                          <span className={`ml-1 text-[10px] ${deltaColor(p.dynamicOvr.totalDelta)}`}>
                            ({formatDelta(p.dynamicOvr.totalDelta)})
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono-num text-[#38f2c8] font-bold">
                          {p.potential}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-white">
                            {GROWTH_PROFILES[p.growthProfile].label}
                          </div>
                          <div className="text-[10px] text-[#8ba5b3] font-mono-num">
                            Mom {p.developmentPlan.momentum}% · XP {Math.round(p.xpProgress)}%
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono-num">
                          <span className={p.matchFitness >= 75 ? 'text-[#38f2c8]' : 'text-amber-300'}>
                            {p.matchFitness}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono-num font-bold text-[#b8fff0]">
                          {formatMoney(p.expectedTransferValue, career.settings.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 4 cols: Player Detail Drawer */}
          {activePlayer && (
            <div className="xl:col-span-4 fc-panel rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar player={activePlayer} clubColor={club.primaryColor} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl font-black uppercase text-white truncate">
                      {activePlayer.knownAs}
                    </h3>
                    <div className="text-xs text-[#8ba5b3]">
                      {activePlayer.nationality} · {activePlayer.age} yrs · {activePlayer.primaryPosition}
                    </div>
                  </div>
                </div>
                <OvrDiamond ovr={activePlayer.dynamicOvr.dynamicOvr} delta={activePlayer.dynamicOvr.totalDelta} />
              </div>

              <div className="grid grid-cols-4 gap-1 border-b border-white/10 pb-2">
                {(['DynamicOVR', 'Attributes', 'Development', 'Actions'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDrawerTab(t)}
                    className={`py-1.5 rounded-lg text-[11px] font-black uppercase ${
                      drawerTab === t ? 'bg-white text-[#071117]' : 'text-[#8ea5b3] hover:text-white'
                    }`}
                  >
                    {t === 'DynamicOVR' ? 'Dyn OVR' : t}
                  </button>
                ))}
              </div>

              {drawerTab === 'DynamicOVR' && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-white/10 bg-[#0a1822]/90 p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Baseline OVR</span>
                      <span className="font-mono-num font-bold text-white">{activePlayer.dynamicOvr.baseOvr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Form ({activePlayer.dynamicOvr.formLabel})</span>
                      <span className={`font-mono-num font-bold ${deltaColor(activePlayer.dynamicOvr.formDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.formDelta)} OVR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Morale ({activePlayer.dynamicOvr.moraleLabel})</span>
                      <span className={`font-mono-num font-bold ${deltaColor(activePlayer.dynamicOvr.moraleDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.moraleDelta)} OVR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Match Fitness ({activePlayer.matchFitness}%)</span>
                      <span className={`font-mono-num font-bold ${deltaColor(activePlayer.dynamicOvr.fitnessDelta)}`}>
                        {formatDelta(activePlayer.dynamicOvr.fitnessDelta)} OVR
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-black">
                      <span className="text-white">Live Dynamic OVR</span>
                      <span className="font-mono-num text-[#38f2c8]">{activePlayer.dynamicOvr.dynamicOvr}</span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'Attributes' && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-[340px] overflow-y-auto pr-1 text-[11px]">
                  {Object.entries(activePlayer.attributes).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between border-b border-white/[0.05] py-1">
                      <span className="capitalize text-[#9bb4c2]">{key}</span>
                      <span
                        className={`font-mono-num font-bold ${
                          val >= 82 ? 'text-[#38f2c8]' : val >= 70 ? 'text-white' : 'text-[#8ea5b3]'
                        }`}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {drawerTab === 'Development' && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-white/10 bg-[#0a1822]/90 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#38f2c8] uppercase">
                        {GROWTH_PROFILES[activePlayer.growthProfile].label}
                      </span>
                      <span className="font-mono-num text-[#9bb4c2]">
                        Peak {GROWTH_PROFILES[activePlayer.growthProfile].peakStartAge}–
                        {GROWTH_PROFILES[activePlayer.growthProfile].peakEndAge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#a7becb] mt-1">
                      {GROWTH_PROFILES[activePlayer.growthProfile].summary}
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#8ba5b3]">Momentum</span>
                        <span className="font-mono-num font-bold text-white">
                          {activePlayer.developmentPlan.momentum}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#10c482] to-[#38f2c8]"
                          style={{ width: `${activePlayer.developmentPlan.momentum}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateDevelopmentPlan(activePlayer.id, 'Balanced')}
                      className={`rounded-lg py-2 px-2.5 text-xs font-bold border ${
                        activePlayer.developmentPlan.mode === 'Balanced'
                          ? 'fc-panel-active text-white'
                          : 'border-white/12 bg-[#0a1822] text-[#a4bcc8]'
                      }`}
                    >
                      Balanced
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDevelopmentPlan(activePlayer.id, 'RoleFocus')}
                      className={`rounded-lg py-2 px-2.5 text-xs font-bold border ${
                        activePlayer.developmentPlan.mode === 'RoleFocus'
                          ? 'fc-panel-active text-white'
                          : 'border-white/12 bg-[#0a1822] text-[#a4bcc8]'
                      }`}
                    >
                      Role Focus
                    </button>
                  </div>
                </div>
              )}

              {drawerTab === 'Actions' && (
                <div className="space-y-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => startNegotiation(activePlayer.id, 'CONTRACT')}
                    className="fc-btn-primary w-full rounded-lg py-2.5 uppercase font-bold"
                  >
                    Negotiate Contract
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTransferList(activePlayer.id)}
                    className="fc-btn-secondary w-full rounded-lg py-2 font-bold uppercase"
                  >
                    {activePlayer.transferListed ? 'Remove from Transfer List' : 'Add to Transfer List'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 4: COACHING STAFF & ENERGY RECOVERY                           */}
      {/* =================================================================== */}
      {subTab === 'Coaches' && (
        <div className="space-y-6">
          {/* Energy Policy */}
          <div className="fc-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2.5 mb-1.5">
              <BatteryCharging className="w-5 h-5 text-[#38f2c8]" />
              <h3 className="font-display text-2xl font-black uppercase tracking-wide text-white">
                Energy Recovery Policy
              </h3>
            </div>
            <p className="text-xs text-[#8ba5b3] mb-4">
              Balance player energy regeneration against match sharpness to protect Dynamic OVR ratings
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(
                [
                  { id: 'Aggressive', title: 'Aggressive Recovery', desc: '+7 Energy / day · -1 Sharpness / day. Essential during fixture congestion.' },
                  { id: 'Balanced', title: 'Balanced Recovery', desc: '+5 Energy / day · +1 Sharpness / day. Standard competitive weekly balance.' },
                  { id: 'Conservative', title: 'High Intensity', desc: '+3 Energy / day · +2 Sharpness / day. Maximizes matchday sharpness.' },
                ] as const
              ).map((opt) => {
                const active = career.settings.energyRecovery === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSettings({ energyRecovery: opt.id as EnergyRecoveryPolicy })}
                    className={`rounded-xl p-4 text-left border transition-all ${
                      active ? 'fc-panel-active border-[#38f2c8]' : 'border-white/10 bg-[#0b1822]/80 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-black uppercase text-white">{opt.title}</span>
                      {active && <Check className="w-4 h-4 text-[#38f2c8]" />}
                    </div>
                    <p className="text-xs text-[#a9c0cc] mt-1.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(['ATK', 'MID', 'DEF', 'GK'] as Sector[]).map((dept) => {
              const deptPlayers = squad.filter((p) => positionToSector(p.primaryPosition) === dept);
              const avgOvr = deptPlayers.length ? Math.round(deptPlayers.reduce((s, p) => s + p.baseOvr, 0) / deptPlayers.length) : 0;
              const hiredCoaches = club.coaches.filter((c) => c.hired && c.department === dept);
              const totalStars = hiredCoaches.reduce((s, c) => s + c.stars, 0);
              return (
                <div key={dept} className="fc-panel rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-black uppercase text-[#38f2c8]">
                      {dept} Staff
                    </span>
                    <span className="font-mono-num text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-300" /> {totalStars} / 5★
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#8ba5b3]">
                    {deptPlayers.length} Players · Avg {avgOvr} OVR
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coach Pool */}
          <div className="fc-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#38f2c8]" />
                <h3 className="font-display text-xl font-black uppercase tracking-wide text-white">
                  Coaching Staff ({club.coaches.filter((c) => c.hired).length}/8 Hired)
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {club.coaches.map((coach) => (
                <div
                  key={coach.id}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                    coach.hired ? 'border-[#38f2c8]/40 bg-[#0f282a]' : 'border-white/10 bg-[#0b1822]/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-[#38f2c8]">{coach.department}</span>
                      <span className="text-sm font-bold text-white">{coach.name}</span>
                    </div>
                    <div className="text-xs text-amber-300 mt-0.5">{'★'.repeat(coach.stars)}</div>
                    <div className="text-[11px] text-[#8ba5b3] mt-0.5 font-mono">
                      {coach.tacticalStyle} · {formatMoney(coach.weeklySalaryEur, career.settings.currency)}/wk
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCoachHire(coach.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase ${
                      coach.hired ? 'fc-btn-secondary text-rose-300' : 'fc-btn-primary'
                    }`}
                  >
                    {coach.hired ? 'Release' : 'Hire'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Tactic Share Code Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="fc-panel rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl space-y-4">
            <h3 className="font-display text-xl font-black uppercase text-white">
              Import FC IQ Tactic Code
            </h3>
            <p className="text-xs text-[#8ba5b3]">
              Paste an 11-digit tactic share code from EA Sports FC 27 or another career save:
            </p>
            <input
              type="text"
              placeholder="e.g. SYq8wc1YsaoP"
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-[#08131b] px-4 py-2.5 text-sm font-mono text-white tracking-widest uppercase focus:border-[#38f2c8] focus:outline-none"
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="fc-btn-secondary rounded-lg px-4 py-2 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="fc-btn-primary rounded-lg px-5 py-2 text-xs font-black uppercase"
              >
                Apply Tactic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
