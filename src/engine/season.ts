import {
  applyWeeklyPlayerGrowth,
  createInitialYouthScouts,
  createRandomizedRegen,
  generateYouthProspect,
} from './growth.ts';
import { simulateQuickMatch } from './matchSim.ts';
import {
  buildLineupForFormation,
  calculateDynamicOVR,
  calculateInjuryAggravationRisk,
  calculateMatchFitness,
  calculateTransferRoomXTV,
  clamp,
  formatMoney,
  TARGET_MINUTE_SHARE,
} from './ratings.ts';
import { completeTransferInState, runDailyAiTransferMarket } from './transfers.ts';
import {
  BoardObjective,
  CareerSettings,
  CareerState,
  Club,
  EnergyRecoveryPolicy,
  Fixture,
  InboxMessage,
  LeagueStanding,
  Player,
  ScoutInstruction,
  ScoutReportProgress,
  TransferNegotiation,
  YouthProspect,
} from './types.ts';

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(startIso: string, endIso: string): number {
  const s = Date.parse(`${startIso}T00:00:00Z`);
  const e = Date.parse(`${endIso}T00:00:00Z`);
  return Math.round((e - s) / 86_400_000);
}

export function isTransferWindowOpenOnDate(isoDate: string): { open: boolean; closesDate: string } {
  const year = parseInt(isoDate.slice(0, 4), 10);
  const mmdd = isoDate.slice(5);
  // Summer window: Jul 1 – Aug 31; Winter window: Jan 1 – Jan 31
  if (mmdd >= '07-01' && mmdd <= '08-31') {
    return { open: true, closesDate: `${year}-08-31` };
  }
  if (mmdd >= '01-01' && mmdd <= '01-31') {
    return { open: true, closesDate: `${year}-01-31` };
  }
  if (mmdd > '08-31') {
    return { open: false, closesDate: `${year + 1}-01-01` };
  }
  return { open: false, closesDate: `${year}-07-01` };
}

/**
 * Generates a balanced double round-robin 38-round LaLiga EA Sports schedule across all 20 clubs.
 */
export function generateLaLigaSchedule(
  laLigaClubIds: number[],
  seasonStartYear: number,
  rng: () => number = Math.random
): Fixture[] {
  const teams = [...laLigaClubIds];
  if (teams.length % 2 !== 0) teams.push(-1);
  const n = teams.length;
  const half = n / 2;
  const roundsFirstHalf: Array<Array<[number, number]>> = [];

  const rot = teams.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const pairings: Array<[number, number]> = [];
    const first = teams[0];
    const opp = rot[0];
    if (first !== -1 && opp !== -1) {
      pairings.push(r % 2 === 0 ? [first, opp] : [opp, first]);
    }
    for (let i = 1; i < half; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a !== -1 && b !== -1) {
        pairings.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    roundsFirstHalf.push(pairings);
    rot.push(rot.shift()!);
  }

  const allRounds = [
    ...roundsFirstHalf,
    ...roundsFirstHalf.map((pairs) => pairs.map(([h, a]) => [a, h] as [number, number])),
  ];

  // Start Matchday 1 on Aug 16 of seasonStartYear; ~7 days between rounds (with occasional midweek rounds)
  let dateCursor = `${seasonStartYear}-08-16`;
  const weathers: Fixture['weather'][] = ['Clear', 'Clear', 'Overcast', 'Night', 'Rain'];
  const fixtures: Fixture[] = [];

  allRounds.forEach((pairings, rIdx) => {
    const round = rIdx + 1;
    pairings.forEach(([homeClubId, awayClubId], mIdx) => {
      fixtures.push({
        id: `fix-${seasonStartYear}-r${round}-${mIdx}`,
        round,
        date: dateCursor,
        homeClubId,
        awayClubId,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        homeXg: 0,
        awayXg: 0,
        homePossession: 50,
        homeShots: 0,
        awayShots: 0,
        events: [],
        weather: weathers[Math.floor(rng() * weathers.length)],
      });
    });
    // Midweek rounds every 5th round, otherwise 7 days
    const gap = round % 5 === 0 ? 4 : round === 19 ? 11 : 7;
    dateCursor = addDays(dateCursor, gap);
  });

  return fixtures;
}

export function computeStandings(
  clubs: Record<number, Club>,
  fixtures: Fixture[]
): LeagueStanding[] {
  const map = new Map<number, LeagueStanding>();
  const participantIds = new Set<number>();
  for (const f of fixtures) {
    participantIds.add(f.homeClubId);
    participantIds.add(f.awayClubId);
  }
  for (const cid of participantIds) {
    const c = clubs[cid];
    if (!c) continue;
    map.set(c.id, {
      clubId: c.id,
      clubName: c.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      form: [],
    });
  }

  const playedFixtures = fixtures.filter((f) => f.played).sort((a, b) => a.round - b.round);
  for (const f of playedFixtures) {
    const h = map.get(f.homeClubId);
    const a = map.get(f.awayClubId);
    if (!h || !a) continue;

    h.played++;
    a.played++;
    h.gf += f.homeGoals;
    h.ga += f.awayGoals;
    a.gf += f.awayGoals;
    a.ga += f.homeGoals;

    if (f.homeGoals > f.awayGoals) {
      h.won++;
      h.points += 3;
      h.form = [...h.form, 'W' as const].slice(-5);
      a.lost++;
      a.form = [...a.form, 'L' as const].slice(-5);
    } else if (f.homeGoals < f.awayGoals) {
      a.won++;
      a.points += 3;
      a.form = [...a.form, 'W' as const].slice(-5);
      h.lost++;
      h.form = [...h.form, 'L' as const].slice(-5);
    } else {
      h.drawn++;
      a.drawn++;
      h.points += 1;
      a.points += 1;
      h.form = [...h.form, 'D' as const].slice(-5);
      a.form = [...a.form, 'D' as const].slice(-5);
    }
    h.gd = h.gf - h.ga;
    a.gd = a.gf - a.ga;
  }

  return Array.from(map.values()).sort(
    (x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || x.clubName.localeCompare(y.clubName)
  );
}

export function createInitialObjectives(club: Club): BoardObjective[] {
  const targetPos =
    club.domesticPrestige >= 9
      ? 'Win LALIGA EA SPORTS'
      : club.domesticPrestige >= 7
      ? 'Finish in Top 4 (Champions League)'
      : club.domesticPrestige >= 5
      ? 'Finish in Top Half (10th or higher)'
      : 'Avoid Relegation (17th or higher)';

  return [
    {
      id: 'obj-league',
      term: 'SHORT',
      category: 'Domestic',
      title: targetPos,
      targetDescription: `Meet the board's league table expectation by Matchday 38.`,
      progressPct: 25,
      completed: false,
      priority: 'Critical',
    },
    {
      id: 'obj-youth',
      term: 'SHORT',
      category: 'Youth',
      title: 'Promote 1 Youth Academy Player',
      targetDescription: 'Scout, sign, and promote an Academy prospect aged 16+ to the senior squad.',
      progressPct: 0,
      completed: false,
      priority: 'High',
    },
    {
      id: 'obj-finance',
      term: 'LONG',
      category: 'Financial',
      title: `Maintain ${formatMoney(Math.round(club.transferBudgetEur * 0.2))} Transfer Reserve`,
      targetDescription: 'Keep club finances healthy and avoid negative cash flow across the season.',
      progressPct: 100,
      completed: true,
      priority: 'Medium',
    },
  ];
}

export function createInitialCareerState(
  clubs: Record<number, Club>,
  players: Record<number, Player>,
  laLigaClubIds: number[],
  userClubId: number,
  settings?: Partial<CareerSettings>
): CareerState {
  const startDate = '2026-07-01';
  const fixtures = generateLaLigaSchedule(laLigaClubIds, 2026);
  const standings = computeStandings(clubs, fixtures);
  const userClub = clubs[userClubId];

  const defaultSettings: CareerSettings = {
    currency: 'EUR',
    energyRecovery: 'Balanced',
    liveSimSpeedMs: 280,
    autoPauseOnOffer: true,
    simulationDepth: 'LaLiga + European Pool',
    ...settings,
  };

  const youthScouts = createInitialYouthScouts();
  const initialProspects: YouthProspect[] = [
    { ...generateYouthProspect(youthScouts[0], 'Spain', 'CM', 'yp-init-1'), inAcademy: true, age: 16 },
    { ...generateYouthProspect(youthScouts[0], 'Spain', 'RW', 'yp-init-2'), inAcademy: true, age: 17 },
    { ...generateYouthProspect(youthScouts[0], 'Spain', 'CB', 'yp-init-3'), inAcademy: true, age: 15 },
    { ...generateYouthProspect(youthScouts[0], 'Spain', 'ST', 'yp-init-4'), inAcademy: false, age: 16 },
  ];

  const defaultInstructions: ScoutInstruction[] = [
    {
      id: 'inst-1',
      name: 'First Team Starters',
      position: 'ANY',
      minAge: 20,
      maxAge: 28,
      minOvr: 78,
      maxValueM: 90,
      active: true,
    },
    {
      id: 'inst-2',
      name: 'High-Potential Wonderkids',
      position: 'ANY',
      minAge: 16,
      maxAge: 21,
      minOvr: 70,
      maxValueM: 45,
      active: true,
    },
    {
      id: 'inst-3',
      name: 'Bargain Expiring Contracts',
      position: 'ANY',
      minAge: 22,
      maxAge: 31,
      minOvr: 74,
      maxValueM: 30,
      active: false,
    },
  ];

  const userSquad = Object.values(players).filter((p) => p.clubId === userClubId);
  const recoveringPlayer = userSquad.find((p) => p.injury?.recovering);

  const inbox: InboxMessage[] = [
    {
      id: 'msg-welcome',
      date: startDate,
      category: 'BOARD',
      sender: `${userClub.name} Board`,
      subject: `Welcome to ${userClub.name} — Season 2026/27 Objectives`,
      body: `The board welcomes you as First Team Manager. Your initial transfer budget is ${formatMoney(userClub.transferBudgetEur, defaultSettings.currency)}. Review your squad's Dynamic OVR ratings, Match Fitness recovery policy, and TransferRoom xTV targets ahead of Matchday 1.`,
      read: false,
    },
    ...(recoveringPlayer
      ? [
          {
            id: 'msg-physio-init',
            date: startDate,
            category: 'PLAYER' as const,
            sender: 'Head of Sports Science',
            subject: `Medical Update: ${recoveringPlayer.knownAs} (${recoveringPlayer.injury?.type})`,
            body: `${recoveringPlayer.knownAs} is recovering from ${recoveringPlayer.injury?.type}. He is cleared to play in emergencies, but carries a ${recoveringPlayer.injury?.aggravationRiskPct}% risk of aggravating the injury until fully recovered in ${recoveringPlayer.injury?.daysRemaining} days.`,
            read: false,
            playerId: recoveringPlayer.id,
          },
        ]
      : []),
    {
      id: 'msg-press-opener',
      date: startDate,
      category: 'PRESS',
      sender: 'LALIGA EA SPORTS Press Office',
      subject: 'Pre-Season Press Conference: Set the Tone',
      body: `Journalists ask about your ambitions for ${userClub.name} this campaign. Your answer will directly affect squad morale and Dynamic OVR entering pre-season.`,
      read: false,
      choices: [
        {
          id: 'press-ambitious',
          label: '“We are here to dominate and challenge for every trophy.”',
          effectSummary: 'Squad Morale +5 · Board Confidence +3',
          moraleDelta: 5,
          boardDelta: 3,
        },
        {
          id: 'press-measured',
          label: '“We focus on match fitness, cohesion, and taking it game by game.”',
          effectSummary: 'Squad Morale +2 (Sweet Spot steady) · Energy +2',
          moraleDelta: 2,
          energyDelta: 2,
        },
        {
          id: 'press-youth',
          label: '“Developing young talent and building momentum is our identity.”',
          effectSummary: 'Young Players Morale +6 · Board Confidence +2',
          moraleDelta: 3,
          boardDelta: 2,
        },
      ],
    },
  ];

  return {
    version: 1,
    saveName: `${userClub.name} Career`,
    seasonNumber: 1,
    currentDate: startDate,
    transferWindowOpen: true,
    transferWindowClosesDate: '2026-08-31',
    deadlineDayHoursRemaining: null,
    userClubId,
    clubs,
    players,
    fixtures,
    standings,
    negotiations: [],
    shortlistIds: [],
    transferHistory: [],
    installments: [],
    scoutInstructions: defaultInstructions,
    scoutReports: {},
    youthScouts,
    youthProspects: initialProspects,
    inbox,
    objectives: createInitialObjectives(userClub),
    transactions: [
      {
        id: 'tx-init-broadcast',
        date: startDate,
        category: 'Broadcast',
        description: 'LALIGA EA SPORTS Season Allocation',
        amountEur: Math.round(userClub.transferBudgetEur * 0.45),
      },
      {
        id: 'tx-init-merch',
        date: startDate,
        category: 'Merchandise',
        description: 'Pre-Season Kit & Commercial Sponsorship',
        amountEur: Math.round(userClub.transferBudgetEur * 0.18),
      },
    ],
    settings: defaultSettings,
    pendingRevealTransfer: null,
    pendingEventModalId: null,
    seasonCompleted: false,
    lastSavedAt: new Date().toISOString(),
  };
}


function getDailyEnergyRecovery(policy: EnergyRecoveryPolicy): { energyGain: number; sharpnessDelta: number } {
  if (policy === 'Aggressive') return { energyGain: 7, sharpnessDelta: -1 };
  if (policy === 'Conservative') return { energyGain: 3, sharpnessDelta: 2 };
  return { energyGain: 5, sharpnessDelta: 1 };
}

/**
 * Advances the career calendar by 1 day (simulating AI fixtures on that day, energy recovery,
 * injury healing, scout/youth ticks, delegated negotiations, weekly growth & dynamic OVR).
 * Stops early if the User has an unplayed match on the next date.
 */
export function advanceSingleDay(
  state: CareerState,
  rng: () => number = Math.random
): { state: CareerState; stoppedForUserMatch: Fixture | null } {
  const nextDate = addDays(state.currentDate, 1);
  const windowInfo = isTransferWindowOpenOnDate(nextDate);
  const isDeadlineDate = nextDate.endsWith('-08-31') || nextDate.endsWith('-01-31');

  let clubs = { ...state.clubs };
  let players = { ...state.players };
  const fixtures = [...state.fixtures];
  const inbox = [...state.inbox];
  const transactions = [...state.transactions];
  let negotiations = [...state.negotiations];
  const transferHistory = [...state.transferHistory];
  const installments = [...state.installments];
  const scoutReports: Record<number, ScoutReportProgress> = { ...state.scoutReports };
  let youthScouts = state.youthScouts.map((s) => ({ ...s, mission: s.mission ? { ...s.mission } : null }));
  let youthProspects = [...state.youthProspects];
  let pendingRevealTransfer = state.pendingRevealTransfer;
  let pendingEventModalId = state.pendingEventModalId;

  const userMatchesPlayed = state.standings.find((s) => s.clubId === state.userClubId)?.played ?? 0;

  // 1. Daily Energy Recovery & Injury Healing for all players
  const rec = getDailyEnergyRecovery(state.settings.energyRecovery);
  for (const p of Object.values(players)) {
    const isUser = p.clubId === state.userClubId;
    const eGain = isUser ? rec.energyGain : 5;
    const sDelta = isUser ? rec.sharpnessDelta : 0;

    let injury = p.injury ? { ...p.injury } : null;
    if (injury) {
      injury.daysRemaining -= 1;
      if (injury.daysRemaining <= 0) {
        injury = null;
      } else if (!injury.recovering && injury.daysRemaining <= 5 && injury.severity !== 'Severe') {
        injury.recovering = true;
        injury.aggravationRiskPct = calculateInjuryAggravationRisk(p.energy, injury);
      } else if (injury.recovering) {
        injury.aggravationRiskPct = calculateInjuryAggravationRisk(p.energy, injury);
      }
    }

    const newEnergy = clamp(p.energy + eGain, 20, 100);
    const newSharpness = clamp(p.sharpness + sDelta, 40, 100);
    const newFit = calculateMatchFitness(newEnergy, newSharpness, injury);
    const clubPlayed = state.standings.find((s) => s.clubId === p.clubId)?.played ?? 0;
    const updatedP: Player = {
      ...p,
      energy: newEnergy,
      sharpness: newSharpness,
      matchFitness: newFit,
      injury,
    };
    updatedP.dynamicOvr = calculateDynamicOVR(updatedP, p.dynamicOvr.deployedPosition, clubPlayed);
    players[p.id] = updatedP;
  }

  // 2. Weekly tick (every Monday — dayOfWeek === 1)
  const dayOfWeek = new Date(`${nextDate}T00:00:00Z`).getUTCDay();
  if (dayOfWeek === 1) {
    // Weekly Growth Profile XP + Development Momentum across ALL clubs (User + AI)
    for (const p of Object.values(players)) {
      const clubPlayed = state.standings.find((s) => s.clubId === p.clubId)?.played ?? 0;
      const res = applyWeeklyPlayerGrowth(p, clubs[p.clubId], clubPlayed, rng);
      players[p.id] = res.player;
      if (res.retrainedPosition && p.clubId === state.userClubId) {
        inbox.unshift({
          id: `msg-retrain-${p.id}-${nextDate}`,
          date: nextDate,
          category: 'PLAYER',
          sender: 'Coaching Staff',
          subject: `${p.knownAs} mastered ${res.retrainedPosition}`,
          body: `${p.knownAs} completed his position retraining plan and can now play ${res.retrainedPosition} with zero out-of-position OVR penalty.`,
          read: false,
          playerId: p.id,
        });
      }
    }

    // Weekly wage expense & matchday/merch trickle for user club
    const userClub = clubs[state.userClubId];
    const weeklyWages = Object.values(players)
      .filter((p) => p.clubId === state.userClubId)
      .reduce((sum, p) => sum + p.weeklyWageEur, 0);
    transactions.unshift({
      id: `tx-wage-${nextDate}`,
      date: nextDate,
      category: 'Wages',
      description: `Weekly First-Team Payroll (${Object.values(players).filter((p) => p.clubId === state.userClubId).length} players)`,
      amountEur: -weeklyWages,
    });
    // Commercial weekly revenue keeps cashflow realistic
    const commercialRev = Math.round(weeklyWages * 0.92 + userClub.domesticPrestige * 85_000);
    transactions.unshift({
      id: `tx-comm-${nextDate}`,
      date: nextDate,
      category: 'Merchandise',
      description: 'Weekly Commercial & Stadium Revenue',
      amountEur: commercialRev,
    });

    // Playtime complaints for unhappy Crucial/Important players on User Club
    if (userMatchesPlayed >= 4) {
      const possibleMinutes = userMatchesPlayed * 90;
      const starved = Object.values(players).find(
        (p) =>
          p.clubId === state.userClubId &&
          (p.squadRole === 'Crucial' || p.squadRole === 'Important') &&
          !p.injury &&
          p.seasonStats.minutes / possibleMinutes < TARGET_MINUTE_SHARE[p.squadRole] - 0.25 &&
          !inbox.some((m) => m.playerId === p.id && m.category === 'PLAYER' && diffDays(m.date, nextDate) < 28)
      );
      if (starved) {
        inbox.unshift({
          id: `msg-playtime-${starved.id}-${nextDate}`,
          date: nextDate,
          category: 'PLAYER',
          sender: starved.knownAs,
          subject: `Playtime Concern: ${starved.knownAs} (${starved.squadRole})`,
          body: `Boss, I signed here as a ${starved.squadRole} player, and sitting on the bench is hurting my form and Dynamic OVR. I need regular starts in the upcoming fixtures.`,
          read: false,
          urgent: true,
          playerId: starved.id,
          choices: [
            {
              id: 'promise-starts',
              label: 'Promise him a start in the next match',
              effectSummary: 'Morale +8 · Dynamic OVR boosted',
              moraleDelta: 8,
            },
            {
              id: 'rotate-squad',
              label: 'Explain the squad rotation policy calmly',
              effectSummary: 'Morale +2 · No lineup pressure',
              moraleDelta: 2,
            },
            {
              id: 'tough-love',
              label: 'Tell him he must earn his spot on the pitch',
              effectSummary: 'Morale -6 · Maintains authority',
              moraleDelta: -6,
            },
          ],
        });
      }
    }

    // Unexpected Career Event (~15% weekly chance, e.g., "STAR ASKS FOR BREAK.")
    if (rng() < 0.16 && !pendingEventModalId) {
      const starters = (clubs[state.userClubId]?.lineup ?? [])
        .map((s) => (s.playerId ? players[s.playerId] : null))
        .filter((p): p is Player => Boolean(p && !p.injury));
      if (starters.length > 0) {
        const star = starters[Math.floor(rng() * starters.length)];
        const evId = `msg-event-${star.id}-${nextDate}`;
        inbox.unshift({
          id: evId,
          date: nextDate,
          category: 'EVENT',
          sender: star.knownAs,
          subject: 'STAR ASKS FOR BREAK.',
          body: `Hi Boss. Today's a difficult day for me. I've an issue at home which I need to deal with before I can focus back fully on my football. Apologies for this being last minute. Would it be possible to be excused from today's training session?`,
          read: false,
          urgent: true,
          playerId: star.id,
          choices: [
            {
              id: 'grant-break',
              label: 'Grant Personal Leave (Support the player)',
              effectSummary: `${star.knownAs} Morale +10 · Energy +8`,
              moraleDelta: 10,
              energyDelta: 8,
            },
            {
              id: 'light-session',
              label: 'Allow Light Recovery Session Only',
              effectSummary: `${star.knownAs} Morale +4 · Energy +3`,
              moraleDelta: 4,
              energyDelta: 3,
            },
            {
              id: 'deny-break',
              label: 'Require Full Squad Attendance',
              effectSummary: `${star.knownAs} Morale -9 · Board Discipline +2`,
              moraleDelta: -9,
              boardDelta: 2,
            },
          ],
        });
        pendingEventModalId = evId;
      }
    }
  }

  // 3. Scout Report 4-Stage Progression (daysElapsed -> stage 1..4)
  for (const [pidStr, rep] of Object.entries(scoutReports)) {
    if (rep.stage < 4) {
      const nextElapsed = rep.daysElapsed + 1;
      const nextStage = (nextElapsed >= 12 ? 4 : nextElapsed >= 8 ? 3 : nextElapsed >= 4 ? 2 : 1) as 1 | 2 | 3 | 4;
      const p = players[Number(pidStr)];
      scoutReports[Number(pidStr)] = {
        ...rep,
        daysElapsed: nextElapsed,
        stage: nextStage,
        tacticalFit: p ? `${p.roleTitle} (${p.roleFamiliarity}) fits ${clubs[state.userClubId].tacticalVision}` : rep.tacticalFit,
        futureVerdict:
          nextStage >= 2 && p
            ? `Potential ${p.potential} · ${p.growthProfile} growth curve`
            : 'Scouting in progress...',
        financialEstimate:
          nextStage >= 3 && p
            ? `xTV ${formatMoney(p.expectedTransferValue, state.settings.currency)} · Wage ~${formatMoney(p.weeklyWageEur, state.settings.currency)}/wk`
            : 'Evaluating valuation...',
        statusNote:
          nextStage === 4 && p
            ? `Full report complete (${p.contractEndYear} contract, ${p.transferListed ? 'Transfer Listed' : 'Active Starter'}).`
            : 'Scout compiling report...',
      };
    }
  }

  // 4. Youth Scout Missions & Monthly Youth Academy Progression
  youthScouts = youthScouts.map((scout) => {
    if (!scout.hired || !scout.mission) return scout;
    const rem = scout.mission.daysRemaining - 1;
    if (rem <= 0) {
      const foundCount = 2 + (scout.experience >= 4 ? 1 : 0);
      for (let i = 0; i < foundCount; i++) {
        youthProspects.push(
          generateYouthProspect(
            scout,
            scout.mission.country,
            scout.mission.targetPosition,
            `yp-${nextDate}-${scout.id}-${i}-${Math.floor(rng() * 999)}`,
            rng
          )
        );
      }
      inbox.unshift({
        id: `msg-youth-rep-${scout.id}-${nextDate}`,
        date: nextDate,
        category: 'YOUTH',
        sender: scout.name,
        subject: `Youth Scout Report Ready (${scout.mission.country})`,
        body: `I've returned from ${scout.mission.country} with ${foundCount} promising prospects for the Academy. Review their OVR/Potential ranges in the Academy Hub.`,
        read: false,
      });
      return { ...scout, mission: null };
    }
    return { ...scout, mission: { ...scout.mission, daysRemaining: rem } };
  });

  // On the 1st of each month, narrow Youth Prospect fog-of-war & grow height (<16)
  if (nextDate.endsWith('-01')) {
    youthProspects = youthProspects.map((yp) => {
      if (!yp.inAcademy) return yp;
      const narrow = (range: [number, number], truth: number): [number, number] => [
        Math.min(truth, range[0] + 1),
        Math.max(truth, range[1] - 1),
      ];
      return {
        ...yp,
        monthsScouted: yp.monthsScouted + 1,
        heightCm: yp.age < 16 ? Math.min(198, yp.heightCm + 1) : yp.heightCm,
        ovrRange: narrow(yp.ovrRange, yp.trueOvr),
        potRange: narrow(yp.potRange, yp.truePotential),
        unsettled: yp.age >= 17 && yp.monthsScouted >= 5 ? true : yp.unsettled,
      };
    });
  }

  // 5. Delegated Negotiations Resolution & Multi-Day Negotiations
  negotiations = negotiations.map((neg) => {
    if (neg.stage === 'DELEGATED' && neg.type === 'CONTRACT') {
      const daysOpen = neg.daysOpen + 1;
      if (daysOpen < 2) return { ...neg, daysOpen };
      // The Technical Director agrees the renewal on the player's stated demands.
      const completedNeg: TransferNegotiation = {
        ...neg,
        daysOpen,
        stage: 'COMPLETED',
        lastUpdatedDate: nextDate,
        currentOffer: { ...neg.currentOffer, wageEur: neg.askingWageEur, contractYears: neg.desiredYears, squadRole: neg.desiredRole },
        managerDialogue: `Your Technical Director agreed a ${neg.desiredYears}-year renewal at ${formatMoney(neg.askingWageEur, state.settings.currency)}/wk.`,
      };
      const res = completeTransferInState({ ...state, clubs, players }, completedNeg);
      clubs = res.clubs;
      players = res.players;
      inbox.unshift({
        id: `msg-del-renew-${neg.id}`,
        date: nextDate,
        category: 'TRANSFER',
        sender: 'Technical Director',
        subject: `Contract Renewed: ${players[neg.playerId]?.knownAs ?? 'Player'}`,
        body: `${players[neg.playerId]?.knownAs ?? 'The player'} has signed a ${neg.desiredYears}-year deal worth ${formatMoney(neg.askingWageEur, state.settings.currency)}/wk.`,
        read: false,
        playerId: neg.playerId,
      });
      return completedNeg;
    }
    if (neg.stage === 'DELEGATED') {
      const daysOpen = neg.daysOpen + 1;
      if (daysOpen >= 2) {
        const targetCap = neg.delegatedMaxEur ?? neg.askingFeeEur;
        if (targetCap >= neg.askingFeeEur * 0.92) {
          const settledFee = Math.round(Math.min(targetCap, neg.askingFeeEur * 0.97));
          const completedNeg: TransferNegotiation = {
            ...neg,
            daysOpen,
            stage: 'COMPLETED',
            lastUpdatedDate: nextDate,
            currentOffer: {
              ...neg.currentOffer,
              transferFeeEur: settledFee,
              paidNowEur: settledFee,
              futurePaymentsEur: 0,
            },
            managerDialogue: `Your Technical Director wrapped up the deal at ${formatMoney(settledFee, state.settings.currency)}!`,
          };
          const res = completeTransferInState({ ...state, clubs, players }, completedNeg);
          clubs = res.clubs;
          players = res.players;
          if (res.transferRecord) {
            transferHistory.unshift(res.transferRecord);
            pendingRevealTransfer = res.transferRecord;
          }
          if (res.installment) installments.push(res.installment);
          inbox.unshift({
            id: `msg-del-ok-${neg.id}`,
            date: nextDate,
            category: 'TRANSFER',
            sender: 'Technical Director',
            subject: `Delegated Signing Completed: ${players[neg.playerId]?.knownAs ?? 'Player'}`,
            body: `We successfully closed the deal for ${players[neg.playerId]?.knownAs ?? 'the target'} at ${formatMoney(settledFee, state.settings.currency)}.`,
            read: false,
            playerId: neg.playerId,
          });
          return completedNeg;
        }
        inbox.unshift({
          id: `msg-del-fail-${neg.id}`,
          date: nextDate,
          category: 'TRANSFER',
          sender: 'Technical Director',
          subject: `Delegation Failed: ${players[neg.playerId]?.knownAs ?? 'Player'}`,
          body: `${neg.counterpartClubName} refused to sell within your delegated cap of ${formatMoney(targetCap, state.settings.currency)}.`,
          read: false,
          playerId: neg.playerId,
        });
        return { ...neg, daysOpen, stage: 'COLLAPSED', lastUpdatedDate: nextDate };
      }
      return { ...neg, daysOpen };
    }
    if (neg.stage === 'CLUB_TALKS' || neg.stage === 'PLAYER_TALKS') {
      return { ...neg, daysOpen: neg.daysOpen + 1 };
    }
    return neg;
  });

  // 6. AI Transfer Market activity (incoming offers + AI-to-AI deals)
  const aiMarket = runDailyAiTransferMarket(
    { ...state, currentDate: nextDate, transferWindowOpen: windowInfo.open, clubs, players, negotiations },
    rng
  );
  clubs = aiMarket.clubs;
  players = aiMarket.players;
  for (const incoming of aiMarket.newNegotiations) {
    negotiations.unshift(incoming);
    inbox.unshift({
      id: `msg-offer-${incoming.id}`,
      date: nextDate,
      category: 'TRANSFER',
      sender: incoming.counterpartClubName,
      subject: `Transfer Offer for ${players[incoming.playerId]?.knownAs}: ${formatMoney(incoming.askingFeeEur, state.settings.currency)}`,
      body: `${incoming.counterpartClubName} have tabled an official offer of ${formatMoney(incoming.askingFeeEur, state.settings.currency)} for ${players[incoming.playerId]?.knownAs}. Open Transfers to negotiate, accept, or decline.`,
      read: false,
      urgent: true,
      playerId: incoming.playerId,
      negotiationId: incoming.id,
    });
  }
  for (const recDeal of aiMarket.newRecords) {
    transferHistory.unshift(recDeal);
  }

  // 7. Simulate AI matches scheduled for `nextDate` (and check if User has a match)
  let stoppedForUserMatch: Fixture | null = null;
  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i];
    if (f.played || f.date !== nextDate) continue;
    if (f.homeClubId === state.userClubId || f.awayClubId === state.userClubId) {
      stoppedForUserMatch = f;
      continue;
    }

    const hClub = clubs[f.homeClubId];
    const aClub = clubs[f.awayClubId];
    if (!hClub || !aClub) continue;

    // Smart AI lineup rotation before match
    const rotateAi = (c: Club): Club => {
      const squad = Object.values(players).filter((p) => p.clubId === c.id);
      const { lineup, benchIds } = buildLineupForFormation(c.formation, squad);
      return { ...c, lineup, benchIds };
    };
    clubs[hClub.id] = rotateAi(hClub);
    clubs[aClub.id] = rotateAi(aClub);

    const hPlayed = state.standings.find((s) => s.clubId === hClub.id)?.played ?? 0;
    const aPlayed = state.standings.find((s) => s.clubId === aClub.id)?.played ?? 0;
    const res = simulateQuickMatch(f, clubs[hClub.id], clubs[aClub.id], players, hPlayed, aPlayed, rng);
    fixtures[i] = res.fixture;
    for (const [pidStr, patch] of Object.entries(res.playerUpdates)) {
      const pid = Number(pidStr);
      if (players[pid]) players[pid] = { ...players[pid], ...patch };
    }
  }

  const standings = computeStandings(clubs, fixtures);
  const allPlayed = fixtures.every((f) => f.played);

  // Update Board Objectives progress
  const userStandingIdx = standings.findIndex((s) => s.clubId === state.userClubId);
  const userPos = userStandingIdx >= 0 ? userStandingIdx + 1 : 10;
  const userClub = clubs[state.userClubId];
  const objectives = state.objectives.map((obj) => {
    if (obj.id === 'obj-league') {
      const targetMaxPos =
        userClub.domesticPrestige >= 9 ? 1 : userClub.domesticPrestige >= 7 ? 4 : userClub.domesticPrestige >= 5 ? 10 : 17;
      const ok = userPos <= targetMaxPos;
      const pct = ok ? 100 : clamp(Math.round((1 - (userPos - targetMaxPos) / 14) * 100), 10, 95);
      return { ...obj, progressPct: pct, completed: ok && allPlayed };
    }
    if (obj.id === 'obj-finance') {
      const reserve = Math.round(userClub.transferBudgetEur >= 5_000_000 ? 100 : (userClub.transferBudgetEur / 5_000_000) * 100);
      return { ...obj, progressPct: clamp(reserve, 0, 100), completed: userClub.transferBudgetEur >= 5_000_000 };
    }
    return obj;
  });

  const nextState: CareerState = {
    ...state,
    currentDate: nextDate,
    transferWindowOpen: windowInfo.open,
    transferWindowClosesDate: windowInfo.closesDate,
    deadlineDayHoursRemaining: isDeadlineDate ? 20 : null,
    clubs,
    players,
    fixtures,
    standings,
    negotiations,
    transferHistory: transferHistory.slice(0, 80),
    installments,
    scoutReports,
    youthScouts,
    youthProspects,
    inbox: inbox.slice(0, 60),
    objectives,
    transactions: transactions.slice(0, 80),
    pendingRevealTransfer,
    pendingEventModalId,
    seasonCompleted: allPlayed,
    lastSavedAt: new Date().toISOString(),
  };

  return { state: nextState, stoppedForUserMatch };
}

/**
 * Transitions a finished season into Season N+1:
 * - Pays prize money & settles deferred transfer installments
 * - Applies Dynamic Potential & player aging (+1 year)
 * - Retires aged veterans & spawns FC 27 Randomized Regens
 * - Resets season stats & generates a brand-new 38-round LaLiga schedule
 */
export function advanceToNextSeason(state: CareerState, rng: () => number = Math.random): CareerState {
  const nextSeasonNum = state.seasonNumber + 1;
  const nextYear = 2026 + (nextSeasonNum - 1);
  const startDate = `${nextYear}-07-01`;

  const clubs: Record<number, Club> = {};
  for (const [idStr, c] of Object.entries(state.clubs)) {
    clubs[Number(idStr)] = { ...c };
  }

  const userStandingIdx = state.standings.findIndex((s) => s.clubId === state.userClubId);
  const finalPos = userStandingIdx >= 0 ? userStandingIdx + 1 : 10;
  const prizeMoney = Math.max(12_000_000, Math.round((21 - finalPos) * 4_500_000));

  const userClub = clubs[state.userClubId];
  userClub.transferBudgetEur += prizeMoney;

  const transactions = [
    {
      id: `tx-prize-s${state.seasonNumber}`,
      date: startDate,
      category: 'Prize' as const,
      description: `LALIGA EA SPORTS Season ${state.seasonNumber} Prize Money (#${finalPos})`,
      amountEur: prizeMoney,
    },
    ...state.transactions,
  ];

  // Settle due installments
  const remainingInstallments = state.installments
    .map((inst) => {
      if (inst.seasonsRemaining <= 0) return inst;
      const delta = inst.direction === 'PAYABLE' ? -inst.amountPerSeasonEur : inst.amountPerSeasonEur;
      userClub.transferBudgetEur = Math.max(0, userClub.transferBudgetEur + delta);
      transactions.unshift({
        id: `tx-inst-${inst.id}-${nextSeasonNum}`,
        date: startDate,
        category: 'Transfer',
        description: `${inst.direction === 'PAYABLE' ? 'Paid' : 'Received'} instalment (${inst.playerName})`,
        amountEur: delta,
      });
      return { ...inst, seasonsRemaining: inst.seasonsRemaining - 1 };
    })
    .filter((i) => i.seasonsRemaining > 0 || i.sellOnPct > 0);

  // Age players, apply Dynamic Potential, retire older veterans & create Randomized Regens
  const players: Record<number, Player> = {};
  let maxPlayerId = Math.max(...Object.keys(state.players).map(Number), 900000);
  const retiredList: Player[] = [];

  for (const p of Object.values(state.players)) {
    const nextAge = p.age + 1;
    const clubPlayed = state.standings.find((s) => s.clubId === p.clubId)?.played ?? 38;
    const shouldRetire =
      (nextAge >= 38 && rng() < 0.72) || (nextAge >= 35 && p.baseOvr <= 76 && rng() < 0.45);

    if (shouldRetire) {
      retiredList.push(p);
      continue;
    }

    // Dynamic Potential adjustment based on season avgRating & minutes
    let nextPotential = p.potential;
    if (p.age <= 24 && p.seasonStats.appearances >= 12) {
      if (p.seasonStats.avgRating >= 7.3) nextPotential = clamp(p.potential + 2, p.baseOvr, 98);
      else if (p.seasonStats.avgRating < 6.0) nextPotential = clamp(p.potential - 2, p.baseOvr, 95);
    }

    const contractYearsLeft = Math.max(1, p.contractEndYear - nextYear);
    const aged: Player = {
      ...p,
      age: nextAge,
      potential: Math.max(p.baseOvr, nextPotential),
      energy: 95,
      sharpness: 78,
      matchFitness: 91,
      injury: null,
      morale: clamp(Math.round(p.morale * 0.6 + 72 * 0.4), 52, 84),
      formScore: 6.7,
      seasonStats: {
        appearances: 0,
        starts: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        yellowCards: 0,
        redCards: 0,
        matchRatings: [],
        avgRating: 6.7,
      },
      expectedTransferValue: calculateTransferRoomXTV(
        p.baseOvr,
        p.baseOvr,
        Math.max(p.baseOvr, nextPotential),
        nextAge,
        contractYearsLeft,
        p.primaryPosition,
        6.7
      ),
    };
    aged.dynamicOvr = calculateDynamicOVR(aged, aged.primaryPosition, 0);
    players[aged.id] = aged;
    void clubPlayed;
  }

  // Spawn FC 27 Randomized Regens into active league clubs for retired players
  const activeLeagueClubIds = Array.from(new Set(state.fixtures.map((f) => f.homeClubId))).filter((id) => Boolean(clubs[id]));
  const activeClubs = activeLeagueClubIds.map((id) => clubs[id]);
  const destClubs = activeClubs.length > 0 ? activeClubs : Object.values(clubs).filter((c) => c.isLaLiga);

  for (const ret of retiredList) {
    maxPlayerId++;
    const destClub = destClubs[Math.floor(rng() * destClubs.length)] ?? userClub;
    const regen = createRandomizedRegen(ret, destClub, maxPlayerId, nextYear, rng);
    players[regen.id] = regen;
  }

  // Rebuild lineups for all active league clubs
  const activeIds = destClubs.map((c) => c.id);
  for (const c of destClubs) {
    const roster = Object.values(players).filter((p) => p.clubId === c.id);
    const { lineup, benchIds } = buildLineupForFormation(c.formation, roster);
    clubs[c.id] = { ...c, lineup, benchIds };
  }

  const newFixtures = generateLaLigaSchedule(activeIds, nextYear, rng);
  const newStandings = computeStandings(clubs, newFixtures);

  const inbox: InboxMessage[] = [
    {
      id: `msg-s${nextSeasonNum}-start`,
      date: startDate,
      category: 'BOARD',
      sender: `${userClub.name} Board`,
      subject: `Season ${nextSeasonNum} (${nextYear}/${String(nextYear + 1).slice(-2)}) Begins!`,
      body: `Congratulations on finishing #${finalPos} last season! You earned ${formatMoney(prizeMoney, state.settings.currency)} in prize money. ${retiredList.length} veterans retired across the league and ${retiredList.length} randomized regens have entered the player pool.`,
      read: false,
    },
    ...state.inbox.slice(0, 20),
  ];

  return {
    ...state,
    seasonNumber: nextSeasonNum,
    currentDate: startDate,
    transferWindowOpen: true,
    transferWindowClosesDate: `${nextYear}-08-31`,
    deadlineDayHoursRemaining: null,
    clubs,
    players,
    fixtures: newFixtures,
    standings: newStandings,
    negotiations: [],
    installments: remainingInstallments,
    inbox,
    objectives: createInitialObjectives(clubs[state.userClubId]),
    transactions: transactions.slice(0, 80),
    pendingRevealTransfer: null,
    pendingEventModalId: null,
    seasonCompleted: false,
    lastSavedAt: new Date().toISOString(),
  };
}


export function formatHubBannerDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

export function formatFixtureMonthDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatOrdinal(n: number): string {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
