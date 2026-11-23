import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FastForward,
  Heart,
  Mail,
  MessageSquare,
  Play,
  Share2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import { computeSectorRatings } from '../engine/matchSim';
import { formatMoney } from '../engine/ratings';
import { addDays, diffDays } from '../engine/season';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest, OvrDiamond, PlayerAvatar } from './PlayerAvatar';

interface Story {
  id: string;
  category: 'HIGHLIGHT' | 'TRANSFER' | 'MILESTONE' | 'TACTICAL';
  categoryLabel: string;
  tagColor: string;
  headline: string;
  summary: string;
  author: string;
  authorHandle: string;
  likes: string;
  commentsCount: string;
  comments: { user: string; handle: string; text: string; time: string }[];
  bgGradient: string;
}

export const CentralHub: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const setActiveTab = useCareerStore((s) => s.setActiveTab);
  const advanceDay = useCareerStore((s) => s.advanceDay);
  const simToNextMatchOrDate = useCareerStore((s) => s.simToNextMatchOrDate);
  const skipDeadlineHours = useCareerStore((s) => s.skipDeadlineHours);
  const quickSimNextMatch = useCareerStore((s) => s.quickSimNextMatch);
  const startLiveMatch = useCareerStore((s) => s.startLiveMatch);
  const proceedToNextSeason = useCareerStore((s) => s.proceedToNextSeason);

  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  const computed = useMemo(() => {
    if (!career) return null;
    const userClub = career.clubs[career.userClubId];
    const nextMatch = career.fixtures
      .filter((f) => !f.played && (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId))
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    const userSquad = Object.values(career.players).filter((p) => p.clubId === career.userClubId);
    const movers = [...userSquad]
      .sort(
        (a, b) =>
          Math.abs(b.dynamicOvr.totalDelta) - Math.abs(a.dynamicOvr.totalDelta) || b.baseOvr - a.baseOvr
      )
      .slice(0, 5);

    const injuredPlayers = userSquad.filter((p) => p.injury?.recovering || (p.injury?.weeksRemaining ?? 0) > 0);
    const expiringContracts = userSquad.filter((p) => {
      if (!p.contract?.expiryDateIso) return false;
      const days = diffDays(career.currentDate, p.contract.expiryDateIso);
      return days > 0 && days <= 365;
    });

    const unreadInbox = career.inbox.filter((m) => !m.read);
    const daysToClose = Math.max(0, diffDays(career.currentDate, career.transferWindowClosesDate));
    const daysToNextMatch = nextMatch ? Math.max(0, diffDays(career.currentDate, nextMatch.date)) : 0;

    const calendarStrip = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(career.currentDate, i);
      const userFix = career.fixtures.find(
        (f) => f.date === date && (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId)
      );
      return { date, userFix, isToday: i === 0 };
    });

    const userStandingIdx = career.standings.findIndex((s) => s.clubId === career.userClubId);
    const userRank = userStandingIdx >= 0 ? userStandingIdx + 1 : 1;

    const homeClub = nextMatch ? career.clubs[nextMatch.homeClubId] : null;
    const awayClub = nextMatch ? career.clubs[nextMatch.awayClubId] : null;
    const homeSectors = homeClub ? computeSectorRatings(homeClub, career.players) : null;
    const awaySectors = awayClub ? computeSectorRatings(awayClub, career.players) : null;

    const homeStandingIdx = homeClub ? career.standings.findIndex((s) => s.clubId === homeClub.id) : -1;
    const awayStandingIdx = awayClub ? career.standings.findIndex((s) => s.clubId === awayClub.id) : -1;
    const homeRank = homeStandingIdx >= 0 ? homeStandingIdx + 1 : 1;
    const awayRank = awayStandingIdx >= 0 ? awayStandingIdx + 1 : 1;

    // Determine competition name based on userClub leagueId
    const leagueName =
      userClub.leagueId === 13
        ? 'PREMIER LEAGUE'
        : userClub.leagueId === 53
        ? 'LALIGA EA SPORTS'
        : userClub.leagueId === 19
        ? 'BUNDESLIGA'
        : userClub.leagueId === 31
        ? 'SERIE A ENILIVE'
        : userClub.leagueId === 16
        ? "LIGUE 1 McDONALD'S"
        : 'DOMESTIC LEAGUE';

    // Build actionable tasks queue
    const tasks: {
      id: string;
      title: string;
      subtitle: string;
      icon: 'transfer' | 'injury' | 'contract' | 'inbox' | 'coach';
      badge: string;
      badgeColor: string;
      action: () => void;
    }[] = [];

    // Transfer offers
    const activeOffers = career.activeNegotiations.filter((n) => n.sellerClubId === career.userClubId);
    if (activeOffers.length > 0) {
      tasks.push({
        id: 'transfer-offer',
        title: `Offer Received for ${activeOffers[0].playerName}`,
        subtitle: `${activeOffers[0].buyerClubName} submitted an official bid (${formatMoney(activeOffers[0].currentOfferFeeEur, career.settings.currency)})`,
        icon: 'transfer',
        badge: 'TRANSFER ACTION',
        badgeColor: 'border-emerald-400 text-emerald-300 bg-emerald-500/10',
        action: () => setActiveTab('Transfers'),
      });
    }

    // Injured players
    if (injuredPlayers.length > 0) {
      const p = injuredPlayers[0];
      tasks.push({
        id: 'injury-alert',
        title: `${p.knownAs} Injured (${p.injury?.type ?? 'Recovering'})`,
        subtitle: `${p.injury?.weeksRemaining ?? 1}w remaining · ${p.injury?.aggravationRiskPct ?? 35}% aggravation risk`,
        icon: 'injury',
        badge: 'FITNESS ALERT',
        badgeColor: 'border-amber-400 text-amber-300 bg-amber-500/10',
        action: () => setActiveTab('Squad'),
      });
    }

    // Expiring contracts
    if (expiringContracts.length > 0) {
      const p = expiringContracts[0];
      tasks.push({
        id: 'contract-expiry',
        title: `${p.knownAs} Contract Expiring`,
        subtitle: `Less than 12 months left on contract (${p.contract?.weeklyWageEur ? formatMoney(p.contract.weeklyWageEur, career.settings.currency) + '/wk' : 'Under contract'})`,
        icon: 'contract',
        badge: 'OFFICE',
        badgeColor: 'border-sky-400 text-sky-300 bg-sky-500/10',
        action: () => setActiveTab('Office'),
      });
    }

    // Unread messages
    if (unreadInbox.length > 0) {
      tasks.push({
        id: 'unread-mail',
        title: unreadInbox[0].subject,
        subtitle: unreadInbox[0].body.slice(0, 75) + '...',
        icon: 'inbox',
        badge: 'INBOX',
        badgeColor: 'border-violet-400 text-violet-300 bg-violet-500/10',
        action: () => setActiveTab('Notifications'),
      });
    }

    // Staff / Tactical review default task
    tasks.push({
      id: 'tactical-review',
      title: 'FC IQ Tactical Calibration',
      subtitle: `${userClub.formation} · ${userClub.tacticalVision} Strategy set for next matchday`,
      icon: 'coach',
      badge: 'FC IQ',
      badgeColor: 'border-[#38f2c8] text-[#38f2c8] bg-[#38f2c8]/10',
      action: () => setActiveTab('Squad'),
    });

    // Formatted current date header: "SUNDAY, JUL 12"
    const dateObj = new Date(`${career.currentDate}T00:00:00Z`);
    const dateFormatted = dateObj
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
      .toUpperCase();

    // Top player for news story
    const starPlayer = [...userSquad].sort((a, b) => b.dynamicOvr.dynamicOvr - a.dynamicOvr.dynamicOvr)[0] || userSquad[0];

    // Generate dynamic news highlights
    const stories: Story[] = [
      {
        id: 's1',
        category: 'HIGHLIGHT',
        categoryLabel: 'MATCHDAY FOCUS',
        tagColor: 'text-[#38f2c8] border-[#38f2c8]/40 bg-[#38f2c8]/10',
        headline: `${starPlayer?.knownAs?.toUpperCase() || userClub.name.toUpperCase()} READY FOR HIGH-STAKES ${leagueName} CLASH`,
        summary: `With ${daysToNextMatch === 0 ? 'kickoff today' : `matchday in ${daysToNextMatch} days`}, ${userClub.name} are sharpening their ${userClub.tacticalVision} system. The gaffer expects peak fitness and attacking flair from the squad.`,
        author: 'The Athletic Football',
        authorHandle: '@TheAthleticFC',
        likes: '1.24 M',
        commentsCount: '1.45 K',
        comments: [
          { user: 'Liam Davies', handle: '@davies_tactics', text: `Tactical masterclass expected. If we exploit the half-spaces, three points are guaranteed!`, time: '2h ago' },
          { user: 'Elena Rossi', handle: '@elena_calcio', text: `Star player looking sharp in training. Can't wait for this one.`, time: '4h ago' },
          { user: 'Marco Silva', handle: '@marcosilva99', text: `We need to be solid at the back on set pieces!`, time: '5h ago' },
        ],
        bgGradient: 'from-[#0b292e] via-[#091b24] to-[#061016]',
      },
      {
        id: 's2',
        category: 'TRANSFER',
        categoryLabel: 'TRANSFERROOM EXCLUSIVE',
        tagColor: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
        headline: `SCOUTS TARGET HIGH-POTENTIAL WONDERKIDS FOR ${userClub.shortName.toUpperCase()}`,
        summary: `TransferRoom reports that European clubs are circling top prospects. Director of Football confirms scouting assignments are active across youth networks with focus on Tactical Fit.`,
        author: 'Fabrizio Romano',
        authorHandle: '@FabrizioRomano',
        likes: '2.10 M',
        commentsCount: '3.82 K',
        comments: [
          { user: 'Alex K.', handle: '@alex_fc_fan', text: `Here we go! Let's bring in a dynamic winger before the window closes!`, time: '1h ago' },
          { user: 'Javier Gomez', handle: '@jgomez_madrid', text: `Youth academy pipeline is where the real gems are found this season.`, time: '3h ago' },
          { user: 'Samir Benali', handle: '@s_benali', text: `Transfer budget looks healthy. Make the right moves gaffer!`, time: '6h ago' },
        ],
        bgGradient: 'from-[#231d10] via-[#14181f] to-[#07131a]',
      },
      {
        id: 's3',
        category: 'TACTICAL',
        categoryLabel: 'FC IQ BREAKDOWN',
        tagColor: 'text-sky-300 border-sky-400/40 bg-sky-500/10',
        headline: `HOW ${userClub.name.toUpperCase()} UTILIZE ${userClub.formation} UNDER CURRENT VISION`,
        summary: `Deep tactical analytics reveal how role familiarity and off-ball movement are reshaping the club's build-up play and defensive transitions this campaign.`,
        author: 'Opta Analyst',
        authorHandle: '@OptaAnalyst',
        likes: '890 K',
        commentsCount: '920',
        comments: [
          { user: 'Coach Dan', handle: '@dancoach_pro', text: `Notice how the inverted wingback steps into midfield during build-up? Pure modern football.`, time: '30m ago' },
          { user: 'Chloe Smith', handle: '@chloe_arsenal', text: `FC IQ gives so much depth to our squad rotations now.`, time: '2h ago' },
        ],
        bgGradient: 'from-[#101f2f] via-[#0b1722] to-[#061016]',
      },
    ];

    const currentStory = stories[activeStoryIdx] || stories[0];

    const compactTable = career.standings.slice(
      Math.max(0, Math.min(userStandingIdx - 2, career.standings.length - 5)),
      Math.max(5, Math.min(userStandingIdx + 3, career.standings.length))
    );

    return {
      userClub,
      nextMatch,
      homeClub,
      awayClub,
      homeSectors,
      awaySectors,
      homeRank,
      awayRank,
      movers,
      injuredPlayers,
      unreadInbox,
      daysToClose,
      daysToNextMatch,
      calendarStrip,
      compactTable,
      userRank,
      leagueName,
      tasks,
      dateFormatted,
      stories,
      currentStory,
      starPlayer,
    };
  }, [career, activeStoryIdx]);

  if (!career || !computed) return null;
  const {
    userClub,
    nextMatch,
    homeClub,
    awayClub,
    homeSectors,
    awaySectors,
    homeRank,
    awayRank,
    movers,
    daysToClose,
    daysToNextMatch,
    calendarStrip,
    compactTable,
    userRank,
    leagueName,
    tasks,
    dateFormatted,
    stories,
    currentStory,
  } = computed;

  const isMatchDay = nextMatch?.date === career.currentDate;

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-8 py-5 space-y-6">
      {/* Transfer Deadline Day 20-Hour Special Banner */}
      {career.deadlineDayHoursRemaining !== null && (
        <div className="fc-panel-active rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-[#38f2c8]/60 shadow-[0_0_30px_rgba(56,242,200,0.18)]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#38f2c8]/20 flex items-center justify-center text-[#38f2c8]">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="font-display text-2xl font-black uppercase tracking-wider text-white leading-none">
                TRANSFER DEADLINE DAY — {career.deadlineDayHoursRemaining} HOURS REMAINING
              </div>
              <div className="text-xs text-[#d6f5ee] mt-1">
                AI clubs are making last-minute bids and hijack offers. Close active deals before the window slams shut.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => skipDeadlineHours(1)}
              className="fc-btn-secondary rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              Skip +1 Hour
            </button>
            <button
              type="button"
              onClick={() => skipDeadlineHours(2)}
              className="fc-btn-primary rounded-lg px-5 py-2.5 text-xs uppercase tracking-wider font-extrabold"
            >
              Skip +2 Hours
            </button>
          </div>
        </div>
      )}

      {/* Season Completed Banner -> Season 2 Progression */}
      {career.seasonCompleted && (
        <div className="fc-panel-active rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 border border-[#38f2c8]/50">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#38f2c8]">
              {leagueName} SEASON {career.seasonNumber} COMPLETE
            </div>
            <h2 className="font-display text-3xl font-black uppercase tracking-wide text-white mt-1">
              Finished #{userRank} in {leagueName}
            </h2>
            <p className="text-xs text-[#d2e8e4] mt-1 max-w-2xl">
              Proceed to Season {career.seasonNumber + 1} to collect prize money, settle deferred transfer instalments, trigger Dynamic Potential, retire veterans, and generate FC 27 Randomized Regens.
            </p>
          </div>
          <button
            type="button"
            onClick={proceedToNextSeason}
            className="fc-btn-primary rounded-lg px-6 py-3.5 text-sm uppercase tracking-wider font-black shadow-lg"
          >
            Advance to Season {career.seasonNumber + 1}
          </button>
        </div>
      )}

      {/* Main 2-Column FC 27 Central Menu Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: HERO MATCHDAY CARD + ADVANCE + TASK STACK */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top Big Date Header & Days to Match Counter */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 px-1">
            <div>
              <h1 className="font-display text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-none">
                {dateFormatted}
              </h1>
              <div className="text-xs font-semibold text-[#8ba5b3] uppercase tracking-widest mt-1.5 flex items-center gap-2">
                <span>{userClub.name}</span>
                <span>•</span>
                <span>Season {career.seasonNumber}</span>
                <span>•</span>
                <span className="text-[#38f2c8]">
                  {career.transferWindowOpen
                    ? `Transfer Window (${daysToClose}d left)`
                    : 'Transfer Window Closed'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/90">
                <Calendar className="w-3.5 h-3.5 text-[#38f2c8]" />
                {daysToNextMatch === 0
                  ? 'MATCHDAY TODAY'
                  : `Next Fixture in ${daysToNextMatch} Day${daysToNextMatch > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Authentic Matchday Hero Tile */}
          {nextMatch && homeClub && awayClub && homeSectors && awaySectors && (
            <div className="fc-panel rounded-2xl p-6 relative overflow-hidden border border-white/10 shadow-2xl backdrop-blur-md">
              {/* Competition Ribbon */}
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-4 border-b border-white/10 text-[#8ba5b3]">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#38f2c8]" />
                  <span className="text-white font-extrabold tracking-widest">{leagueName}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-[#38f2c8]">Matchday {nextMatch.round}</span>
                </div>
                <div className="font-mono-num text-xs text-white/70">
                  {nextMatch.date} · {nextMatch.weather}
                </div>
              </div>

              {/* Match Face-Off: Club A vs Club B */}
              <div className="grid grid-cols-11 items-center gap-2 my-6">
                {/* Home Club */}
                <div className="col-span-5 flex flex-col items-center text-center group cursor-pointer" onClick={() => setActiveTab('Office')}>
                  <div className="relative">
                    <ClubCrest club={homeClub} size={76} />
                    <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#0b1b24] border border-white/20 text-[#38f2c8]">
                      {homeRank}{homeRank === 1 ? 'ST' : homeRank === 2 ? 'ND' : homeRank === 3 ? 'RD' : 'TH'}
                    </span>
                  </div>
                  <div className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-3 leading-tight line-clamp-1">
                    {homeClub.name}
                  </div>
                  <div className="text-xs text-[#8ba5b3] font-mono-num mt-1 flex items-center gap-1.5 font-bold">
                    <span>ATK {Math.round(homeSectors.atk)}</span>
                    <span className="text-white/30">·</span>
                    <span>MID {Math.round(homeSectors.mid)}</span>
                    <span className="text-white/30">·</span>
                    <span>DEF {Math.round(homeSectors.def)}</span>
                  </div>
                </div>

                {/* VS Center Badge */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#0a1b24]/90 border border-white/15 flex items-center justify-center font-display text-xl font-black text-[#38f2c8] shadow-inner">
                    VS
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/50 mt-1.5">
                    {nextMatch.homeClubId === career.userClubId ? 'HOME' : 'AWAY'}
                  </span>
                </div>

                {/* Away Club */}
                <div className="col-span-5 flex flex-col items-center text-center group cursor-pointer" onClick={() => setActiveTab('Office')}>
                  <div className="relative">
                    <ClubCrest club={awayClub} size={76} />
                    <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#0b1b24] border border-white/20 text-[#38f2c8]">
                      {awayRank}{awayRank === 1 ? 'ST' : awayRank === 2 ? 'ND' : awayRank === 3 ? 'RD' : 'TH'}
                    </span>
                  </div>
                  <div className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wide text-white mt-3 leading-tight line-clamp-1">
                    {awayClub.name}
                  </div>
                  <div className="text-xs text-[#8ba5b3] font-mono-num mt-1 flex items-center gap-1.5 font-bold">
                    <span>ATK {Math.round(awaySectors.atk)}</span>
                    <span className="text-white/30">·</span>
                    <span>MID {Math.round(awaySectors.mid)}</span>
                    <span className="text-white/30">·</span>
                    <span>DEF {Math.round(awaySectors.def)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Strip */}
              <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={startLiveMatch}
                  className="fc-btn-primary rounded-xl py-3 px-4 text-xs uppercase tracking-wider font-black flex items-center justify-center gap-2 shadow-lg"
                >
                  <Activity className="w-4 h-4" />
                  <span>✕ Play Live Sim</span>
                </button>
                <button
                  type="button"
                  onClick={quickSimNextMatch}
                  className="fc-btn-secondary rounded-xl py-3 px-4 text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 border border-white/15 hover:border-[#38f2c8]/50"
                >
                  <Zap className="w-4 h-4 text-[#38f2c8]" />
                  <span>Quick Sim</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('Squad')}
                  className="fc-btn-secondary rounded-xl py-3 px-4 text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 border border-white/15 hover:border-[#38f2c8]/50"
                >
                  <span>Team Strategy</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#38f2c8]" />
                </button>
              </div>
            </div>
          )}

          {/* Advance Calendar Strip & One-Click Simming */}
          <div className="fc-panel rounded-2xl p-5 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#38f2c8]" />
                <span className="font-display text-lg font-black uppercase tracking-wider text-white">
                  Schedule Advance
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={advanceDay}
                  disabled={career.seasonCompleted || isMatchDay}
                  className="fc-btn-primary rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-extrabold inline-flex items-center gap-1.5 shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Advance Day</span>
                </button>
                <button
                  type="button"
                  onClick={() => simToNextMatchOrDate()}
                  disabled={career.seasonCompleted || isMatchDay}
                  className="fc-btn-secondary rounded-lg px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 border border-white/15 hover:border-[#38f2c8]/50"
                >
                  <FastForward className="w-3.5 h-3.5 text-[#38f2c8]" />
                  <span>Sim to Matchday</span>
                </button>
              </div>
            </div>

            {/* 7-Day Day Selector */}
            <div className="grid grid-cols-7 gap-2">
              {calendarStrip.map(({ date, userFix, isToday }) => {
                const oppId = userFix
                  ? userFix.homeClubId === career.userClubId
                    ? userFix.awayClubId
                    : userFix.homeClubId
                  : null;
                const opp = oppId ? career.clubs[oppId] : null;
                const dayLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
                  weekday: 'short',
                  timeZone: 'UTC',
                });
                const dayNum = date.slice(8);

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      if (!isToday) simToNextMatchOrDate(date);
                    }}
                    className={`rounded-xl p-2.5 text-center border transition-all duration-200 ${
                      isToday
                        ? 'fc-panel-active border-[#38f2c8] shadow-[0_0_15px_rgba(56,242,200,0.25)]'
                        : userFix
                        ? 'border-[#38f2c8]/40 bg-[#0e272a]/70 hover:bg-[#12363a]'
                        : 'border-white/8 bg-[#0a1822]/60 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="text-[10px] uppercase text-[#8ba5b3] font-bold">{dayLabel}</div>
                    <div className="font-mono-num text-base font-black text-white my-0.5">{dayNum}</div>
                    <div className="h-5 flex items-center justify-center">
                      {opp ? (
                        <span className="text-[10px] font-extrabold text-[#38f2c8] uppercase truncate">
                          {userFix?.homeClubId === career.userClubId ? 'vs ' : '@ '}
                          {opp.shortName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/20">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actionable Task List */}
          <div className="fc-panel rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38f2c8] animate-pulse" />
                <h3 className="font-display text-lg font-black uppercase tracking-wider text-white">
                  Actionable Tasks
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#38f2c8]/20 text-[#38f2c8] border border-[#38f2c8]/40">
                  {tasks.length} TASKS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('Notifications')}
                className="text-xs font-bold text-[#38f2c8] hover:underline inline-flex items-center gap-1"
              >
                <span>View Inbox</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={task.action}
                  className="rounded-xl border border-white/10 bg-[#091823]/80 hover:bg-[#0f2434] hover:border-[#38f2c8]/50 transition-all p-3.5 flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {task.icon === 'transfer' && <Briefcase className="w-5 h-5 text-emerald-300" />}
                      {task.icon === 'injury' && <AlertTriangle className="w-5 h-5 text-amber-300" />}
                      {task.icon === 'contract' && <UserCheck className="w-5 h-5 text-sky-300" />}
                      {task.icon === 'inbox' && <Mail className="w-5 h-5 text-violet-300" />}
                      {task.icon === 'coach' && <Activity className="w-5 h-5 text-[#38f2c8]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${task.badgeColor}`}>
                          {task.badge}
                        </span>
                      </div>
                      <div className="font-display text-sm font-bold text-white truncate mt-1 group-hover:text-[#38f2c8] transition-colors">
                        {task.title}
                      </div>
                      <div className="text-xs text-[#8ba5b3] truncate mt-0.5">
                        {task.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center text-white/40 group-hover:text-[#38f2c8] transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: VERTICAL MEDIA & SOCIAL HIGHLIGHTS CARD */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* Authentic Vertical News & Social Card */}
          <div
            className={`fc-panel rounded-2xl border border-white/15 overflow-hidden shadow-2xl bg-gradient-to-b ${currentStory.bgGradient} relative`}
          >
            {/* Header: Tag + Story Dots */}
            <div className="p-5 pb-3 flex items-center justify-between border-b border-white/10">
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${currentStory.tagColor}`}>
                {currentStory.categoryLabel}
              </span>
              <div className="flex items-center gap-1.5">
                {stories.map((st, idx) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setActiveStoryIdx(idx);
                      setShowComments(false);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === activeStoryIdx ? 'bg-[#38f2c8] w-6' : 'bg-white/20 hover:bg-white/40'
                    }`}
                    aria-label={`Story ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Main Visual / Story Graphic */}
            <div className="p-5">
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#07131a]/80 p-5 min-h-[170px] flex flex-col justify-end">
                <div className="absolute top-3 right-3 opacity-15">
                  <ClubCrest club={userClub} size={110} />
                </div>
                <div className="relative z-10">
                  <div className="text-[11px] font-bold text-[#38f2c8] uppercase tracking-wider">
                    {currentStory.author} · {currentStory.authorHandle}
                  </div>
                  <h2 className="font-display text-xl lg:text-2xl font-black uppercase tracking-tight text-white mt-1 leading-snug">
                    {currentStory.headline}
                  </h2>
                </div>
              </div>

              {/* Story Summary */}
              <p className="text-xs text-[#cad9e2] leading-relaxed mt-4">
                {currentStory.summary}
              </p>

              {/* Social Engagement Stats */}
              <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs text-[#8ba5b3]">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setHasLiked(!hasLiked)}
                    className={`flex items-center gap-1.5 font-bold transition-colors ${
                      hasLiked ? 'text-rose-400' : 'hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                    <span>{currentStory.likes}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-1.5 font-bold hover:text-white transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{currentStory.commentsCount}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowComments(!showComments)}
                  className="fc-btn-secondary rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border border-white/15 hover:border-[#38f2c8]/50"
                >
                  {showComments ? 'Hide Comments' : 'Show Comments'}
                </button>
              </div>

              {/* Interactive Comments Drawer */}
              {showComments && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5 animate-fadeIn">
                  <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Fan Reactions &amp; Comments
                  </div>
                  {currentStory.comments.map((cm, i) => (
                    <div key={i} className="rounded-lg bg-black/40 border border-white/8 p-3 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#8ba5b3]">
                        <span className="font-bold text-white">{cm.user}</span>
                        <span>{cm.time}</span>
                      </div>
                      <div className="text-[10px] text-[#38f2c8] font-mono">{cm.handle}</div>
                      <div className="text-white/90 mt-1 leading-normal">{cm.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Story Navigation Footer */}
            <div className="p-4 bg-black/30 border-t border-white/10 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveStoryIdx((prev) => (prev > 0 ? prev - 1 : stories.length - 1));
                  setShowComments(false);
                }}
                className="hover:text-[#38f2c8] font-bold inline-flex items-center gap-1 text-[#8ba5b3]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev News</span>
              </button>
              <span className="text-[11px] font-mono-num text-white/50">
                {activeStoryIdx + 1} of {stories.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveStoryIdx((prev) => (prev < stories.length - 1 ? prev + 1 : 0));
                  setShowComments(false);
                }}
                className="hover:text-[#38f2c8] font-bold inline-flex items-center gap-1 text-[#8ba5b3]"
              >
                <span>Next News</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dynamic OVR Movers Watch */}
          <div className="fc-panel rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="font-display text-lg font-black uppercase tracking-wider text-white">
                  Dynamic OVR Pulse
                </h3>
                <p className="text-[11px] text-[#8ba5b3]">
                  Real-time form and morale shifts across {userClub.shortName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('Squad')}
                className="text-xs font-bold text-[#38f2c8] hover:underline"
              >
                Full Squad
              </button>
            </div>

            <div className="space-y-2">
              {movers.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActiveTab('Squad')}
                  className="rounded-xl border border-white/8 bg-[#091823]/70 hover:bg-[#0f2434] p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar player={p} clubColor={userClub.primaryColor} size="sm" />
                    <div className="min-w-0">
                      <div className="font-display text-xs font-bold text-white truncate">{p.knownAs}</div>
                      <div className="text-[10px] text-[#8ba5b3]">
                        {p.primaryPosition} · Fit {p.matchFitness}% · {p.dynamicOvr.moraleLabel}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <OvrDiamond ovr={p.dynamicOvr.dynamicOvr} delta={p.dynamicOvr.totalDelta} size="sm" />
                    <span
                      className={`font-mono-num text-xs font-extrabold ${
                        p.dynamicOvr.totalDelta > 0
                          ? 'text-[#38f2c8]'
                          : p.dynamicOvr.totalDelta < 0
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {p.dynamicOvr.totalDelta > 0 ? `+${p.dynamicOvr.totalDelta}` : p.dynamicOvr.totalDelta === 0 ? '±0' : p.dynamicOvr.totalDelta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compact Standings Snapshot */}
          <div className="fc-panel rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-black uppercase tracking-wider text-white">
                {leagueName} Standings
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('Office')}
                className="text-xs font-bold text-[#38f2c8] hover:underline"
              >
                View Table
              </button>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase text-[#7f9aa8]">
                  <th className="py-1.5 text-left w-6">#</th>
                  <th className="py-1.5 text-left">Club</th>
                  <th className="py-1.5 text-right w-8">P</th>
                  <th className="py-1.5 text-right w-9">GD</th>
                  <th className="py-1.5 text-right w-10">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {compactTable.map((row) => {
                  const rank = career.standings.findIndex((s) => s.clubId === row.clubId) + 1;
                  const isUser = row.clubId === career.userClubId;
                  return (
                    <tr key={row.clubId} className={isUser ? 'bg-[#194640]/55 text-white font-bold' : 'text-[#cad9e2]'}>
                      <td className="py-1.5 font-mono-num">{rank}</td>
                      <td className="py-1.5 truncate max-w-[130px] font-semibold">{row.clubName}</td>
                      <td className="py-1.5 text-right font-mono-num">{row.played}</td>
                      <td className="py-1.5 text-right font-mono-num">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      <td className="py-1.5 text-right font-mono-num font-black text-white">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FC 27 Authentic Controller Footer Bar */}
      <div className="border-t border-white/10 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8ba5b3] select-none">
        <div className="flex flex-wrap items-center gap-4 lg:gap-6 font-semibold">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[11px]">✕</kbd>
            <span>Select</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[11px]">◯</kbd>
            <span>Back</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[11px]">R</kbd>
            <span>Scroll Feed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[11px]">L3</kbd>
            <span>Tutorials</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[11px]">≡</kbd>
            <span>Advance Customisation</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[11px]">L2</kbd>
            <span>Shortcuts</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#38f2c8]">
            <kbd className="px-1.5 py-0.5 rounded bg-[#38f2c8]/20 border border-[#38f2c8]/40 text-[#38f2c8] font-mono text-[11px]">R2</kbd>
            <span>FC HUB</span>
          </span>
        </div>
      </div>
    </div>
  );
};
