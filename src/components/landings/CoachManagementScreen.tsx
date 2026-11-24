import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, Scale, Star } from 'lucide-react';
import { GROWTH_PROFILES } from '../../engine/growth';
import { formatMoney } from '../../engine/ratings';
import { CareerState, Club, Coach, Player } from '../../engine/types';
import { LayerBackdrop, LayerHeader, PadGlyph, PagerDots, PlayerBust } from '../fc/HubCarousel';
import {
  COACH_TIER,
  DEPARTMENTS,
  MAX_BOOST_PCT,
  departmentSummary,
  shortPersonName,
  weeksToLevelUp,
} from './squadMetrics';

/**
 * Squad › Team Strategy › Coach Management — 1:1 with inputs/screenshotspart2/image (4).png.
 * Left: four department rows (Achieved vs Ideal stars, potential banner, head coach + tier badge, boost meter).
 * Right: pager (R) between "Development Boost" (focused department's players, weeks to next level)
 * and "Department Coaches" (3 slots: hired coaches or Available Slot → ▢ Hire Coach).
 */

const SLOTS_PER_DEPARTMENT = 3;
type Zone = 'dept' | 'slot';
type Page = 'boost' | 'coaches';

interface Props {
  career: CareerState;
  club: Club;
  squad: Player[];
  onToggleCoach: (coachId: string) => void;
  onBack: () => void;
}

export const CoachManagementScreen: React.FC<Props> = ({ career, club, squad, onToggleCoach, onBack }) => {
  const [dept, setDept] = useState(0);
  const [zone, setZone] = useState<Zone>('dept');
  const [slot, setSlot] = useState(0);
  const [page, setPage] = useState<Page>('boost');
  const boostListRef = useRef<HTMLDivElement>(null);

  const summaries = DEPARTMENTS.map((d) => ({ ...d, ...departmentSummary(club, squad, d.sector) }));
  const focused = summaries[dept];
  const cur = career.settings.currency;
  const hiredTotal = club.coaches.filter((c) => c.hired).length;

  const slotCoach = (i: number): Coach | undefined => focused.coaches[i];
  const candidate = club.coaches
    .filter((c) => !c.hired && c.department === focused.sector)
    .sort((a, b) => Number(b.tacticalStyle === club.tacticalVision) - Number(a.tacticalStyle === club.tacticalVision) || b.stars - a.stars)[0];

  const boostPlayers = [...focused.players]
    .map((p) => ({ p, weeks: weeksToLevelUp(p, focused.achieved) }))
    .sort((a, b) => (a.weeks ?? 999) - (b.weeks ?? 999));

  useLayoutEffect(() => {
    boostListRef.current?.scrollTo({ top: 0 });
  }, [dept]);

  // ▢ on a slot: hire the best market candidate into an empty slot, or release the coach in it.
  const squareAction = () => {
    if (zone !== 'slot') return;
    const coach = slotCoach(slot);
    if (coach) onToggleCoach(coach.id);
    else if (candidate) onToggleCoach(candidate.id);
  };

  const enterSlots = () => {
    setPage('coaches');
    setZone('slot');
    setSlot(Math.min(slot, SLOTS_PER_DEPARTMENT - 1));
  };

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
    if (k === 'q' || k === 'e' || k === '[' || k === ']' || /^[1-8]$/.test(k)) return swallow();
    if (k === 'Escape' || k === 'b') {
      swallow();
      if (zone === 'slot') setZone('dept');
      else onBack();
      return;
    }
    if (k === 'r') {
      swallow();
      setPage((p) => (p === 'boost' ? 'coaches' : 'boost'));
      if (zone === 'slot') setZone('dept');
      return;
    }
    const up = k === 'w' || k === 'ArrowUp';
    const down = k === 's' || k === 'ArrowDown';
    const left = k === 'a' || k === 'ArrowLeft';
    const right = k === 'd' || k === 'ArrowRight';
    const confirm = k === ' ' || k === 'Enter';
    if (zone === 'dept') {
      if (up || down) {
        swallow();
        setDept((d) => Math.min(DEPARTMENTS.length - 1, Math.max(0, d + (up ? -1 : 1))));
      } else if ((right || confirm) && !e.repeat) {
        swallow();
        enterSlots();
      } else if (k === 'f') {
        swallow();
        enterSlots();
      }
    } else {
      if (up || down) {
        swallow();
        setSlot((s) => Math.min(SLOTS_PER_DEPARTMENT - 1, Math.max(0, s + (up ? -1 : 1))));
      } else if (left) {
        swallow();
        setZone('dept');
      } else if ((confirm || k === 'f') && !e.repeat) {
        swallow();
        squareAction();
      }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handlerRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const squareLabel = zone === 'slot' && slotCoach(slot) ? 'Release Coach' : 'Hire Coach';

  return (
    <div className="fixed inset-0 z-40 overflow-hidden text-white select-none">
      <LayerBackdrop />
      <LayerHeader
        parent="Squad"
        title="Team Strategy"
        tabs={['Coach Management']}
        active="Coach Management"
        onTab={() => {}}
        bumpers={false}
        right={
          <div className="absolute right-[3.8vw] top-[5.2vh] flex items-center gap-[1.2vw]">
            <div className="text-right leading-tight">
              <div className="text-[clamp(14px,1.18vw,22px)]">{club.tacticalVision}</div>
              <div className="text-white/70 text-[clamp(12px,1.05vw,20px)]">Current Tactical Vision</div>
            </div>
            <Scale className="w-[2.9vw] h-[2.9vw] min-w-[34px] min-h-[34px]" strokeWidth={2.2} />
          </div>
        }
      />

      <p className="absolute left-[4.75vw] top-[15.2vh] w-[61vw] text-white/90 leading-[1.45] text-[clamp(13px,1.12vw,21px)]">
        Each department generates development efficiency based on how many stars the department has. This reduces the
        development plan&apos;s estimated time.
      </p>

      {/* ------------------------------------------------ Department rows */}
      <div className="absolute left-[4.75vw] top-[22.2vh] w-[60.5vw] flex flex-col gap-[1.1vh]">
        {summaries.map((d, i) => {
          const isFocused = i === dept;
          const head = d.coaches[0];
          return (
            <div
              key={d.sector}
              role="button"
              tabIndex={-1}
              onMouseEnter={() => setDept(i)}
              onClick={() => {
                setDept(i);
                enterSlots();
              }}
              className="relative h-[17vh] rounded-[5px] cursor-pointer transition-colors"
              style={
                isFocused
                  ? {
                      background: 'linear-gradient(158deg, rgba(118,134,164,0.62) 0%, rgba(76,94,126,0.6) 50%, rgba(104,100,148,0.56) 100%)',
                      border: '2px solid rgba(232,238,255,0.8)',
                      boxShadow: '0 0 28px rgba(196,210,255,0.25)',
                    }
                  : { background: 'rgba(30,40,58,0.86)', border: '2px solid transparent' }
              }
            >
              {/* Potential banner */}
              <div
                className={`absolute right-0 -top-[2px] w-[21.6vw] h-[4.4vh] rounded-[3px] flex items-center justify-center gap-[0.6vw] font-bold text-[clamp(12px,1.1vw,21px)] ${
                  d.coaches.length ? 'bg-[#45e07c] text-[#0d1a14]' : 'bg-white/15 text-white/80'
                }`}
              >
                <span className={`inline-block w-[0.85vw] h-[0.85vw] min-w-[11px] min-h-[11px] rounded-full ${d.coaches.length ? 'bg-[#0d1a14]' : 'bg-white/60'}`} />
                {d.coaches.length ? "Players' potential determined" : 'Hire a coach to determine potential'}
              </div>

              <h3 className="absolute left-[1.75vw] top-[2.2vh] font-bold text-[clamp(26px,2.3vw,42px)] leading-none">{d.label}</h3>

              {/* Achieved | Ideal */}
              <div className="absolute left-[1.75vw] bottom-[2.1vh] flex items-end">
                {(
                  [
                    ['Achieved', d.achieved],
                    ['Ideal', d.ideal],
                  ] as const
                ).map(([label, value], j) => (
                  <div key={label} className={j ? 'border-l border-white/25 pl-[1.75vw]' : 'pr-[1.75vw]'}>
                    <div className="text-white/70 text-[clamp(12px,1.12vw,21px)]">{label}</div>
                    <div className="mt-[0.5vh] flex items-center gap-[0.6vw]">
                      <Star className="w-[1.55vw] h-[1.55vw] min-w-[18px] min-h-[18px] fill-[#d9b45a] text-[#d9b45a]" />
                      <span className="font-light tabular-nums text-[clamp(20px,1.65vw,31px)] leading-none">{value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Development boost meter */}
              <div className="absolute left-[16.5vw] bottom-[2.4vh] w-[14vw]">
                <div className="flex items-center justify-between text-[clamp(10px,0.85vw,16px)] text-white/70">
                  <span>{d.players.length} Players · Development Boost</span>
                  <span className="font-bold text-[#45e07c]">+{d.boostPct}%</span>
                </div>
                <div className="mt-[0.7vh] h-[4px] rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-[#45e07c]" style={{ width: `${(d.boostPct / MAX_BOOST_PCT) * 100}%` }} />
                </div>
              </div>

              {/* Head coach + tier badge */}
              <div className="absolute right-[2.4vw] bottom-[2.5vh] flex items-center gap-[1.3vw]">
                <div className="text-right">
                  <div className="text-white/70 text-[clamp(11px,1.02vw,19px)]">{head ? shortPersonName(head.name) : 'No coach hired'}</div>
                  <div className="text-[clamp(20px,1.78vw,33px)] leading-tight">{head ? COACH_TIER[head.stars] : 'Available Slot'}</div>
                </div>
                <TierBadge stars={head?.stars ?? 0} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------ Right panel */}
      <div className="absolute left-[66.1vw] w-[29.4vw] top-[22.2vh] h-[71.2vh] rounded-[5px]" style={{ background: 'rgba(30,40,58,0.88)' }}>
        <div className="mx-[0.9vw] h-[6.8vh] flex items-center justify-center border-b border-white/20 font-bold text-[#8ff0cd] text-[clamp(13px,1.12vw,21px)]">
          {page === 'boost' ? 'Development Boost' : `${focused.label} Coaches · ${focused.coaches.length}/${SLOTS_PER_DEPARTMENT}`}
        </div>

        {page === 'boost' && (
          <div ref={boostListRef} className="h-[56vh] overflow-y-auto pr-[0.4vw]">
            {boostPlayers.length === 0 && <div className="py-[6vh] text-center text-white/60">No players in this department.</div>}
            {boostPlayers.map(({ p, weeks }) => (
              <div key={p.id} className="relative h-[9.8vh] border-b border-white/10 flex items-end">
                <span className="absolute left-[1vw] top-[0.6vh] text-white/20 text-[clamp(16px,1.45vw,27px)] leading-none">{p.primaryPosition}</span>
                <div className="ml-[2vw]">
                  <PlayerBust src={p.headshotUrl} alt={p.knownAs} />
                </div>
                <div className="flex-1 min-w-0 self-center pl-[1.2vw]">
                  <div className="font-bold truncate text-[clamp(14px,1.33vw,25px)]">{shortPersonName(p.knownAs)}</div>
                  <div className="text-white/65 text-[clamp(11px,1vw,19px)]">{GROWTH_PROFILES[p.growthProfile].label}</div>
                </div>
                <div className="self-center pr-[1vw] text-right">
                  <div className="text-white/65 text-[clamp(10px,0.95vw,17px)]">{weeks === null ? 'Peaked' : 'Level up in'}</div>
                  <div className="flex items-center justify-end gap-[0.9vw] text-[clamp(13px,1.12vw,21px)]">
                    <span className="tabular-nums">{p.baseOvr}</span>
                    <span className="text-[0.75em]">▶</span>
                    <span className="text-[#45e07c] tabular-nums">{weeks === null ? '—' : `${weeks} w`}</span>
                  </div>
                </div>
                <div className="absolute left-0 right-0 bottom-0 h-[2px]">
                  <div className="h-full bg-white/85" style={{ width: `${Math.min(100, Math.max(0, p.xpProgress))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {page === 'coaches' && (
          <div className="px-[0.9vw] pt-[1.6vh] space-y-[1.4vh]">
            {Array.from({ length: SLOTS_PER_DEPARTMENT }, (_, i) => {
              const coach = slotCoach(i);
              const isFocused = zone === 'slot' && slot === i;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={-1}
                  onMouseEnter={() => {
                    setZone('slot');
                    setSlot(i);
                  }}
                  onClick={() => {
                    setZone('slot');
                    setSlot(i);
                    if (isFocused) squareAction();
                  }}
                  className="relative h-[16.4vh] rounded-[5px] flex items-center gap-[1vw] px-[1vw] cursor-pointer"
                  style={
                    isFocused
                      ? {
                          background: 'linear-gradient(158deg, rgba(118,134,164,0.62), rgba(76,94,126,0.6) 50%, rgba(104,100,148,0.56))',
                          border: '2px solid rgba(232,238,255,0.8)',
                        }
                      : coach
                      ? { background: 'rgba(44,58,82,0.7)', border: '2px solid transparent' }
                      : { background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.25)' }
                  }
                >
                  {coach ? (
                    <>
                      <PlayerBust alt={coach.name} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate text-[clamp(14px,1.25vw,24px)]">{coach.name}</div>
                        <div className="text-white/70 text-[clamp(11px,0.98vw,18px)]">
                          {coach.tacticalStyle}
                          {coach.tacticalStyle === club.tacticalVision && <span className="ml-[0.5vw] text-[#45e07c] font-bold">✓ Vision match</span>}
                        </div>
                        <div className="mt-[0.6vh] flex items-center gap-[0.15vw]">
                          {Array.from({ length: 5 }, (_, s) => (
                            <Star
                              key={s}
                              className={`w-[1.05vw] h-[1.05vw] min-w-[13px] min-h-[13px] ${s < coach.stars ? 'fill-[#d9b45a] text-[#d9b45a]' : 'fill-[#6f7886] text-[#6f7886]'}`}
                            />
                          ))}
                          <span className="ml-[0.5vw] text-white/80 text-[clamp(10px,0.9vw,17px)]">{COACH_TIER[coach.stars]}</span>
                        </div>
                      </div>
                      <div className="text-right text-[clamp(11px,0.98vw,18px)]">
                        <div className="text-white/60">Wage</div>
                        <div className="font-bold">{formatMoney(coach.weeklySalaryEur, cur)}/wk</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white/60 w-[3.4vw] h-[3.4vw] min-w-[40px] min-h-[40px]">
                        <Plus className="w-1/2 h-1/2" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[clamp(14px,1.25vw,24px)]">Available Slot</div>
                        <div className="text-white/65 truncate text-[clamp(10px,0.92vw,17px)]">
                          {candidate
                            ? `Best candidate: ${shortPersonName(candidate.name)} · ${'★'.repeat(candidate.stars)} · ${candidate.tacticalStyle} · ${formatMoney(candidate.weeklySalaryEur, cur)}/wk`
                            : 'No coaches available in the market'}
                        </div>
                        <div className="mt-[0.7vh] flex items-center gap-[0.5vw] text-[clamp(11px,0.98vw,18px)]">
                          <PadGlyph shape="square" /> Hire Coach
                          {candidate && <span className="text-white/50">(signing fee {formatMoney(candidate.weeklySalaryEur * 6, cur)})</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            <div className="text-white/55 text-center text-[clamp(10px,0.9vw,17px)]">{hiredTotal}/8 coaches hired across all departments</div>
          </div>
        )}

        <div className="absolute left-[0.9vw] right-[0.9vw] bottom-[1.4vh] flex items-center justify-between text-[clamp(11px,1vw,19px)]">
          <span className="text-white/85">
            {page === 'boost' ? `${focused.label}: +${focused.boostPct}% growth from ${focused.achieved}★ coaching` : '▢ hires the best market candidate for the slot'}
          </span>
          <PagerDots count={2} index={page === 'boost' ? 0 : 1} onCycle={() => setPage((p) => (p === 'boost' ? 'coaches' : 'boost'))} />
        </div>
      </div>

      {/* ------------------------------------------------ Controller bar */}
      <div className="absolute left-[2vw] bottom-[1.6vh] flex items-center gap-[2vw] text-white/90 text-[clamp(12px,1vw,19px)]">
        <span className="flex items-center gap-[0.5vw]">
          <PadGlyph shape="cross" /> Select
        </span>
        <button type="button" onClick={() => (zone === 'slot' ? setZone('dept') : onBack())} className="flex items-center gap-[0.5vw]">
          <PadGlyph shape="circle" /> Back
        </button>
        <button type="button" onClick={() => (zone === 'slot' ? squareAction() : enterSlots())} className="flex items-center gap-[0.5vw]">
          <PadGlyph shape="square" /> {squareLabel}
        </button>
        <span className="flex items-center gap-[0.5vw] text-white/70">
          <span className="inline-flex items-center justify-center rounded-full bg-white/25 font-bold w-[clamp(18px,1.4vw,26px)] h-[clamp(18px,1.4vw,26px)] text-[clamp(9px,0.72vw,14px)]">R</span>
          {page === 'boost' ? 'Department Coaches' : 'Development Boost'}
        </span>
      </div>
    </div>
  );
};

/** Coach tier shield with the tactical-vision scales glyph (gold for Expert / Elite). */
const TierBadge: React.FC<{ stars: number }> = ({ stars }) => {
  const gold = stars >= 4;
  return (
    <svg viewBox="0 0 64 76" className="w-[3.4vw] h-auto min-w-[40px]" aria-hidden>
      <path d="M6 6 H58 V48 L32 72 L6 48 Z" fill={gold ? '#1f1a0c' : '#1a2028'} stroke={gold ? '#d9b45a' : 'rgba(255,255,255,0.35)'} strokeWidth="3" />
      <path d="M2 18 L6 14 V30 L2 34 Z M62 18 L58 14 V30 L62 34 Z" fill={stars ? '#45e07c' : 'rgba(255,255,255,0.25)'} />
      <path d="M26 2 L32 7 L38 2 Z" fill={stars ? '#45e07c' : 'rgba(255,255,255,0.25)'} />
      <g stroke={gold ? '#e8c368' : '#eef0f3'} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 18 V52 M22 52 H42 M16 26 H48" />
        <path d="M16 26 L11 38 H21 Z M48 26 L43 38 H53 Z" />
      </g>
    </svg>
  );
};
