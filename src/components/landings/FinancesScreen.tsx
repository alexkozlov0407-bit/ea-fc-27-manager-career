import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Star } from 'lucide-react';
import { formatMoney } from '../../engine/ratings';
import { CareerState, FinancialTransaction } from '../../engine/types';
import { ClubCrest } from '../PlayerAvatar';
import { LayerHeader, PadGlyph } from '../fc/HubCarousel';

/**
 * Office › Finances layer — 1:1 with inputs/screenshots/image (9).png.
 * Full-screen (covers the main tab bar, as layer-3 screens do in FC 27) with its own
 * breadcrumb header, L1/R1 sub-tabs, a Profit / Earnings / Expenses column and a donut panel.
 */

type FinTab = 'Overview' | 'Transactions' | 'Budget';
const FIN_TABS: FinTab[] = ['Overview', 'Transactions', 'Budget'];
type Metric = 'Profit' | 'Earnings' | 'Expenses';
const METRICS: Metric[] = ['Profit', 'Earnings', 'Expenses'];

const RED = '#d82c2c';
const RED_TEXT = '#ff4a36';
const GREEN = '#3cbf4c';
const GREEN_TEXT = '#3fe06c';

const CATEGORY_COLORS: Record<FinancialTransaction['category'], string> = {
  Matchday: '#3cbf4c',
  Broadcast: '#2f9e8f',
  Merchandise: '#8fd14f',
  Prize: '#e6c34a',
  Transfer: '#4a8fe8',
  Wages: '#d82c2c',
  Scouting: '#f07a3a',
};

interface Props {
  career: CareerState;
  onBack: () => void;
}

export const FinancesScreen: React.FC<Props> = ({ career, onBack }) => {
  const [tab, setTab] = useState<FinTab>('Overview');
  const [metric, setMetric] = useState<Metric>('Profit');
  const club = career.clubs[career.userClubId];
  const cur = career.settings.currency;

  const earnings = career.transactions.filter((t) => t.amountEur > 0).reduce((s, t) => s + t.amountEur, 0);
  const expenses = Math.abs(career.transactions.filter((t) => t.amountEur < 0).reduce((s, t) => s + t.amountEur, 0));
  const profit = earnings - expenses;

  // Projection: club worth after this season's profit so far is banked.
  const projection = club.clubWorthEur + profit;

  /** `sign`: 'auto' = only "-" when negative; '+' / '-' = always prefix that sign (FC style "+ £583.85K"). */
  const money = (v: number, sign: 'auto' | '+' | '-' = 'auto') => {
    const s = formatMoney(Math.abs(v), cur);
    if (sign === 'auto') return v < 0 ? `-${s}` : s;
    return `${sign} ${s}`;
  };

  // Keyboard (capture phase so Q/E don't also switch the main career tab underneath).
  const stateRef = useRef({ tab, metric, onBack });
  stateRef.current = { tab, metric, onBack };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const { tab: t, metric: m, onBack: back } = stateRef.current;
      const swallow = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      if (k === 'q' || k === '[' || k === 'e' || k === ']') {
        swallow();
        const dir = k === 'q' || k === '[' ? -1 : 1;
        setTab(FIN_TABS[(FIN_TABS.indexOf(t) + dir + FIN_TABS.length) % FIN_TABS.length]);
      } else if (/^[1-8]$/.test(k)) {
        swallow();
      } else if (k === 'Escape' || k === 'b') {
        swallow();
        back();
      } else if (t === 'Overview' && (k === 'w' || k === 'ArrowUp' || k === 's' || k === 'ArrowDown')) {
        swallow();
        const dir = k === 'w' || k === 'ArrowUp' ? -1 : 1;
        setMetric(METRICS[Math.min(METRICS.length - 1, Math.max(0, METRICS.indexOf(m) + dir))]);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const filledSegments = Math.min(4, Math.max(1, Math.ceil((club.boardConfidence / 100) * 4)));

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden text-white select-none"
      style={{
        background:
          'linear-gradient(112deg, #1a2244 0%, #1c2a57 22%, #1b3f60 46%, #1c5f58 70%, #22805a 88%, #2c935e 100%)',
      }}
    >
      {/* Faint diagonal light facets (stand-in for the animated menu background) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(128deg, transparent 54%, rgba(255,255,255,0.05) 54.2%, rgba(255,255,255,0.05) 54.5%, transparent 54.7%), linear-gradient(32deg, transparent 70%, rgba(170,255,220,0.06) 70.2%, rgba(170,255,220,0.06) 70.6%, transparent 70.8%), radial-gradient(60% 50% at 8% 40%, rgba(70,60,140,0.35), transparent 70%)',
        }}
      />

      {/* ------------------------------------------------------------- Header */}
      <LayerHeader
        parent="Office"
        title="Finances"
        tabs={FIN_TABS}
        active={tab}
        onTab={(t) => setTab(t as FinTab)}
        right={
          <div className="absolute right-[1.3vw] top-[5.2vh] flex items-center gap-[0.8vw]">
            <ClubCrest club={club} size={38} />
            <div className="w-[12vw]">
              <div className="flex items-center justify-between text-[clamp(12px,1.1vw,20px)] text-white/85">
                <span className="truncate">{club.name}</span>
                <span className="inline-flex items-center justify-center w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px] rounded-full bg-[#1e2a20] border border-[#e6c34a]">
                  <Star className="w-[60%] h-[60%] fill-[#e6c34a] text-[#e6c34a]" />
                </span>
              </div>
              <div className="mt-[0.6vh] flex gap-[3px]">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-[6px] rounded-[1px] ${i === 0 ? 'flex-[3]' : 'flex-1'} ${i < filledSegments ? 'bg-[#34d058]' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        }
      />

      {/* ------------------------------------------------------------- Body */}
      {tab === 'Overview' && (
        <>
          {/* Left metric column */}
          <div
            className="absolute left-[5.2vw] top-[29vh] w-[27.9vw] h-[63.2vh] rounded-[4px]"
            style={{ background: 'rgba(30,40,58,0.86)' }}
          >
            {METRICS.map((m) => {
              const focused = metric === m;
              const value = m === 'Profit' ? profit : m === 'Earnings' ? earnings : -expenses;
              const color = m === 'Earnings' ? GREEN_TEXT : m === 'Expenses' || value < 0 ? RED_TEXT : GREEN_TEXT;
              return (
                <button
                  key={m}
                  type="button"
                  onMouseEnter={() => setMetric(m)}
                  onClick={() => setMetric(m)}
                  className="relative block w-full h-1/3 text-left rounded-[4px] transition-colors"
                  style={
                    focused
                      ? {
                          background: 'linear-gradient(160deg, rgba(120,134,160,0.55), rgba(84,96,126,0.55) 55%, rgba(104,100,146,0.5))',
                          border: '2px solid rgba(228,234,255,0.8)',
                          boxShadow: '0 0 26px rgba(196,210,255,0.25)',
                        }
                      : { border: '2px solid transparent' }
                  }
                >
                  <span
                    className={`absolute left-[5%] top-[10%] text-[clamp(15px,1.35vw,26px)] ${focused ? 'font-bold text-white' : 'text-white/75'}`}
                  >
                    {m}
                  </span>
                  <span
                    className="absolute left-[3.5%] bottom-[14%] font-bold tracking-[-0.01em] text-[clamp(24px,2.25vw,42px)]"
                    style={{ color }}
                  >
                    {m === 'Profit' ? money(value) : money(value, m === 'Earnings' ? '+' : '-')}
                  </span>
                  <span className="absolute right-[11%] top-1/2 -translate-y-1/2">
                    <MetricIcon kind={m} bright={focused} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right donut panel */}
          <div
            className="absolute left-[33.6vw] top-[29.3vh] w-[61.9vw] h-[62.9vh] rounded-[4px]"
            style={{ background: 'rgba(30,40,58,0.86)' }}
          >
            <h2 className="absolute left-[3vw] top-[3.4vh] font-bold text-[clamp(24px,2.25vw,42px)]">{metric}</h2>
            <div className="absolute inset-x-0 top-[11vh] bottom-[11vh]">
              {metric === 'Profit' ? (
                <ProfitDonut earnings={earnings} expenses={expenses} centre={money(profit)} earnLabel={money(earnings, '+')} expLabel={money(expenses, '-')} />
              ) : (
                <CategoryDonut
                  rows={categoryTotals(career.transactions, metric === 'Earnings' ? 1 : -1)}
                  centre={metric === 'Earnings' ? money(earnings, '+') : money(expenses, '-')}
                  format={(v) => formatMoney(v, cur)}
                />
              )}
            </div>
            <div className="absolute left-[3.4vw] right-[1.4vw] bottom-[3.2vh] grid grid-cols-2 gap-[4vw] text-[clamp(15px,1.45vw,27px)]">
              <div className="flex items-center gap-[1vw]">
                <span className="inline-flex items-center justify-center rounded-full bg-white text-[#1e283a] font-bold w-[2.1vw] h-[2.1vw] min-w-[26px] min-h-[26px] text-[clamp(13px,1.1vw,21px)]">$</span>
                <span className="text-white/75">Club Worth</span>
                <span className="ml-auto text-white">{formatMoney(club.clubWorthEur, cur)}</span>
              </div>
              <div className="flex items-center gap-[1vw]">
                <BarChart3 className="w-[2.1vw] h-[2.1vw] min-w-[26px] min-h-[26px] text-white" />
                <span className="text-white/75">Projection</span>
                <span className="ml-auto text-white">{formatMoney(projection, cur)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'Transactions' && (
        <div
          className="absolute left-[5.2vw] right-[4.3vw] top-[29vh] h-[63vh] rounded-[4px] overflow-hidden"
          style={{ background: 'rgba(30,40,58,0.86)' }}
        >
          <h2 className="px-[3vw] pt-[3.4vh] font-bold text-[clamp(24px,2.25vw,42px)]">Transactions</h2>
          <div className="mt-[2vh] h-[calc(100%-12vh)] overflow-y-auto px-[3vw]">
            {[...career.transactions].reverse().map((t) => (
              <div key={t.id} className="flex items-center gap-[2vw] border-b border-white/15 py-[1.6vh] text-[clamp(13px,1.1vw,20px)]">
                <span className="w-[8vw] text-white/60 tabular-nums">{t.date}</span>
                <span className="w-[1vw] h-[1vw] min-w-[10px] min-h-[10px] rounded-full" style={{ background: CATEGORY_COLORS[t.category] }} />
                <span className="w-[10vw] text-white/75">{t.category}</span>
                <span className="flex-1 truncate text-white">{t.description}</span>
                <span className="font-bold tabular-nums" style={{ color: t.amountEur < 0 ? RED_TEXT : GREEN_TEXT }}>
                  {money(t.amountEur, t.amountEur < 0 ? '-' : '+')}
                </span>
              </div>
            ))}
            {career.transactions.length === 0 && <div className="py-[6vh] text-center text-white/60">No transactions yet this season.</div>}
          </div>
        </div>
      )}

      {tab === 'Budget' && (
        <div className="absolute left-[5.2vw] right-[4.3vw] top-[29vh] h-[63vh] grid grid-cols-3 gap-[1vw]">
          {[
            { label: 'Transfer Budget', value: formatMoney(club.transferBudgetEur, cur) },
            { label: 'Wage Budget Remaining', value: `${formatMoney(club.wageBudgetRemainingEur, cur)}/wk` },
            { label: 'Budget Split', value: `${club.budgetSplitTransferPct}% / ${100 - club.budgetSplitTransferPct}%`, sub: 'Transfer / Wage' },
          ].map((b) => (
            <div key={b.label} className="rounded-[4px] px-[2vw] py-[3.4vh]" style={{ background: 'rgba(30,40,58,0.86)' }}>
              <div className="text-white/75 text-[clamp(15px,1.35vw,26px)]">{b.label}</div>
              <div className="mt-[3vh] font-bold text-[clamp(24px,2.25vw,42px)]">{b.value}</div>
              {b.sub && <div className="mt-[1vh] text-white/60 text-[clamp(12px,1vw,19px)]">{b.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Back prompt */}
      <button
        type="button"
        onClick={onBack}
        className="absolute left-[2vw] bottom-[1.6vh] flex items-center gap-[0.5vw] text-white/85 text-[clamp(12px,1vw,19px)]"
      >
        <PadGlyph shape="circle" />
        Back
      </button>
    </div>
  );
};

function categoryTotals(transactions: FinancialTransaction[], sign: 1 | -1) {
  const totals = new Map<FinancialTransaction['category'], number>();
  for (const t of transactions) {
    if (Math.sign(t.amountEur) !== sign) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amountEur));
  }
  return [...totals.entries()].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value);
}

// ---------------------------------------------------------------------------
// Donuts (SVG, viewBox 1110 × 420 to match the panel's aspect)
// ---------------------------------------------------------------------------
const CX = 555;
const CY = 210;
const R_OUT = 162;
const R_IN = 58;

function arcPath(a0: number, a1: number): string {
  // A single SVG arc cannot draw a full circle (start == end), so split it in two halves.
  if (a1 - a0 >= Math.PI * 2 - 1e-3) return arcPath(a0, a0 + Math.PI) + ' ' + arcPath(a0 + Math.PI, a0 + Math.PI * 2 - 2e-3);
  const p = (r: number, a: number) => `${CX + r * Math.cos(a)} ${CY + r * Math.sin(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(R_OUT, a0)} A${R_OUT} ${R_OUT} 0 ${large} 1 ${p(R_OUT, a1)} L${p(R_IN, a1)} A${R_IN} ${R_IN} 0 ${large} 0 ${p(R_IN, a0)} Z`;
}

const ProfitDonut: React.FC<{ earnings: number; expenses: number; centre: string; earnLabel: string; expLabel: string }> = ({
  earnings,
  expenses,
  centre,
  earnLabel,
  expLabel,
}) => {
  const total = Math.max(1, earnings + expenses);
  const start = -Math.PI / 2 + 0.36; // earnings slice sits just right of 12 o'clock, as in the capture
  const earnSweep = Math.max(0.02, (earnings / total) * Math.PI * 2);
  const earnMid = start + earnSweep / 2;
  const edge = (a: number, r = R_OUT) => [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
  const [ex, ey] = edge(earnMid);
  const [rx, ry] = edge(Math.PI * 0.72);
  return (
    <svg viewBox="0 0 1110 420" className="w-full h-full overflow-visible">
      {expenses > 0 && <path d={arcPath(earnings > 0 ? start + earnSweep : start, start + Math.PI * 2)} fill={RED} stroke={RED} strokeWidth="1" />}
      {earnings > 0 && <path d={arcPath(start, expenses > 0 ? start + earnSweep : start + Math.PI * 2)} fill={GREEN} stroke={GREEN} strokeWidth="1" />}
      <text x={CX} y={CY + 9} textAnchor="middle" fill="#fff" fontSize="27">{centre}</text>
      {/* Earnings leader */}
      <polyline points={`${ex},${ey} ${880},${CY} ${930},${CY}`} fill="none" stroke={GREEN} strokeWidth="2" />
      <text x={936} y={CY + 7} fill="#fff" fontSize="21">Earnings</text>
      <text x={936} y={CY + 34} fill={GREEN_TEXT} fontSize="21" opacity="0.75">{earnLabel}</text>
      {/* Expenses leader */}
      <polyline points={`${rx},${ry} ${282},${CY} ${236},${CY}`} fill="none" stroke={RED} strokeWidth="2" />
      <text x={230} y={CY + 7} fill="#fff" fontSize="21" textAnchor="end">Expenses</text>
      <text x={230} y={CY + 34} fill={RED_TEXT} fontSize="21" textAnchor="end" opacity="0.75">{expLabel}</text>
    </svg>
  );
};

const CategoryDonut: React.FC<{ rows: { category: FinancialTransaction['category']; value: number }[]; centre: string; format: (v: number) => string }> = ({
  rows,
  centre,
  format,
}) => {
  const total = rows.reduce((s, r) => s + r.value, 0);
  let a = -Math.PI / 2;
  return (
    <svg viewBox="0 0 1110 420" className="w-full h-full overflow-visible">
      {total === 0 ? (
        <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={R_OUT - R_IN} />
      ) : (
        rows.map((r) => {
          const sweep = (r.value / total) * Math.PI * 2;
          const d = arcPath(a, a + sweep);
          a += sweep;
          return <path key={r.category} d={d} fill={CATEGORY_COLORS[r.category]} stroke={CATEGORY_COLORS[r.category]} strokeWidth="1" />;
        })
      )}
      <text x={CX} y={CY + 9} textAnchor="middle" fill="#fff" fontSize="27">{centre}</text>
      {rows.slice(0, 6).map((r, i) => (
        <g key={r.category} transform={`translate(812 ${70 + i * 52})`}>
          <rect width="16" height="16" y="-13" rx="3" fill={CATEGORY_COLORS[r.category]} />
          <text x="28" fill="#fff" fontSize="21">{r.category}</text>
          <text x="290" fill="rgba(255,255,255,0.7)" fontSize="21" textAnchor="end">{format(r.value)}</text>
        </g>
      ))}
    </svg>
  );
};

/** Wallet / box-up / box-down glyphs from the metric column (drawn, no image assets needed). */
const MetricIcon: React.FC<{ kind: Metric; bright: boolean }> = ({ kind, bright }) => {
  const fill = bright ? '#f4f5f7' : '#c9cbcf';
  const ink = '#2b3445';
  return (
    <svg viewBox="0 0 72 64" className="w-[4vw] h-auto min-w-[44px]" aria-hidden>
      {kind === 'Profit' ? (
        <>
          <rect x="2" y="8" width="66" height="54" rx="7" fill={fill} />
          <rect x="6" y="2" width="56" height="12" rx="5" fill={fill} stroke={ink} strokeWidth="2.5" />
          <rect x="40" y="26" width="30" height="20" rx="4" fill={fill} stroke={ink} strokeWidth="3" />
          <rect x="48" y="33" width="8" height="6" rx="1.5" fill={ink} />
        </>
      ) : (
        <>
          <rect x="2" y="10" width="68" height="52" rx="2" fill={fill} />
          <rect x="0" y="6" width="72" height="9" rx="2" fill={fill} stroke={ink} strokeWidth="2" />
          <path
            d={kind === 'Earnings' ? 'M36 20 L48 34 H40 V54 H32 V34 H24 Z' : 'M36 56 L48 42 H40 V22 H32 V42 H24 Z'}
            fill={ink}
          />
        </>
      )}
    </svg>
  );
};
