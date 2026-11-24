import { create } from 'zustand';
import { ParsedDatabase, parseCareerDatabaseFromCsv } from '../engine/csvParser';
import { promoteProspectToSeniorPlayer } from '../engine/growth';
import {
  applyLiveSub,
  createLiveMatch,
  finalizeLiveMatch,
  simulateQuickMatch,
  stepLiveMatchMinute,
} from '../engine/matchSim';
import {
  buildLineupForFormation,
  calculateDynamicOVR,
  calculateMatchFitness,
  clamp,
  formatMoney,
} from '../engine/ratings';
import {
  advanceSingleDay,
  advanceToNextSeason,
  computeStandings,
  createInitialCareerState,
  diffDays,
} from '../engine/season';
import {
  completeTransferInState,
  evaluateClubOffer,
  evaluateContractOffer,
  initiateNegotiation,
} from '../engine/transfers';
import {
  CareerSettings,
  CareerState,
  FormationId,
  LiveMatchState,
  Mentality,
  NegotiationOffer,
  Position,
  TacticalVision,
  TransferNegotiation,
} from '../engine/types';

export type NavTab =
  | 'Central'
  | 'Notifications'
  | 'Squad'
  | 'Scouting'
  | 'Transfers'
  | 'Academy'
  | 'Office'
  | 'Customise';

const STORAGE_KEY_ACTIVE = 'fc27_career_active_v1';
const STORAGE_KEY_SLOTS = 'fc27_career_slots_v1';

export interface SaveSlotMeta {
  slotId: string;
  saveName: string;
  clubName: string;
  seasonNumber: number;
  currentDate: string;
  savedAt: string;
  state: CareerState;
}

interface CareerStore {
  loadingDb: boolean;
  dbError: string | null;
  database: ParsedDatabase | null;
  career: CareerState | null;
  activeTab: NavTab;
  activeNegotiationId: string | null;
  liveMatch: LiveMatchState | null;
  postMatchSummary: {
    fixtureId: string;
    homeName: string;
    awayName: string;
    homeGoals: number;
    awayGoals: number;
    homeXg: number;
    awayXg: number;
    homePossession: number;
    aggravatedNames: string[];
    motmName: string;
  } | null;
  toast: string | null;
  savedSlots: SaveSlotMeta[];

  loadDatabase: () => Promise<void>;
  startNewCareer: (clubId: number, settings?: Partial<CareerSettings>) => void;
  resumeSavedCareer: () => boolean;
  saveToSlot: (slotId: string, customName?: string) => void;
  loadFromSlot: (slotId: string) => void;
  deleteSlot: (slotId: string) => void;
  exitToClubSelect: () => void;

  setActiveTab: (tab: NavTab) => void;
  setActiveNegotiationId: (id: string | null) => void;
  clearToast: () => void;
  dismissTransferReveal: () => void;
  dismissEventModal: () => void;
  dismissPostMatchSummary: () => void;

  // Calendar & Matches
  advanceDay: () => void;
  simToNextMatchOrDate: (targetDate?: string) => void;
  skipDeadlineHours: (hours: 1 | 2) => void;
  quickSimNextMatch: () => void;
  startLiveMatch: () => void;
  stepLiveMinute: () => void;
  makeLiveSub: (outPlayerId: number, inPlayerId: number) => void;
  updateLiveTactics: (mentality: Mentality, vision: TacticalVision) => void;
  finishLiveMatch: () => void;

  // Team Management & Squad Hub
  swapSquadPlayers: (firstPlayerId: number, secondPlayerId: number) => void;
  changeFormation: (formation: FormationId) => void;
  updateClubTactics: (vision: TacticalVision, mentality: Mentality, lineHeight: number) => void;
  setCaptain: (playerId: number) => void;
  setSetPieceTaker: (role: 'penalty' | 'freekick' | 'corner', playerId: number) => void;
  updateDevelopmentPlan: (
    playerId: number,
    mode: 'Balanced' | 'RoleFocus' | 'PositionRetrain',
    targetPosition?: Position
  ) => void;
  toggleTransferList: (playerId: number) => void;
  toggleLoanList: (playerId: number) => void;
  toggleBlockOffers: (playerId: number) => void;
  setJerseyNumber: (playerId: number, jerseyNumber: number) => void;
  toggleCoachHire: (coachId: string) => void;

  // Scouting & Transfers
  toggleShortlist: (playerId: number) => void;
  assignSeniorScout: (playerId: number) => void;
  updateScoutInstruction: (id: string, patch: Partial<CareerState['scoutInstructions'][number]>) => void;
  startNegotiation: (playerId: number, type: TransferNegotiation['type']) => void;
  submitClubNegotiationOffer: (negId: string, offer: NegotiationOffer) => void;
  submitContractNegotiationOffer: (negId: string, offer: NegotiationOffer) => void;
  delegateNegotiation: (negId: string, maxFeeEur: number) => void;
  cancelNegotiation: (negId: string) => void;

  // Academy
  hireYouthScout: (scoutId: string) => void;
  sendYouthScoutMission: (scoutId: string, country: string, targetPosition: Position | 'ANY', months: number) => void;
  signYouthProspect: (prospectId: string) => void;
  rejectYouthProspect: (prospectId: string) => void;
  promoteYouthProspect: (prospectId: string) => void;
  playYouthRushTournament: () => { won: boolean; score: string; mvpName: string };

  // Inbox, Office & Settings
  markInboxRead: (msgId: string) => void;
  resolveInboxChoice: (msgId: string, choiceId: string) => void;
  updateBudgetSplit: (transferPct: number) => void;
  updateSettings: (patch: Partial<CareerSettings>) => void;
  proceedToNextSeason: () => void;
}

function persistActiveCareer(state: CareerState | null) {
  try {
    if (!state) return;
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(state));
  } catch {
    // ignore storage quota failures in constrained contexts
  }
}

function loadSlotsFromStorage(): SaveSlotMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SLOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSlots(slots: SaveSlotMeta[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(slots));
  } catch {
    // ignore
  }
}

export const useCareerStore = create<CareerStore>((set, get) => ({
  loadingDb: false,
  dbError: null,
  database: null,
  career: null,
  activeTab: 'Central',
  activeNegotiationId: null,
  liveMatch: null,
  postMatchSummary: null,
  toast: null,
  savedSlots: loadSlotsFromStorage(),

  loadDatabase: async () => {
    if (get().database || get().loadingDb) return;
    set({ loadingDb: true, dbError: null });
    try {
      const resp = await fetch('/assets/aistudio/combined_f33bd40d.csv');
      if (!resp.ok) throw new Error(`Failed to fetch database CSV (${resp.status})`);
      const csvText = await resp.text();
      const db = parseCareerDatabaseFromCsv(csvText);
      set({ database: db, loadingDb: false });

      // Check ?autostart=1 for instant career start (testable / fast entry)
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        const clubParam = Number(params.get('club')) || 243;
        const targetId = db.clubs[clubParam]?.isLaLiga ? clubParam : 243;
        get().startNewCareer(targetId);
      } else {
        // Restore active session if user reloaded page mid-career
        const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
        if (raw && params.get('new') !== '1') {
          try {
            const restored = JSON.parse(raw) as CareerState;
            if (restored?.version === 1 && restored.clubs?.[restored.userClubId]) {
              set({ career: restored });
            }
          } catch {
            // ignore corrupted local storage
          }
        }
      }
    } catch (err) {
      set({ loadingDb: false, dbError: err instanceof Error ? err.message : 'Database load error' });
    }
  },

  startNewCareer: (clubId, settings) => {
    const db = get().database;
    if (!db) return;
    // Deep clone parsed database so new career starts pristine
    const clonedClubs = JSON.parse(JSON.stringify(db.clubs));
    const clonedPlayers = JSON.parse(JSON.stringify(db.players));
    const userClub = clonedClubs[clubId];
    const leagueClubIds =
      (userClub?.leagueId && db.clubsByLeague?.[userClub.leagueId]) ||
      Object.values(clonedClubs)
        .filter((c: any) => c.leagueId === userClub?.leagueId)
        .map((c: any) => c.id);
    const activeLeagueIds = leagueClubIds && leagueClubIds.length >= 10 ? leagueClubIds : db.laLigaClubIds;
    const fresh = createInitialCareerState(clonedClubs, clonedPlayers, activeLeagueIds, clubId, settings);
    persistActiveCareer(fresh);
    set({
      career: fresh,
      activeTab: 'Central',
      activeNegotiationId: null,
      liveMatch: null,
      postMatchSummary: null,
      toast: `Signed as First Team Manager of ${fresh.clubs[clubId].name}!`,
    });
  },

  resumeSavedCareer: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as CareerState;
      if (parsed?.version === 1 && parsed.clubs?.[parsed.userClubId]) {
        set({ career: parsed, activeTab: 'Central' });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  },

  saveToSlot: (slotId, customName) => {
    const career = get().career;
    if (!career) return;
    const club = career.clubs[career.userClubId];
    const meta: SaveSlotMeta = {
      slotId,
      saveName: customName || `${club.name} — S${career.seasonNumber}`,
      clubName: club.name,
      seasonNumber: career.seasonNumber,
      currentDate: career.currentDate,
      savedAt: new Date().toISOString(),
      state: career,
    };
    const nextSlots = [meta, ...get().savedSlots.filter((s) => s.slotId !== slotId)].slice(0, 6);
    persistSlots(nextSlots);
    persistActiveCareer(career);
    set({ savedSlots: nextSlots, toast: `Career saved to ${meta.saveName}.` });
  },

  loadFromSlot: (slotId) => {
    const found = get().savedSlots.find((s) => s.slotId === slotId);
    if (!found) return;
    persistActiveCareer(found.state);
    set({
      career: found.state,
      activeTab: 'Central',
      activeNegotiationId: null,
      liveMatch: null,
      toast: `Loaded save: ${found.saveName}.`,
    });
  },

  deleteSlot: (slotId) => {
    const nextSlots = get().savedSlots.filter((s) => s.slotId !== slotId);
    persistSlots(nextSlots);
    set({ savedSlots: nextSlots, toast: 'Save slot deleted.' });
  },

  exitToClubSelect: () => {
    set({ career: null, liveMatch: null, activeNegotiationId: null, postMatchSummary: null });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveNegotiationId: (id) => set({ activeNegotiationId: id }),
  clearToast: () => set({ toast: null }),
  dismissTransferReveal: () => {
    const c = get().career;
    if (!c) return;
    const next = { ...c, pendingRevealTransfer: null };
    persistActiveCareer(next);
    set({ career: next });
  },
  dismissEventModal: () => {
    const c = get().career;
    if (!c) return;
    const next = { ...c, pendingEventModalId: null };
    persistActiveCareer(next);
    set({ career: next });
  },
  dismissPostMatchSummary: () => set({ postMatchSummary: null }),

  advanceDay: () => {
    const career = get().career;
    if (!career || career.seasonCompleted) return;
    // Check if there is an unplayed user match TODAY
    const matchToday = career.fixtures.find(
      (f) => !f.played && f.date === career.currentDate && (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId)
    );
    if (matchToday) {
      set({ toast: 'Matchday today! Play Live Tactical Sim or Quick Sim to continue.' });
      return;
    }
    const res = advanceSingleDay(career);
    persistActiveCareer(res.state);
    set({
      career: res.state,
      toast: res.stoppedForUserMatch
        ? `Matchday reached! ${res.state.clubs[res.stoppedForUserMatch.homeClubId].shortName} vs ${res.state.clubs[res.stoppedForUserMatch.awayClubId].shortName}`
        : null,
    });
  },

  simToNextMatchOrDate: (targetDate) => {
    let career = get().career;
    if (!career || career.seasonCompleted) return;

    const userClubId = career.userClubId;
    const nextUserMatch = career.fixtures
      .filter((f) => !f.played && (f.homeClubId === userClubId || f.awayClubId === userClubId))
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    const goalDate = targetDate ?? nextUserMatch?.date;
    if (!goalDate) return;
    const days = clamp(diffDays(career.currentDate, goalDate), 0, 60);

    for (let i = 0; i < days; i++) {
      // Stop if an unplayed user match is scheduled on currentDate
      const matchToday = career.fixtures.find(
        (f) =>
          !f.played &&
          f.date === career!.currentDate &&
          (f.homeClubId === career!.userClubId || f.awayClubId === career!.userClubId)
      );
      if (matchToday) {
        if (targetDate && targetDate > career.currentDate) {
          // Sim user match automatically when explicitly simming past it to a future calendar date
          const hClub = career.clubs[matchToday.homeClubId];
          const aClub = career.clubs[matchToday.awayClubId];
          const hPlayed = career.standings.find((s) => s.clubId === hClub.id)?.played ?? 0;
          const aPlayed = career.standings.find((s) => s.clubId === aClub.id)?.played ?? 0;
          const res = simulateQuickMatch(matchToday, hClub, aClub, career.players, hPlayed, aPlayed);
          const nextFixtures = career.fixtures.map((f) => (f.id === matchToday.id ? res.fixture : f));
          const nextPlayers = { ...career.players };
          for (const [pidStr, patch] of Object.entries(res.playerUpdates)) {
            const pid = Number(pidStr);
            if (nextPlayers[pid]) nextPlayers[pid] = { ...nextPlayers[pid], ...patch };
          }
          career = {
            ...career,
            fixtures: nextFixtures,
            players: nextPlayers,
            standings: computeStandings(career.clubs, nextFixtures),
          };
        } else {
          break;
        }
      }
      const step = advanceSingleDay(career);
      career = step.state;
      if (step.stoppedForUserMatch && !targetDate) break;
      if (career.pendingEventModalId && !targetDate) break;
      if (career.deadlineDayHoursRemaining !== null && !targetDate) break;
    }

    persistActiveCareer(career);
    set({ career, toast: `Advanced to ${career.currentDate}.` });
  },

  skipDeadlineHours: (hours) => {
    const career = get().career;
    if (!career || career.deadlineDayHoursRemaining === null) return;
    const nextHours = Math.max(0, career.deadlineDayHoursRemaining - hours);
    if (nextHours === 0) {
      // Close Transfer Deadline Day and advance to Sep 1 / Feb 1
      const step = advanceSingleDay({ ...career, deadlineDayHoursRemaining: null });
      const closed = { ...step.state, deadlineDayHoursRemaining: null };
      persistActiveCareer(closed);
      set({ career: closed, toast: 'Transfer Window has officially CLOSED!' });
      return;
    }
    // Tick market activity during deadline day hours
    const step = advanceSingleDay(career);
    const updated: CareerState = {
      ...step.state,
      currentDate: career.currentDate, // remain on deadline day
      transferWindowOpen: true,
      deadlineDayHoursRemaining: nextHours,
    };
    persistActiveCareer(updated);
    set({ career: updated, toast: `Transfer Deadline Day: ${nextHours}h remaining!` });
  },

  quickSimNextMatch: () => {
    const career = get().career;
    if (!career) return;
    const nextMatch = career.fixtures
      .filter((f) => !f.played && (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!nextMatch) return;

    // Fast-forward calendar up to match date if needed
    let cur = career;
    const gap = clamp(diffDays(cur.currentDate, nextMatch.date), 0, 65);
    for (let i = 0; i < gap; i++) {
      cur = advanceSingleDay(cur).state;
    }
    cur = { ...cur, pendingEventModalId: null };

    const hClub = cur.clubs[nextMatch.homeClubId];
    const aClub = cur.clubs[nextMatch.awayClubId];
    const hPlayed = cur.standings.find((s) => s.clubId === hClub.id)?.played ?? 0;
    const aPlayed = cur.standings.find((s) => s.clubId === aClub.id)?.played ?? 0;

    const result = simulateQuickMatch(nextMatch, hClub, aClub, cur.players, hPlayed, aPlayed);
    const nextFixtures = cur.fixtures.map((f) => (f.id === nextMatch.id ? result.fixture : f));
    const nextPlayers = { ...cur.players };
    for (const [pidStr, patch] of Object.entries(result.playerUpdates)) {
      const pid = Number(pidStr);
      if (nextPlayers[pid]) nextPlayers[pid] = { ...nextPlayers[pid], ...patch };
    }

    const standings = computeStandings(cur.clubs, nextFixtures);
    const aggravatedNames = result.newInjuries.filter((i) => i.aggravated).map((i) => i.playerName);
    const matchdayIncome =
      nextMatch.homeClubId === cur.userClubId
        ? Math.round(1_250_000 + hClub.domesticPrestige * 320_000)
        : 0;

    const nextClubs = { ...cur.clubs };
    const userWon =
      (nextMatch.homeClubId === cur.userClubId && result.fixture.homeGoals > result.fixture.awayGoals) ||
      (nextMatch.awayClubId === cur.userClubId && result.fixture.awayGoals > result.fixture.homeGoals);
    const userLost =
      (nextMatch.homeClubId === cur.userClubId && result.fixture.homeGoals < result.fixture.awayGoals) ||
      (nextMatch.awayClubId === cur.userClubId && result.fixture.awayGoals < result.fixture.homeGoals);

    nextClubs[cur.userClubId] = {
      ...nextClubs[cur.userClubId],
      boardConfidence: clamp(nextClubs[cur.userClubId].boardConfidence + (userWon ? 2 : userLost ? -3 : 0), 25, 99),
      transferBudgetEur: nextClubs[cur.userClubId].transferBudgetEur + Math.round(matchdayIncome * 0.25),
    };

    const nextTransactions =
      matchdayIncome > 0
        ? [
            {
              id: `tx-match-${nextMatch.id}`,
              date: cur.currentDate,
              category: 'Matchday' as const,
              description: `Gate Receipts vs ${aClub.name}`,
              amountEur: matchdayIncome,
            },
            ...cur.transactions,
          ]
        : cur.transactions;

    const motm = Object.entries(result.playerUpdates)
      .map(([id, patch]) => ({ id: Number(id), r: patch.formScore ?? 6.5 }))
      .sort((x, y) => y.r - x.r)[0];

    const updatedState: CareerState = {
      ...cur,
      clubs: nextClubs,
      players: nextPlayers,
      fixtures: nextFixtures,
      standings,
      transactions: nextTransactions.slice(0, 80),
      seasonCompleted: nextFixtures.every((f) => f.played),
      lastSavedAt: new Date().toISOString(),
    };
    persistActiveCareer(updatedState);

    set({
      career: updatedState,
      postMatchSummary: {
        fixtureId: nextMatch.id,
        homeName: hClub.name,
        awayName: aClub.name,
        homeGoals: result.fixture.homeGoals,
        awayGoals: result.fixture.awayGoals,
        homeXg: result.fixture.homeXg,
        awayXg: result.fixture.awayXg,
        homePossession: result.fixture.homePossession,
        aggravatedNames,
        motmName: motm ? nextPlayers[motm.id]?.knownAs ?? 'Star Player' : 'Star Player',
      },
    });
  },

  startLiveMatch: () => {
    const career = get().career;
    if (!career) return;
    const nextMatch = career.fixtures
      .filter((f) => !f.played && (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!nextMatch) return;

    let cur = career;
    const gap = clamp(diffDays(cur.currentDate, nextMatch.date), 0, 65);
    for (let i = 0; i < gap; i++) {
      cur = advanceSingleDay(cur).state;
    }
    cur = { ...cur, pendingEventModalId: null };

    const hClub = cur.clubs[nextMatch.homeClubId];
    const aClub = cur.clubs[nextMatch.awayClubId];
    const live = createLiveMatch(nextMatch, hClub, aClub, cur.players);
    persistActiveCareer(cur);
    set({ career: cur, liveMatch: live });
  },

  stepLiveMinute: () => {
    const { career, liveMatch } = get();
    if (!career || !liveMatch || liveMatch.isFinished) return;
    const hClub = career.clubs[liveMatch.homeClubId];
    const aClub = career.clubs[liveMatch.awayClubId];
    const next = stepLiveMatchMinute(liveMatch, hClub, aClub, career.players);
    set({ liveMatch: next });
  },

  makeLiveSub: (outPlayerId, inPlayerId) => {
    const { career, liveMatch } = get();
    if (!career || !liveMatch) return;
    const isHome = liveMatch.homeClubId === career.userClubId;
    const next = applyLiveSub(liveMatch, isHome, outPlayerId, inPlayerId, career.players);
    set({ liveMatch: next });
  },

  updateLiveTactics: (mentality, vision) => {
    const { career, liveMatch } = get();
    if (!career || !liveMatch) return;
    const isHome = liveMatch.homeClubId === career.userClubId;
    set({
      liveMatch: isHome
        ? { ...liveMatch, homeMentality: mentality, homeVision: vision }
        : { ...liveMatch, awayMentality: mentality, awayVision: vision },
    });
  },

  finishLiveMatch: () => {
    const { career, liveMatch } = get();
    if (!career || !liveMatch) return;
    const fix = career.fixtures.find((f) => f.id === liveMatch.fixtureId);
    if (!fix) return;

    const hClub = career.clubs[liveMatch.homeClubId];
    const aClub = career.clubs[liveMatch.awayClubId];
    const hPlayed = career.standings.find((s) => s.clubId === hClub.id)?.played ?? 0;
    const aPlayed = career.standings.find((s) => s.clubId === aClub.id)?.played ?? 0;

    const res = finalizeLiveMatch(liveMatch, fix, hClub, aClub, career.players, hPlayed, aPlayed);
    const nextFixtures = career.fixtures.map((f) => (f.id === fix.id ? res.fixture : f));
    const nextPlayers = { ...career.players };
    for (const [pidStr, patch] of Object.entries(res.playerUpdates)) {
      const pid = Number(pidStr);
      if (nextPlayers[pid]) nextPlayers[pid] = { ...nextPlayers[pid], ...patch };
    }

    const standings = computeStandings(career.clubs, nextFixtures);
    const aggravatedNames = res.newInjuries.filter((i) => i.aggravated).map((i) => i.playerName);
    const motmId = Object.entries(liveMatch.playerRatings).sort((a, b) => b[1] - a[1])[0]?.[0];

    const updatedState: CareerState = {
      ...career,
      players: nextPlayers,
      fixtures: nextFixtures,
      standings,
      seasonCompleted: nextFixtures.every((f) => f.played),
      lastSavedAt: new Date().toISOString(),
    };
    persistActiveCareer(updatedState);

    set({
      career: updatedState,
      liveMatch: null,
      postMatchSummary: {
        fixtureId: fix.id,
        homeName: hClub.name,
        awayName: aClub.name,
        homeGoals: liveMatch.homeGoals,
        awayGoals: liveMatch.awayGoals,
        homeXg: liveMatch.homeXg,
        awayXg: liveMatch.awayXg,
        homePossession: liveMatch.homePossession,
        aggravatedNames,
        motmName: motmId ? nextPlayers[Number(motmId)]?.knownAs ?? 'Star Player' : 'Star Player',
      },
    });
  },

  swapSquadPlayers: (firstId, secondId) => {
    const career = get().career;
    if (!career || firstId === secondId) return;
    const club = career.clubs[career.userClubId];
    const lineup = club.lineup.map((s) => ({ ...s }));
    const benchIds = [...club.benchIds];

    const slotA = lineup.findIndex((s) => s.playerId === firstId);
    const slotB = lineup.findIndex((s) => s.playerId === secondId);
    const benchA = benchIds.indexOf(firstId);
    const benchB = benchIds.indexOf(secondId);

    if (slotA !== -1 && slotB !== -1) {
      lineup[slotA].playerId = secondId;
      lineup[slotB].playerId = firstId;
    } else if (slotA !== -1 && benchB !== -1) {
      lineup[slotA].playerId = secondId;
      benchIds[benchB] = firstId;
    } else if (slotB !== -1 && benchA !== -1) {
      lineup[slotB].playerId = firstId;
      benchIds[benchA] = secondId;
    } else if (slotA !== -1) {
      // Reserve swapped into Starting XI
      lineup[slotA].playerId = secondId;
    } else if (slotB !== -1) {
      lineup[slotB].playerId = firstId;
    } else if (benchA !== -1) {
      benchIds[benchA] = secondId;
    } else if (benchB !== -1) {
      benchIds[benchB] = firstId;
    }

    const clubMatches = career.standings.find((s) => s.clubId === club.id)?.played ?? 0;
    const nextPlayers = { ...career.players };
    for (const slot of lineup) {
      if (slot.playerId && nextPlayers[slot.playerId]) {
        const p = nextPlayers[slot.playerId];
        nextPlayers[p.id] = { ...p, dynamicOvr: calculateDynamicOVR(p, slot.position, clubMatches) };
      }
    }
    for (const bid of benchIds) {
      if (nextPlayers[bid]) {
        const p = nextPlayers[bid];
        nextPlayers[p.id] = { ...p, dynamicOvr: calculateDynamicOVR(p, p.primaryPosition, clubMatches) };
      }
    }

    const nextState: CareerState = {
      ...career,
      clubs: { ...career.clubs, [club.id]: { ...club, lineup, benchIds } },
      players: nextPlayers,
    };
    persistActiveCareer(nextState);
    set({ career: nextState });
  },

  changeFormation: (formation) => {
    const career = get().career;
    if (!career) return;
    const club = career.clubs[career.userClubId];
    const roster = Object.values(career.players).filter((p) => p.clubId === club.id);
    const { lineup, benchIds } = buildLineupForFormation(formation, roster);
    const clubMatches = career.standings.find((s) => s.clubId === club.id)?.played ?? 0;
    const nextPlayers = { ...career.players };
    for (const slot of lineup) {
      if (slot.playerId && nextPlayers[slot.playerId]) {
        const p = nextPlayers[slot.playerId];
        nextPlayers[p.id] = { ...p, dynamicOvr: calculateDynamicOVR(p, slot.position, clubMatches) };
      }
    }
    const nextState: CareerState = {
      ...career,
      clubs: { ...career.clubs, [club.id]: { ...club, formation, lineup, benchIds } },
      players: nextPlayers,
    };
    persistActiveCareer(nextState);
    set({ career: nextState, toast: `Formation switched to ${formation}.` });
  },

  updateClubTactics: (vision, mentality, lineHeight) => {
    const career = get().career;
    if (!career) return;
    const club = career.clubs[career.userClubId];
    const nextState: CareerState = {
      ...career,
      clubs: {
        ...career.clubs,
        [club.id]: {
          ...club,
          tacticalVision: vision,
          mentality,
          defensiveLineHeight: clamp(lineHeight, 30, 90),
        },
      },
    };
    persistActiveCareer(nextState);
    set({ career: nextState });
  },

  setCaptain: (playerId) => {
    const career = get().career;
    if (!career) return;
    const club = career.clubs[career.userClubId];
    const next = { ...career, clubs: { ...career.clubs, [club.id]: { ...club, captainId: playerId } } };
    persistActiveCareer(next);
    set({ career: next, toast: `${career.players[playerId]?.knownAs} appointed Club Captain.` });
  },

  setSetPieceTaker: (role, playerId) => {
    const career = get().career;
    if (!career) return;
    const club = career.clubs[career.userClubId];
    const patch =
      role === 'penalty'
        ? { penaltyTakerId: playerId }
        : role === 'freekick'
        ? { freeKickTakerId: playerId }
        : { cornerTakerId: playerId };
    const next = { ...career, clubs: { ...career.clubs, [club.id]: { ...club, ...patch } } };
    persistActiveCareer(next);
    set({ career: next });
  },

  updateDevelopmentPlan: (playerId, mode, targetPosition) => {
    const career = get().career;
    if (!career || !career.players[playerId]) return;
    const p = career.players[playerId];
    const nextPlayers = {
      ...career.players,
      [playerId]: {
        ...p,
        developmentPlan: {
          ...p.developmentPlan,
          mode,
          targetPosition: mode === 'PositionRetrain' ? targetPosition : undefined,
          weeksCompleted: 0,
          weeksRequired: mode === 'PositionRetrain' ? 14 : 18,
        },
      },
    };
    const next = { ...career, players: nextPlayers };
    persistActiveCareer(next);
    set({
      career: next,
      toast:
        mode === 'PositionRetrain' && targetPosition
          ? `${p.knownAs} started retraining to learn ${targetPosition}.`
          : `Updated ${p.knownAs}'s development plan to ${mode}.`,
    });
  },

  toggleTransferList: (playerId) => {
    const career = get().career;
    if (!career || !career.players[playerId]) return;
    const p = career.players[playerId];
    const next = {
      ...career,
      players: { ...career.players, [playerId]: { ...p, transferListed: !p.transferListed } },
    };
    persistActiveCareer(next);
    set({
      career: next,
      toast: !p.transferListed ? `${p.knownAs} added to Transfer List.` : `${p.knownAs} removed from Transfer List.`,
    });
  },

  toggleLoanList: (playerId) => {
    const career = get().career;
    if (!career || !career.players[playerId]) return;
    const p = career.players[playerId];
    const next = {
      ...career,
      players: { ...career.players, [playerId]: { ...p, loanListed: !p.loanListed } },
    };
    persistActiveCareer(next);
    set({ career: next });
  },

  toggleBlockOffers: (playerId) => {
    const career = get().career;
    if (!career || !career.players[playerId]) return;
    const p = career.players[playerId];
    const blocked = !p.offersBlocked;
    const next = {
      ...career,
      players: { ...career.players, [playerId]: { ...p, offersBlocked: blocked } },
    };
    persistActiveCareer(next);
    set({
      career: next,
      toast: blocked ? `Offers for ${p.knownAs} are now blocked.` : `${p.knownAs} is open to offers again.`,
    });
  },

  setJerseyNumber: (playerId, jerseyNumber) => {
    const career = get().career;
    if (!career || !career.players[playerId]) return;
    const p = career.players[playerId];
    const num = Math.round(jerseyNumber);
    if (num < 1 || num > 99) return;
    const taken = Object.values(career.players).find(
      (o) => o.id !== playerId && o.clubId === p.clubId && o.jerseyNumber === num
    );
    if (taken) {
      set({ toast: `#${num} is already worn by ${taken.knownAs}.` });
      return;
    }
    const next = {
      ...career,
      players: { ...career.players, [playerId]: { ...p, jerseyNumber: num } },
    };
    persistActiveCareer(next);
    set({ career: next, toast: `${p.knownAs} will now wear #${num}.` });
  },

  toggleCoachHire: (coachId) => {
    const career = get().career;
    if (!career) return;
    const club = career.clubs[career.userClubId];
    const coach = club.coaches.find((c) => c.id === coachId);
    if (!coach) return;
    const hiredCount = club.coaches.filter((c) => c.hired).length;
    if (!coach.hired && hiredCount >= 8) {
      set({ toast: 'Maximum 8 coaches hired simultaneously. Release one first.' });
      return;
    }
    const fee = !coach.hired ? coach.weeklySalaryEur * 6 : 0;
    if (fee > club.transferBudgetEur) {
      set({ toast: 'Insufficient transfer funds to sign this coach.' });
      return;
    }
    const nextClub = {
      ...club,
      transferBudgetEur: club.transferBudgetEur - fee,
      coaches: club.coaches.map((c) => (c.id === coachId ? { ...c, hired: !c.hired } : c)),
    };
    const next = { ...career, clubs: { ...career.clubs, [club.id]: nextClub } };
    persistActiveCareer(next);
    set({
      career: next,
      toast: !coach.hired ? `Hired ${coach.name} (${coach.department} Coach).` : `Released ${coach.name}.`,
    });
  },

  toggleShortlist: (playerId) => {
    const career = get().career;
    if (!career) return;
    const exists = career.shortlistIds.includes(playerId);
    const shortlistIds = exists
      ? career.shortlistIds.filter((id) => id !== playerId)
      : [playerId, ...career.shortlistIds];
    const next = { ...career, shortlistIds };
    persistActiveCareer(next);
    set({
      career: next,
      toast: exists ? 'Removed from Shortlist.' : `Added ${career.players[playerId]?.knownAs} to Shortlist.`,
    });
  },

  assignSeniorScout: (playerId) => {
    const career = get().career;
    if (!career || !career.players[playerId]) return;
    const p = career.players[playerId];
    const nextReports = {
      ...career.scoutReports,
      [playerId]: {
        playerId,
        stage: 1 as const,
        daysElapsed: 1,
        tacticalFit: `${p.roleTitle} (${p.roleFamiliarity}) matches ${career.clubs[career.userClubId].tacticalVision}`,
        futureVerdict: 'Compiling growth profile & potential...',
        financialEstimate: 'Estimating TransferRoom xTV...',
        statusNote: 'Senior Scout assigned (Stage 1/4)',
      },
    };
    const next = { ...career, scoutReports: nextReports };
    persistActiveCareer(next);
    set({ career: next, toast: `Assigned Senior Scout to compile full 4-stage report on ${p.knownAs}.` });
  },

  updateScoutInstruction: (id, patch) => {
    const career = get().career;
    if (!career) return;
    const next = {
      ...career,
      scoutInstructions: career.scoutInstructions.map((inst) => (inst.id === id ? { ...inst, ...patch } : inst)),
    };
    persistActiveCareer(next);
    set({ career: next });
  },

  startNegotiation: (playerId, type) => {
    const career = get().career;
    if (!career) return;
    const { negotiation, error } = initiateNegotiation(career, playerId, type);
    if (!negotiation) {
      set({ toast: error || 'Unable to start negotiation.' });
      return;
    }
    const exists = career.negotiations.some((n) => n.id === negotiation.id);
    const nextNegs = exists ? career.negotiations : [negotiation, ...career.negotiations];
    const next = { ...career, negotiations: nextNegs };
    persistActiveCareer(next);
    set({
      career: next,
      activeTab: 'Transfers',
      activeNegotiationId: negotiation.id,
    });
  },

  submitClubNegotiationOffer: (negId, offer) => {
    const career = get().career;
    if (!career) return;
    const neg = career.negotiations.find((n) => n.id === negId);
    if (!neg) return;

    const { updated, clubRelationDelta } = evaluateClubOffer(career, neg, offer);
    let clubs = { ...career.clubs };
    let players = { ...career.players };
    let transferHistory = [...career.transferHistory];
    let installments = [...career.installments];
    let transactions = [...career.transactions];
    let pendingRevealTransfer = career.pendingRevealTransfer;

    // Update Club Relationship (-2 to 10)
    const counterpartId = neg.fromClubId === career.userClubId ? neg.toClubId : neg.fromClubId;
    if (clubs[counterpartId] && clubRelationDelta !== 0) {
      const curRel = clubs[counterpartId].relationships[career.userClubId] ?? 4;
      clubs[counterpartId] = {
        ...clubs[counterpartId],
        relationships: {
          ...clubs[counterpartId].relationships,
          [career.userClubId]: clamp(curRel + clubRelationDelta, -2, 10),
        },
      };
    }

    if (updated.stage === 'COMPLETED') {
      const res = completeTransferInState({ ...career, clubs, players }, updated);
      clubs = res.clubs;
      players = res.players;
      if (res.transferRecord) {
        transferHistory = [res.transferRecord, ...transferHistory];
        pendingRevealTransfer = res.transferRecord;
      }
      if (res.installment) installments = [res.installment, ...installments];
      const deltaAmt =
        updated.type === 'SELL' ? updated.currentOffer.paidNowEur : -updated.currentOffer.paidNowEur;
      transactions = [
        {
          id: `tx-tr-${Date.now()}`,
          date: career.currentDate,
          category: 'Transfer',
          description: `${updated.type === 'SELL' ? 'Sold' : 'Signed'} ${players[updated.playerId]?.knownAs ?? 'Player'}`,
          amountEur: deltaAmt,
        },
        ...transactions,
      ];
    }

    const next: CareerState = {
      ...career,
      clubs,
      players,
      negotiations: career.negotiations.map((n) => (n.id === negId ? updated : n)),
      transferHistory,
      installments,
      transactions,
      pendingRevealTransfer,
    };
    persistActiveCareer(next);
    set({
      career: next,
      activeNegotiationId: updated.stage === 'COMPLETED' ? null : negId,
    });
  },

  submitContractNegotiationOffer: (negId, offer) => {
    const career = get().career;
    if (!career) return;
    const neg = career.negotiations.find((n) => n.id === negId);
    if (!neg) return;

    const updated = evaluateContractOffer(career, neg, offer);
    let clubs = career.clubs;
    let players = career.players;
    let transferHistory = career.transferHistory;
    let installments = career.installments;
    let transactions = career.transactions;
    let pendingRevealTransfer = career.pendingRevealTransfer;

    if (updated.stage === 'COMPLETED') {
      const res = completeTransferInState(career, updated);
      clubs = res.clubs;
      players = res.players;
      if (res.transferRecord) {
        transferHistory = [res.transferRecord, ...transferHistory];
        pendingRevealTransfer = res.transferRecord;
      }
      if (res.installment) installments = [res.installment, ...installments];
      if (updated.type !== 'CONTRACT') {
        transactions = [
          {
            id: `tx-buy-${Date.now()}`,
            date: career.currentDate,
            category: 'Transfer',
            description: `Transfer Fee (Upfront) — ${players[updated.playerId]?.knownAs}`,
            amountEur: -(updated.currentOffer.paidNowEur + updated.currentOffer.signingBonusEur),
          },
          ...transactions,
        ];
      }
    }

    const next: CareerState = {
      ...career,
      clubs,
      players,
      negotiations: career.negotiations.map((n) => (n.id === negId ? updated : n)),
      transferHistory,
      installments,
      transactions,
      pendingRevealTransfer,
    };
    persistActiveCareer(next);
    set({
      career: next,
      activeNegotiationId: updated.stage === 'COMPLETED' ? null : negId,
      toast:
        updated.stage === 'COMPLETED' && updated.type === 'CONTRACT'
          ? `Contract renewed for ${players[updated.playerId]?.knownAs}!`
          : null,
    });
  },

  delegateNegotiation: (negId, maxFeeEur) => {
    const career = get().career;
    if (!career) return;
    const next: CareerState = {
      ...career,
      negotiations: career.negotiations.map((n) =>
        n.id === negId
          ? {
              ...n,
              stage: 'DELEGATED',
              delegatedMaxEur: maxFeeEur,
              managerDialogue: `Delegated to Technical Director (max ${formatMoney(maxFeeEur, career.settings.currency)}). Advance 2 days for resolution.`,
            }
          : n
      ),
    };
    persistActiveCareer(next);
    set({
      career: next,
      activeNegotiationId: null,
      toast: 'Negotiation delegated to Technical Director. Advance 2 days to receive the result.',
    });
  },

  cancelNegotiation: (negId) => {
    const career = get().career;
    if (!career) return;
    const next: CareerState = {
      ...career,
      negotiations: career.negotiations.map((n) =>
        n.id === negId ? { ...n, stage: 'COLLAPSED', managerDialogue: 'Negotiation ended by manager.' } : n
      ),
    };
    persistActiveCareer(next);
    set({ career: next, activeNegotiationId: null });
  },

  hireYouthScout: (scoutId) => {
    const career = get().career;
    if (!career) return;
    const scout = career.youthScouts.find((s) => s.id === scoutId);
    const club = career.clubs[career.userClubId];
    if (!scout || scout.hired) return;
    if (club.transferBudgetEur < scout.costEur) {
      set({ toast: 'Insufficient transfer budget to hire this Youth Scout.' });
      return;
    }
    const next: CareerState = {
      ...career,
      clubs: {
        ...career.clubs,
        [club.id]: { ...club, transferBudgetEur: club.transferBudgetEur - scout.costEur },
      },
      youthScouts: career.youthScouts.map((s) => (s.id === scoutId ? { ...s, hired: true } : s)),
      transactions: [
        {
          id: `tx-ys-${Date.now()}`,
          date: career.currentDate,
          category: 'Scouting',
          description: `Hired Youth Scout ${scout.name}`,
          amountEur: -scout.costEur,
        },
        ...career.transactions,
      ],
    };
    persistActiveCareer(next);
    set({ career: next, toast: `Hired Youth Scout ${scout.name}.` });
  },

  sendYouthScoutMission: (scoutId, country, targetPosition, months) => {
    const career = get().career;
    if (!career) return;
    const club = career.clubs[career.userClubId];
    const cost = months * 110_000;
    if (club.transferBudgetEur < cost) {
      set({ toast: 'Insufficient funds for youth scouting mission.' });
      return;
    }
    const next: CareerState = {
      ...career,
      clubs: {
        ...career.clubs,
        [club.id]: { ...club, transferBudgetEur: club.transferBudgetEur - cost },
      },
      youthScouts: career.youthScouts.map((s) =>
        s.id === scoutId
          ? {
              ...s,
              mission: {
                country,
                targetPosition,
                durationMonths: months,
                daysRemaining: months * 12,
                costEur: cost,
              },
            }
          : s
      ),
    };
    persistActiveCareer(next);
    set({ career: next, toast: `Scout dispatched to ${country} (${targetPosition}) for ${months}m.` });
  },

  signYouthProspect: (prospectId) => {
    const career = get().career;
    if (!career) return;
    const academyCount = career.youthProspects.filter((p) => p.inAcademy).length;
    if (academyCount >= 16) {
      set({ toast: 'Youth Academy full (16/16). Promote or release a player first.' });
      return;
    }
    const next: CareerState = {
      ...career,
      youthProspects: career.youthProspects.map((p) => (p.id === prospectId ? { ...p, inAcademy: true } : p)),
    };
    persistActiveCareer(next);
    set({ career: next, toast: 'Prospect signed to the Youth Academy!' });
  },

  rejectYouthProspect: (prospectId) => {
    const career = get().career;
    if (!career) return;
    const next: CareerState = {
      ...career,
      youthProspects: career.youthProspects.filter((p) => p.id !== prospectId),
    };
    persistActiveCareer(next);
    set({ career: next });
  },

  promoteYouthProspect: (prospectId) => {
    const career = get().career;
    if (!career) return;
    const prospect = career.youthProspects.find((p) => p.id === prospectId);
    if (!prospect) return;
    if (prospect.age < 16) {
      set({ toast: 'Players must be at least 16 years old to promote to the Senior Squad.' });
      return;
    }
    const club = career.clubs[career.userClubId];
    const maxId = Math.max(...Object.keys(career.players).map(Number), 900000);
    const newSenior = promoteProspectToSeniorPlayer(prospect, club, maxId + 1, career.currentDate);
    const nextObjectives = career.objectives.map((o) =>
      o.id === 'obj-youth' ? { ...o, progressPct: 100, completed: true } : o
    );
    const next: CareerState = {
      ...career,
      players: { ...career.players, [newSenior.id]: newSenior },
      youthProspects: career.youthProspects.filter((p) => p.id !== prospectId),
      objectives: nextObjectives,
    };
    persistActiveCareer(next);
    set({ career: next, toast: `${newSenior.knownAs} (${newSenior.baseOvr} OVR) promoted to Senior Squad!` });
  },

  playYouthRushTournament: () => {
    const career = get().career;
    if (!career) return { won: false, score: '0 - 0', mvpName: 'Academy Squad' };
    const academy = career.youthProspects.filter((p) => p.inAcademy);
    const avgPot =
      academy.length > 0 ? academy.reduce((s, p) => s + p.truePotential, 0) / academy.length : 75;
    const won = Math.random() < clamp((avgPot - 60) / 35, 0.35, 0.82);
    const gFor = won ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
    const gAgainst = won ? Math.floor(Math.random() * gFor) : gFor + 1 + Math.floor(Math.random() * 2);
    const mvp = academy[Math.floor(Math.random() * Math.max(1, academy.length))];

    // Boost OVR/narrow fog for Academy squad on Youth Rush participation
    const boosted = career.youthProspects.map((yp) => {
      if (!yp.inAcademy) return yp;
      const gain = won ? 1 : 0;
      const nextTrue = clamp(yp.trueOvr + gain, 48, yp.truePotential);
      return {
        ...yp,
        trueOvr: nextTrue,
        ovrRange: [Math.min(nextTrue, yp.ovrRange[0] + 1), Math.max(nextTrue, yp.ovrRange[1] - 1)] as [number, number],
        potRange: [
          Math.min(yp.truePotential, yp.potRange[0] + 1),
          Math.max(yp.truePotential, yp.potRange[1] - 1),
        ] as [number, number],
      };
    });
    const next = { ...career, youthProspects: boosted };
    persistActiveCareer(next);
    set({
      career: next,
      toast: won
        ? `Youth Rush 5v5 Victory (${gFor}-${gAgainst})! Academy prospects gained +1 OVR & sharper potential clarity.`
        : `Youth Rush 5v5 ended ${gFor}-${gAgainst}. Valuable experience gained.`,
    });
    return { won, score: `${gFor} - ${gAgainst}`, mvpName: mvp?.name ?? 'Youth Prospect' };
  },

  markInboxRead: (msgId) => {
    const career = get().career;
    if (!career) return;
    const next = {
      ...career,
      inbox: career.inbox.map((m) => (m.id === msgId ? { ...m, read: true } : m)),
    };
    persistActiveCareer(next);
    set({ career: next });
  },

  resolveInboxChoice: (msgId, choiceId) => {
    const career = get().career;
    if (!career) return;
    const msg = career.inbox.find((m) => m.id === msgId);
    const choice = msg?.choices?.find((c) => c.id === choiceId);
    if (!msg || !choice) return;

    const club = career.clubs[career.userClubId];
    const nextPlayers = { ...career.players };
    const clubPlayed = career.standings.find((s) => s.clubId === club.id)?.played ?? 0;

    if (msg.playerId && nextPlayers[msg.playerId]) {
      const p = nextPlayers[msg.playerId];
      const nextMorale = clamp(p.morale + (choice.moraleDelta ?? 0), 15, 96);
      const nextEnergy = clamp(p.energy + (choice.energyDelta ?? 0), 20, 100);
      const nextFit = calculateMatchFitness(nextEnergy, p.sharpness, p.injury);
      const updated = { ...p, morale: nextMorale, energy: nextEnergy, matchFitness: nextFit };
      updated.dynamicOvr = calculateDynamicOVR(updated, p.dynamicOvr.deployedPosition, clubPlayed);
      nextPlayers[p.id] = updated;
    } else if (choice.moraleDelta || choice.energyDelta) {
      // Squad-wide press conference impact
      for (const p of Object.values(nextPlayers)) {
        if (p.clubId !== club.id) continue;
        const nextMorale = clamp(p.morale + (choice.moraleDelta ?? 0), 15, 96);
        const nextEnergy = clamp(p.energy + (choice.energyDelta ?? 0), 20, 100);
        const nextFit = calculateMatchFitness(nextEnergy, p.sharpness, p.injury);
        const updated = { ...p, morale: nextMorale, energy: nextEnergy, matchFitness: nextFit };
        updated.dynamicOvr = calculateDynamicOVR(updated, p.dynamicOvr.deployedPosition, clubPlayed);
        nextPlayers[p.id] = updated;
      }
    }

    const nextClub = {
      ...club,
      boardConfidence: clamp(club.boardConfidence + (choice.boardDelta ?? 0), 20, 99),
      transferBudgetEur: Math.max(0, club.transferBudgetEur + (choice.budgetDeltaEur ?? 0)),
    };

    const next: CareerState = {
      ...career,
      clubs: { ...career.clubs, [club.id]: nextClub },
      players: nextPlayers,
      inbox: career.inbox.map((m) =>
        m.id === msgId ? { ...m, read: true, resolvedChoiceId: choiceId } : m
      ),
      pendingEventModalId: career.pendingEventModalId === msgId ? null : career.pendingEventModalId,
    };
    persistActiveCareer(next);
    set({ career: next, toast: `Decision applied: ${choice.effectSummary}` });
  },

  updateBudgetSplit: (transferPct) => {
    const career = get().career;
    if (!career) return;
    const club = career.clubs[career.userClubId];
    const pct = clamp(Math.round(transferPct), 25, 95);
    const totalPool = club.transferBudgetEur + club.wageBudgetRemainingEur * 52;
    const newTransfer = Math.round(totalPool * (pct / 100));
    const newWage = Math.round((totalPool - newTransfer) / 52);
    const next: CareerState = {
      ...career,
      clubs: {
        ...career.clubs,
        [club.id]: {
          ...club,
          budgetSplitTransferPct: pct,
          transferBudgetEur: newTransfer,
          wageBudgetRemainingEur: newWage,
        },
      },
    };
    persistActiveCareer(next);
    set({ career: next });
  },

  updateSettings: (patch) => {
    const career = get().career;
    if (!career) return;
    const next = { ...career, settings: { ...career.settings, ...patch } };
    persistActiveCareer(next);
    set({ career: next, toast: 'Career settings saved.' });
  },

  proceedToNextSeason: () => {
    const career = get().career;
    if (!career) return;
    const nextSeason = advanceToNextSeason(career);
    persistActiveCareer(nextSeason);
    set({
      career: nextSeason,
      activeTab: 'Central',
      toast: `Welcome to Season ${nextSeason.seasonNumber}! New LaLiga schedule & randomized regens generated.`,
    });
  },
}));
