import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Ambulance, FileSignature, Heart, Mail, MessageCircle, Settings2, UserPlus } from 'lucide-react';
import { computeSectorRatings } from '../engine/matchSim';
import { formatMoney } from '../engine/ratings';
import { diffDays } from '../engine/season';
import { Player } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { ArenaBackdrop, PadGlyph, PagerDots, PlayerBust } from './fc/HubCarousel';
import { ClubCrest, MarqueePlayerCutout } from './PlayerAvatar';

/**
 * Central Hub — 1:1 with inputs/screenshotspart2/image (2).png.
 * Left: date banner, next-fixture line, competition + kickoff, crests with ranked names, two action buttons
 * (the focused one is the glowing ✕ pill), a 3-row task window with dividers and "N Tasks".
 * Right: social news card (tag + date, New badge, image + player cutout, two big stats, copy, likes /
 * comments / ▢ Show Comments) with the (R) pager underneath.
 *
 * Keys: W/S/A/D move focus (buttons ↔ tasks ↔ news card) · ✕ Space/Enter activates · R next story ·
 *       ▢ F show comments · ≡ M Customise.
 */

interface Story {
  id: string;
  tag: string;
  tagIcon: 'goal' | 'transfer' | 'tactics';
  dateLabel: string;
  summary: string;
  stats: [{ value: string; label: string }, { value: string; label: string }];
  likes: string;
  comments: { user: string; text: string; time: string }[];
  commentsCount: string;
  image: string;
  cutoutName?: string;
}

type Focus = { zone: 'buttons'; index: number } | { zone: 'tasks'; index: number } | { zone: 'news' };
const VISIBLE_TASKS = 3;

const LEAGUE_NAMES: Record<number, string> = {
  13: 'Premier League',
  53: 'LALIGA EA SPORTS',
  19: 'Bundesliga',
  31: 'Serie A Enilive',
  16: "Ligue 1 McDonald's",
};
const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH';
  return `${n}${s}`;
};
const longDate = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });

/** Fixtures carry no kickoff time: night games are 8:00 PM, others rotate through the usual weekend slots. */
const kickoffTime = (round: number, weather: string) =>
  weather === 'Night' ? '8:00 PM' : ['12:30 PM', '3:00 PM', '4:00 PM', '5:30 PM'][round % 4];

export const CentralHub: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const setActiveTab = useCareerStore((s) => s.setActiveTab);
  const advanceDay = useCareerStore((s) => s.advanceDay);
  const simToNextMatchOrDate = useCareerStore((s) => s.simToNextMatchOrDate);
  const skipDeadlineHours = useCareerStore((s) => s.skipDeadlineHours);
  const quickSimNextMatch = useCareerStore((s) => s.quickSimNextMatch);
  const startLiveMatch = useCareerStore((s) => s.startLiveMatch);
  const proceedToNextSeason = useCareerStore((s) => s.proceedToNextSeason);

  const [storyIdx, setStoryIdx] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState<Focus>({ zone: 'buttons', index: 0 });

  const computed = useMemo(() => {
    if (!career) return null;
    const userClub = career.clubs[career.userClubId];
    const userSquad = Object.values(career.players).filter((p) => p.clubId === career.userClubId);
    const nextMatch = career.fixtures
      .filter((f) => !f.played && (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const homeClub = nextMatch ? career.clubs[nextMatch.homeClubId] : null;
    const awayClub = nextMatch ? career.clubs[nextMatch.awayClubId] : null;
    const rankOf = (id?: number) => {
      const i = id === undefined ? -1 : career.standings.findIndex((s) => s.clubId === id);
      return i >= 0 ? i + 1 : null;
    };
    const daysToNextMatch = nextMatch ? Math.max(0, diffDays(career.currentDate, nextMatch.date)) : null;
    const leagueName = LEAGUE_NAMES[userClub.leagueId] ?? 'League';
    const cur = career.settings.currency;

    // ---- Tasks (icon + one line, as in the capture) ----
    const tasks: { id: string; title: string; icon: 'coach' | 'offer' | 'injury' | 'contract' | 'inbox'; player?: Player; clubId?: number; action: () => void }[] = [];
    if (userClub.coaches.filter((c) => c.hired).length < 8) {
      tasks.push({ id: 'coach', title: 'Hire a Coach', icon: 'coach', action: () => setActiveTab('Squad') });
    }
    career.negotiations
      .filter((n) => (n.type === 'SELL' || n.type === 'LOAN_OUT') && n.stage === 'CLUB_TALKS')
      .slice(0, 2)
      .forEach((n) => {
        const p = career.players[n.playerId];
        if (!p) return;
        tasks.push({
          id: `offer-${n.id}`,
          title: `Offer Received For ${p.firstName ? `${p.firstName[0]}. ` : ''}${p.lastName || p.knownAs}`,
          icon: 'offer',
          player: p,
          clubId: n.toClubId,
          action: () => setActiveTab('Transfers'),
        });
      });
    const injured = userSquad.filter((p) => p.injury && (p.injury.recovering || p.injury.daysRemaining > 0));
    if (injured.length) {
      tasks.push({
        id: 'injured',
        title: injured.length === 1 ? `${injured[0].knownAs} Is Injured` : `${injured.length} Players Are Injured`,
        icon: 'injury',
        action: () => setActiveTab('Squad'),
      });
    }
    const year = parseInt(career.currentDate.slice(0, 4), 10);
    const expiring = userSquad.filter((p) => p.contractEndYear <= year + 1);
    if (expiring.length) {
      tasks.push({
        id: 'contracts',
        title: expiring.length === 1 ? `${expiring[0].knownAs}'s Contract Is Expiring` : `${expiring.length} Contracts Are Expiring`,
        icon: 'contract',
        action: () => setActiveTab('Squad'),
      });
    }
    const unread = career.inbox.filter((m) => !m.read);
    unread.slice(0, 2).forEach((m) =>
      tasks.push({ id: `mail-${m.id}`, title: m.subject, icon: 'inbox', action: () => setActiveTab('Notifications') })
    );

    // ---- Stories ----
    const star = [...userSquad].sort((a, b) => b.seasonStats.goals - a.seasonStats.goals || b.dynamicOvr.dynamicOvr - a.dynamicOvr.dynamicOvr)[0];
    const dateLabel = longDate(career.currentDate, { month: 'long', day: 'numeric' });
    const sectors = computeSectorRatings(userClub, career.players);
    const playedStats = star && star.seasonStats.appearances > 0;
    const daysToClose = Math.max(0, diffDays(career.currentDate, career.transferWindowClosesDate));
    const stories: Story[] = [
      {
        id: 'goal',
        tag: playedStats ? 'GOAL' : 'ONE TO WATCH',
        tagIcon: 'goal',
        dateLabel,
        summary: star
          ? `One to watch: ${star.knownAs} leads the line for ${userClub.name} as the ${leagueName} campaign ${playedStats ? 'heats up' : 'gets under way'}, ...`
          : `${userClub.name} prepare for the new ${leagueName} season.`,
        stats: playedStats
          ? [
              { value: String(star.seasonStats.appearances), label: 'MATCHES' },
              { value: String(star.seasonStats.goals), label: 'GOALS' },
            ]
          : [
              { value: String(star?.dynamicOvr.dynamicOvr ?? 0), label: 'OVERALL' },
              { value: String(star?.potential ?? 0), label: 'POTENTIAL' },
            ],
        likes: '1.10 M',
        commentsCount: '1.37 K',
        comments: [
          { user: '@davies_tactics', text: `${star?.knownAs ?? 'Our No.9'} is going to be unplayable this season.`, time: '2h' },
          { user: '@elena_calcio', text: 'Looked razor sharp in training this week.', time: '4h' },
        ],
        image: '/assets/art/goal-celebration.png',
        cutoutName: star?.knownAs,
      },
      {
        id: 'transfer',
        tag: 'TRANSFER',
        tagIcon: 'transfer',
        dateLabel,
        summary: `Window watch: ${userClub.name} have ${formatMoney(userClub.transferBudgetEur, cur)} to spend, with ${career.shortlistIds.length} targets on the shortlist, ...`,
        stats: [
          { value: String(career.transferWindowOpen ? daysToClose : 0), label: 'DAYS LEFT' },
          { value: String(career.shortlistIds.length), label: 'TARGETS' },
        ],
        likes: '2.10 M',
        commentsCount: '3.82 K',
        comments: [
          { user: '@alex_fc_fan', text: 'Bring in a winger before the window shuts!', time: '1h' },
          { user: '@s_benali', text: 'Budget looks healthy. Make the right moves.', time: '6h' },
        ],
        image: '/assets/art/vinicius-trophy.jpg',
      },
      {
        id: 'tactics',
        tag: 'TACTICS',
        tagIcon: 'tactics',
        dateLabel,
        summary: `Analysis: how ${userClub.name}'s ${userClub.formation} and ${userClub.tacticalVision} vision are shaping the build-up and the press, ...`,
        stats: [
          { value: String(Math.round(sectors.atk)), label: 'ATTACK' },
          { value: String(Math.round(sectors.def)), label: 'DEFENCE' },
        ],
        likes: '890 K',
        commentsCount: '920',
        comments: [{ user: '@dancoach_pro', text: 'The inverted full-back stepping into midfield is pure modern football.', time: '30m' }],
        image: '/assets/art/champions-league-match.jpg',
      },
    ];

    return { userClub, nextMatch, homeClub, awayClub, rankOf, daysToNextMatch, leagueName, tasks, stories };
  }, [career, setActiveTab]);

  // ---- action buttons for the current situation ----
  const isMatchDay = Boolean(career && computed?.nextMatch && computed.nextMatch.date === career.currentDate);
  const buttons: { label: string; run: () => void }[] = !career
    ? []
    : career.seasonCompleted
    ? [{ label: `Advance to Season ${career.seasonNumber + 1}`, run: proceedToNextSeason }]
    : career.deadlineDayHoursRemaining !== null
    ? [
        { label: 'Skip +1 Hour', run: () => skipDeadlineHours(1) },
        { label: 'Skip +2 Hours', run: () => skipDeadlineHours(2) },
      ]
    : isMatchDay
    ? [
        { label: 'Play Match', run: startLiveMatch },
        { label: 'Quick Sim', run: quickSimNextMatch },
      ]
    : [
        { label: 'Advance', run: advanceDay },
        { label: 'Sim to Matchday', run: () => simToNextMatchOrDate() },
      ];
  const tasks = computed?.tasks ?? [];
  const stories = computed?.stories ?? [];
  const story = stories[storyIdx % Math.max(1, stories.length)];

  const nextStory = () => {
    setStoryIdx((i) => (i + 1) % Math.max(1, stories.length));
    setShowComments(false);
  };

  // Keyboard (bubble phase; layers / modals capture their own keys first).
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const handled = () => e.preventDefault();
    const btnIdx = focus.zone === 'buttons' ? Math.min(focus.index, buttons.length - 1) : 0;
    if (k === 'r') {
      handled();
      nextStory();
    } else if (k === 'f') {
      handled();
      setShowComments((v) => !v);
    } else if (k === 'm') {
      handled();
      setActiveTab('Customise');
    } else if (k === 'w' || k === 'ArrowUp') {
      handled();
      if (focus.zone === 'tasks') setFocus(focus.index === 0 ? { zone: 'buttons', index: 0 } : { zone: 'tasks', index: focus.index - 1 });
    } else if (k === 's' || k === 'ArrowDown') {
      handled();
      if (focus.zone === 'buttons' && tasks.length) setFocus({ zone: 'tasks', index: 0 });
      else if (focus.zone === 'tasks') setFocus({ zone: 'tasks', index: Math.min(tasks.length - 1, focus.index + 1) });
    } else if (k === 'a' || k === 'ArrowLeft') {
      handled();
      if (focus.zone === 'buttons') setFocus({ zone: 'buttons', index: Math.max(0, btnIdx - 1) });
      else if (focus.zone === 'news') setFocus({ zone: 'buttons', index: buttons.length - 1 });
    } else if (k === 'd' || k === 'ArrowRight') {
      handled();
      if (focus.zone === 'buttons' && btnIdx < buttons.length - 1) setFocus({ zone: 'buttons', index: btnIdx + 1 });
      else setFocus({ zone: 'news' });
    } else if ((k === ' ' || k === 'Enter') && !e.repeat) {
      handled();
      if (focus.zone === 'buttons') buttons[btnIdx]?.run();
      else if (focus.zone === 'tasks') tasks[focus.index]?.action();
      else if (story) setLiked((l) => ({ ...l, [story.id]: !l[story.id] }));
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!career || !computed) return null;
  const { nextMatch, homeClub, awayClub, rankOf, daysToNextMatch, leagueName } = computed;
  const dateTitle = longDate(career.currentDate, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
  const focusedTask = focus.zone === 'tasks' ? Math.min(focus.index, tasks.length - 1) : -1;
  const windowStart = Math.max(0, Math.min(focusedTask - (VISIBLE_TASKS - 1), tasks.length - VISIBLE_TASKS));
  const visibleTasks = tasks.slice(windowStart, windowStart + VISIBLE_TASKS);

  const subtitle = career.seasonCompleted
    ? `${leagueName} Season ${career.seasonNumber} complete`
    : career.deadlineDayHoursRemaining !== null
    ? `Transfer Deadline Day · ${career.deadlineDayHoursRemaining} hours remaining`
    : daysToNextMatch === null
    ? 'No upcoming fixtures'
    : daysToNextMatch === 0
    ? 'Matchday today'
    : `Next Fixture in ${daysToNextMatch} ${daysToNextMatch === 1 ? 'day' : 'days'}`;

  return (
    <div className="relative w-full overflow-hidden select-none h-[calc(100vh-75px)] min-h-[620px] text-white">
      <ArenaBackdrop />

      {/* Content is laid out against the capture's 125px top bar; ours is 75px, so shift by the difference
          (5vh at 1003px) to land every element on the reference's absolute screen position. */}
      <div className="absolute inset-x-0 top-[5vh] bottom-0">
      {/* ------------------------------------------------ Date banner + fixture */}
      <h1 className="absolute left-[10.75vw] top-[5.2vh] font-expanded font-black tracking-[0.005em] leading-none text-[clamp(28px,2.62vw,52px)]">{dateTitle}</h1>
      <div className={`absolute left-[10.75vw] top-[13.2vh] text-[clamp(12px,1.05vw,20px)] ${career.deadlineDayHoursRemaining !== null ? 'text-amber-300' : 'text-[#c3cbd6]'}`}>
        {subtitle}
      </div>
      <div className="absolute left-[10.7vw] w-[37vw] top-[17vh] h-px bg-white/30" />

      {nextMatch && homeClub && awayClub && (
        <>
          <div className="absolute left-[11.4vw] top-[19.1vh] flex items-center gap-[1.25vw]">
            <CompetitionBadge />
            <span className="font-bold text-[clamp(13px,1.15vw,22px)]">{leagueName}</span>
            <span className="-ml-[0.4vw] text-[#b9c2ce] text-[clamp(11px,0.98vw,18px)]">
              {longDate(nextMatch.date, { month: 'long', day: 'numeric' })} {kickoffTime(nextMatch.round, nextMatch.weather)}
            </span>
          </div>
          <div className="absolute left-[11.5vw] top-[25.3vh] flex items-center">
            <ClubCrest club={homeClub} size={Math.round(Math.min(98, Math.max(60, window.innerHeight * 0.098)))} />
            <span className="mx-[1.6vw] h-[8vh] w-px bg-white/20" />
            <ClubCrest club={awayClub} size={Math.round(Math.min(98, Math.max(60, window.innerHeight * 0.098)))} />
            <div className="ml-[1.4vw] font-expanded font-black uppercase leading-[1.22] text-[clamp(17px,1.65vw,32px)]">
              {[homeClub, awayClub].map((c) => {
                const r = rankOf(c.id);
                return (
                  <div key={c.id} className="whitespace-nowrap">
                    {c.name}
                    {r && <span className="ml-[0.5vw] font-display font-light tracking-[0.02em] text-white/45">{ordinal(r)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------ Action buttons */}
      <div className="absolute left-[12.3vw] top-[39.5vh] flex items-center gap-[0.95vw]">
        {buttons.map((b, i) => {
          const focused = focus.zone === 'buttons' && Math.min(focus.index, buttons.length - 1) === i;
          return (
            <button
              key={b.label}
              type="button"
              onMouseEnter={() => setFocus({ zone: 'buttons', index: i })}
              onClick={b.run}
              className={`h-[5.8vh] min-h-[40px] rounded-[4px] flex items-center gap-[0.8vw] whitespace-nowrap text-[clamp(13px,1.12vw,21px)] transition-shadow ${
                focused ? 'px-[1.5vw] font-bold text-[#141824]' : 'px-[1.4vw] bg-[#050607] text-white border border-white/10'
              }`}
              style={
                focused
                  ? {
                      background: 'linear-gradient(90deg, #d4fff4 0%, #ece2ff 58%, #e6d9ff 100%)',
                      boxShadow: '0 0 26px rgba(214,200,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.9)',
                    }
                  : undefined
              }
            >
              {focused && <PadGlyph shape="cross" dark />}
              {b.label}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------ Task window */}
      <div className="absolute left-[10.7vw] w-[37vw] top-[49.6vh]">
        {visibleTasks.map((t, i) => {
          const idx = windowStart + i;
          const focused = idx === focusedTask;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={-1}
              onMouseEnter={() => setFocus({ zone: 'tasks', index: idx })}
              onClick={t.action}
              className={`relative h-[7.55vh] flex items-center cursor-pointer border-b border-white/30 ${focused ? 'text-white' : 'text-[#c3cbd6]'}`}
              style={focused ? { background: 'linear-gradient(90deg, rgba(150,164,196,0.35), rgba(110,104,150,0.18))' } : undefined}
            >
              <span className="w-[6.2vw] h-full flex items-center justify-center">
                <TaskIcon icon={t.icon} player={t.player} />
              </span>
              {t.clubId !== undefined && (
                <span className="mr-[0.8vw]"><ClubCrest club={career.clubs[t.clubId]} size={24} /></span>
              )}
              <span className={`truncate text-[clamp(13px,1.12vw,21px)] ${focused ? 'font-bold' : ''}`}>{t.title}</span>
              {focused && <span className="ml-auto mr-[1vw] flex items-center gap-[0.4vw] text-[clamp(10px,0.85vw,16px)] text-white/80"><PadGlyph shape="cross" /> Open</span>}
            </div>
          );
        })}
        <div className="h-[6vh] flex items-center pl-[1.6vw] text-[#c3cbd6] text-[clamp(12px,1.05vw,20px)]">
          {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
        </div>
      </div>

      {/* ------------------------------------------------ Social news card */}
      {story && (
        <div
          role="button"
          tabIndex={-1}
          onMouseEnter={() => setFocus({ zone: 'news' })}
          className="absolute left-[59.8vw] w-[30.4vw] top-[5.5vh] h-[67.5vh] rounded-[10px] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #164036 0%, #10302b 55%, #0c2321 100%)',
            boxShadow: focus.zone === 'news' ? '0 0 0 2px rgba(232,238,255,0.85), 0 0 30px rgba(196,210,255,0.3)' : '0 22px 50px rgba(0,0,0,0.45)',
          }}
        >
          {/* Story art + player cutout (art is a placeholder for the in-game photo) */}
          <div
            className="absolute inset-x-0 top-0 h-[78%] bg-cover bg-center"
            style={{
              backgroundImage: `url('${story.image}')`,
              maskImage: 'linear-gradient(180deg, #000 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, #000 55%, transparent 100%)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-[78%] bg-gradient-to-b from-[#0c2321]/10 via-[#0c2321]/20 to-[#0c2321]/90" />
          {story.cutoutName && (
            <div className="absolute inset-x-0 top-[6%] h-[62%] flex items-end justify-center pointer-events-none">
              <MarqueePlayerCutout name={story.cutoutName} useFallback={false} className="h-full w-auto object-contain object-bottom" />
            </div>
          )}

          {/* Tag + date */}
          <div className="absolute left-[3.9%] top-[3%] flex items-center gap-[1vw]">
            <StoryTagIcon kind={story.tagIcon} />
            <div className="leading-tight">
              <div className="font-bold text-[clamp(13px,1.17vw,22px)]">{story.tag}</div>
              <div className="text-white/85 text-[clamp(11px,0.95vw,18px)]">{story.dateLabel}</div>
            </div>
          </div>
          <span className="absolute right-0 top-0 h-[6.5%] min-h-[30px] px-[1.75vw] rounded-bl-[6px] flex items-center bg-[#dcf55c] text-[#1a1f10] font-medium text-[clamp(12px,1.1vw,21px)]">
            New
          </span>

          {showComments ? (
            <div className="absolute inset-x-[4%] top-[14%] bottom-[24%] overflow-y-auto space-y-[1.2vh]">
              {story.comments.map((c, i) => (
                <div key={i} className="rounded-[6px] bg-black/45 px-[1vw] py-[1vh] text-[clamp(11px,0.95vw,18px)]">
                  <div className="flex justify-between text-white/60"><span>{c.user}</span><span>{c.time}</span></div>
                  <div className="mt-[0.3vh]">{c.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute inset-x-0 top-[55%] grid grid-cols-2 text-center">
              {story.stats.map((s) => (
                <div key={s.label}>
                  <div className="font-expanded font-black leading-[0.9] text-[clamp(52px,6.1vw,118px)] drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]">{s.value}</div>
                  <div className="mt-[1.2vh] font-expanded font-black text-[#45e07c] text-[clamp(12px,1.06vw,20px)]">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <p className="absolute left-[4%] right-[5%] top-[82.5%] line-clamp-2 leading-[1.45] text-[clamp(12px,1.12vw,21px)]">{story.summary}</p>

          <div className="absolute left-[4.3%] right-[4.6%] top-[94.6%] -translate-y-1/2 flex items-center text-[clamp(12px,1.17vw,22px)]">
            <button type="button" onClick={() => setLiked((l) => ({ ...l, [story.id]: !l[story.id] }))} className="flex items-center gap-[0.7vw]">
              <Heart className={`w-[1.3vw] h-[1.3vw] min-w-[16px] min-h-[16px] ${liked[story.id] ? 'fill-[#ff5a6e] text-[#ff5a6e]' : ''}`} strokeWidth={1.8} />
              {story.likes}
            </button>
            <span className="ml-[2vw] flex items-center gap-[0.7vw]">
              <MessageCircle className="w-[1.3vw] h-[1.3vw] min-w-[16px] min-h-[16px]" strokeWidth={1.8} />
              {story.commentsCount}
            </span>
            <button type="button" onClick={() => setShowComments((v) => !v)} className="ml-auto flex items-center gap-[0.5vw]">
              <PadGlyph shape="square" /> {showComments ? 'Hide Comments' : 'Show Comments'}
            </button>
          </div>
        </div>
      )}
      <div className="absolute left-[74.4vw] top-[76.6vh] -translate-x-1/2">
        <PagerDots count={stories.length} index={storyIdx % Math.max(1, stories.length)} onCycle={nextStory} />
      </div>

      </div>

      {/* ------------------------------------------------ Controller bar */}
      <div className="absolute left-[2.6vw] right-[2.6vw] bottom-[1vh] flex items-center text-white/90 text-[clamp(12px,1.08vw,20px)]">
        <div className="flex items-center gap-[2.2vw]">
          <span className="flex items-center gap-[0.5vw]"><PadGlyph shape="cross" /> Select</span>
          <button type="button" onClick={nextStory} className="flex items-center gap-[0.5vw]">
            <span className="inline-flex items-center justify-center rounded-full bg-white/25 font-bold w-[clamp(20px,1.6vw,30px)] h-[clamp(20px,1.6vw,30px)] text-[clamp(9px,0.75vw,14px)]">R</span>
            Scroll Feed
          </button>
          <button type="button" onClick={() => setActiveTab('Customise')} className="flex items-center gap-[0.5vw]">
            <span className="inline-flex items-center justify-center rounded-full bg-white/20 w-[clamp(20px,1.6vw,30px)] h-[clamp(20px,1.6vw,30px)]">
              <Settings2 className="w-1/2 h-1/2" />
            </span>
            Advance Customisation
          </button>
        </div>
        <button type="button" onClick={() => setActiveTab('Squad')} className="ml-auto flex items-center gap-[0.5vw] text-[#8ff0cd]">
          <span className="rounded bg-[#38f2c8]/20 px-[0.4vw] text-[clamp(9px,0.72vw,14px)] font-bold">R2</span> FC HUB
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
const CompetitionBadge: React.FC = () => (
  <svg viewBox="0 0 40 44" className="w-[1.95vw] h-auto min-w-[24px]" aria-hidden>
    <path d="M20 6 C10 6 5 14 5 22 C5 32 12 39 20 39 C28 39 35 32 35 22" fill="none" stroke="#f0a030" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M20 13 C14 13 11 18 11 23 C11 29 15 33 20 33 C25 33 29 29 29 23" fill="none" stroke="#3d8ef0" strokeWidth="4.5" strokeLinecap="round" />
    <circle cx="20" cy="5" r="3.5" fill="#3d8ef0" />
  </svg>
);

const TaskIcon: React.FC<{ icon: 'coach' | 'offer' | 'injury' | 'contract' | 'inbox'; player?: Player }> = ({ icon, player }) => {
  const cls = 'w-[2.4vw] h-[2.4vw] min-w-[26px] min-h-[26px]';
  switch (icon) {
    case 'coach':
      return <UserPlus className={`${cls} text-[#c9d0da]`} strokeWidth={2} />;
    case 'offer':
      return (
        <span className="h-full flex items-end">
          <PlayerBust src={player?.headshotUrl} alt={player?.knownAs ?? 'Player'} />
        </span>
      );
    case 'injury':
      return <Ambulance className={`${cls} text-[#f0613a] fill-[#f0613a]/25`} strokeWidth={2} />;
    case 'contract':
      return <FileSignature className={`${cls} text-[#c9d0da]`} strokeWidth={2} />;
    case 'inbox':
      return <Mail className={`${cls} text-[#c9d0da]`} strokeWidth={2} />;
  }
};

/** Orange story tag tile (goal frame / transfer arrows / tactics board glyph). */
const StoryTagIcon: React.FC<{ kind: Story['tagIcon'] }> = ({ kind }) => (
  <span className="inline-flex items-center justify-center rounded-[3px] bg-[#f2683a] w-[2.95vw] h-[2.95vw] min-w-[34px] min-h-[34px]">
    <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'goal' && <path d="M3 16 V8 H21 V16" />}
      {kind === 'transfer' && <path d="M4 9 H18 L14 5 M20 15 H6 L10 19" />}
      {kind === 'tactics' && <path d="M4 5 H20 V19 H4 Z M12 5 V19 M4 12 H8 M16 12 H20" />}
    </svg>
  </span>
);
