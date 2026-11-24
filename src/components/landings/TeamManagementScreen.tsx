import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { FORMATIONS } from '../../engine/ratings';
import { CareerState, Club, FormationId, Player, TacticalSlot } from '../../engine/types';
import { LayerBackdrop, LayerHeader, PadGlyph, PagerDots, PlayerBust } from '../fc/HubCarousel';

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
}) => {
  const [phase, setPhase] = useState<Phase>('WITHOUT_BALL');
  const [cursor, setCursor] = useState<Cursor>({ zone: 'pitch', slot: club.lineup.length - 1 });
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formationList, setFormationList] = useState<number | null>(null);
  const benchScrollRef = useRef<HTMLDivElement>(null);

  const formations = Object.keys(FORMATIONS) as FormationId[];
  const lineupIds = new Set(club.lineup.map((s) => s.playerId).filter(Boolean) as number[]);
  const subs = club.benchIds.map((id) => career.players[id]).filter(Boolean);
  const reserves = squad.filter((p) => !lineupIds.has(p.id) && !club.benchIds.includes(p.id));
  const bench: { p: Player; kind: 'SUB' | 'RES' }[] = [
    ...subs.map((p) => ({ p, kind: 'SUB' as const })),
    ...reserves.map((p) => ({ p, kind: 'RES' as const })),
  ];

  const slotXY = (s: TacticalSlot) => (phase === 'WITH_BALL' ? [s.withBallX, s.withBallY] : [s.x, s.y]) as [number, number];
  const focusedPlayer: Player | undefined =
    cursor.zone === 'pitch'
      ? (club.lineup[cursor.slot]?.playerId ? career.players[club.lineup[cursor.slot].playerId!] : undefined)
      : bench[cursor.index]?.p;
  const focusedSlot = cursor.zone === 'pitch' ? club.lineup[cursor.slot] : undefined;

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(t);
  }, [notice]);

  // Keep the focused bench card in view.
  useLayoutEffect(() => {
    if (cursor.zone !== 'bench') return;
    benchScrollRef.current
      ?.querySelector<HTMLElement>(`[data-bench-index="${cursor.index}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
      // Two substitutes (or two reserves) have no positions to exchange.
      setNotice('Pick a player from the Starting XI (or a sub ↔ reserve) to swap with.');
      setSwapSource(null);
      return;
    }
    onSwap(swapSource, target.id);
    setSwapSource(null);
  };

  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (cursor.zone === 'bench') {
      if (dir === 'left') setCursor({ zone: 'bench', index: Math.max(0, cursor.index - 1) });
      else if (dir === 'right') setCursor({ zone: 'bench', index: Math.min(bench.length - 1, cursor.index + 1) });
      else if (dir === 'up') {
        // Back onto the pitch: nearest deep-lying token to the card's horizontal position.
        const el = benchScrollRef.current?.querySelector<HTMLElement>(`[data-bench-index="${cursor.index}"]`);
        const box = benchScrollRef.current?.getBoundingClientRect();
        const cardX = el && box ? ((el.getBoundingClientRect().left + el.offsetWidth / 2) / window.innerWidth) * 100 : 50;
        let best = 0;
        let bestScore = Infinity;
        club.lineup.forEach((s, i) => {
          const [x, y] = slotXY(s);
          const score = Math.abs(x - cardX) + (100 - y) * 1.4;
          if (score < bestScore) {
            bestScore = score;
            best = i;
          }
        });
        setCursor({ zone: 'pitch', slot: best });
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
      setCursor({ zone: 'bench', index: Math.min(bench.length - 1, Math.round((cx / 100) * Math.min(bench.length - 1, 9))) });
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
    const isConfirm = k === ' ' || k === 'Enter';
    const isBack = k === 'Escape' || k === 'b';

    if (formationList !== null) {
      swallow();
      if (isBack) setFormationList(null);
      else if (isConfirm && !e.repeat) {
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
      return;
    }
    if (/^[1-8]$/.test(k)) return swallow();
    if (isBack) {
      swallow();
      if (swapSource !== null) setSwapSource(null);
      else onBack();
      return;
    }
    if (section !== 'Squad') return;

    if (dir) {
      swallow();
      move(dir);
    } else if (isConfirm && !e.repeat) {
      swallow();
      confirm();
    } else if (k === 'r') {
      swallow();
      setPhase((p) => (p === 'WITH_BALL' ? 'WITHOUT_BALL' : 'WITH_BALL'));
    } else if (k === 'f') {
      swallow();
      onSection('Tactics');
    } else if (k === 't' || k === 'y') {
      swallow();
      setFormationList(Math.max(0, formations.indexOf(club.formation)));
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handlerRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const swapName = swapSource !== null ? career.players[swapSource]?.knownAs : null;

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
        }}
      />

      {section !== 'Squad' && (
        <div className="absolute inset-x-0 top-[13vh] bottom-[7vh] overflow-y-auto px-[5vw] pb-[2vh]">
          <div className="mx-auto max-w-[1560px]">{section === 'Tactics' ? tacticsContent : assignmentsContent}</div>
        </div>
      )}

      {section === 'Squad' && (
        <>
          {/* Tactic preset: name · code · Active */}
          <div className="absolute inset-x-0 top-[12vh] text-center">
            <h1 className="font-expanded font-black uppercase tracking-[0.01em] text-[clamp(24px,2.55vw,48px)] leading-none">
              {club.name} Default
            </h1>
            <div className="mt-[1.4vh] flex items-center justify-center gap-[1.3vw] text-[clamp(12px,1vw,19px)]">
              <span className="text-white/70">Code: {tacticCode}</span>
              <span className="inline-flex items-center gap-[0.4vw] text-[#3fe07a]">
                <span className="inline-flex items-center justify-center rounded-full bg-[#3fe07a] w-[1.15vw] h-[1.15vw] min-w-[15px] min-h-[15px]">
                  <Check className="w-[70%] h-[70%] text-[#0c1a2a]" strokeWidth={3.5} />
                </span>
                Active
              </span>
            </div>
          </div>

          {/* Left: tactic summary (image (6) list style) */}
          <div className="absolute left-[4.2vw] top-[30vh] w-[19vw]">
            {[
              ['Formation', club.formation.toUpperCase()],
              ['Tactical Vision', club.tacticalVision.toUpperCase()],
              ['Build-Up Style', (BUILD_UP[club.tacticalVision] ?? 'Balanced').toUpperCase()],
              ['Defensive Approach', lineLabel(club.defensiveLineHeight).toUpperCase()],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-white/15 py-[2.1vh]">
                <span className="text-white text-[clamp(12px,1.1vw,20px)]">{label}</span>
                <span className="font-bold tracking-wide text-[clamp(11px,0.98vw,18px)] text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Pitch */}
          <div className="absolute left-1/2 top-[29vh] -translate-x-1/2 w-[50vw]" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
            <PitchTurf />
            {/* Without / With Ball pager */}
            <div className="absolute right-0 -top-[7.4vh] flex flex-col items-end gap-[0.6vh]">
              <span className="font-medium text-[clamp(14px,1.35vw,26px)]">{phase === 'WITH_BALL' ? 'With Ball' : 'Without Ball'}</span>
              <PagerDots
                count={2}
                index={phase === 'WITH_BALL' ? 1 : 0}
                onCycle={() => setPhase((p) => (p === 'WITH_BALL' ? 'WITHOUT_BALL' : 'WITH_BALL'))}
              />
            </div>

            {club.lineup.map((slot, i) => {
              const p = slot.playerId ? career.players[slot.playerId] : null;
              if (!p) return null;
              const [x, y] = slotXY(slot);
              const [lx, ly] = slotPct(x, y);
              const focused = cursor.zone === 'pitch' && cursor.slot === i;
              return (
                <RoleCard
                  key={slot.slotIndex}
                  player={p}
                  slot={slot}
                  leftPct={lx}
                  topPct={ly}
                  focused={focused}
                  swapSource={swapSource === p.id}
                  captain={club.captainId === p.id}
                  onHover={() => setCursor({ zone: 'pitch', slot: i })}
                  onClick={() => {
                    setCursor({ zone: 'pitch', slot: i });
                    if (focused) confirm();
                  }}
                />
              );
            })}
          </div>

          {/* Right: focused player readout */}
          {focusedPlayer && (
            <div className="absolute right-[4.2vw] top-[30vh] w-[18vw]">
              <div className="text-[#8ff0cd] font-bold text-[clamp(11px,0.95vw,18px)]">
                {focusedSlot ? `${focusedSlot.position} · ${focusedSlot.roleTitle || focusedPlayer.roleTitle}` : `${focusedPlayer.primaryPosition} · ${bench[(cursor as { index: number }).index]?.kind === 'SUB' ? 'Substitute' : 'Reserve'}`}
              </div>
              <div className="mt-[0.6vh] flex items-center justify-between gap-[1vw]">
                <span className="font-bold truncate text-[clamp(18px,1.7vw,32px)]">{focusedPlayer.knownAs}</span>
                <OvrDiamond ovr={focusedPlayer.dynamicOvr.dynamicOvr} delta={focusedPlayer.dynamicOvr.totalDelta} size="lg" />
              </div>
              {(
                [
                  ['Form', focusedPlayer.dynamicOvr.formLabel, focusedPlayer.dynamicOvr.formDelta],
                  ['Morale', focusedPlayer.dynamicOvr.moraleLabel, focusedPlayer.dynamicOvr.moraleDelta],
                  ['Match Fitness', `${focusedPlayer.matchFitness}%`, focusedPlayer.dynamicOvr.fitnessDelta],
                ] as const
              ).map(([label, value, d]) => (
                <div key={label} className="flex items-center justify-between border-b border-white/15 py-[1.6vh] text-[clamp(12px,1.02vw,19px)]">
                  <span className="text-white/75">{label}</span>
                  <span>
                    {value}
                    <span className="ml-[0.6vw] font-bold" style={{ color: deltaTone(d) }}>
                      {d > 0 ? `+${d}` : d} OVR
                    </span>
                  </span>
                </div>
              ))}
              <div className="mt-[2vh] min-h-[6vh] text-[clamp(11px,0.95vw,18px)]">
                {swapName ? (
                  <span className="text-amber-200">
                    Swapping <strong className="text-white">{swapName}</strong> — move to a player and press ✕
                  </span>
                ) : notice ? (
                  <span className="text-amber-200">{notice}</span>
                ) : (
                  <span className="text-white/55">Press ✕ to pick this player for a swap</span>
                )}
              </div>
            </div>
          )}

          {/* Substitutes & Reserves ribbon */}
          <div className="absolute left-[4.2vw] right-[4.2vw] top-[74vh]">
            <div className="flex items-baseline gap-[1.2vw] text-[clamp(11px,0.95vw,18px)] font-bold">
              <span className="text-[#38f2c8]">Substitutes ({subs.length})</span>
              <span className="text-white/45">Reserves ({reserves.length})</span>
            </div>
            <div ref={benchScrollRef} className="mt-[1vh] flex gap-[0.7vw] overflow-x-auto pb-[0.8vh] pt-[0.8vh] px-[0.4vw]">
              {bench.map(({ p, kind }, i) => {
                const focused = cursor.zone === 'bench' && cursor.index === i;
                const isSrc = swapSource === p.id;
                const firstReserve = kind === 'RES' && (i === 0 || bench[i - 1].kind === 'SUB');
                return (
                  <React.Fragment key={p.id}>
                    {firstReserve && <div className="shrink-0 w-px self-stretch bg-white/25 mx-[0.4vw]" aria-hidden />}
                    <button
                      type="button"
                      data-bench-index={i}
                      onMouseEnter={() => setCursor({ zone: 'bench', index: i })}
                      onClick={() => {
                        setCursor({ zone: 'bench', index: i });
                        if (focused) confirm();
                      }}
                      className={`relative shrink-0 w-[7.2vw] min-w-[92px] rounded-[5px] px-[0.5vw] pt-[0.7vh] pb-[1vh] text-left transition-all duration-150 ${
                        kind === 'RES' && !focused && !isSrc ? 'opacity-75' : ''
                      }`}
                      style={{
                        background: focused
                          ? 'linear-gradient(158deg, rgba(128,146,176,0.66), rgba(80,98,130,0.6) 50%, rgba(112,106,154,0.58))'
                          : isSrc
                          ? 'linear-gradient(158deg, rgba(180,140,60,0.45), rgba(60,52,40,0.7))'
                          : 'linear-gradient(180deg, rgba(42,57,82,0.86), rgba(30,42,62,0.9))',
                        border: focused ? '2px solid rgba(232,238,255,0.85)' : isSrc ? '2px solid #f5c344' : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: focused ? '0 0 20px rgba(196,210,255,0.35)' : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between font-bold text-[clamp(10px,0.85vw,16px)]">
                        <span className="text-white/80">{p.primaryPosition}</span>
                        <span style={{ color: deltaTone(p.dynamicOvr.totalDelta) }}>{p.dynamicOvr.dynamicOvr}</span>
                      </div>
                      <div className="flex justify-center -mt-[0.2vh]">
                        <PlayerBust src={p.headshotUrl} alt={p.knownAs} />
                      </div>
                      <div className="mt-[0.4vh] truncate text-center font-bold uppercase text-[clamp(9px,0.72vw,13px)]">
                        {p.jerseyName || p.knownAs}
                      </div>
                      <div className="mt-[0.6vh] h-[3px] rounded-full bg-white/15 overflow-hidden">
                        <div
                          className={`h-full ${p.matchFitness >= 78 ? 'bg-[#38f2c8]' : p.matchFitness >= 58 ? 'bg-amber-400' : 'bg-rose-500'}`}
                          style={{ width: `${p.matchFitness}%` }}
                        />
                      </div>
                      {isSrc && (
                        <span className="absolute -top-[1.1vh] left-1/2 -translate-x-1/2 rounded bg-[#f5c344] px-[0.4vw] text-[clamp(8px,0.6vw,11px)] font-black text-[#1a1406]">
                          SWAP
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Console controller bar */}
      <div className="absolute left-[2vw] bottom-[2vh] flex flex-wrap items-center gap-[2vw] text-white/90 text-[clamp(12px,1vw,19px)]">
        {section === 'Squad' && (
          <span className="flex items-center gap-[0.5vw]">
            <PadGlyph shape="cross" /> Select / Swap
          </span>
        )}
        <button type="button" onClick={() => (swapSource !== null ? setSwapSource(null) : onBack())} className="flex items-center gap-[0.5vw]">
          <PadGlyph shape="circle" /> Back
        </button>
        {section === 'Squad' && (
          <>
            <button type="button" onClick={() => onSection('Tactics')} className="flex items-center gap-[0.5vw]">
              <PadGlyph shape="square" /> Tactic Details
            </button>
            <button
              type="button"
              onClick={() => setFormationList(Math.max(0, formations.indexOf(club.formation)))}
              className="flex items-center gap-[0.5vw]"
            >
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
                  style={
                    focused
                      ? { background: 'linear-gradient(90deg, #d4fff4 0%, #ece2ff 55%, #e6d9ff 100%)', boxShadow: '0 0 22px rgba(214,200,255,0.45)' }
                      : undefined
                  }
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
