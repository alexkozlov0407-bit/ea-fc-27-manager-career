import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Star } from 'lucide-react';
import { GROWTH_PROFILES } from '../../engine/growth';
import { formatMoney } from '../../engine/ratings';
import { CareerState, Player } from '../../engine/types';
import { LayerBackdrop, LayerHeader, PadGlyph, PlayerBust } from '../fc/HubCarousel';
import { DeltaChip, PlayerActionsScreen } from './PlayerActionsScreen';
import {
  accelerationType,
  contractLengthLabel,
  contractMonthsLeft,
  deltaTone,
  heightLabel,
  shortName,
  splitName,
} from './playerFormat';

/**
 * Squad › Squad Hub — 1:1 with the "B. Fernandes" Financial capture.
 * Tabs Status / Stats / Attributes / Financial (L1/R1 = Q/E); W/S rows; ▢ F sort; ✕ Show Actions
 * (Player Actions screen); △ T Full Profile; R Team Management; ◯ Esc back.
 */

type Tab = 'Status' | 'Stats' | 'Attributes' | 'Financial';
const TABS: Tab[] = ['Status', 'Stats', 'Attributes', 'Financial'];

interface Column {
  key: string;
  label: string;
  width: string;
  align?: 'left' | 'center';
  value: (p: Player) => number | string;
  render?: (p: Player) => React.ReactNode;
  sortable?: boolean;
  /** true = ascending is the natural first sort (e.g. contract, age). */
  ascFirst?: boolean;
}

interface Props {
  career: CareerState;
  squad: Player[];
  onBack: () => void;
  onTeamManagement: () => void;
}

export const SquadHubScreen: React.FC<Props> = ({ career, squad, onBack, onTeamManagement }) => {
  const [tab, setTab] = useState<Tab>('Financial');
  const [row, setRow] = useState(0);
  const [sort, setSort] = useState<Record<Tab, { key: string; asc: boolean }>>({
    Status: { key: 'ovr', asc: false },
    Stats: { key: 'apps', asc: false },
    Attributes: { key: 'pac', asc: false },
    Financial: { key: 'contract', asc: true },
  });
  const [actionsFor, setActionsFor] = useState<number | null>(null);
  const [profileFor, setProfileFor] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cur = career.settings.currency;
  const months = (p: Player) => contractMonthsLeft(p.contractEndYear, career.currentDate);

  const ovrCell = (p: Player) => (
    <span className="relative inline-flex items-center justify-center w-[2.6vw] h-[2.6vw] min-w-[30px] min-h-[30px]">
      <span className="absolute inset-[18%] rotate-45 rounded-[2px] border border-white/25" />
      <span className="relative font-expanded font-black" style={{ color: p.dynamicOvr.totalDelta ? deltaTone(p.dynamicOvr.totalDelta) : undefined }}>
        {p.dynamicOvr.dynamicOvr}
      </span>
    </span>
  );
  const facet = (k: 'pac' | 'sho' | 'pas' | 'dri' | 'def' | 'phy', label: string): Column => ({
    key: k,
    label,
    width: '4.2vw',
    align: 'center',
    sortable: true,
    value: (p) => p.cardFacets[k] + p.dynamicOvr.facetDeltas[k],
    render: (p) => (
      <span>
        {p.cardFacets[k]}
        {p.dynamicOvr.facetDeltas[k] !== 0 && (
          <sup className="ml-[0.15vw] text-[0.7em]" style={{ color: deltaTone(p.dynamicOvr.facetDeltas[k]) }}>
            {p.dynamicOvr.facetDeltas[k] > 0 ? `+${p.dynamicOvr.facetDeltas[k]}` : p.dynamicOvr.facetDeltas[k]}
          </sup>
        )}
      </span>
    ),
  });

  const columns: Record<Tab, Column[]> = {
    Status: [
      { key: 'age', label: 'Age', width: '4.4vw', align: 'center', sortable: true, ascFirst: true, value: (p) => p.age },
      { key: 'ovr', label: 'OVR', width: '5vw', align: 'center', sortable: true, value: (p) => p.dynamicOvr.dynamicOvr, render: ovrCell },
      { key: 'form', label: 'Form', width: '6.4vw', align: 'center', sortable: true, value: (p) => p.formScore, render: (p) => p.dynamicOvr.formLabel },
      { key: 'morale', label: 'Morale', width: '7vw', align: 'center', sortable: true, value: (p) => p.morale, render: (p) => p.dynamicOvr.moraleLabel },
      { key: 'fit', label: 'Fitness', width: '6vw', align: 'center', sortable: true, value: (p) => p.matchFitness, render: (p) => `${p.matchFitness}%` },
    ],
    Stats: [
      { key: 'apps', label: 'Apps', width: '5vw', align: 'center', sortable: true, value: (p) => p.seasonStats.appearances },
      { key: 'goals', label: 'Goals', width: '5vw', align: 'center', sortable: true, value: (p) => p.seasonStats.goals },
      { key: 'assists', label: 'Assists', width: '5.6vw', align: 'center', sortable: true, value: (p) => p.seasonStats.assists },
      { key: 'cs', label: 'Clean Sh.', width: '6vw', align: 'center', sortable: true, value: (p) => p.seasonStats.cleanSheets },
      { key: 'rating', label: 'Avg', width: '5vw', align: 'center', sortable: true, value: (p) => p.seasonStats.avgRating, render: (p) => (p.seasonStats.appearances ? p.seasonStats.avgRating.toFixed(1) : '–') },
    ],
    Attributes: [facet('pac', 'PAC'), facet('sho', 'SHO'), facet('pas', 'PAS'), facet('dri', 'DRI'), facet('def', 'DEF'), facet('phy', 'PHY')],
    Financial: [
      { key: 'age', label: 'Age', width: '4.4vw', align: 'center', sortable: true, ascFirst: true, value: (p) => p.age },
      { key: 'value', label: 'Value (xTV)', width: '7vw', align: 'center', sortable: true, value: (p) => p.expectedTransferValue, render: (p) => formatMoney(p.expectedTransferValue, cur) },
      { key: 'wage', label: 'Wage', width: '7vw', align: 'center', sortable: true, value: (p) => p.weeklyWageEur, render: (p) => formatMoney(p.weeklyWageEur, cur) },
      { key: 'contract', label: 'Contract', width: '6vw', align: 'center', sortable: true, ascFirst: true, value: (p) => months(p), render: (p) => contractLengthLabel(p.contractEndYear, career.currentDate) },
    ],
  };
  const cols = columns[tab];
  const s = sort[tab];
  const sortCol = cols.find((c) => c.key === s.key) ?? cols[0];
  const rows = [...squad].sort((a, b) => {
    const va = sortCol.value(a);
    const vb = sortCol.value(b);
    const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return (s.asc ? d : -d) || a.jerseyNumber - b.jerseyNumber;
  });
  const focusIdx = Math.min(row, rows.length - 1);
  const focused = rows[focusIdx];

  useLayoutEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${focusIdx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx, tab]);

  const cycleSort = () => {
    const sortable = cols.filter((c) => c.sortable);
    const i = sortable.findIndex((c) => c.key === s.key);
    const nextCol = sortable[(i + 1) % sortable.length];
    setSort((prev) => ({ ...prev, [tab]: { key: nextCol.key, asc: Boolean(nextCol.ascFirst) } }));
    setRow(0);
  };

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (actionsFor !== null) return; // the actions screen owns the keyboard
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (profileFor !== null) {
      if (k === 'Escape' || k === 'b' || k === 't') setProfileFor(null);
      return;
    }
    if (k === 'q' || k === '[' || k === 'e' || k === ']') {
      const dir = k === 'q' || k === '[' ? -1 : 1;
      setTab(TABS[(TABS.indexOf(tab) + dir + TABS.length) % TABS.length]);
    } else if (k === 'w' || k === 'ArrowUp') setRow(Math.max(0, focusIdx - 1));
    else if (k === 's' || k === 'ArrowDown') setRow(Math.min(rows.length - 1, focusIdx + 1));
    else if (k === 'f') cycleSort();
    else if ((k === ' ' || k === 'Enter') && !e.repeat && focused) setActionsFor(focused.id);
    else if (k === 't' && focused) setProfileFor(focused.id);
    else if (k === 'r') onTeamManagement();
    else if (k === 'Escape' || k === 'b') onBack();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const grid = 'grid items-center';
  const gridStyle: React.CSSProperties = { gridTemplateColumns: `4.6vw 4.4vw 3.6vw minmax(0,1fr) ${cols.map((c) => c.width).join(' ')}` };
  const actionsPlayer = actionsFor !== null ? career.players[actionsFor] : undefined;
  const profilePlayer = profileFor !== null ? career.players[profileFor] : undefined;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden text-white select-none">
      <LayerBackdrop />
      <LayerHeader parent="Squad" title="Squad Hub" tabs={TABS} active={tab} onTab={(t) => setTab(t as Tab)} />

      {/* ------------------------------------------------ List */}
      <div className="absolute left-[2.8vw] top-[17.6vh] w-[45.2vw]">
        <div className={`${grid} h-[5.4vh] text-white/75 text-[clamp(12px,1.1vw,21px)]`} style={gridStyle}>
          <span className="text-center">No.</span>
          <span className="text-center">Pos</span>
          <span />
          <span className="pl-[0.6vw]">Name</span>
          {cols.map((c) => (
            <span key={c.key} className={`text-center whitespace-nowrap ${c.key === sortCol.key ? 'text-[#8ff0cd]' : ''}`}>
              {c.label}
              {c.key === sortCol.key && <span className="ml-[0.3vw] text-[0.75em]">{s.asc ? '▲' : '▼'}</span>}
            </span>
          ))}
        </div>
        <div
          ref={listRef}
          className="h-[67vh] overflow-y-auto pr-[0.3vw]"
          style={{ maskImage: 'linear-gradient(180deg, #000 86%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 86%, transparent 100%)' }}
        >
          {rows.map((p, i) => {
            const isFocused = i === focusIdx;
            return (
              <div
                key={p.id}
                data-row={i}
                role="button"
                tabIndex={-1}
                onMouseEnter={() => setRow(i)}
                onClick={() => (isFocused ? setActionsFor(p.id) : setRow(i))}
                className={`${grid} relative h-[7.52vh] cursor-pointer text-[clamp(13px,1.1vw,21px)] ${isFocused ? 'z-10 font-bold' : 'border-b border-white/15'}`}
                style={
                  isFocused
                    ? {
                        ...gridStyle,
                        background: 'linear-gradient(100deg, rgba(150,164,196,0.5), rgba(104,118,150,0.48) 60%, rgba(120,112,160,0.46))',
                        border: '1.5px solid rgba(226,234,255,0.75)',
                        borderRadius: 6,
                        boxShadow: '0 0 22px rgba(196,210,255,0.25)',
                        margin: '0 -0.8vw',
                        padding: '0 0.8vw',
                      }
                    : gridStyle
                }
              >
                <span className="text-center tabular-nums">{p.jerseyNumber}</span>
                <span className="text-center">{p.primaryPosition}</span>
                <span className="h-full flex items-end overflow-hidden"><PlayerBust src={p.headshotUrl} alt={p.knownAs} /></span>
                <span className="truncate pl-[0.6vw]">
                  {shortName(p)}
                  {p.injury && <span className="ml-[0.4vw] text-[0.75em] text-amber-300">+</span>}
                </span>
                {cols.map((c) => (
                  <span
                    key={c.key}
                    className={`h-full flex items-center justify-center tabular-nums ${c.key === sortCol.key && !isFocused ? 'bg-black/15' : ''}`}
                  >
                    {c.render ? c.render(p) : c.value(p)}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------ Render + readout */}
      {focused && (
        <>
          <div
            className="absolute left-[56vw] top-[9vh] h-[50vh] w-[24vw] flex items-end justify-center pointer-events-none"
            style={{ maskImage: 'linear-gradient(180deg, #000 72%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 72%, transparent 100%)' }}
          >
            {focused.headshotUrl ? (
              <img src={focused.headshotUrl} alt="" className="h-[86%] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]" />
            ) : (
              <svg viewBox="0 0 200 220" className="h-[80%] w-auto" aria-label="render placeholder">
                <ellipse cx="100" cy="78" rx="44" ry="54" fill="rgba(214,222,234,0.22)" />
                <path d="M10 220 C14 160 56 140 100 140 C144 140 186 160 190 220 Z" fill="rgba(214,222,234,0.16)" />
              </svg>
            )}
          </div>
          <PlayerReadout career={career} p={focused} tab={tab} />
        </>
      )}

      {/* ------------------------------------------------ Controller bar */}
      <div className="absolute left-[2.4vw] bottom-[2.2vh] flex items-center gap-[2vw] text-white/90 text-[clamp(12px,1.1vw,21px)]">
        <span className="flex items-center gap-[0.5vw]"><PadGlyph shape="cross" /> Show Actions</span>
        <button type="button" onClick={onBack} className="flex items-center gap-[0.5vw]"><PadGlyph shape="circle" /> Back</button>
        <button type="button" onClick={cycleSort} className="flex items-center gap-[0.5vw]"><PadGlyph shape="square" /> Sort</button>
        <button type="button" onClick={() => focused && setProfileFor(focused.id)} className="flex items-center gap-[0.5vw]"><PadGlyph shape="triangle" /> Full Profile</button>
        <button type="button" onClick={onTeamManagement} className="flex items-center gap-[0.5vw]">
          <span className="inline-flex items-center justify-center rounded-full bg-white/25 font-bold w-[clamp(20px,1.6vw,30px)] h-[clamp(20px,1.6vw,30px)] text-[clamp(9px,0.75vw,14px)]">R</span>
          Team Management
        </button>
      </div>

      {profilePlayer && <FullProfile career={career} p={profilePlayer} onClose={() => setProfileFor(null)} />}
      {actionsPlayer && (
        <PlayerActionsScreen
          career={career}
          player={actionsPlayer}
          onClose={() => setActionsFor(null)}
          onViewProfile={() => {
            setActionsFor(null);
            setProfileFor(actionsPlayer.id);
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
const NationChip: React.FC<{ nation: string }> = ({ nation }) => (
  <span className="inline-flex items-center justify-center rounded-[2px] bg-white/90 px-[0.3vw] py-[0.2vh] text-[#1a2230] font-bold text-[clamp(9px,0.72vw,14px)]" title={nation}>
    {nation.slice(0, 3).toUpperCase()}
  </span>
);

const PlayerReadout: React.FC<{ career: CareerState; p: Player; tab: Tab }> = ({ career, p, tab }) => {
  const cur = career.settings.currency;
  const d = p.dynamicOvr;
  const months = contractMonthsLeft(p.contractEndYear, career.currentDate);
  const renewal = career.negotiations.find(
    (n) => n.type === 'CONTRACT' && n.playerId === p.id && !['COMPLETED', 'COLLAPSED', 'REJECTED'].includes(n.stage)
  );
  const negotiationStatus = renewal
    ? renewal.stage === 'DELEGATED'
      ? 'DELEGATED'
      : 'NEGOTIATING'
    : p.transferListed
    ? 'TRANSFER LISTED'
    : months <= 12
    ? 'CONTRACT EXPIRING'
    : months <= 18
    ? 'OPEN TO TALKS'
    : 'NONE';
  const sellOn = career.transferHistory.find((t) => t.playerId === p.id && t.toClubId === career.userClubId && t.sellOnPct > 0);

  const cells: [string, React.ReactNode][] =
    tab === 'Financial'
      ? [
          ['Negotiation Status', negotiationStatus],
          ['Wage', formatMoney(p.weeklyWageEur, cur)],
          ['Market Value (xTV)', formatMoney(p.expectedTransferValue, cur)],
          ['Contract Length', contractLengthLabel(p.contractEndYear, career.currentDate).toUpperCase()],
          ['Release Clause', p.releaseClauseEur ? formatMoney(p.releaseClauseEur, cur) : 'NONE'],
          ['Sell-On Clause', sellOn ? `${sellOn.sellOnPct}%` : 'NONE'],
        ]
      : tab === 'Status'
      ? [
          ['Form', d.formLabel.toUpperCase()],
          ['Morale', d.moraleLabel.toUpperCase()],
          ['Match Fitness', `${p.matchFitness}%`],
          ['Squad Role', p.squadRole.toUpperCase()],
          ['Injury', p.injury ? `${p.injury.daysRemaining}D OUT` : 'NONE'],
          ['Development', GROWTH_PROFILES[p.growthProfile].label.toUpperCase()],
        ]
      : tab === 'Stats'
      ? [
          ['Appearances', p.seasonStats.appearances],
          ['Goals', p.seasonStats.goals],
          ['Assists', p.seasonStats.assists],
          ['Average Rating', p.seasonStats.appearances ? p.seasonStats.avgRating.toFixed(1) : '–'],
          ['Clean Sheets', p.seasonStats.cleanSheets],
          ['Minutes', p.seasonStats.minutes],
        ]
      : (['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const).map((k) => [
          ({ pac: 'Pace', sho: 'Shooting', pas: 'Passing', dri: 'Dribbling', def: 'Defending', phy: 'Physical' } as const)[k],
          <span key={k}>
            {p.cardFacets[k]}
            {d.facetDeltas[k] !== 0 && <span className="ml-[0.4vw]" style={{ color: deltaTone(d.facetDeltas[k]) }}>{d.facetDeltas[k] > 0 ? `+${d.facetDeltas[k]}` : d.facetDeltas[k]}</span>}
          </span>,
        ]);

  return (
    <div className="absolute left-[51.6vw] right-[3.4vw] top-[55.6vh]">
      <div className="ml-[7.4vw] text-[clamp(14px,1.25vw,24px)]">
        <span className="font-expanded font-black">{p.primaryPosition}</span>
        {p.otherPositions.length > 0 && <span className="text-white/60"> · {p.otherPositions.slice(0, 3).join(' · ')}</span>}
      </div>
      <div className="flex items-center">
        <span className="relative w-[7.2vw] flex items-center justify-center">
          <span className="absolute w-[5vw] h-[5vw] rotate-45 rounded-[4px] border border-white/20" />
          {d.totalDelta > 0 && <span className="absolute -top-[1.4vh] text-[#45e07c] text-[clamp(10px,0.9vw,17px)]">▲</span>}
          <span className="relative font-expanded font-black leading-none text-[clamp(44px,3.9vw,74px)]">{d.dynamicOvr}</span>
        </span>
        <span className="flex items-center gap-[0.7vw] min-w-0">
          <NationChip nation={p.nationality} />
          <span className="font-expanded font-black uppercase truncate text-[clamp(26px,2.45vw,46px)]">{shortName(p)}</span>
        </span>
      </div>
      <div className="ml-[7.4vw] mt-[0.4vh] inline-flex items-center gap-[0.8vw] rounded-[3px] bg-black/20 px-[0.6vw] py-[0.4vh] text-[clamp(12px,1.18vw,22px)]">
        <span className="flex items-center gap-[0.3vw]"><Star className="w-[1.05vw] h-[1.05vw] min-w-[13px]" /> <b className="font-expanded font-black">{p.baseOvr}</b></span>
        <span className="text-white/30">|</span>
        <span className="flex items-center gap-[0.3vw]"><ArrowUpRight className="w-[1.1vw] h-[1.1vw] min-w-[13px]" /> <b className="font-expanded font-black">{p.potential}</b></span>
        <span className="text-white/30">|</span>
        <DeltaChip icon="form" d={d.formDelta} />
        <span className="text-white/30">|</span>
        <DeltaChip icon="morale" d={d.moraleDelta} />
        <span className="text-white/30">|</span>
        <DeltaChip icon="fitness" d={d.fitnessDelta} />
      </div>
      <div className="mt-[3vh] grid grid-cols-3">
        {cells.map(([label, value], i) => (
          <div key={label} className={`${i % 3 !== 2 ? 'border-r border-white/20' : ''} ${i % 3 ? 'pl-[1.2vw]' : ''} ${i >= 3 ? 'mt-[2.8vh]' : ''}`}>
            <div className="text-white/75 text-[clamp(12px,1.12vw,21px)]">{label}</div>
            <div className="mt-[0.8vh] font-expanded font-black uppercase truncate text-[clamp(13px,1.18vw,22px)]">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** △ Full Profile: bio + every attribute, grouped like the in-game profile. */
export const FullProfile: React.FC<{ career: CareerState; p: Player; onClose: () => void }> = ({ career, p, onClose }) => {
  const a = p.attributes;
  const groups: [string, [string, number][]][] = [
    ['Pace', [['Acceleration', a.acceleration], ['Sprint Speed', a.sprintspeed]]],
    ['Shooting', [['Positioning', a.positioning], ['Finishing', a.finishing], ['Shot Power', a.shotpower], ['Long Shots', a.longshots], ['Volleys', a.volleys], ['Penalties', a.penalties]]],
    ['Passing', [['Vision', a.vision], ['Crossing', a.crossing], ['FK Accuracy', a.freekickaccuracy], ['Short Passing', a.shortpassing], ['Long Passing', a.longpassing], ['Curve', a.curve]]],
    ['Dribbling', [['Agility', a.agility], ['Balance', a.balance], ['Reactions', a.reactions], ['Ball Control', a.ballcontrol], ['Dribbling', a.dribbling], ['Composure', a.composure]]],
    ['Defending', [['Interceptions', a.interceptions], ['Heading Acc.', a.headingaccuracy], ['Def. Awareness', a.marking], ['Standing Tackle', a.standingtackle], ['Sliding Tackle', a.slidingtackle]]],
    ['Physical', [['Jumping', a.jumping], ['Stamina', a.stamina], ['Strength', a.strength], ['Aggression', a.aggression]]],
  ];
  if (p.primaryPosition === 'GK') {
    groups.unshift(['Goalkeeping', [['Diving', a.gkdiving], ['Handling', a.gkhandling], ['Kicking', a.gkkicking], ['Reflexes', a.gkreflexes], ['Positioning', a.gkpositioning]]]);
  }
  const tone = (v: number) => (v >= 80 ? 'bg-[#1fbf75] text-[#04150c]' : v >= 65 ? 'bg-[#4f5d68] text-white' : 'bg-[#d9434f] text-white');
  const { first, last } = splitName(p);
  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-[3px]" onClick={onClose}>
      <div className="absolute left-[5vw] right-[5vw] top-[14vh] bottom-[9vh] rounded-[8px] p-[2vw] overflow-y-auto" style={{ background: 'rgba(24,34,50,0.96)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-end justify-between">
          <div>
            <div className="uppercase tracking-[0.04em] text-white/60 text-[clamp(11px,1vw,19px)]">{first}</div>
            <div className="font-expanded font-black uppercase text-[clamp(22px,2.2vw,42px)] leading-none">{last}</div>
          </div>
          <div className="flex gap-[2vw] text-[clamp(11px,1vw,19px)]">
            {(
              [
                ['Age', p.age],
                ['Height', heightLabel(p.heightCm)],
                ['Foot', p.preferredFoot],
                ['Skill Moves', '★'.repeat(p.skillMoves)],
                ['Weak Foot', '★'.repeat(p.weakFoot)],
                ['Accel. Type', accelerationType(p)],
                ['Contract', contractLengthLabel(p.contractEndYear, career.currentDate)],
              ] as const
            ).map(([l, v]) => (
              <div key={l}><div className="text-white/60">{l}</div><div className="font-bold">{v}</div></div>
            ))}
          </div>
        </div>
        <div className="mt-[3vh] grid grid-cols-3 gap-[2vw]">
          {groups.map(([g, attrs]) => (
            <div key={g}>
              <div className="font-bold text-[#8ff0cd] text-[clamp(12px,1.05vw,20px)] border-b border-white/20 pb-[0.6vh]">{g}</div>
              {attrs.map(([l, v]) => (
                <div key={l} className="flex items-center justify-between py-[0.5vh] text-[clamp(11px,0.98vw,18px)]">
                  <span className="text-white/80">{l}</span>
                  <span className={`min-w-[2.2vw] text-center rounded-[3px] px-[0.3vw] font-bold ${tone(v)}`}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {p.playStyles.length > 0 && (
          <div className="mt-[2.4vh] text-[clamp(11px,0.98vw,18px)]">
            <span className="text-white/60">PlayStyles: </span>
            {p.playStyles.join(' · ')}
          </div>
        )}
        <div className="mt-[2vh] flex items-center gap-[0.5vw] text-white/80 text-[clamp(11px,0.98vw,18px)]"><PadGlyph shape="circle" /> Back</div>
      </div>
    </div>
  );
};
