import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryCharging,
  Check,
  Handshake,
  Star,
  Users,
} from 'lucide-react';
import { GROWTH_PROFILES } from '../engine/growth';
import {
  formatMoney,
  positionToSector,
} from '../engine/ratings';
import {
  EnergyRecoveryPolicy,
  Mentality,
  Player,
  Position,
  Sector,
  TacticalVision,
} from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { OvrDiamond, PlayerAvatar, positionColorClass } from './PlayerAvatar';
import { CardTitle, HubCarousel } from './fc/HubCarousel';
import { TeamManagementScreen } from './landings/TeamManagementScreen';

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
// Squad Hub roster (v1.2.0): 4 horizontal sub-tabs + Player Actions modal
// ---------------------------------------------------------------------------
type RosterTab = 'Overview' | 'Attributes' | 'FormMorale' | 'Financial';
const ROSTER_TABS: ReadonlyArray<readonly [RosterTab, string]> = [
  ['Overview', 'Overview'],
  ['Attributes', 'Attributes'],
  ['FormMorale', 'Form & Morale'],
  ['Financial', 'Financial'],
];
const FACET_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const;

/** Players inside this window of their contract are flagged "Open to Talks" (v1.1.0 icon). */
const OPEN_TO_TALKS_MONTHS = 18;

/** Contracts run to 30 June of `contractEndYear`. */
function contractMonthsLeft(contractEndYear: number, currentDate: string): number {
  const [y, m] = currentDate.split('-').map(Number);
  return Math.max(0, (contractEndYear - y) * 12 + (6 - m) + 1);
}

function isOpenToTalks(p: Player, currentDate: string): boolean {
  return !p.transferListed && contractMonthsLeft(p.contractEndYear, currentDate) <= OPEN_TO_TALKS_MONTHS;
}

/** v1.1.0 high-contrast stat badges: green / grey / red. */
function statBadgeClass(v: number): string {
  if (v >= 80) return 'bg-[#1fbf75] text-[#04150c]';
  if (v >= 65) return 'bg-[#4f5d68] text-white';
  return 'bg-[#d9434f] text-white';
}

function ratingChipClass(r: number): string {
  if (r >= 7.5) return 'bg-[#1fbf75] text-[#04150c]';
  if (r >= 6.5) return 'bg-[#4f5d68] text-white';
  return 'bg-[#d9434f] text-white';
}

function lastFiveRatings(p: Player): (number | null)[] {
  const recent = p.seasonStats.matchRatings.slice(-5);
  return [...Array<null>(5 - recent.length).fill(null), ...recent];
}

const FORM_TONE: Record<Player['dynamicOvr']['formLabel'], string> = {
  Excellent: 'text-[#38f2c8]',
  Good: 'text-emerald-300',
  Okay: 'text-white',
  Poor: 'text-amber-300',
  Terrible: 'text-rose-400',
};

const MORALE_TONE: Record<Player['dynamicOvr']['moraleLabel'], string> = {
  Complacent: 'text-amber-200',
  Happy: 'text-[#38f2c8]',
  Content: 'text-white',
  Unhappy: 'text-amber-300',
  'Very Unhappy': 'text-rose-400',
};

const DEV_PLAN_OPTIONS = [
  { mode: 'Balanced', label: 'Balanced', desc: 'Even attribute growth across the whole profile.' },
  { mode: 'RoleFocus', label: 'Role Focus', desc: 'Prioritise the attributes that drive the current FC IQ role.' },
] as const;
type DevPlanMode = (typeof DEV_PLAN_OPTIONS)[number]['mode'];

type ActionId = 'profile' | 'dev' | 'contract' | 'transfer' | 'loan' | 'block' | 'kit';
type ActionMenuState = { playerId: number; view: 'list' | 'dev' | 'kit'; index: number; kit: number };

const StatusTag: React.FC<{ tone: 'rose' | 'amber' | 'slate'; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${
      tone === 'rose'
        ? 'bg-rose-500/15 text-rose-300 border-rose-400/40'
        : tone === 'amber'
        ? 'bg-amber-400/15 text-amber-200 border-amber-300/40'
        : 'bg-white/10 text-white/80 border-white/20'
    }`}
  >
    {children}
  </span>
);

const KeyHint: React.FC<{ keys: string[]; label: string; sub?: string }> = ({ keys, label, sub }) => (
  <span className="flex items-center gap-1.5">
    {keys.map((k) => (
      <kbd
        key={k}
        className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded bg-white/10 border border-white/15 text-[10px] font-black text-white"
      >
        {k}
      </kbd>
    ))}
    <span className="font-semibold text-white/80">{label}</span>
    {sub && <span className="text-white/40">({sub})</span>}
  </span>
);

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


/** Department "ideal" star count shown on the Ideal Quality card (depth + quality). */
function idealStars(players: number, ovr: number): number {
  if (players === 0) return 0;
  return Math.max(1, Math.round(2 + players * 0.4 + (ovr - 65) * 0.45));
}

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
  const updateDevelopmentPlan = useCareerStore((s) => s.updateDevelopmentPlan);
  const toggleTransferList = useCareerStore((s) => s.toggleTransferList);
  const toggleLoanList = useCareerStore((s) => s.toggleLoanList);
  const toggleCoachHire = useCareerStore((s) => s.toggleCoachHire);
  const startNegotiation = useCareerStore((s) => s.startNegotiation);
  const updateSettings = useCareerStore((s) => s.updateSettings);
  const toggleBlockOffers = useCareerStore((s) => s.toggleBlockOffers);
  const setJerseyNumber = useCareerStore((s) => s.setJerseyNumber);

  const [subTab, setSubTab] = useState<SquadSubTab>('Hub');
  const [mgmtSection, setMgmtSection] = useState<MgmtSection>('Squad');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<'DynamicOVR' | 'Attributes' | 'Development'>('DynamicOVR');
  const [retrainPos, setRetrainPos] = useState<Position>('CM');
  const [buildUpStyle, setBuildUpStyle] = useState<string>('Short Passing');
  const tacticCode = 'SYq8wc1YsaoP';

  // Squad Hub roster: sub-tab, Action List modal and keyboard routing
  const [hubFocus, setHubFocus] = useState(0);
  const [rosterTab, setRosterTab] = useState<RosterTab>('Overview');
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const rosterScrollRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Capture phase so the open modal can swallow keys before TopNavBar's Q/E/1-8 handler.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keyHandlerRef.current?.(e);
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  // Keep the focused roster row visible while moving with W/S.
  useEffect(() => {
    if (subTab !== 'SquadHub' || selectedPlayerId === null) return;
    const row = rosterScrollRef.current?.querySelector<HTMLElement>(`tr[data-player-id="${selectedPlayerId}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [selectedPlayerId, subTab, rosterTab]);

  // Leaving the Squad Hub always dismisses the Action List.
  useEffect(() => {
    if (subTab !== 'SquadHub') setActionMenu(null);
  }, [subTab]);

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

  const activePlayer: Player | undefined =
    (selectedPlayerId ? career.players[selectedPlayerId] : undefined) ??
    (club.lineup[10]?.playerId ? career.players[club.lineup[10].playerId] : squad[0]);

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

  // ------------------------------------------------------------------------
  // Squad Hub roster focus + Player Actions (Action List)
  // ------------------------------------------------------------------------
  const focusedRow = Math.max(0, squad.findIndex((p) => p.id === activePlayer?.id));
  const focusRow = (idx: number) => {
    const target = squad[Math.min(Math.max(idx, 0), squad.length - 1)];
    if (target) setSelectedPlayerId(target.id);
  };

  const actionPlayer: Player | undefined = actionMenu ? career.players[actionMenu.playerId] : undefined;
  const devModeLabel = (mode: Player['developmentPlan']['mode']) =>
    mode === 'RoleFocus' ? 'Role Focus' : mode === 'PositionRetrain' ? 'Retraining' : mode;

  const actionItems: { id: ActionId; label: string; detail?: string }[] = actionPlayer
    ? [
        { id: 'profile', label: 'View Player Profile' },
        { id: 'dev', label: 'Development Plan', detail: devModeLabel(actionPlayer.developmentPlan.mode) },
        {
          id: 'contract',
          label: 'Contract Renewal',
          detail: isOpenToTalks(actionPlayer, career.currentDate) ? 'Open to talks' : `Ends ${actionPlayer.contractEndYear}`,
        },
        { id: 'transfer', label: actionPlayer.transferListed ? 'Remove from Transfer List' : 'Add to Transfer List' },
        { id: 'loan', label: actionPlayer.loanListed ? 'Remove from Loan List' : 'Add to Loan List' },
        { id: 'block', label: actionPlayer.offersBlocked ? 'Unblock Offers' : 'Block Offers' },
        { id: 'kit', label: 'Change Kit Number', detail: `#${actionPlayer.jerseyNumber}` },
      ]
    : [];
  const actionIndexOf = (id: ActionId) => Math.max(0, actionItems.findIndex((a) => a.id === id));

  const kitOwner =
    actionMenu?.view === 'kit' && actionPlayer
      ? squad.find((o) => o.id !== actionPlayer.id && o.jerseyNumber === actionMenu.kit)
      : undefined;

  const openActionList = () => {
    if (!activePlayer) return;
    setActionMenu({ playerId: activePlayer.id, view: 'list', index: 0, kit: activePlayer.jerseyNumber });
  };
  const closeActionList = () => setActionMenu(null);
  const backAction = () => {
    if (!actionMenu) return;
    if (actionMenu.view === 'list') closeActionList();
    else setActionMenu({ ...actionMenu, view: 'list', index: actionIndexOf(actionMenu.view) });
  };

  const runAction = (id: ActionId) => {
    if (!actionMenu || !actionPlayer) return;
    switch (id) {
      case 'profile':
        closeActionList();
        setDrawerTab('DynamicOVR');
        requestAnimationFrame(() => profileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
        break;
      case 'dev': {
        const cur = DEV_PLAN_OPTIONS.findIndex((o) => o.mode === actionPlayer.developmentPlan.mode);
        setActionMenu({ ...actionMenu, view: 'dev', index: Math.max(0, cur) });
        break;
      }
      case 'contract':
        closeActionList();
        startNegotiation(actionPlayer.id, 'CONTRACT');
        break;
      case 'transfer':
        toggleTransferList(actionPlayer.id);
        break;
      case 'loan':
        toggleLoanList(actionPlayer.id);
        break;
      case 'block':
        toggleBlockOffers(actionPlayer.id);
        break;
      case 'kit':
        setActionMenu({ ...actionMenu, view: 'kit', kit: actionPlayer.jerseyNumber });
        break;
    }
  };

  const applyDevPlan = (mode: DevPlanMode) => {
    if (!actionMenu || !actionPlayer) return;
    updateDevelopmentPlan(actionPlayer.id, mode);
    setActionMenu({ ...actionMenu, view: 'list', index: actionIndexOf('dev') });
  };

  const stepKit = (delta: number) =>
    setActionMenu((m) => (m ? { ...m, kit: ((m.kit - 1 + delta + 99) % 99) + 1 } : m));

  const confirmKit = () => {
    if (!actionMenu || !actionPlayer || kitOwner) return;
    setJerseyNumber(actionPlayer.id, actionMenu.kit);
    setActionMenu({ ...actionMenu, view: 'list', index: actionIndexOf('kit') });
  };

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

  // Assigned every render so the (mount-once) listener always sees fresh state.
  keyHandlerRef.current = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (subTab === 'Hub' || subTab === 'TeamManagement') return; // owned by HubCarousel / TeamManagementScreen
    if (subTab !== 'SquadHub') {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSubTab('Hub');
      }
      return;
    }

    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const up = k === 'w' || k === 'ArrowUp';
    const down = k === 's' || k === 'ArrowDown';
    const left = k === 'a' || k === 'ArrowLeft';
    const right = k === 'd' || k === 'ArrowRight';
    const confirm = k === ' ' || k === 'Enter';
    const back = k === 'Escape' || k === 'b' || k === 'Backspace';

    if (actionMenu) {
      // The modal owns the keyboard: nothing leaks to the tab bar or page.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (back) return backAction();
      if (confirm && e.repeat) return;
      if (actionMenu.view === 'kit') {
        if (left || down) stepKit(-1);
        else if (right || up) stepKit(1);
        else if (confirm) confirmKit();
        return;
      }
      const count = actionMenu.view === 'list' ? actionItems.length : DEV_PLAN_OPTIONS.length;
      if (up || down) {
        const index = (actionMenu.index + (up ? -1 : 1) + count) % count;
        setActionMenu({ ...actionMenu, index });
      } else if (confirm) {
        if (actionMenu.view === 'list') runAction(actionItems[actionMenu.index].id);
        else applyDevPlan(DEV_PLAN_OPTIONS[actionMenu.index].mode);
      }
      return;
    }

    if (up || down) {
      e.preventDefault();
      focusRow(focusedRow + (up ? -1 : 1));
    } else if (left || right) {
      e.preventDefault();
      const i = ROSTER_TABS.findIndex(([key]) => key === rosterTab);
      setRosterTab(ROSTER_TABS[(i + (left ? -1 : 1) + ROSTER_TABS.length) % ROSTER_TABS.length][0]);
    } else if (confirm) {
      e.preventDefault();
      if (!e.repeat) openActionList();
    } else if (back) {
      e.preventDefault();
      setSubTab('Hub');
    }
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
      />
    );
  }

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
                ['Hub', '◯ Squad'],
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
      {/* VIEW 3: SQUAD HUB ROSTER (v1.2.0)                                   */}
      {/* 4 horizontal sub-tabs · W/S rows · A/D tabs · ✕ (Space) Action List */}
      {/* =================================================================== */}
      {subTab === 'SquadHub' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 fc-panel rounded-2xl overflow-hidden border border-white/10">
            {/* Horizontal roster sub-tabs with A / D shoulder prompts */}
            <div className="flex items-center gap-2 px-3 pt-2 border-b border-white/10 bg-[#0b1924]">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-black text-white/80">
                A
              </kbd>
              <div role="tablist" aria-label="Squad Hub views" className="flex flex-1 items-stretch gap-1 overflow-x-auto">
                {ROSTER_TABS.map(([key, label]) => {
                  const active = rosterTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setRosterTab(key)}
                      className={`relative flex-1 min-w-[110px] px-3 py-3 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                        active ? 'text-white' : 'text-[#8ea5b3] hover:text-white'
                      }`}
                    >
                      {key === 'Financial' && <Handshake className="w-3.5 h-3.5 text-[#38f2c8]" aria-hidden />}
                      <span>{label}</span>
                      <span
                        className={`absolute left-2 right-2 bottom-0 h-[3px] rounded-t-full transition-all ${
                          active ? 'bg-[#38f2c8] shadow-[0_0_10px_rgba(56,242,200,0.7)]' : 'bg-transparent'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-black text-white/80">
                D
              </kbd>
            </div>

            <div ref={rosterScrollRef} className="overflow-x-auto max-h-[64vh]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-[#0d1d29] border-b border-white/12 text-[10px] uppercase tracking-wider text-[#8ba5b3]">
                  <tr>
                    <th className="py-3 px-3.5 text-left">Player</th>
                    <th className="py-3 px-2 text-center">Pos</th>
                    {rosterTab === 'Overview' && (
                      <>
                        <th className="py-3 px-2 text-center">Age</th>
                        <th className="py-3 px-2 text-center">OVR</th>
                        <th className="py-3 px-2 text-center">POT</th>
                        <th className="py-3 px-2 text-left">Squad Role</th>
                        <th className="py-3 px-2 text-center">Fitness</th>
                      </>
                    )}
                    {rosterTab === 'Attributes' &&
                      FACET_KEYS.map((f) => (
                        <th key={f} className="py-3 px-2 text-center">
                          {f.toUpperCase()}
                        </th>
                      ))}
                    {rosterTab === 'FormMorale' && (
                      <>
                        <th className="py-3 px-2 text-left">Form</th>
                        <th className="py-3 px-2 text-center">Last 5</th>
                        <th className="py-3 px-2 text-left">Morale</th>
                        <th className="py-3 px-2 text-center">Fitness</th>
                        <th className="py-3 px-2 text-center">OVR Δ</th>
                      </>
                    )}
                    {rosterTab === 'Financial' && (
                      <>
                        <th className="py-3 px-2 text-right">Wage / wk</th>
                        <th className="py-3 px-2 text-center">Contract</th>
                        <th className="py-3 px-2 text-right">Release Clause</th>
                        <th className="py-3 px-2 text-right">Value (xTV)</th>
                        <th className="py-3 px-2 text-center">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {squad.map((p, idx) => {
                    const isFocused = idx === focusedRow;
                    const monthsLeft = contractMonthsLeft(p.contractEndYear, career.currentDate);
                    const openToTalks = isOpenToTalks(p, career.currentDate);
                    return (
                      <tr
                        key={p.id}
                        data-player-id={p.id}
                        aria-selected={isFocused}
                        onClick={() => focusRow(idx)}
                        onDoubleClick={() => {
                          focusRow(idx);
                          openActionList();
                        }}
                        className={`cursor-pointer transition-colors scroll-mt-10 ${
                          isFocused
                            ? 'bg-[#123039] text-white shadow-[inset_3px_0_0_#38f2c8,inset_0_0_0_1px_rgba(56,242,200,0.55)]'
                            : 'hover:bg-white/[0.05] text-[#d6e4ec]'
                        }`}
                      >
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 text-right font-mono-num text-[10px] text-[#8ba5b3]">
                              {p.jerseyNumber}
                            </span>
                            <PlayerAvatar player={p} clubColor={club.primaryColor} size="xs" />
                            <div className="min-w-0">
                              <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                <span className="truncate">{p.knownAs}</span>
                                {club.captainId === p.id && (
                                  <span className="px-1 rounded-[2px] bg-amber-300 text-[#071117] text-[9px] font-black">C</span>
                                )}
                                {p.injury && (
                                  <span className="text-[10px] text-amber-300 font-semibold">
                                    ({p.injury.recovering ? `${p.injury.aggravationRiskPct}% risk` : `${p.injury.daysRemaining}d out`})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#8ba5b3] truncate">
                                {p.nationality} · {p.roleTitle}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-2.5 px-2 text-center font-bold ${positionColorClass(p.primaryPosition)}`}>
                          {p.primaryPosition}
                        </td>

                        {rosterTab === 'Overview' && (
                          <>
                            <td className="py-2.5 px-2 text-center font-mono-num">{p.age}</td>
                            <td className="py-2.5 px-2 text-center font-mono-num font-extrabold">
                              <span className="text-white">{p.dynamicOvr.dynamicOvr}</span>
                              {p.dynamicOvr.totalDelta !== 0 && (
                                <span className={`ml-1 text-[10px] ${deltaColor(p.dynamicOvr.totalDelta)}`}>
                                  {formatDelta(p.dynamicOvr.totalDelta)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono-num text-[#38f2c8] font-bold">{p.potential}</td>
                            <td className="py-2.5 px-2 text-[#d6e4ec]">{p.squadRole}</td>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full ${renderFitnessColor(p.matchFitness)}`}
                                    style={{ width: `${p.matchFitness}%` }}
                                  />
                                </div>
                                <span className="font-mono-num text-[10px] w-7 text-right">{p.matchFitness}</span>
                              </div>
                            </td>
                          </>
                        )}

                        {rosterTab === 'Attributes' &&
                          FACET_KEYS.map((f) => {
                            const base = p.cardFacets[f];
                            const d = p.dynamicOvr.facetDeltas[f];
                            return (
                              <td key={f} className="py-2.5 px-2 text-center">
                                <span
                                  className={`inline-flex items-center justify-center min-w-[30px] px-1.5 py-0.5 rounded font-mono-num font-black text-[11px] ${statBadgeClass(
                                    base
                                  )}`}
                                >
                                  {base}
                                </span>
                                {d !== 0 && (
                                  <span className={`ml-1 text-[10px] font-bold ${deltaColor(d)}`}>{formatDelta(d)}</span>
                                )}
                              </td>
                            );
                          })}

                        {rosterTab === 'FormMorale' && (
                          <>
                            <td className="py-2.5 px-2">
                              <div className={`font-bold ${FORM_TONE[p.dynamicOvr.formLabel]}`}>{p.dynamicOvr.formLabel}</div>
                              <div className="text-[10px] font-mono-num text-[#8ba5b3]">Index {p.formScore.toFixed(1)}</div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center justify-center gap-0.5">
                                {lastFiveRatings(p).map((r, i) => (
                                  <span
                                    key={i}
                                    className={`w-7 py-0.5 rounded text-center font-mono-num text-[10px] font-black ${
                                      r === null ? 'bg-white/5 text-white/25' : ratingChipClass(r)
                                    }`}
                                  >
                                    {r === null ? '–' : r.toFixed(1)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className={`font-bold ${MORALE_TONE[p.dynamicOvr.moraleLabel]}`}>
                                {p.dynamicOvr.moraleLabel}
                              </div>
                              <div className="mt-1 w-20 h-1 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-[#38f2c8]/80" style={{ width: `${p.morale}%` }} />
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono-num">
                              <span className={p.matchFitness >= 78 ? 'text-[#38f2c8]' : p.matchFitness >= 58 ? 'text-amber-300' : 'text-rose-400'}>
                                {p.matchFitness}%
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono-num text-[10px]">
                              <span className={deltaColor(p.dynamicOvr.formDelta)}>F{formatDelta(p.dynamicOvr.formDelta)}</span>
                              <span className="text-white/25"> · </span>
                              <span className={deltaColor(p.dynamicOvr.moraleDelta)}>M{formatDelta(p.dynamicOvr.moraleDelta)}</span>
                              <span className="text-white/25"> · </span>
                              <span className={deltaColor(p.dynamicOvr.fitnessDelta)}>
                                Fit{formatDelta(p.dynamicOvr.fitnessDelta)}
                              </span>
                            </td>
                          </>
                        )}

                        {rosterTab === 'Financial' && (
                          <>
                            <td className="py-2.5 px-2 text-right font-mono-num text-white">
                              {formatMoney(p.weeklyWageEur, career.settings.currency)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`font-mono-num font-bold ${monthsLeft <= 12 ? 'text-amber-300' : 'text-white'}`}>
                                  {p.contractEndYear}
                                </span>
                                {openToTalks && (
                                  <span
                                    title="Open to contract talks"
                                    aria-label="Open to contract talks"
                                    className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#38f2c8]/15 border border-[#38f2c8]/60"
                                  >
                                    <Handshake className="w-3 h-3 text-[#38f2c8]" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#8ba5b3] font-mono-num">
                                {monthsLeft <= 0 ? 'Expiring' : `${monthsLeft} mo left`}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono-num text-[#9bb4c2]">
                              {formatMoney(p.releaseClauseEur, career.settings.currency)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono-num font-bold text-[#b8fff0]">
                              {formatMoney(p.expectedTransferValue, career.settings.currency)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex flex-wrap justify-center gap-1">
                                {p.transferListed && <StatusTag tone="rose">Transfer</StatusTag>}
                                {p.loanListed && <StatusTag tone="amber">Loan</StatusTag>}
                                {p.offersBlocked && <StatusTag tone="slate">Blocked</StatusTag>}
                                {!p.transferListed && !p.loanListed && !p.offersBlocked && (
                                  <span className="text-[10px] text-white/30">—</span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer: legend + controller prompts */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-white/10 bg-[#0b1924] text-[11px] text-[#8ba5b3]">
              <div className="flex items-center gap-3">
                {rosterTab === 'Financial' ? (
                  <span className="flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5 text-[#38f2c8]" />
                    Open to contract talks (≤ {OPEN_TO_TALKS_MONTHS} months remaining)
                  </span>
                ) : rosterTab === 'Attributes' ? (
                  <span className="flex items-center gap-2">
                    <span className={`px-1.5 rounded font-black ${statBadgeClass(85)}`}>80+</span>
                    <span className={`px-1.5 rounded font-black ${statBadgeClass(70)}`}>65–79</span>
                    <span className={`px-1.5 rounded font-black ${statBadgeClass(50)}`}>&lt;65</span>
                  </span>
                ) : (
                  <span>{squad.length} players</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <KeyHint keys={['W', 'S']} label="Select Player" />
                <KeyHint keys={['A', 'D']} label="Switch View" />
                <KeyHint keys={['✕']} label="Player Actions" sub="Space" />
              </div>
            </div>
          </div>

          {/* Right 4 cols: Player Detail Drawer (target of "View Player Profile") */}
          {activePlayer && (
            <div ref={profileRef} className="xl:col-span-4 fc-panel rounded-2xl p-5 border border-white/10 space-y-4 scroll-mt-24">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar player={activePlayer} clubColor={club.primaryColor} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl font-black uppercase text-white truncate">
                      {activePlayer.knownAs}
                    </h3>
                    <div className="text-xs text-[#8ba5b3]">
                      #{activePlayer.jerseyNumber} · {activePlayer.nationality} · {activePlayer.age} yrs ·{' '}
                      {activePlayer.primaryPosition}
                    </div>
                  </div>
                </div>
                <OvrDiamond ovr={activePlayer.dynamicOvr.dynamicOvr} delta={activePlayer.dynamicOvr.totalDelta} />
              </div>

              <div className="grid grid-cols-3 gap-1 border-b border-white/10 pb-2">
                {(['DynamicOVR', 'Attributes', 'Development'] as const).map((t) => (
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
                  <div className="rounded-xl border border-white/10 bg-[#0a1822]/90 p-3 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Contract</span>
                      <span className="font-mono-num font-bold text-white">
                        {formatMoney(activePlayer.weeklyWageEur, career.settings.currency)}/wk · {activePlayer.contractEndYear}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8ba5b3]">Value (xTV)</span>
                      <span className="font-mono-num font-bold text-[#b8fff0]">
                        {formatMoney(activePlayer.expectedTransferValue, career.settings.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'Attributes' && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-[340px] overflow-y-auto pr-1 text-[11px]">
                  {Object.entries(activePlayer.attributes).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between border-b border-white/[0.05] py-1">
                      <span className="capitalize text-[#9bb4c2]">{key}</span>
                      <span className={`px-1.5 rounded font-mono-num font-bold ${statBadgeClass(val)}`}>{val}</span>
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
                        <span className="text-[#8ba5b3]">Plan · Momentum</span>
                        <span className="font-mono-num font-bold text-white">
                          {activePlayer.developmentPlan.mode} · {activePlayer.developmentPlan.momentum}%
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
                </div>
              )}

              <button
                type="button"
                onClick={openActionList}
                className="w-full rounded-xl py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-[#f6f3ff] to-[#e4d9ff] text-[#120f24] shadow-[0_0_18px_rgba(200,180,255,0.35)] hover:brightness-105"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#120f24] text-white text-[10px]">✕</span>
                Player Actions
              </button>
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

      {/* Player Actions (Action List) — centered Layer-4 modal */}
      {actionMenu && actionPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeActionList}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-actions-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/20 bg-gradient-to-b from-[#1b2a3a]/95 to-[#0c1620]/95 shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/10">
              <PlayerAvatar player={actionPlayer} clubColor={club.primaryColor} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#38f2c8]">
                  {actionMenu.view === 'list' ? 'Player Actions' : actionMenu.view === 'dev' ? 'Development Plan' : 'Change Kit Number'}
                </div>
                <h3 id="player-actions-title" className="font-display text-2xl font-black uppercase text-white truncate">
                  {actionPlayer.knownAs}
                </h3>
                <div className="text-[11px] text-[#8ba5b3]">
                  #{actionPlayer.jerseyNumber} · {actionPlayer.primaryPosition} · {actionPlayer.dynamicOvr.dynamicOvr} OVR
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-3">
              {actionMenu.view === 'list' && (
                <ul role="menu" className="space-y-1">
                  {actionItems.map((item, i) => {
                    const focused = i === actionMenu.index;
                    return (
                      <li key={item.id} role="none">
                        <button
                          type="button"
                          role="menuitem"
                          onMouseEnter={() => setActionMenu((m) => (m ? { ...m, index: i } : m))}
                          onClick={() => runAction(item.id)}
                          className={`w-full flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-all ${
                            focused
                              ? 'bg-gradient-to-r from-[#f6f3ff] to-[#e4d9ff] text-[#120f24] shadow-[0_0_18px_rgba(200,180,255,0.35)]'
                              : 'text-white/90 hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            {focused ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#120f24] text-white text-[10px]">
                                ✕
                              </span>
                            ) : (
                              <span className="h-5 w-5" />
                            )}
                            {item.label}
                          </span>
                          {item.detail && (
                            <span className={`text-[11px] font-semibold ${focused ? 'text-[#4b4070]' : 'text-[#8ba5b3]'}`}>
                              {item.detail}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {actionMenu.view === 'dev' && (
                <ul role="menu" className="space-y-1">
                  {DEV_PLAN_OPTIONS.map((opt, i) => {
                    const focused = i === actionMenu.index;
                    const current = actionPlayer.developmentPlan.mode === opt.mode;
                    return (
                      <li key={opt.mode} role="none">
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={current}
                          onMouseEnter={() => setActionMenu((m) => (m ? { ...m, index: i } : m))}
                          onClick={() => applyDevPlan(opt.mode)}
                          className={`w-full rounded-xl px-4 py-2.5 text-left transition-all ${
                            focused
                              ? 'bg-gradient-to-r from-[#f6f3ff] to-[#e4d9ff] text-[#120f24]'
                              : 'text-white/90 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm font-bold">
                            <span>{opt.label}</span>
                            {current && <Check className="w-4 h-4" />}
                          </div>
                          <div className={`text-[11px] mt-0.5 ${focused ? 'text-[#4b4070]' : 'text-[#8ba5b3]'}`}>{opt.desc}</div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {actionMenu.view === 'kit' && (
                <div className="py-4 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      aria-label="Previous number"
                      onClick={() => stepKit(-1)}
                      className="h-9 w-9 rounded-full border border-white/20 text-white text-lg font-black hover:bg-white/10"
                    >
                      ‹
                    </button>
                    <div className="font-display text-6xl font-black text-white tabular-nums w-28 text-center">
                      {actionMenu.kit}
                    </div>
                    <button
                      type="button"
                      aria-label="Next number"
                      onClick={() => stepKit(1)}
                      className="h-9 w-9 rounded-full border border-white/20 text-white text-lg font-black hover:bg-white/10"
                    >
                      ›
                    </button>
                  </div>
                  <div className={`text-xs font-semibold h-4 ${kitOwner ? 'text-amber-300' : 'text-[#8ba5b3]'}`}>
                    {kitOwner ? `Worn by ${kitOwner.knownAs}` : 'Available'}
                  </div>
                  <button
                    type="button"
                    disabled={!!kitOwner}
                    onClick={confirmKit}
                    className="mt-1 rounded-xl px-5 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 bg-gradient-to-r from-[#f6f3ff] to-[#e4d9ff] text-[#120f24] disabled:opacity-40"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#120f24] text-white text-[10px]">✕</span>
                    Confirm #{actionMenu.kit}
                  </button>
                </div>
              )}
            </div>

            {/* Footer prompts */}
            <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-white/10 bg-black/20 text-[11px] text-[#8ba5b3]">
              {actionMenu.view === 'kit' ? (
                <KeyHint keys={['A', 'D']} label="Number" />
              ) : (
                <KeyHint keys={['W', 'S']} label="Navigate" />
              )}
              <KeyHint keys={['✕']} label="Select" sub="Space" />
              <KeyHint keys={['◯']} label="Back" sub="Esc" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
