import React, { useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  UserPlus,
  Wifi,
} from 'lucide-react';
import {
  diffDays,
  formatFixtureMonthDay,
  formatHubBannerDate,
  formatOrdinal,
} from '../engine/season';
import {
  clampFocusToLayout,
  closeHubOverlay,
  cycleStoryIndex,
  moveHubFocus,
  openHubOverlay,
  setHubFocusDirect,
  type HubFocusLayout,
  type HubTileId,
} from '../navigation/hubFocus';
import { useCareerStore, type BroadcastStory } from '../store/careerStore';
import { HubOverlays, type HubTaskItem } from './HubOverlays';
import {
  BroadcastEditorialArt,
  ClubCrest,
  CompetitionBadge,
  PlayerAvatar,
} from './PlayerAvatar';

/** Authentic PlayStation/Console Select Glyph shown inside the focused tile */
const ConsoleCrossGlyph: React.FC<{ dark?: boolean }> = ({ dark = true }) => (
  <span
    className={`inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[11px] font-black leading-none ${
      dark
        ? 'bg-[#081016] text-[#e4dcff]'
        : 'border border-white/75 bg-white/10 text-white'
    }`}
    aria-hidden="true"
  >
    ✕
  </span>
);

/** Orange medical ambulance glyph matching Image 2's injured players row */
const InjuryAmbulanceIcon: React.FC = () => (
  <svg width="26" height="20" viewBox="0 0 28 22" fill="none" aria-hidden="true" className="shrink-0">
    <path
      d="M2 5.5C2 4.1 3.1 3 4.5 3H17.5C18.3 3 19 3.7 19 4.5V16H2V5.5Z"
      fill="#FF5733"
    />
    <path d="M19 7H23.2L26 10.8V16H19V7Z" fill="#FF5733" />
    <rect x="20.5" y="8.5" width="3.5" height="2.8" rx="0.5" fill="#10212D" />
    <rect x="9.3" y="6.2" width="2.4" height="6.6" rx="0.6" fill="#10212D" />
    <rect x="7.2" y="8.3" width="6.6" height="2.4" rx="0.6" fill="#10212D" />
    <circle cx="7.2" cy="17.2" r="2.7" fill="#FF5733" stroke="#10212D" strokeWidth="1.2" />
    <circle cx="21.2" cy="17.2" r="2.7" fill="#FF5733" stroke="#10212D" strokeWidth="1.2" />
  </svg>
);

/** GOAL red-orange goal-frame badge matching Image 2's top-left card header */
const NewsSourceIcon: React.FC<{ sourceType: 'GOAL' | 'ATHLETIC' | 'OPTA' }> = ({
  sourceType,
}) => {
  if (sourceType === 'GOAL') {
    return (
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] bg-[#f25a38] shadow-md"
        aria-hidden="true"
      >
        <svg width="22" height="16" viewBox="0 0 24 18" fill="none">
          <path d="M2 16V3H22V16" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="square" />
          <path d="M6 16V7H18V16" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] bg-[#0e2d3b] border border-[#38f2c8]/40 text-[#38f2c8] font-expanded text-[11px] font-black shadow-md"
      aria-hidden="true"
    >
      {sourceType === 'OPTA' ? 'OP' : 'TA'}
    </span>
  );
};

const DEFAULT_STORIES: BroadcastStory[] = [
  {
    id: 's-quinones',
    source: 'GOAL',
    sourceType: 'GOAL',
    dateLabel: 'July 12',
    isNew: true,
    headline: 'Quiñones Sets Blistering Pace Ahead of International Cup',
    artVariant: 'striker-green',
    statLeftValue: '32',
    statLeftLabel: 'MATCHES',
    statRightValue: '32',
    statRightLabel: 'GOALS',
    snippet:
      'One to watch: after having seconded Quiñones in the ROSHN Saudi League Golden Boot race, the forward is primed to lead the line in the upcoming cup.',
    fullArticle:
      'Full analysis: Tactical setup, dynamic pressing statistics, and match-readiness indicators confirm peak physical form heading into tournament kickoff.',
    likesLabel: '1.10 M',
    commentsCountLabel: '1.37 K',
    comments: [
      {
        user: 'Mateo R.',
        handle: '@mateor99',
        text: 'Absolute machine in front of goal. Defenses will struggle to contain him.',
        time: '1h ago',
      },
      {
        user: 'Sofia V.',
        handle: '@sofiav_fc',
        text: 'The finishing composure has reached elite European standards.',
        time: '3h ago',
      },
    ],
  },
  {
    id: 's-tactics',
    source: 'The Athletic',
    sourceType: 'ATHLETIC',
    dateLabel: 'July 10',
    isNew: false,
    headline: 'FC IQ Analysis: How High Line Reshapes Defensive Transitions',
    artVariant: 'touchline-tactics',
    statLeftValue: '88%',
    statLeftLabel: 'PRESS SUCCESS',
    statRightValue: '+4',
    statRightLabel: 'XG DELTA',
    snippet:
      'Advanced tactical tracking reveals inverted fullbacks and compact midfield diamonds creating unprecedented counter-pressing control.',
    fullArticle:
      'Comprehensive tactical breakdown of defensive line height, role familiarity, and off-ball movement across European pre-season matches.',
    likesLabel: '840 K',
    commentsCountLabel: '920',
    comments: [
      {
        user: 'Liam Davies',
        handle: '@davies_tactics',
        text: 'The half-space occupation is what makes this system click.',
        time: '2h ago',
      },
    ],
  },
  {
    id: 's-tunnel',
    source: 'Opta',
    sourceType: 'OPTA',
    dateLabel: 'July 8',
    isNew: false,
    headline: 'Tunnel Vision: Match Fitness Demands at Peak Pre-Season Intensity',
    artVariant: 'tunnel-night',
    statLeftValue: '94',
    statLeftLabel: 'STAMINA PEAK',
    statRightValue: '0',
    statRightLabel: 'INJURIES',
    snippet:
      'Medical room data indicates rigorous conditioning cycles have yielded top physical performance across starting personnel.',
    fullArticle:
      'Player wellness report tracking VO2 max, recovery velocity, and tactical endurance through two-a-day pre-season sessions.',
    likesLabel: '620 K',
    commentsCountLabel: '450',
    comments: [
      {
        user: 'Carlos M.',
        handle: '@carlos_physio',
        text: 'Recovery policy and rotation will determine whether this form holds through winter.',
        time: '4h ago',
      },
    ],
  },
];

export const CentralHub: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const hubFocus = useCareerStore((s) => s.hubFocus);
  const setHubFocus = useCareerStore((s) => s.setHubFocus);
  const activeStoryIdx = useCareerStore((s) => s.activeStoryIdx);
  const setActiveStoryIdx = useCareerStore((s) => s.setActiveStoryIdx);
  const advanceDay = useCareerStore((s) => s.advanceDay);
  const toggleStoryLike = useCareerStore((s) => s.toggleStoryLike);
  const lastActionNotice = useCareerStore((s) => s.lastActionNotice);
  const clearActionNotice = useCareerStore((s) => s.clearActionNotice);

  // Auto-dismiss transient feedback toast after 2.6s
  useEffect(() => {
    if (!lastActionNotice) return;
    const timer = window.setTimeout(() => clearActionNotice(), 2600);
    return () => window.clearTimeout(timer);
  }, [lastActionNotice, clearActionNotice]);

  const computed = useMemo(() => {
    if (!career) return null;
    const userClub = career.clubs[career.userClubId];

    // Next unplayed fixture for the active club
    const nextMatch = career.fixtures
      .filter(
        (f) =>
          !f.played &&
          (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId)
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    const homeClub = nextMatch ? career.clubs[nextMatch.homeClubId] : null;
    const awayClub = nextMatch ? career.clubs[nextMatch.awayClubId] : null;

    const homeStandingIdx = homeClub
      ? career.standings.findIndex((s) => s.clubId === homeClub.id)
      : -1;
    const awayStandingIdx = awayClub
      ? career.standings.findIndex((s) => s.clubId === awayClub.id)
      : -1;
    const homeRank = homeStandingIdx >= 0 ? homeStandingIdx + 1 : 1;
    const awayRank = awayStandingIdx >= 0 ? awayStandingIdx + 1 : 1;

    const daysToNextMatch = nextMatch
      ? Math.max(0, diffDays(career.currentDate, nextMatch.date))
      : 0;

    const userSquad = Object.values(career.players).filter(
      (p) => p.clubId === career.userClubId
    );
    const injuredPlayers = userSquad.filter(
      (p) => p.injury?.recovering || (p.injury?.daysRemaining ?? 0) > 0
    );
    const activeOffers = career.negotiations.filter(
      (n) =>
        n.fromClubId === career.userClubId &&
        n.stage !== 'COMPLETED' &&
        n.stage !== 'REJECTED'
    );
    const clubInbox = career.inbox.filter((m) => !m.clubId || m.clubId === career.userClubId);
    const currentYear = parseInt(career.currentDate.slice(0, 4), 10);
    const expiringContracts = userSquad.filter((p) => p.contractEndYear <= currentYear + 1);

    // Build live immediate management tasks matching FC 27 hierarchy
    const allTasks: HubTaskItem[] = [];

    const coachSlotsFilled = userClub.coachSlotsFilled ?? userClub.coaches?.length ?? 4;
    const coachSlotsTotal = userClub.coachSlotsTotal ?? 6;
    if (coachSlotsFilled < coachSlotsTotal) {
      allTasks.push({
        id: 'hire-coach',
        kind: 'coach',
        title: 'Hire a Coach',
        detail: `${coachSlotsTotal - coachSlotsFilled} coaching slot(s) available for ${userClub.name}.`,
      });
    }

    for (const offer of activeOffers) {
      const targetPlayer = career.players[offer.playerId];
      allTasks.push({
        id: `offer-${offer.id}`,
        kind: 'transfer',
        title: `Offer Received For ${targetPlayer?.knownAs ?? 'Squad Player'}`,
        detail: `${offer.counterpartClubName} submitted an official transfer bid.`,
        negotiationId: offer.id,
        playerId: String(offer.playerId),
        counterpartClubId: String(offer.toClubId),
      });
    }

    if (injuredPlayers.length > 0) {
      allTasks.push({
        id: 'injured-players',
        kind: 'injury',
        title:
          injuredPlayers.length === 1
            ? `${injuredPlayers[0].knownAs} Is Injured`
            : `${injuredPlayers.length} Players Are Injured`,
        detail: injuredPlayers
          .map((p) => `${p.knownAs} (${p.injury?.daysRemaining ?? 5}d)`)
          .join(', '),
      });
    }

    for (const msg of clubInbox.slice(0, 3)) {
      allTasks.push({
        id: `inbox-${msg.id}`,
        kind: 'inbox',
        title: msg.subject,
        detail: msg.body,
      });
    }

    if (expiringContracts.length > 0) {
      allTasks.push({
        id: `contract-${expiringContracts[0].id}`,
        kind: 'contract',
        title: `Contract Renewal: ${expiringContracts[0].knownAs}`,
        detail: `Current deal expires in ${expiringContracts[0].contractEndYear}.`,
      });
    }

    allTasks.push({
      id: 'tactical-vision',
      kind: 'tactics',
      title: `Review ${userClub.tacticalVision} Tactics`,
      detail: `${userClub.formation} matchday shape prepared for upcoming fixtures.`,
    });

    const visibleTasks = allTasks.slice(0, 3);

    const rawStories = career.stories && career.stories.length > 0 ? career.stories : DEFAULT_STORIES;
    const clubStories = rawStories.filter((s) => !s.clubId || s.clubId === career.userClubId);
    const stories = clubStories.length > 0 ? clubStories : rawStories;
    const safeStoryIdx = activeStoryIdx < stories.length ? activeStoryIdx : 0;
    const currentStory = stories[safeStoryIdx];

    const dateFormatted = formatHubBannerDate(career.currentDate);
    const fixtureDateTime = nextMatch
      ? `${formatFixtureMonthDay(nextMatch.date)} ${nextMatch.kickoffTime || '4:00 PM'}`
      : '';

    return {
      userClub,
      nextMatch,
      homeClub,
      awayClub,
      homeRank,
      awayRank,
      daysToNextMatch,
      allTasks,
      visibleTasks,
      stories,
      safeStoryIdx,
      currentStory,
      dateFormatted,
      fixtureDateTime,
    };
  }, [career, activeStoryIdx]);

  const {
    userClub,
    nextMatch,
    homeClub,
    awayClub,
    homeRank,
    awayRank,
    daysToNextMatch,
    allTasks,
    visibleTasks,
    stories,
    safeStoryIdx,
    currentStory,
    dateFormatted,
    fixtureDateTime,
  } = computed ?? {};

  const isMatchDay = Boolean(nextMatch && career && nextMatch.date === career.currentDate);
  const isStoryLiked = Boolean(career?.likedStoryIds?.[currentStory?.id ?? '']);

  const layout: HubFocusLayout = useMemo(
    () => ({
      visibleTaskCount: visibleTasks?.length ?? 0,
      hasTasksAllRow: (allTasks?.length ?? 0) > 0,
    }),
    [visibleTasks?.length, allTasks?.length]
  );

  const safeFocus = useMemo(
    () => clampFocusToLayout(hubFocus, layout),
    [hubFocus, layout]
  );

  const activateTile = (tileId: HubTileId) => {
    if (tileId === 'btn-advance') {
      setHubFocus((prev) => setHubFocusDirect(prev, 'btn-advance'));
      if (isMatchDay) {
        setHubFocus((prev) =>
          openHubOverlay(prev, 'matchday', { fromTile: 'btn-advance' })
        );
      } else {
        advanceDay();
      }
      return;
    }

    if (tileId === 'btn-practice') {
      setHubFocus((prev) =>
        openHubOverlay(prev, 'practice', { fromTile: 'btn-practice' })
      );
      return;
    }

    if (tileId === 'task-0' || tileId === 'task-1' || tileId === 'task-2') {
      const idx = parseInt(tileId.split('-')[1], 10);
      if (visibleTasks?.[idx]) {
        setHubFocus((prev) =>
          openHubOverlay(prev, 'task-detail', { fromTile: tileId, taskIndex: idx })
        );
      }
      return;
    }

    if (tileId === 'tasks-all') {
      setHubFocus((prev) =>
        openHubOverlay(prev, 'tasks-all', { fromTile: 'tasks-all' })
      );
      return;
    }

    if (tileId === 'feed-card') {
      setHubFocus((prev) =>
        openHubOverlay(prev, 'story-detail', { fromTile: 'feed-card' })
      );
      return;
    }

    if (tileId === 'feed-like') {
      setHubFocus((prev) => setHubFocusDirect(prev, 'feed-like'));
      if (currentStory) toggleStoryLike(currentStory.id);
      return;
    }

    if (tileId === 'feed-comments') {
      setHubFocus((prev) =>
        openHubOverlay(prev, 'comments', { fromTile: 'feed-comments' })
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'SELECT' ||
        activeEl?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'escape' || key === 'backspace') {
        if (safeFocus.activeOverlay !== null) {
          e.preventDefault();
          setHubFocus((prev) => closeHubOverlay(prev, layout));
        }
        return;
      }

      if (safeFocus.activeOverlay !== null) {
        if (key === 't' && safeFocus.activeOverlay === 'tutorials') {
          e.preventDefault();
          setHubFocus((prev) => closeHubOverlay(prev, layout));
        }
        return;
      }

      if (key === 'w' || key === 'arrowup') {
        e.preventDefault();
        setHubFocus((prev) => moveHubFocus(prev, 'up', layout));
        return;
      }
      if (key === 's' || key === 'arrowdown') {
        e.preventDefault();
        setHubFocus((prev) => moveHubFocus(prev, 'down', layout));
        return;
      }
      if (key === 'a' || key === 'arrowleft') {
        e.preventDefault();
        setHubFocus((prev) => moveHubFocus(prev, 'left', layout));
        return;
      }
      if (key === 'd' || key === 'arrowright') {
        e.preventDefault();
        setHubFocus((prev) => moveHubFocus(prev, 'right', layout));
        return;
      }

      if (key === 'enter' || key === ' ' || key === 'f') {
        e.preventDefault();
        activateTile(safeFocus.focusedId);
        return;
      }

      if (key === 'r') {
        e.preventDefault();
        const delta = e.shiftKey ? -1 : 1;
        setActiveStoryIdx(cycleStoryIndex(safeStoryIdx ?? 0, stories?.length ?? 1, delta));
        return;
      }

      if (key === 't') {
        e.preventDefault();
        setHubFocus((prev) => openHubOverlay(prev, 'tutorials'));
        return;
      }

      if (key === 'c') {
        e.preventDefault();
        setHubFocus((prev) => openHubOverlay(prev, 'advance-customisation'));
        return;
      }

      if (key === 'tab') {
        e.preventDefault();
        setHubFocus((prev) => openHubOverlay(prev, 'shortcuts'));
        return;
      }

      if (key === 'h') {
        e.preventDefault();
        setHubFocus((prev) => openHubOverlay(prev, 'fc-hub'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!career || !computed || !userClub || !currentStory) return null;

  const selectedTask =
    safeFocus.selectedTaskIndex !== null
      ? allTasks?.[safeFocus.selectedTaskIndex] ?? null
      : null;

  const isFocused = (id: HubTileId) =>
    safeFocus.activeOverlay === null && safeFocus.focusedId === id;

  return (
    <main
      className="flex-1 min-h-0 flex flex-col justify-between relative"
      data-focused-tile={safeFocus.focusedId}
      data-active-club={userClub.id}
    >
      <div className="flex-1 min-h-0 flex items-center justify-center px-5 lg:px-10 pt-2 pb-3">
        <div className="fc-hub-screen relative w-full max-w-[1340px] h-full max-h-[725px] rounded-[6px] border border-white/[0.09] overflow-hidden flex flex-col justify-center">
          <div className="fc-hub-screen-facets absolute inset-0 pointer-events-none" />

          {lastActionNotice && (
            <div
              role="status"
              aria-live="polite"
              className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 rounded-md bg-[#08131b]/90 border border-[#38f2c8]/50 px-4 py-1.5 text-xs font-semibold text-[#b8fff0] shadow-lg"
            >
              {lastActionNotice}
            </div>
          )}

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center px-7 sm:px-10 lg:px-12 py-6 h-full">
            <section
              className="lg:col-span-7 flex flex-col justify-center max-w-[560px] w-full"
              aria-label="Fixture and Daily Routine"
            >
              <h1 className="font-expanded text-[34px] sm:text-[40px] lg:text-[44px] font-black uppercase tracking-tight text-white leading-[1.04]">
                {dateFormatted}
              </h1>

              <p className="mt-2.5 text-[15px] font-normal text-white/80">
                {daysToNextMatch === 0
                  ? 'Matchday Today'
                  : `Next Fixture in ${daysToNextMatch} ${daysToNextMatch === 1 ? 'day' : 'days'}`}
              </p>

              <div className="my-4 h-px w-full bg-white/22" aria-hidden="true" />

              {nextMatch && homeClub && awayClub ? (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2.5 text-[15px]">
                    <CompetitionBadge name={nextMatch.competitionName ?? 'League Match'} size={24} />
                    <span className="font-bold text-white tracking-tight">
                      {nextMatch.competitionName ?? 'League Match'}
                    </span>
                    <span className="text-white/65 font-normal ml-1 tabular-nums">
                      {fixtureDateTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-5 pt-0.5">
                    <div className="flex items-center gap-4 shrink-0">
                      <ClubCrest club={homeClub} size={58} />
                      <ClubCrest club={awayClub} size={58} />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-baseline gap-2.5 leading-tight">
                        <span className="font-expanded text-[20px] sm:text-[22px] font-black uppercase text-white tracking-tight truncate">
                          {homeClub.name}
                        </span>
                        <span className="font-mono-num text-[17px] font-light uppercase text-white/65 shrink-0">
                          {formatOrdinal(homeRank ?? 1)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2.5 leading-tight">
                        <span className="font-expanded text-[20px] sm:text-[22px] font-black uppercase text-white tracking-tight truncate">
                          {awayClub.name}
                        </span>
                        <span className="font-mono-num text-[17px] font-light uppercase text-white/65 shrink-0">
                          {formatOrdinal(awayRank ?? 1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-sm text-white/70">
                  No remaining scheduled fixtures this month.
                </div>
              )}

              <div className="mt-6 flex items-center gap-3.5">
                <button
                  type="button"
                  data-tile-id="btn-advance"
                  aria-current={isFocused('btn-advance') ? 'true' : undefined}
                  onMouseEnter={() =>
                    setHubFocus((prev) => setHubFocusDirect(prev, 'btn-advance'))
                  }
                  onClick={() => activateTile('btn-advance')}
                  className={`h-[48px] min-w-[132px] px-6 rounded-[8px] text-[15px] tracking-wide inline-flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none whitespace-nowrap ${
                    isFocused('btn-advance')
                      ? 'fc-btn-primary scale-[1.02]'
                      : 'fc-btn-console font-medium'
                  }`}
                >
                  {isFocused('btn-advance') && <ConsoleCrossGlyph dark />}
                  <span>{isMatchDay ? 'Play Match' : 'Advance'}</span>
                </button>

                <button
                  type="button"
                  data-tile-id="btn-practice"
                  aria-current={isFocused('btn-practice') ? 'true' : undefined}
                  onMouseEnter={() =>
                    setHubFocus((prev) => setHubFocusDirect(prev, 'btn-practice'))
                  }
                  onClick={() => activateTile('btn-practice')}
                  className={`h-[48px] min-w-[196px] px-6 rounded-[8px] text-[15px] tracking-wide inline-flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none whitespace-nowrap ${
                    isFocused('btn-practice')
                      ? 'fc-btn-primary scale-[1.02]'
                      : 'fc-btn-console font-medium'
                  }`}
                >
                  {isFocused('btn-practice') && <ConsoleCrossGlyph dark />}
                  <span>Practice Arena</span>
                </button>
              </div>

              <div className="mt-7 w-full" aria-label="Immediate Management Tasks">
                {visibleTasks?.map((task, idx) => {
                  const tileId = `task-${idx}` as HubTileId;
                  const focused = isFocused(tileId);
                  const offerPlayer = task.playerId
                    ? career.players[Number(task.playerId)]
                    : undefined;
                  const counterpartClub = task.counterpartClubId
                    ? career.clubs[Number(task.counterpartClubId)]
                    : undefined;

                  return (
                    <button
                      key={task.id}
                      type="button"
                      data-tile-id={tileId}
                      aria-current={focused ? 'true' : undefined}
                      onMouseEnter={() =>
                        setHubFocus((prev) => setHubFocusDirect(prev, tileId))
                      }
                      onClick={() => activateTile(tileId)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 h-[56px] text-left transition-all cursor-pointer focus-visible:outline-none ${
                        focused
                          ? 'fc-task-focused rounded-[8px] my-0.5 border-transparent'
                          : 'border-b border-white/16 text-white/82 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 flex items-center justify-center shrink-0">
                          {task.kind === 'coach' && (
                            <UserPlus
                              className={`w-6 h-6 ${
                                focused ? 'text-[#081016]' : 'text-white/60'
                              }`}
                            />
                          )}
                          {task.kind === 'transfer' && offerPlayer && (
                            <PlayerAvatar
                              player={offerPlayer}
                              clubColor={userClub.primaryColor}
                              size="md"
                            />
                          )}
                          {task.kind === 'injury' && <InjuryAmbulanceIcon />}
                          {task.kind !== 'coach' &&
                            task.kind !== 'transfer' &&
                            task.kind !== 'injury' && (
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  focused ? 'bg-[#081016]' : 'bg-[#38f2c8]'
                                }`}
                              />
                            )}
                        </div>

                        {task.kind === 'transfer' && counterpartClub && (
                          <ClubCrest club={counterpartClub} size={20} />
                        )}

                        <span
                          className={`text-[15px] truncate ${
                            focused ? 'font-bold text-[#081016]' : 'font-normal text-white/82'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {focused && <ConsoleCrossGlyph dark />}
                    </button>
                  );
                })}

                <button
                  type="button"
                  data-tile-id="tasks-all"
                  aria-current={isFocused('tasks-all') ? 'true' : undefined}
                  onMouseEnter={() =>
                    setHubFocus((prev) => setHubFocusDirect(prev, 'tasks-all'))
                  }
                  onClick={() => activateTile('tasks-all')}
                  className={`mt-2 inline-flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-[14px] transition-all cursor-pointer focus-visible:outline-none ${
                    isFocused('tasks-all')
                      ? 'fc-task-focused font-bold'
                      : 'text-white/65 hover:text-white'
                  }`}
                >
                  {isFocused('tasks-all') && <ConsoleCrossGlyph dark />}
                  <span className="tabular-nums">
                    {allTasks?.length ?? 0} {(allTasks?.length ?? 0) === 1 ? 'Task' : 'Tasks'}
                  </span>
                </button>
              </div>
            </section>

            <aside
              className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center h-full"
              aria-label="Broadcast Newsfeed"
            >
              <div className="w-full max-w-[432px] flex flex-col">
                <div
                  className={`relative rounded-[12px] overflow-hidden bg-[#070b0f] border transition-all duration-150 ${
                    isFocused('feed-card')
                      ? 'fc-card-focused border-[#38f2c8] scale-[1.01]'
                      : 'border-white/14 shadow-[0_22px_50px_rgba(0,0,0,0.6)]'
                  }`}
                >
                  <button
                    type="button"
                    data-tile-id="feed-card"
                    aria-current={isFocused('feed-card') ? 'true' : undefined}
                    aria-label={`${currentStory.source} ${currentStory.dateLabel}: ${currentStory.headline}. Open full story.`}
                    onMouseEnter={() =>
                      setHubFocus((prev) => setHubFocusDirect(prev, 'feed-card'))
                    }
                    onClick={() => activateTile('feed-card')}
                    className="relative block w-full h-[388px] sm:h-[420px] text-left cursor-pointer focus-visible:outline-none group"
                  >
                    <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.02]">
                      <BroadcastEditorialArt
                        variant={currentStory.artVariant}
                        imageSrc={currentStory.image}
                        alt={currentStory.headline}
                      />
                    </div>

                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />

                    <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2.5">
                      <NewsSourceIcon sourceType={currentStory.sourceType} />
                      <div className="leading-tight">
                        <div className="text-[14px] font-extrabold uppercase tracking-wide text-white drop-shadow">
                          {currentStory.source}
                        </div>
                        <div className="text-[13px] font-medium text-white/85 drop-shadow">
                          {currentStory.dateLabel}
                        </div>
                      </div>
                    </div>

                    {currentStory.isNew && (
                      <span className="absolute top-0 right-0 z-10 rounded-bl-[10px] bg-[#d8ff4a] px-6 py-1.5 text-[14px] font-bold text-[#081016] shadow-md">
                        New
                      </span>
                    )}

                    {isFocused('feed-card') && (
                      <div className="absolute top-12 right-3.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#b8fff0] px-2.5 py-1 text-[11px] font-bold text-[#081016] shadow-lg">
                        <ConsoleCrossGlyph dark />
                        <span>Read Story</span>
                      </div>
                    )}

                    <div className="absolute inset-x-6 bottom-5 z-10 grid grid-cols-2 gap-2 text-center">
                      <div>
                        <div className="font-expanded text-[54px] sm:text-[60px] font-black text-white leading-[0.9] tracking-tight tabular-nums drop-shadow-[0_4px_16px_rgba(0,0,0,0.88)]">
                          {currentStory.statLeftValue}
                        </div>
                        <div className="mt-1.5 font-expanded text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#38e878] drop-shadow">
                          {currentStory.statLeftLabel}
                        </div>
                      </div>
                      <div>
                        <div className="font-expanded text-[54px] sm:text-[60px] font-black text-white leading-[0.9] tracking-tight tabular-nums drop-shadow-[0_4px_16px_rgba(0,0,0,0.88)]">
                          {currentStory.statRightValue}
                        </div>
                        <div className="mt-1.5 font-expanded text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#38e878] drop-shadow">
                          {currentStory.statRightLabel}
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="bg-[#070b0f] px-4 pt-3 pb-3.5 border-t border-white/[0.06]">
                    <p className="text-[14px] leading-[1.42] text-white/90 line-clamp-2 min-h-[40px]">
                      {currentStory.snippet}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 text-[13px]">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          data-tile-id="feed-like"
                          aria-current={isFocused('feed-like') ? 'true' : undefined}
                          aria-pressed={isStoryLiked}
                          onMouseEnter={() =>
                            setHubFocus((prev) => setHubFocusDirect(prev, 'feed-like'))
                          }
                          onClick={() => activateTile('feed-like')}
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-all cursor-pointer focus-visible:outline-none ${
                            isFocused('feed-like')
                              ? 'fc-task-focused font-bold'
                              : isStoryLiked
                              ? 'text-rose-400 hover:text-rose-300'
                              : 'text-white/85 hover:text-white'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${isStoryLiked ? 'fill-current' : ''}`}
                          />
                          <span className="tabular-nums font-medium">
                            {currentStory.likesLabel}
                          </span>
                        </button>

                        <span className="inline-flex items-center gap-1.5 text-white/85 tabular-nums font-medium">
                          <MessageCircle className="w-4 h-4" />
                          <span>{currentStory.commentsCountLabel}</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        data-tile-id="feed-comments"
                        aria-current={isFocused('feed-comments') ? 'true' : undefined}
                        onMouseEnter={() =>
                          setHubFocus((prev) => setHubFocusDirect(prev, 'feed-comments'))
                        }
                        onClick={() => activateTile('feed-comments')}
                        className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[13px] transition-all cursor-pointer focus-visible:outline-none whitespace-nowrap ${
                          isFocused('feed-comments')
                            ? 'fc-task-focused font-bold'
                            : 'text-white/90 hover:text-[#b8fff0] hover:bg-white/[0.06]'
                        }`}
                      >
                        <span
                          className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[9px] font-bold ${
                            isFocused('feed-comments')
                              ? 'border-[#081016] bg-[#081016] text-[#e4dcff]'
                              : 'border-white/70 text-white/90'
                          }`}
                          aria-hidden="true"
                        >
                          □
                        </span>
                        <span>Show Comments</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2.5 text-white/75 select-none">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveStoryIdx(cycleStoryIndex(safeStoryIdx ?? 0, stories?.length ?? 1, -1))
                    }
                    className="p-0.5 hover:text-white transition-colors cursor-pointer"
                    aria-label="Previous news story"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveStoryIdx(cycleStoryIndex(safeStoryIdx ?? 0, stories?.length ?? 1, 1))
                    }
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/85 text-[10px] font-black text-[#081016] hover:bg-[#b8fff0] transition-colors cursor-pointer"
                    title="Scroll Feed (R)"
                    aria-label="Scroll newsfeed story (R)"
                  >
                    R
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveStoryIdx(cycleStoryIndex(safeStoryIdx ?? 0, stories?.length ?? 1, 1))
                    }
                    className="p-0.5 hover:text-white transition-colors cursor-pointer"
                    aria-label="Next news story"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="ml-1 flex items-center gap-1.5">
                    {stories?.map((story, idx) => (
                      <button
                        key={story.id}
                        type="button"
                        onClick={() => setActiveStoryIdx(idx)}
                        aria-label={`View story ${idx + 1} of ${stories.length}`}
                        className={`rounded-full transition-all cursor-pointer ${
                          idx === safeStoryIdx
                            ? 'h-2.5 w-2.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.75)]'
                            : 'h-1.5 w-1.5 bg-white/35 hover:bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <footer
        className="shrink-0 h-[48px] w-full bg-black/55 border-t border-white/[0.08] px-6 lg:px-10 flex items-center justify-between gap-4 text-[13px] text-white/85 select-none"
        aria-label="Console Controls"
      >
        <div className="flex items-center gap-5 lg:gap-6 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => activateTile(safeFocus.focusedId)}
            className="inline-flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Select focused tile (Enter / Space)"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/75 text-[10px] font-bold">
              ✕
            </span>
            <span>Select</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (safeFocus.activeOverlay) {
                setHubFocus((prev) => closeHubOverlay(prev, layout));
              }
            }}
            className="inline-flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Exit or Back (Esc / Backspace)"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/75 text-[10px] font-bold">
              ◯
            </span>
            <span>Exit/Back</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveStoryIdx(cycleStoryIndex(safeStoryIdx ?? 0, stories?.length ?? 1, 1))
            }
            className="inline-flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Scroll Broadcast Feed (R)"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/85 text-[10px] font-black text-[#081016]">
              R
            </span>
            <span>Scroll Feed</span>
          </button>

          <button
            type="button"
            onClick={() => setHubFocus((prev) => openHubOverlay(prev, 'tutorials'))}
            className="inline-flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="View 60% Keyboard Tutorials (T)"
          >
            <span className="inline-flex h-5 px-1.5 items-center justify-center rounded bg-white/15 font-mono-num text-[10px] font-bold text-white">
              L3
            </span>
            <span>Tutorials</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setHubFocus((prev) => openHubOverlay(prev, 'advance-customisation'))
            }
            className="inline-flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Advance Customisation (C)"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/35 bg-white/10 text-[11px] font-bold">
              ≡
            </span>
            <span>Advance Customisation</span>
          </button>

          <button
            type="button"
            onClick={() => setHubFocus((prev) => openHubOverlay(prev, 'shortcuts'))}
            className="inline-flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Quick Shortcuts (Tab)"
          >
            <span className="inline-flex h-5 px-1.5 items-center justify-center rounded-full border border-white/55 font-mono-num text-[10px] font-bold text-white">
              L2
            </span>
            <span>(Hold) Shortcuts</span>
          </button>
        </div>

        <div className="flex items-center gap-3.5 shrink-0">
          <span
            className="hidden sm:inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[9px] font-black tracking-tighter text-[#081016]"
            aria-hidden="true"
          >
            EA
          </span>
          <Wifi className="hidden sm:block w-4 h-4 text-[#22d68a]" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setHubFocus((prev) => openHubOverlay(prev, 'fc-hub'))}
            className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
            title="Open FC HUB & Switch Club (H)"
          >
            <span className="font-bold tracking-wide text-white text-[13px]">FC HUB</span>
            <span className="inline-flex h-5 px-1.5 items-center justify-center rounded bg-white/18 font-mono-num text-[10px] font-bold text-white">
              R2
            </span>
          </button>
        </div>
      </footer>

      <HubOverlays
        activeOverlay={safeFocus.activeOverlay}
        selectedTask={selectedTask}
        allTasks={allTasks ?? []}
        currentStory={currentStory}
        isLiked={isStoryLiked}
        onClose={() => setHubFocus((prev) => closeHubOverlay(prev, layout))}
        onSelectTaskFromAll={(idx) =>
          setHubFocus((prev) => ({
            ...prev,
            activeOverlay: 'task-detail',
            selectedTaskIndex: idx,
          }))
        }
        onOpenComments={() =>
          setHubFocus((prev) => ({
            ...prev,
            activeOverlay: 'comments',
          }))
        }
      />
    </main>
  );
};
