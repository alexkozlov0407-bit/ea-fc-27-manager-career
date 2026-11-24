import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { FORMATIONS } from '../../engine/ratings';
import { CareerState, Club, FormationId, Player, TacticalSlot } from '../../engine/types';
import { LayerBackdrop, LayerHeader, PadGlyph } from '../fc/HubCarousel';
import { FullProfile } from '../squad/SquadHubScreen';
import { accelerationType, heightLabel } from '../squad/playerFormat';

/**
 * Squad › Team Management — Starting XI layer, 1:1 with
 * inputs/screenshotspart2/image (5).png (role cards on the angled pitch) and
 * image (6).png (Without Ball / With Ball pager), plus the substitutes strip from
 * inputs/screenshots/image (2).png.
 */

export type MgmtSection = 'Squad' | 'Tactics' | 'Assignments';
const SECTIONS: MgmtSection[] = ['Squad', 'Tactics', 'Assignments'];
type Phase = 'WITHOUT_BALL' | 'WITH_BALL';
type Cursor = { zone: 'pitch'; slot: number } | { zone: 'bench'; index: number };

const BUILD_UP: Record<string, string> = {
  'Tiki-Taka': 'Short Passing',
  Gegenpressing: 'Balanced',
  'Wing Play': 'Balanced',
  'Counter-Attack': 'Counter',
  'Park the Bus': 'Long Ball',
  Standard: 'Balanced',
};

const lineLabel = (h: number) => (h >= 72 ? 'High' : h >= 58 ? 'Balanced' : h >= 45 ? 'Deep' : 'Very Deep');

// ---------------------------------------------------------------------------
// Perspective projection (viewBox 1000 × 440; top edge is 72% of the bottom edge,
// measured from the capture's pitch trapezoid).
// ---------------------------------------------------------------------------
const VB_W = 1000;
const VB_H = 440;
function project(x: number, y: number): [number, number] {
  const t = y / 100;
  const py = 20 + t * 410;
  const half = 360 + t * 140;
  return [500 + (x / 100 - 0.5) * 2 * half, py];
}
/**
 * Slot coords (x 0..100, y 0..100 attack→goal) → % of the pitch box. Formation data spans y≈10..89, which is
 * stretched over the full pitch depth (the ST card overhangs the top line and the GK sits on the goal line,
 * as in the capture) so each row of cards clears the next.
 */
function slotPct(x: number, y: number): [number, number] {
  const [px, py] = project(2 + x * 0.96, -6 + (y - 10) * 1.34);
  return [(px / VB_W) * 100, (py / VB_H) * 100];
}
const path = (pts: [number, number][], close = false) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${project(x, y).map((n) => n.toFixed(1)).join(' ')}`).join(' ') + (close ? ' Z' : '');
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, k = 1): [number, number][] =>
  Array.from({ length: 29 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / 28;
    return [cx + r * Math.cos(a), cy + r * k * Math.sin(a)];
  });

const PitchTurf: React.FC = () => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
    <path d={path([[0, 0], [100, 0], [100, 100], [0, 100]], true)} fill="rgba(16,26,42,0.55)" />
    <g fill="none" stroke="rgba(222,232,246,0.3)" strokeWidth="1.6" strokeLinejoin="round">
      <path d={path([[0, 0], [100, 0], [100, 100], [0, 100]], true)} />
      <path d={path([[0, 50], [100, 50]])} />
      <path d={path(arc(50, 50, 11, 0, Math.PI * 2, 1.25), true)} />
      <path d={path([[27, 0], [27, 15], [73, 15], [73, 0]])} />
      <path d={path([[40, 0], [40, 5], [60, 5], [60, 0]])} />
      <path d={path(arc(50, 15, 8, 0, Math.PI, 0.5))} />
      <path d={path([[27, 100], [27, 85], [73, 85], [73, 100]])} />
      <path d={path([[40, 100], [40, 95], [60, 95], [60, 100]])} />
      <path d={path(arc(50, 85, 8, Math.PI, Math.PI * 2, 0.5))} />
      <path d={path(arc(0, 0, 1.6, 0, Math.PI / 2))} />
      <path d={path(arc(100, 0, 1.6, Math.PI / 2, Math.PI))} />
      <path d={path(arc(0, 100, 1.6, -Math.PI / 2, 0))} />
      <path d={path(arc(100, 100, 1.6, Math.PI, Math.PI * 1.5))} />
    </g>
  </svg>
);

const deltaTone = (d: number) => (d > 0 ? '#38f2c8' : d < 0 ? '#ff6b7a' : 'rgba(255,255,255,0.85)');
const familiarityPlus = (f: Player['roleFamiliarity']) => (f === 'Role++' ? '++' : f === 'Role+' ? '+' : '');

// ---------------------------------------------------------------------------
interface Props {
  career: CareerState;
  club: Club;
  squad: Player[];
  section: MgmtSection;
  onSection: (s: MgmtSection) => void;
  tacticCode: string;
  tacticsContent: React.ReactNode;
  assignmentsContent: React.ReactNode;
  onSwap: (a: number, b: number) => void;
  onFormation: (f: FormationId) => void;
  onBack: () => void;
  onGoSquadHub: () => void;
}

export const TeamManagementScreen: React.FC<Props> = ({
  career,
  club,
  squad,
  section,
  onSection,
  tacticCode,
  tacticsContent,
  assignmentsContent,
  onSwap,
  onFormation,
  onBack,
  onGoSquadHub,
}) => {
  const [phase, setPhase] = useState<Phase>('WITHOUT_BALL');
  const [cursor, setCursor] = useState<Cursor>({ zone: 'pitch', slot: club.lineup.length - 1 });
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formationList, setFormationList] = useState<number | null>(null);
  const [editingTactic, setEditingTactic] = useState(false);
  const [profileFor, setProfileFor] = useState<number | null>(null);
  const benchScrollRef = useRef<HTMLDivElement>(null);

  const formations = Object.keys(FORMATIONS) as FormationId[];
  const lineupIds = new Set(club.lineup.map((s) => s.playerId).filter(Boolean) as number[]);
  const subs = club.benchIds.map((id) => career.players[id]).filter(Boolean);
  const reserves = squad.filter((p) => !lineupIds.has(p.id) && !club.benchIds.includes(p.id));
  const bench: { p: Player; kind: 'SUB' | 'RES' }[] = [
    ...subs.map((p) => ({ p, kind: 'SUB' as const })),
    ...reserves.map((p) => ({ p, kind: 'RES' as const })),
  ];
  const BENCH_COLS = 6;
  /** Grid position of a bench index (subs and reserves are separate grids of 6 per row). */
  const benchPos = (i: number) => {
    const res = i >= subs.length;
    const local = res ? i - subs.length : i;
    return { res, row: Math.floor(local / BENCH_COLS), col: local % BENCH_COLS };
  };

  const slotXY = (s: TacticalSlot) => (phase === 'WITH_BALL' ? [s.withBallX, s.withBallY] : [s.x, s.y]) as [number, number];
  const focusedPlayer: Player | undefined =
    cursor.zone === 'pitch'
      ? (club.lineup[cursor.slot]?.playerId ? career.players[club.lineup[cursor.slot].playerId!] : undefined)
      : bench[cursor.index]?.p;
  const focusedSlot = cursor.zone === 'pitch' ? club.lineup[cursor.slot] : club.lineup.find((s) => s.playerId === focusedPlayer?.id);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(t);
  }, [notice]);

  useLayoutEffect(() => {
    if (cursor.zone !== 'bench') return;
    benchScrollRef.current?.querySelector<HTMLElement>(`[data-bench-index="${cursor.index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  // ---- actions -------------------------------------------------------------
  const confirm = () => {
    const target = focusedPlayer;
    if (!target) return;
    if (swapSource === null) {
      setSwapSource(target.id);
      return;
    }
    if (swapSource === target.id) {
      setSwapSource(null);
      return;
    }
    const srcInXI = lineupIds.has(swapSource);
    const tgtInXI = lineupIds.has(target.id);
    const srcOnBench = club.benchIds.includes(swapSource);
    const tgtOnBench = club.benchIds.includes(target.id);
    if (!srcInXI && !tgtInXI && srcOnBench === tgtOnBench) {
      setNotice('Pick a player from the Starting XI (or a sub ↔ reserve) to swap with.');
      setSwapSource(null);
      return;
    }
    onSwap(swapSource, target.id);
    setSwapSource(null);
  };

  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (cursor.zone === 'bench') {
      const { res, row, col } = benchPos(cursor.index);
      const groupStart = res ? subs.length : 0;
      const groupLen = res ? reserves.length : subs.length;
      const local = cursor.index - groupStart;
      if (dir === 'left') setCursor({ zone: 'bench', index: Math.max(groupStart, cursor.index - 1) });
      else if (dir === 'right') setCursor({ zone: 'bench', index: Math.min(groupStart + groupLen - 1, cursor.index + 1) });
      else if (dir === 'down') {
        if (local + BENCH_COLS < groupLen) setCursor({ zone: 'bench', index: cursor.index + BENCH_COLS });
        else if (!res && reserves.length) setCursor({ zone: 'bench', index: subs.length + Math.min(col, reserves.length - 1) });
      } else if (dir === 'up') {
        if (row > 0) setCursor({ zone: 'bench', index: cursor.index - BENCH_COLS });
        else if (res && subs.length) {
          const lastRow = Math.floor((subs.length - 1) / BENCH_COLS);
          setCursor({ zone: 'bench', index: Math.min(subs.length - 1, lastRow * BENCH_COLS + col) });
        } else {
          // Back onto the pitch: deepest token nearest this column.
          const colX = ((col + 0.5) / BENCH_COLS) * 100;
          let best = 0;
          let bestScore = Infinity;
          club.lineup.forEach((s, i) => {
            const [x, y] = slotXY(s);
            const score = Math.abs(x - colX) + (100 - y) * 1.4;
            if (score < bestScore) {
              bestScore = score;
              best = i;
            }
          });
          setCursor({ zone: 'pitch', slot: best });
        }
      }
      return;
    }
    const [cx, cy] = slotXY(club.lineup[cursor.slot]);
    let best = -1;
    let bestScore = Infinity;
    club.lineup.forEach((s, i) => {
      if (i === cursor.slot) return;
      const [x, y] = slotXY(s);
      const dx = x - cx;
      const dy = y - cy;
      const primary = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
      const secondary = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
      if (primary <= 2) return;
      const score = primary + secondary * 1.8;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) setCursor({ zone: 'pitch', slot: best });
    else if (dir === 'down' && bench.length) {
      setCursor({ zone: 'bench', index: Math.min(subs.length - 1, Math.round((cx / 100) * (BENCH_COLS - 1))) });
    }
  };

  // ---- keyboard (capture phase: Q/E and 1-8 must not reach the main tab bar) ----
  const handlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  handlerRef.current = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const swallow = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const dir =
      k === 'w' || k === 'ArrowUp' ? 'up' : k === 's' || k === 'ArrowDown' ? 'down' : k === 'a' || k === 'ArrowLeft' ? 'left' : k === 'd' || k === 'ArrowRight' ? 'right' : null;
    const isConfirm = (k === ' ' || k === 'Enter') && !e.repeat;
    const isBack = k === 'Escape' || k === 'b';

    if (profileFor !== null) {
      swallow();
      if (isBack || k === 't') setProfileFor(null);
      return;
    }
    if (formationList !== null) {
      swallow();
      if (isBack) setFormationList(null);
      else if (isConfirm) {
        onFormation(formations[formationList]);
        setFormationList(null);
        setSwapSource(null);
      } else if (dir) {
        const step = dir === 'up' ? -2 : dir === 'down' ? 2 : dir === 'left' ? -1 : 1;
        setFormationList(Math.min(formations.length - 1, Math.max(0, formationList + step)));
      }
      return;
    }
    if (k === 'q' || k === '[' || k === 'e' || k === ']') {
      swallow();
      const d = k === 'q' || k === '[' ? -1 : 1;
      onSection(SECTIONS[(SECTIONS.indexOf(section) + d + SECTIONS.length) % SECTIONS.length]);
      setSwapSource(null);
      setEditingTactic(false);
      return;
    }
    if (/^[1-8]$/.test(k)) return swallow();
    if (isBack) {
      swallow();
      if (editingTactic) setEditingTactic(false);
      else if (swapSource !== null) setSwapSource(null);
      else onBack();
      return;
    }

    if (section === 'Tactics' && !editingTactic) {
      if (isConfirm) {
        swallow();
        setEditingTactic(true);
      } else if (k === 'r') {
        swallow();
        setPhase((p) => (p === 'WITH_BALL' ? 'WITHOUT_BALL' : 'WITH_BALL'));
      } else if (k === 't' || k === 'y') {
        swallow();
        setFormationList(Math.max(0, formations.indexOf(club.formation)));
      }
      return;
    }
    if (section !== 'Squad') return;

    if (dir) {
      swallow();
      move(dir);
    } else if (isConfirm) {
      swallow();
      confirm();
    } else if (k === 'c') {
      swallow();
      setPhase((p) => (p === 'WITH_BALL' ? 'WITHOUT_BALL' : 'WITH_BALL'));
    } else if (k === 'f') {
      swallow();
      onSection('Tactics');
      setEditingTactic(true);
    } else if (k === 't' && focusedPlayer) {
      swallow();
      setProfileFor(focusedPlayer.id);
    } else if (k === 'r') {
      swallow();
      onGoSquadHub();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handlerRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const benchFocused = cursor.zone === 'bench';
  const profilePlayer = profileFor !== null ? career.players[profileFor] : undefined;

  const tokenProps = (p: Player) => ({
    focused: focusedPlayer?.id === p.id,
    swapSource: swapSource === p.id,
    captain: club.captainId === p.id,
  });

  return (
    <div className="fixed inset-0 z-40 overflow-hidden text-white select-none">
      <LayerBackdrop />
      <LayerHeader
        parent="Squad"
        title="Team Management"
        tabs={SECTIONS}
        active={section}
        onTab={(t) => {
          onSection(t as MgmtSection);
          setSwapSource(null);
          setEditingTactic(false);
        }}
      />

      {/* ============================================ SQUAD (image (2) + bench-focus capture) */}
      {section === 'Squad' && (
        <>
          <div
            className="absolute left-[4.7vw] top-[12.4vh] w-[52vw] h-[46vh] transition-[filter,opacity] duration-300"
            style={benchFocused ? { filter: 'saturate(0.25) brightness(0.75)', opacity: 0.45 } : undefined}
          >
            <GreenPitch />
            {club.lineup.map((slot, i) => {
              const p = slot.playerId ? career.players[slot.playerId] : null;
              if (!p) return null;
              const [x, y] = slotXY(slot);
              const [lx, ly] = flatPitchPct(x, y);
              return (
                <div
                  key={slot.slotIndex}
                  className="absolute -translate-x-1/2 -translate-y-[62%] transition-[left,top] duration-500 ease-out"
                  style={{ left: `${lx}%`, top: `${ly}%` }}
                >
                  <BustToken
                    player={p}
                    position={slot.position}
                    size="pitch"
                    {...tokenProps(p)}
                    onHover={() => setCursor({ zone: 'pitch', slot: i })}
                    onClick={() => {
                      const already = cursor.zone === 'pitch' && cursor.slot === i;
                      setCursor({ zone: 'pitch', slot: i });
                      if (already) confirm();
                    }}
                  />
                </div>
              );
            })}
          </div>
          {!benchFocused && (
            <div className="absolute left-[4.7vw] top-[59.4vh] flex items-center gap-[1.2vw] text-[clamp(12px,1.02vw,19px)]">
              <span>{phase === 'WITH_BALL' ? 'With Ball' : 'Without Ball'}</span>
              <button type="button" onClick={() => setPhase((p) => (p === 'WITH_BALL' ? 'WITHOUT_BALL' : 'WITH_BALL'))} className="flex items-center gap-[0.4vw] text-white/80">
                <span className="inline-flex items-center justify-center rounded-full bg-white/25 font-bold w-[clamp(16px,1.25vw,24px)] h-[clamp(16px,1.25vw,24px)] text-[clamp(8px,0.65vw,12px)]">C</span>
                Switch View
              </button>
            </div>
          )}

          {/* Substitutes / Reserves panel: slides up over the pitch when the cursor is in it */}
          <div
            className="absolute left-[4.7vw] w-[52vw] bottom-[8.6vh] rounded-[6px] px-[1.7vw] pt-[2.4vh] transition-[top] duration-300 ease-out"
            style={{ top: benchFocused ? '41.2vh' : '63.6vh', background: 'rgba(30,42,62,0.92)' }}
          >
            <div ref={benchScrollRef} className="h-full overflow-y-auto pb-[2vh]">
              {(
                [
                  ['Substitutes', subs, 0],
                  ['Reserves', reserves, subs.length],
                ] as const
              ).map(([title, list, offset]) =>
                list.length ? (
                  <div key={title} className="mb-[2.4vh]">
                    <div className="font-bold text-[#38f2c8] text-[clamp(13px,1.15vw,22px)]">{title}</div>
                    <div className="mt-[1.4vh] grid grid-cols-6 gap-y-[2.6vh]">
                      {list.map((p, j) => (
                        <div key={p.id} data-bench-index={offset + j} className="flex justify-center">
                          <BustToken
                            player={p}
                            position={p.primaryPosition}
                            size="bench"
                            {...tokenProps(p)}
                            onHover={() => setCursor({ zone: 'bench', index: offset + j })}
                            onClick={() => {
                              const already = cursor.zone === 'bench' && cursor.index === offset + j;
                              setCursor({ zone: 'bench', index: offset + j });
                              if (already) confirm();
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {focusedPlayer && (
            <PlayerDetailPanel
              p={focusedPlayer}
              slot={focusedSlot}
              notice={swapSource !== null ? `Swapping ${career.players[swapSource]?.knownAs ?? ''} — pick a player and press ✕` : notice}
            />
          )}
        </>
      )}

      {/* ============================================ TACTICS (image (5)) */}
      {section === 'Tactics' && !editingTactic && (
        <>
          <div className="absolute inset-x-0 top-[13.4vh] text-center">
            <h1 className="font-expanded font-black uppercase tracking-[0.01em] text-[clamp(24px,2.55vw,48px)] leading-none">{club.name} Default</h1>
            <div className="mt-[1.6vh] flex items-center justify-center gap-[1.3vw] text-[clamp(12px,1vw,19px)]">
              <span className="text-white/70">Code: {tacticCode}</span>
              <span className="inline-flex items-center gap-[0.4vw] text-[#3fe07a]">
                <span className="inline-flex items-center justify-center rounded-full bg-[#3fe07a] w-[1.15vw] h-[1.15vw] min-w-[15px] min-h-[15px]">
                  <Check className="w-[70%] h-[70%] text-[#0c1a2a]" strokeWidth={3.5} />
                </span>
                Active
              </span>
            </div>
          </div>
          <div className="absolute left-1/2 top-[31vh] -translate-x-1/2 w-[41.5vw]" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
            <PitchTurf />
            {club.lineup.map((slot) => {
              const p = slot.playerId ? career.players[slot.playerId] : null;
              if (!p) return null;
              const [x, y] = slotXY(slot);
              const [lx, ly] = slotPct(x, y);
              return (
                <RoleCard
                  key={slot.slotIndex}
                  player={p}
                  slot={slot}
                  leftPct={lx}
                  topPct={ly}
                  focused={false}
                  swapSource={false}
                  captain={club.captainId === p.id}
                  onHover={() => {}}
                  onClick={() => setEditingTactic(true)}
                />
              );
            })}
          </div>
          <div className="absolute left-1/2 top-[72.6vh] -translate-x-1/2 grid grid-cols-3 w-[39vw] text-center">
            {(
              [
                ['Formation', club.formation.toUpperCase()],
                ['Build-Up Style', BUILD_UP[club.tacticalVision] ?? 'Balanced'],
                ['Defensive Approach', lineLabel(club.defensiveLineHeight)],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <div className="text-white/85 text-[clamp(12px,1.02vw,19px)]">{label}</div>
                <div className="mt-[2vh] font-bold text-[clamp(18px,1.68vw,32px)]">{value}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEditingTactic(true)}
            className="absolute left-1/2 top-[85.8vh] -translate-x-1/2 h-[5.9vh] min-h-[40px] px-[1.6vw] rounded-[5px] flex items-center gap-[0.8vw] font-bold text-[#141824] text-[clamp(14px,1.25vw,24px)]"
            style={{ background: 'linear-gradient(90deg, #d4fff4 0%, #ece2ff 60%, #e6d9ff 100%)', boxShadow: '0 0 26px rgba(214,200,255,0.55)' }}
          >
            <PadGlyph shape="cross" dark /> Edit Tactic
          </button>
        </>
      )}

      {((section === 'Tactics' && editingTactic) || section === 'Assignments') && (
        <div className="absolute inset-x-0 top-[13vh] bottom-[7vh] overflow-y-auto px-[5vw] pb-[2vh]">
          <div className="mx-auto max-w-[1560px]">{section === 'Tactics' ? tacticsContent : assignmentsContent}</div>
        </div>
      )}

      {/* ============================================ Controller bar */}
      <div className="absolute left-[2vw] bottom-[2vh] flex flex-wrap items-center gap-[2vw] text-white/90 text-[clamp(12px,1vw,19px)]">
        {section === 'Squad' && (
          <span className="flex items-center gap-[0.5vw]"><PadGlyph shape="cross" /> Select / Swap</span>
        )}
        {section === 'Tactics' && !editingTactic && (
          <button type="button" onClick={() => setEditingTactic(true)} className="flex items-center gap-[0.5vw]"><PadGlyph shape="cross" /> Edit Tactic</button>
        )}
        <button
          type="button"
          onClick={() => (editingTactic ? setEditingTactic(false) : swapSource !== null ? setSwapSource(null) : onBack())}
          className="flex items-center gap-[0.5vw]"
        >
          <PadGlyph shape="circle" /> Back
        </button>
        {section === 'Squad' && (
          <>
            <button type="button" onClick={() => { onSection('Tactics'); setEditingTactic(true); }} className="flex items-center gap-[0.5vw]">
              <PadGlyph shape="square" /> Edit Active Tactic
            </button>
            <button type="button" onClick={() => focusedPlayer && setProfileFor(focusedPlayer.id)} className="flex items-center gap-[0.5vw]">
              <PadGlyph shape="triangle" /> Full Profile
            </button>
            <button type="button" onClick={onGoSquadHub} className="flex items-center gap-[0.5vw]">
              <span className="inline-flex items-center justify-center rounded-full bg-white/25 font-bold w-[clamp(18px,1.4vw,26px)] h-[clamp(18px,1.4vw,26px)] text-[clamp(9px,0.72vw,14px)]">R</span>
              Go to Squad Hub
            </button>
          </>
        )}
        {section === 'Tactics' && !editingTactic && (
          <>
            <button type="button" onClick={() => setFormationList(Math.max(0, formations.indexOf(club.formation)))} className="flex items-center gap-[0.5vw]">
              <PadGlyph shape="triangle" /> Formation List
            </button>
            <span className="flex items-center gap-[0.5vw] text-white/70">
              <span className="inline-flex items-center justify-center rounded-full bg-white/25 font-bold w-[clamp(18px,1.4vw,26px)] h-[clamp(18px,1.4vw,26px)] text-[clamp(9px,0.72vw,14px)]">R</span>
              {phase === 'WITH_BALL' ? 'Without Ball' : 'With Ball'}
            </span>
          </>
        )}
      </div>

      {/* △ Formation List — centered option dialog */}
      {formationList !== null && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[3px]" onClick={() => setFormationList(null)}>
          <h2 className="font-bold text-[clamp(20px,2vw,38px)]">Formation</h2>
          <p className="mt-[1vh] text-white/70 text-[clamp(12px,1vw,19px)]">Players are re-picked for the new shape. Current: {club.formation}</p>
          <div className="mt-[4vh] grid grid-cols-2 gap-[1.2vh_1vw]" onClick={(e) => e.stopPropagation()}>
            {formations.map((f, i) => {
              const focused = i === formationList;
              return (
                <button
                  key={f}
                  type="button"
                  onMouseEnter={() => setFormationList(i)}
                  onClick={() => {
                    onFormation(f);
                    setFormationList(null);
                    setSwapSource(null);
                  }}
                  className={`flex items-center gap-[0.8vw] rounded-[5px] px-[1.4vw] h-[clamp(40px,6vh,58px)] min-w-[18vw] text-[clamp(13px,1.1vw,21px)] ${
                    focused ? 'font-bold text-[#141824]' : 'text-white border border-white/25 bg-black/80'
                  }`}
                  style={focused ? { background: 'linear-gradient(90deg, #d4fff4 0%, #ece2ff 55%, #e6d9ff 100%)', boxShadow: '0 0 22px rgba(214,200,255,0.45)' } : undefined}
                >
                  {focused && <PadGlyph shape="cross" dark />}
                  {f}
                  {f === club.formation && <Check className="ml-auto w-[1.2vw] h-[1.2vw] min-w-[14px]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {profilePlayer && <FullProfile career={career} p={profilePlayer} onClose={() => setProfileFor(null)} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Squad tab: flat green pitch, headshot tokens and the player detail panel
// ---------------------------------------------------------------------------
/** Gentle perspective for the Squad-tab pitch (top edge 82% of the bottom edge). */
function flatPitchPct(x: number, y: number): [number, number] {
  const t = Math.min(1, Math.max(0, (y - 8) / 86));
  const half = 41 + t * 8;
  return [50 + ((x - 50) / 50) * half * 0.94, 7 + t * 86];
}

const GreenPitch: React.FC = () => {
  const P = (x: number, y: number) => {
    const t = y / 100;
    const half = 41 + t * 8;
    return `${50 + ((x - 50) / 50) * half},${2 + t * 96}`;
  };
  const poly = (pts: [number, number][]) => pts.map(([x, y]) => P(x, y)).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
      <defs>
        <clipPath id="tm-turf">
          <polygon points={poly([[0, 0], [100, 0], [100, 100], [0, 100]])} />
        </clipPath>
      </defs>
      <g clipPath="url(#tm-turf)">
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x="0" y={i * 10} width="100" height="10" fill={i % 2 ? '#1d7a4c' : '#22875a'} />
        ))}
      </g>
      <g fill="none" stroke="rgba(235,255,240,0.55)" strokeWidth="0.35" vectorEffect="non-scaling-stroke">
        <polygon points={poly([[0, 0], [100, 0], [100, 100], [0, 100]])} />
        <polyline points={poly([[0, 50], [100, 50]])} />
        <polyline points={poly([[30, 0], [30, 16], [70, 16], [70, 0]])} />
        <polyline points={poly([[30, 100], [30, 84], [70, 84], [70, 100]])} />
        <polyline points={poly([[42, 0], [42, 6], [58, 6], [58, 0]])} />
        <polyline points={poly([[42, 100], [42, 94], [58, 94], [58, 100]])} />
        <polyline points={poly(Array.from({ length: 33 }, (_, i) => [50 + 11 * Math.cos((i / 32) * Math.PI * 2), 50 + 13 * Math.sin((i / 32) * Math.PI * 2)] as [number, number]))} />
      </g>
    </svg>
  );
};

/** Headshot token: position + OVR, bust, fitness bar and name (pill when focused). */
const BustToken: React.FC<{
  player: Player;
  position: string;
  size: 'pitch' | 'bench';
  focused: boolean;
  swapSource: boolean;
  captain: boolean;
  onHover: () => void;
  onClick: () => void;
}> = ({ player, position, size, focused, swapSource, captain, onHover, onClick }) => {
  const d = player.dynamicOvr;
  const fit = player.matchFitness;
  const bustH = size === 'pitch' ? 'h-[6.6vh]' : 'h-[6.2vh]';
  return (
    <button type="button" onMouseEnter={onHover} onClick={onClick} className="relative flex flex-col items-center w-[7.6vw] min-w-[86px]" aria-label={`${player.knownAs}, ${position}`}>
      <div className="relative flex items-end">
        <span className={`absolute -left-[1.6vw] bottom-[0.6vh] font-bold text-[clamp(9px,0.78vw,15px)] ${d.positionPenalty < 0 ? 'text-amber-300' : 'text-white/90'}`}>{position}</span>
        {player.headshotUrl ? (
          <img src={player.headshotUrl} alt="" className={`${bustH} w-auto object-contain object-bottom`} />
        ) : (
          <svg viewBox="0 0 100 92" className={`${bustH} w-auto`}>
            <ellipse cx="50" cy="34" rx="19" ry="23" fill="rgba(214,222,234,0.35)" />
            <path d="M8 92 C10 66 28 58 50 58 C72 58 90 66 92 92 Z" fill="rgba(214,222,234,0.28)" />
          </svg>
        )}
        <span
          className="absolute -right-[1.9vw] top-[0.4vh] font-expanded font-black text-[clamp(12px,1.12vw,21px)]"
          style={{ color: d.totalDelta > 0 ? '#38f2c8' : d.totalDelta < 0 ? '#ff8a7a' : '#fff' }}
        >
          {d.dynamicOvr}
        </span>
      </div>
      <span className="w-[5.2vw] min-w-[56px] h-[3px] rounded-full bg-black/40 overflow-hidden">
        <span className="block h-full" style={{ width: `${fit}%`, background: fit >= 78 ? '#3fe07a' : fit >= 58 ? '#f5c344' : '#ff5a4f' }} />
      </span>
      <span
        className={`mt-[0.5vh] flex items-center gap-[0.3vw] rounded-full font-expanded font-black uppercase whitespace-nowrap text-[clamp(8px,0.7vw,13px)] ${
          focused ? 'bg-white text-[#141824] px-[0.5vw] py-[0.15vh]' : swapSource ? 'bg-[#f5c344] text-[#1a1406] px-[0.5vw] py-[0.15vh]' : ''
        }`}
      >
        {focused && <PadGlyph shape="cross" dark />}
        {captain && <span className={`rounded-[2px] px-[0.2vw] ${focused ? 'bg-[#141824] text-white' : 'bg-[#f5c344] text-[#141824]'}`}>C</span>}
        {(player.jerseyName || player.knownAs.split(' ').slice(-1)[0]).slice(0, 14)}
      </span>
    </button>
  );
};

const PlayerDetailPanel: React.FC<{ p: Player; slot?: TacticalSlot; notice: string | null }> = ({ p, slot, notice }) => {
  const d = p.dynamicOvr;
  const fitnessLabel = p.matchFitness >= 85 ? 'Sharp' : p.matchFitness >= 70 ? 'Fit' : p.matchFitness >= 55 ? 'Tired' : 'Exhausted';
  const readiness = p.injury ? `Injured · ${p.injury.daysRemaining}d` : p.matchFitness < 60 ? 'Tired' : 'Ready to Play';
  const facets: [string, keyof Player['cardFacets']][] = [
    ['Pace', 'pac'],
    ['Shooting', 'sho'],
    ['Passing', 'pas'],
    ['Dribbling', 'dri'],
    ['Defending', 'def'],
    ['Physical', 'phy'],
  ];
  const bio: [string, React.ReactNode][] = [
    ['Age', p.age],
    ['Height', heightLabel(p.heightCm)],
    ['Role', slot?.roleTitle || '-'],
    ['Focus', slot?.focus || '-'],
    ['Acceleration T', accelerationType(p)],
    ['Foot', p.preferredFoot],
  ];
  const stars = (n: number) => (
    <span className="tracking-[0.05em]">
      <span className="text-[#d9b45a]">{'★'.repeat(n)}</span>
      <span className="text-white/25">{'★'.repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
  const chip = (label: string, delta: number) => (
    <span className="flex items-center gap-[0.5vw]">
      <span className="text-white/80">{label}</span>
      <span className="rounded-[3px] bg-white/10 px-[0.4vw] text-[0.9em]" style={{ color: deltaTone(delta) === 'rgba(255,255,255,0.85)' ? undefined : deltaTone(delta) }}>
        {delta > 0 ? `+${delta}` : delta} OVR
      </span>
    </span>
  );
  return (
    <div className="absolute left-[59.3vw] right-[4.8vw] top-[12.7vh] bottom-[8.6vh] rounded-[6px] px-[2.4vw] pt-[2.6vh]" style={{ background: 'rgba(32,44,64,0.9)' }}>
      <div className="flex items-end gap-[1.4vw] border-b border-white/15 pb-[1vh]">
        <div className="shrink-0 h-[10.4vh] w-[6.7vw] flex items-end justify-center overflow-hidden">
          {p.headshotUrl && <img src={p.headshotUrl} alt="" className="h-full w-auto object-contain object-bottom" />}
        </div>
        <div className="flex-1 min-w-0 pb-[0.6vh]">
          <div className="text-white/60 text-[clamp(11px,1vw,19px)]">{[p.primaryPosition, ...p.otherPositions.slice(0, 2)].join(' • ')}</div>
          <div className="flex items-center gap-[0.5vw]">
            <span className="inline-flex items-center justify-center rounded-[2px] bg-white/85 px-[0.25vw] text-[#1a2230] font-bold text-[clamp(8px,0.62vw,12px)]">{p.nationality.slice(0, 3).toUpperCase()}</span>
            <span className="font-expanded font-black uppercase truncate text-[clamp(15px,1.4vw,27px)]">{p.knownAs.split(' ').slice(-1)[0]}</span>
          </div>
          <div className="text-white/75 text-[clamp(11px,1vw,19px)]">
            Baseline OVR <b className="ml-[0.6vw] mr-[2vw] text-white">{p.baseOvr}</b> Potential <b className="ml-[0.4vw] text-white">{p.potential}</b>
          </div>
        </div>
        <span className="relative shrink-0 flex items-center justify-center w-[4.6vw] h-[4.6vw] min-w-[52px] min-h-[52px] mb-[1vh]">
          <span className="absolute inset-[14%] rotate-45 rounded-[4px] border-2" style={{ borderColor: deltaTone(d.totalDelta) === 'rgba(255,255,255,0.85)' ? 'rgba(255,255,255,0.6)' : deltaTone(d.totalDelta) }} />
          {d.totalDelta > 0 && <span className="absolute -top-[0.6vh] text-[#45e07c] text-[clamp(9px,0.8vw,15px)]">▲</span>}
          <span className="relative font-expanded font-black text-[clamp(20px,2vw,38px)]">{d.dynamicOvr}</span>
        </span>
      </div>

      <div className="mt-[1.6vh] grid grid-cols-3 text-[clamp(11px,1vw,19px)]">
        <div>{chip('Form', d.formDelta)}<div className="mt-[0.6vh] font-medium">{d.formLabel}</div></div>
        <div>{chip('Morale', d.moraleDelta)}<div className="mt-[0.6vh] font-medium text-[#45e07c]">{d.moraleLabel}</div></div>
        <div>{chip('Match Fitness', d.fitnessDelta)}<div className="mt-[0.6vh] font-medium">{fitnessLabel}</div></div>
      </div>
      <div className={`mt-[1.4vh] rounded-[3px] bg-black/15 py-[0.7vh] text-center text-[clamp(12px,1.1vw,21px)] ${readiness === 'Ready to Play' ? '' : 'text-amber-300'}`}>
        {notice ?? readiness}
      </div>

      <div className="mt-[2vh] grid grid-cols-2 text-[clamp(11px,1vw,19px)]">
        <div className="border-r border-white/20 pr-[1.6vw]">
          {facets.map(([label, k]) => (
            <div key={k} className="flex items-center h-[5.25vh]">
              <span className="w-[8vw] text-white/75">{label}</span>
              <span className="w-[3vw] font-medium">{p.cardFacets[k]}</span>
              {d.facetDeltas[k] !== 0 && <span style={{ color: deltaTone(d.facetDeltas[k]) }}>{d.facetDeltas[k] > 0 ? `+${d.facetDeltas[k]}` : d.facetDeltas[k]}</span>}
            </div>
          ))}
          <div className="flex items-center h-[5.25vh] border-t border-white/15">
            <span className="w-[8vw] text-white/75">Skill Moves</span>
            {stars(p.skillMoves)}
          </div>
        </div>
        <div className="pl-[1.2vw]">
          {bio.map(([label, value]) => (
            <div key={label} className="flex items-center h-[5.25vh]">
              <span className="w-[7.6vw] truncate text-white/75">{label}</span>
              <span className="truncate font-medium">{value}</span>
            </div>
          ))}
          <div className="flex items-center h-[5.25vh] border-t border-white/15">
            <span className="w-[7.6vw] text-white/75">Weak Foot</span>
            {stars(p.weakFoot)}
          </div>
        </div>
      </div>

      <div className="mt-[1.4vh] text-right text-white/70 text-[clamp(11px,0.98vw,18px)]">PlayStyles</div>
      <div className="mt-[1vh] flex justify-between">
        {Array.from({ length: 10 }, (_, i) => {
          const ps = p.playStyles[i];
          return (
            <span key={i} className="relative inline-flex items-center justify-center w-[2.4vw] h-[2.4vw] min-w-[26px] min-h-[26px]" title={ps}>
              <span className={`absolute inset-[14%] rotate-45 rounded-[3px] ${ps ? 'bg-white' : 'bg-white/15'}`} />
              {ps && <span className="relative font-black text-[#1a2230] text-[clamp(7px,0.6vw,11px)]">{ps.replace(/[^A-Za-z ]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Role card token (dark shield card: Name · Role + · Focus · POS), with the
// jersey-number node top-left and a Dynamic OVR diamond top-right.
// ---------------------------------------------------------------------------
const RoleCard: React.FC<{
  player: Player;
  slot: TacticalSlot;
  leftPct: number;
  topPct: number;
  focused: boolean;
  swapSource: boolean;
  captain: boolean;
  onHover: () => void;
  onClick: () => void;
}> = ({ player, slot, leftPct, topPct, focused, swapSource, captain, onHover, onClick }) => {
  const plus = familiarityPlus(player.roleFamiliarity);
  const role = slot.roleTitle || player.roleTitle;
  const outOfPosition = player.dynamicOvr.positionPenalty < 0;
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onClick}
      aria-label={`${player.knownAs}, ${slot.position}`}
      className={`absolute w-[5.8vw] min-w-[80px] -translate-x-1/2 -translate-y-[64%] transition-[left,top,transform] duration-500 ease-out ${focused ? 'z-20 scale-[1.08]' : 'z-10'}`}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        filter: focused
          ? 'drop-shadow(0 0 9px rgba(214,222,255,0.75))'
          : swapSource
          ? 'drop-shadow(0 0 9px rgba(245,195,68,0.85))'
          : 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))',
      }}
    >
      <div
        className="relative px-[0.3vw] pt-[0.8vh] pb-[1.4vh] text-center leading-[1.15]"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%)',
          background: focused
            ? 'linear-gradient(170deg, #eef0ff 0%, #d9d6f2 100%)'
            : swapSource
            ? 'linear-gradient(180deg, #5a4a24 0%, #2c2616 100%)'
            : 'linear-gradient(180deg, rgba(44,50,62,0.97) 0%, rgba(26,32,44,0.97) 62%, rgba(30,44,74,0.97) 100%)',
          color: focused ? '#141824' : '#fff',
        }}
      >
        <div className="font-bold truncate text-[clamp(10px,0.82vw,15px)]">
          {captain && <span className="mr-[0.2vw] rounded-[2px] bg-[#f5c344] px-[0.2vw] text-[#141824] text-[0.85em]">C</span>}
          {player.knownAs.split(' ').slice(-1)[0]}
        </div>
        <div className="truncate text-[clamp(9px,0.76vw,14px)]">
          {role}
          {plus && <span className={`ml-[0.15vw] font-black ${focused ? 'text-[#0f9d58]' : 'text-[#3fe07a]'}`}>{plus}</span>}
        </div>
        <div className={`truncate text-[clamp(9px,0.74vw,14px)] ${focused ? 'text-[#4a4f63]' : 'text-white/60'}`}>{slot.focus}</div>
        <div className={`font-bold text-[clamp(10px,0.82vw,15px)] ${outOfPosition ? (focused ? 'text-[#b26b00]' : 'text-amber-300') : ''}`}>{slot.position}</div>
      </div>
      {/* Jersey number node */}
      <span
        className="absolute -left-[0.55vw] -top-[0.9vh] flex items-center justify-center w-[1.55vw] h-[1.55vw] min-w-[20px] min-h-[20px] font-bold text-[clamp(8px,0.66vw,12px)] text-white"
        style={{ clipPath: 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%)', background: '#0e1520', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)' }}
      >
        {player.jerseyNumber}
      </span>
      {/* Dynamic OVR diamond */}
      <span className="absolute -right-[0.7vw] -top-[1.1vh]">
        <OvrDiamond ovr={player.dynamicOvr.dynamicOvr} delta={player.dynamicOvr.totalDelta} size="sm" />
      </span>
    </button>
  );
};

const OvrDiamond: React.FC<{ ovr: number; delta: number; size: 'sm' | 'lg' }> = ({ ovr, delta, size }) => {
  const dim = size === 'sm' ? 'w-[1.9vw] h-[1.9vw] min-w-[24px] min-h-[24px]' : 'w-[3.2vw] h-[3.2vw] min-w-[40px] min-h-[40px]';
  return (
    <span className={`relative inline-flex items-center justify-center ${dim}`}>
      <span
        className="absolute inset-[15%] rotate-45 rounded-[2px]"
        style={{ background: '#0e1520', border: `2px solid ${deltaTone(delta)}`, boxShadow: delta !== 0 ? `0 0 8px ${deltaTone(delta)}66` : 'none' }}
      />
      <span className={`relative font-bold tabular-nums ${size === 'sm' ? 'text-[clamp(9px,0.72vw,13px)]' : 'text-[clamp(14px,1.2vw,22px)]'}`} style={{ color: deltaTone(delta) === 'rgba(255,255,255,0.85)' ? '#fff' : deltaTone(delta) }}>
        {ovr}
      </span>
    </span>
  );
};
