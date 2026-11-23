import {
  calculateDynamicOVR,
  calculateInjuryAggravationRisk,
  calculateMatchFitness,
  clamp,
  positionToSector,
} from './ratings.ts';
import {
  Club,
  Fixture,
  InjuryState,
  LiveMatchState,
  MatchEvent,
  Mentality,
  Player,
  TacticalVision,
} from './types.ts';

export interface SectorRatings {
  gk: number;
  def: number;
  mid: number;
  atk: number;
  avgMorale: number;
}

const VISION_MODIFIERS: Record<
  TacticalVision,
  { atk: number; mid: number; def: number; staminaDrainMult: number }
> = {
  Gegenpressing: { atk: 1.5, mid: 2.2, def: -1.2, staminaDrainMult: 1.24 },
  'Tiki-Taka': { atk: 1.0, mid: 2.6, def: -0.4, staminaDrainMult: 1.06 },
  'Wing Play': { atk: 2.0, mid: 0.8, def: -0.9, staminaDrainMult: 1.09 },
  'Counter-Attack': { atk: 1.6, mid: -1.4, def: 2.2, staminaDrainMult: 0.94 },
  'Park the Bus': { atk: -1.6, mid: -1.8, def: 3.1, staminaDrainMult: 0.88 },
  Standard: { atk: 0.3, mid: 0.4, def: 0.3, staminaDrainMult: 1.0 },
};

const MENTALITY_MODIFIERS: Record<
  Mentality,
  { atk: number; def: number; staminaDrainMult: number }
> = {
  'Ultra Defensive': { atk: -2.4, def: 2.8, staminaDrainMult: 0.92 },
  Defensive: { atk: -1.1, def: 1.4, staminaDrainMult: 0.96 },
  Balanced: { atk: 0, def: 0, staminaDrainMult: 1.0 },
  Attacking: { atk: 1.5, def: -1.2, staminaDrainMult: 1.08 },
  'Ultra Attacking': { atk: 2.9, def: -2.6, staminaDrainMult: 1.18 },
};

function getRoleIqBonus(player: Player): number {
  if (player.roleFamiliarity === 'Role++') return 1.5;
  if (player.roleFamiliarity === 'Role+') return 0.75;
  return 0;
}

export function computeSectorRatings(
  club: Club,
  players: Record<number, Player>,
  lineupIds?: number[],
  liveStamina?: Record<number, number>,
  redCardIds: number[] = [],
  visionOverride?: TacticalVision,
  mentalityOverride?: Mentality
): SectorRatings {
  const vision = visionOverride ?? club.tacticalVision;
  const mentality = mentalityOverride ?? club.mentality;
  const vMod = VISION_MODIFIERS[vision];
  const mMod = MENTALITY_MODIFIERS[mentality];

  const activeSlots = club.lineup.map((slot, idx) => {
    const pid = lineupIds ? lineupIds[idx] : slot.playerId;
    return { pos: slot.position, player: pid ? players[pid] : undefined };
  });

  const gkVals: number[] = [];
  const defVals: number[] = [];
  const cdmVals: number[] = [];
  const midVals: number[] = [];
  const atkVals: number[] = [];
  const camWingVals: number[] = [];
  const morales: number[] = [];

  for (const { pos, player } of activeSlots) {
    if (!player || redCardIds.includes(player.id)) continue;
    const stamina = liveStamina ? liveStamina[player.id] ?? player.energy : player.energy;
    const staminaFactor = 0.72 + 0.28 * clamp(stamina, 10, 100) / 100;
    const eff = player.dynamicOvr.dynamicOvr * staminaFactor + getRoleIqBonus(player);
    morales.push(player.morale);

    const sector = positionToSector(pos);
    if (sector === 'GK') gkVals.push(eff);
    else if (sector === 'DEF') defVals.push(eff);
    else if (sector === 'MID') {
      midVals.push(eff);
      if (pos === 'CDM') cdmVals.push(eff);
      if (pos === 'CAM' || pos === 'LM' || pos === 'RM') camWingVals.push(eff);
    } else {
      atkVals.push(eff);
    }
  }

  const mean = (arr: number[], fallback: number) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : fallback;

  const fallbackAll = mean([...defVals, ...midVals, ...atkVals], 70);
  const gk = mean(gkVals, fallbackAll - 5);
  const defPure = mean(defVals, fallbackAll);
  const def = cdmVals.length > 0 ? defPure * 0.78 + mean(cdmVals, defPure) * 0.22 : defPure;
  const mid = mean(midVals, fallbackAll);
  const atkPure = mean(atkVals, fallbackAll);
  const atk = camWingVals.length > 0 ? atkPure * 0.75 + mean(camWingVals, atkPure) * 0.25 : atkPure;

  // Red card structural penalty (-14% per dismissed player)
  const redPenaltyMult = Math.pow(0.86, redCardIds.length);

  return {
    gk: clamp(gk * redPenaltyMult, 35, 99),
    def: clamp((def + vMod.def + mMod.def) * redPenaltyMult, 35, 99),
    mid: clamp((mid + vMod.mid) * redPenaltyMult, 35, 99),
    atk: clamp((atk + vMod.atk + mMod.atk) * redPenaltyMult, 35, 99),
    avgMorale: mean(morales, 68),
  };
}

export function computeExpectedGoals(
  homeSectors: SectorRatings,
  awaySectors: SectorRatings,
  weather: Fixture['weather'] = 'Clear'
): { homeXg: number; awayXg: number; homePossession: number } {
  const homeAdvantage = 1.12;
  const weatherFactor = weather === 'Rain' ? 0.93 : 1.0;

  const homeMoraleMult = 1 + (homeSectors.avgMorale - 65) * 0.0025;
  const awayMoraleMult = 1 + (awaySectors.avgMorale - 65) * 0.0025;

  const midControlHome = 1 / (1 + Math.exp(-(homeSectors.mid - awaySectors.mid) / 7.5));
  const homePossession = clamp(Math.round(32 + midControlHome * 36), 30, 70);

  const awayDefBlend = 0.68 * awaySectors.def + 0.32 * awaySectors.gk;
  const homeDefBlend = 0.68 * homeSectors.def + 0.32 * homeSectors.gk;

  const homeXg = clamp(
    1.38 *
      homeAdvantage *
      weatherFactor *
      homeMoraleMult *
      Math.exp((homeSectors.atk - awayDefBlend) / 13.5) *
      (0.84 + 0.32 * midControlHome),
    0.22,
    4.4
  );

  const awayXg = clamp(
    1.24 *
      weatherFactor *
      awayMoraleMult *
      Math.exp((awaySectors.atk - homeDefBlend) / 13.5) *
      (0.84 + 0.32 * (1 - midControlHome)),
    0.18,
    4.1
  );

  return {
    homeXg: Number(homeXg.toFixed(2)),
    awayXg: Number(awayXg.toFixed(2)),
    homePossession,
  };
}

function poissonPmf(k: number, lambda: number): number {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
}

/**
 * Sample (homeGoals, awayGoals) using Dixon-Coles low-score correlation adjustment (rho = -0.07).
 */
export function sampleDixonColesScore(
  lambdaHome: number,
  lambdaAway: number,
  rng: () => number = Math.random
): [number, number] {
  const rho = -0.07;
  const maxGoals = 7;
  const probs: { h: number; a: number; p: number }[] = [];
  let total = 0;

  for (let h = 0; h <= maxGoals; h++) {
    const ph = poissonPmf(h, lambdaHome);
    for (let a = 0; a <= maxGoals; a++) {
      const pa = poissonPmf(a, lambdaAway);
      let tau = 1;
      if (h === 0 && a === 0) tau = 1 - lambdaHome * lambdaAway * rho;
      else if (h === 0 && a === 1) tau = 1 + lambdaHome * rho;
      else if (h === 1 && a === 0) tau = 1 + lambdaAway * rho;
      else if (h === 1 && a === 1) tau = 1 - rho;
      const p = Math.max(0, ph * pa * tau);
      probs.push({ h, a, p });
      total += p;
    }
  }

  let r = rng() * total;
  for (const item of probs) {
    r -= item.p;
    if (r <= 0) return [item.h, item.a];
  }
  return [1, 1];
}

function pickWeightedPlayer(
  lineup: Player[],
  weightFn: (p: Player) => number,
  rng: () => number,
  excludeId?: number
): Player | null {
  const eligible = lineup.filter((p) => p.id !== excludeId);
  if (eligible.length === 0) return null;
  const weights = eligible.map((p) => Math.max(0.1, weightFn(p)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) return eligible[i];
  }
  return eligible[0];
}

function pickGoalScorer(lineup: Player[], rng: () => number): Player | null {
  return pickWeightedPlayer(
    lineup,
    (p) => {
      const sector = positionToSector(p.primaryPosition);
      const posWeight = sector === 'ATK' ? 5.2 : sector === 'MID' ? 2.1 : sector === 'DEF' ? 0.45 : 0.01;
      return posWeight * (0.4 + p.attributes.finishing / 100 + p.attributes.positioning / 150);
    },
    rng
  );
}

function pickAssister(lineup: Player[], scorerId: number, rng: () => number): Player | null {
  return pickWeightedPlayer(
    lineup,
    (p) => {
      const sector = positionToSector(p.primaryPosition);
      const posWeight = sector === 'MID' ? 3.8 : sector === 'ATK' ? 2.8 : sector === 'DEF' ? 1.1 : 0.05;
      return posWeight * (0.4 + p.attributes.vision / 100 + p.attributes.crossing / 140);
    },
    rng,
    scorerId
  );
}

const INJURY_CATALOG: Array<{ type: string; severity: InjuryState['severity']; minDays: number; maxDays: number }> = [
  { type: 'Ankle Knock', severity: 'Minor', minDays: 5, maxDays: 10 },
  { type: 'Hamstring Strain', severity: 'Moderate', minDays: 14, maxDays: 26 },
  { type: 'Calf Muscle Pull', severity: 'Minor', minDays: 7, maxDays: 13 },
  { type: 'Groin Tear', severity: 'Moderate', minDays: 18, maxDays: 32 },
  { type: 'Knee Ligament Sprain', severity: 'Severe', minDays: 38, maxDays: 65 },
];

function createInjury(rng: () => number, aggravated = false): InjuryState {
  const pool = aggravated ? INJURY_CATALOG.filter((i) => i.severity !== 'Minor') : INJURY_CATALOG;
  const picked = pool[Math.floor(rng() * pool.length)];
  const days = picked.minDays + Math.floor(rng() * (picked.maxDays - picked.minDays + 1));
  return {
    type: aggravated ? `${picked.type} (Aggravated)` : picked.type,
    severity: picked.severity,
    daysRemaining: days,
    recovering: false,
    aggravationRiskPct: 0,
  };
}

export interface MatchCompletionOutput {
  fixture: Fixture;
  playerUpdates: Record<number, Partial<Player>>;
  newInjuries: Array<{ playerId: number; playerName: string; clubId: number; injury: InjuryState; aggravated: boolean }>;
}

/**
 * Quick Sim: Dixon-Coles Poisson simulation with full sector strength, risky recovering-injury checks,
 * stamina drain, goals/assists, cards, and post-match ratings.
 */
export function simulateQuickMatch(
  fixture: Fixture,
  homeClub: Club,
  awayClub: Club,
  players: Record<number, Player>,
  clubMatchesPlayedHome: number,
  clubMatchesPlayedAway: number,
  rng: () => number = Math.random
): MatchCompletionOutput {
  const homeSectors = computeSectorRatings(homeClub, players);
  const awaySectors = computeSectorRatings(awayClub, players);
  const { homeXg, awayXg, homePossession } = computeExpectedGoals(homeSectors, awaySectors, fixture.weather);

  const [homeGoals, awayGoals] = sampleDixonColesScore(homeXg, awayXg, rng);

  const homeStarters = homeClub.lineup
    .map((s) => (s.playerId ? players[s.playerId] : null))
    .filter(Boolean) as Player[];
  const awayStarters = awayClub.lineup
    .map((s) => (s.playerId ? players[s.playerId] : null))
    .filter(Boolean) as Player[];

  const events: MatchEvent[] = [];
  const goalsByPlayer = new Map<number, number>();
  const assistsByPlayer = new Map<number, number>();
  const yellowsByPlayer = new Map<number, number>();
  const redsByPlayer = new Map<number, number>();
  const newInjuries: MatchCompletionOutput['newInjuries'] = [];

  const generateTeamGoals = (count: number, clubId: number, starters: Player[]) => {
    for (let g = 0; g < count; g++) {
      const minute = clamp(Math.round(3 + rng() * 88), 1, 90);
      const scorer = pickGoalScorer(starters, rng);
      if (!scorer) continue;
      goalsByPlayer.set(scorer.id, (goalsByPlayer.get(scorer.id) ?? 0) + 1);
      const assister = rng() < 0.78 ? pickAssister(starters, scorer.id, rng) : null;
      if (assister) {
        assistsByPlayer.set(assister.id, (assistsByPlayer.get(assister.id) ?? 0) + 1);
      }
      events.push({
        minute,
        type: 'GOAL',
        clubId,
        playerId: scorer.id,
        playerName: scorer.knownAs,
        assistPlayerId: assister?.id,
        assistPlayerName: assister?.knownAs,
        description: assister
          ? `${scorer.knownAs} finishes clinically after a sharp pass from ${assister.knownAs}.`
          : `${scorer.knownAs} fires home from the edge of the box.`,
      });
    }
  };

  generateTeamGoals(homeGoals, homeClub.id, homeStarters);
  generateTeamGoals(awayGoals, awayClub.id, awayStarters);

  // Cards & Risky Recovering Injury Aggravation + random match injuries
  const processDisciplineAndFitness = (club: Club, starters: Player[]) => {
    for (const p of starters) {
      // Risky recovering injury aggravation check
      if (p.injury?.recovering) {
        const riskPct = calculateInjuryAggravationRisk(p.energy, p.injury);
        if (rng() * 100 < riskPct) {
          const agg = createInjury(rng, true);
          newInjuries.push({ playerId: p.id, playerName: p.knownAs, clubId: club.id, injury: agg, aggravated: true });
          events.push({
            minute: clamp(Math.round(18 + rng() * 62), 10, 85),
            type: 'AGGRAVATION',
            clubId: club.id,
            playerId: p.id,
            playerName: p.knownAs,
            description: `${p.knownAs} aggravated his recovering injury (${agg.type}, ${agg.daysRemaining}d out)!`,
          });
        }
      } else if (!p.injury && rng() < (p.energy < 65 ? 0.022 : 0.008)) {
        const inj = createInjury(rng, false);
        newInjuries.push({ playerId: p.id, playerName: p.knownAs, clubId: club.id, injury: inj, aggravated: false });
        events.push({
          minute: clamp(Math.round(12 + rng() * 72), 8, 86),
          type: 'INJURY',
          clubId: club.id,
          playerId: p.id,
          playerName: p.knownAs,
          description: `${p.knownAs} forced off with ${inj.type} (${inj.daysRemaining} days).`,
        });
      }

      // Yellow cards
      const yellowProb = (p.attributes.aggression / 100) * 0.16;
      if (rng() < yellowProb) {
        yellowsByPlayer.set(p.id, 1);
        events.push({
          minute: clamp(Math.round(10 + rng() * 78), 5, 89),
          type: 'YELLOW',
          clubId: club.id,
          playerId: p.id,
          playerName: p.knownAs,
          description: `${p.knownAs} booked for a late challenge.`,
        });
      }
    }
  };

  processDisciplineAndFitness(homeClub, homeStarters);
  processDisciplineAndFitness(awayClub, awayStarters);
  events.sort((a, b) => a.minute - b.minute);

  const homeShots = Math.max(homeGoals + 2, Math.round(homeXg * 7.2 + rng() * 4));
  const awayShots = Math.max(awayGoals + 2, Math.round(awayXg * 7.2 + rng() * 4));

  const updatedFixture: Fixture = {
    ...fixture,
    played: true,
    homeGoals,
    awayGoals,
    homeXg,
    awayXg,
    homePossession,
    homeShots,
    awayShots,
    events,
  };

  const playerUpdates = computePostMatchPlayerUpdates(
    homeClub,
    awayClub,
    homeStarters,
    awayStarters,
    homeGoals,
    awayGoals,
    goalsByPlayer,
    assistsByPlayer,
    yellowsByPlayer,
    redsByPlayer,
    newInjuries,
    clubMatchesPlayedHome + 1,
    clubMatchesPlayedAway + 1,
    rng
  );

  return { fixture: updatedFixture, playerUpdates, newInjuries };
}

function computePostMatchPlayerUpdates(
  homeClub: Club,
  awayClub: Club,
  homePlayed: Player[],
  awayPlayed: Player[],
  homeGoals: number,
  awayGoals: number,
  goalsByPlayer: Map<number, number>,
  assistsByPlayer: Map<number, number>,
  yellowsByPlayer: Map<number, number>,
  redsByPlayer: Map<number, number>,
  newInjuries: MatchCompletionOutput['newInjuries'],
  homeMatchesAfter: number,
  awayMatchesAfter: number,
  rng: () => number,
  overrideStamina?: Record<number, number>,
  overrideRatings?: Record<number, number>,
  minutesMap?: Record<number, number>
): Record<number, Partial<Player>> {
  const updates: Record<number, Partial<Player>> = {};
  const injuryByPlayer = new Map<number, InjuryState>();
  newInjuries.forEach((ni) => injuryByPlayer.set(ni.playerId, ni.injury));

  const applyTeam = (
    club: Club,
    squad: Player[],
    gf: number,
    ga: number,
    matchesAfter: number
  ) => {
    const won = gf > ga;
    const drew = gf === ga;
    const vDrain = VISION_MODIFIERS[club.tacticalVision].staminaDrainMult;

    for (const p of squad) {
      const mins = minutesMap ? minutesMap[p.id] ?? 90 : 90;
      const g = goalsByPlayer.get(p.id) ?? 0;
      const a = assistsByPlayer.get(p.id) ?? 0;
      const y = yellowsByPlayer.get(p.id) ?? 0;
      const r = redsByPlayer.get(p.id) ?? 0;
      const cleanSheet = ga === 0 && (p.primaryPosition === 'GK' || positionToSector(p.primaryPosition) === 'DEF') ? 1 : 0;

      const rating =
        overrideRatings?.[p.id] ??
        clamp(
          Number(
            (
              6.3 +
              (won ? 0.55 : drew ? 0.1 : -0.45) +
              g * 0.95 +
              a * 0.6 +
              cleanSheet * 0.5 -
              y * 0.25 -
              r * 1.4 +
              (rng() * 0.7 - 0.35)
            ).toFixed(1)
          ),
          4.2,
          9.8
        );

      const prevRatings = [...p.seasonStats.matchRatings, rating].slice(-5);
      const rollingForm = Number(
        (prevRatings.reduce((acc, v) => acc + v, 0) / prevRatings.length).toFixed(2)
      );

      // Energy drain based on stamina attribute, minutes played & tactical vision
      const staminaResist = 1 - (p.attributes.stamina - 50) * 0.0055;
      const drain = Math.round((mins / 90) * 19 * staminaResist * vDrain);
      const newEnergy =
        overrideStamina?.[p.id] !== undefined
          ? clamp(Math.round(overrideStamina[p.id]), 18, 100)
          : clamp(p.energy - drain, 20, 100);
      const newSharpness = clamp(p.sharpness + (mins >= 45 ? 5 : 2), 35, 100);
      const newMorale = clamp(
        p.morale + (won ? 4 : drew ? 1 : -4) + (rating >= 7.8 ? 3 : rating < 5.7 ? -3 : 0),
        18,
        96
      );

      const finalInjury = injuryByPlayer.get(p.id) ?? p.injury;
      const newMatchFitness = calculateMatchFitness(newEnergy, newSharpness, finalInjury);
      const newStats = {
        appearances: p.seasonStats.appearances + 1,
        starts: p.seasonStats.starts + (mins >= 45 ? 1 : 0),
        minutes: p.seasonStats.minutes + mins,
        goals: p.seasonStats.goals + g,
        assists: p.seasonStats.assists + a,
        cleanSheets: p.seasonStats.cleanSheets + cleanSheet,
        yellowCards: p.seasonStats.yellowCards + y,
        redCards: p.seasonStats.redCards + r,
        matchRatings: prevRatings,
        avgRating: rollingForm,
      };

      const draft: Player = {
        ...p,
        energy: newEnergy,
        sharpness: newSharpness,
        matchFitness: newMatchFitness,
        morale: newMorale,
        formScore: rollingForm,
        injury: finalInjury,
        seasonStats: newStats,
      };
      draft.dynamicOvr = calculateDynamicOVR(draft, p.dynamicOvr.deployedPosition, matchesAfter);

      updates[p.id] = {
        energy: newEnergy,
        sharpness: newSharpness,
        matchFitness: newMatchFitness,
        morale: newMorale,
        formScore: rollingForm,
        injury: finalInjury,
        seasonStats: newStats,
        dynamicOvr: draft.dynamicOvr,
      };
    }
  };

  applyTeam(homeClub, homePlayed, homeGoals, awayGoals, homeMatchesAfter);
  applyTeam(awayClub, awayPlayed, awayGoals, homeGoals, awayMatchesAfter);

  return updates;
}

// ============================================================================
// LIVE TACTICAL MATCH ENGINE (Minute-by-Minute Interactive 2D Simulation)
// ============================================================================

export function createLiveMatch(
  fixture: Fixture,
  homeClub: Club,
  awayClub: Club,
  players: Record<number, Player>
): LiveMatchState {
  const homeLineupIds = homeClub.lineup.map((s) => s.playerId ?? 0).filter(Boolean);
  const awayLineupIds = awayClub.lineup.map((s) => s.playerId ?? 0).filter(Boolean);
  const homeStamina: Record<number, number> = {};
  const awayStamina: Record<number, number> = {};
  const playerRatings: Record<number, number> = {};

  for (const id of [...homeLineupIds, ...homeClub.benchIds]) {
    if (players[id]) {
      homeStamina[id] = players[id].energy;
      playerRatings[id] = 6.5;
    }
  }
  for (const id of [...awayLineupIds, ...awayClub.benchIds]) {
    if (players[id]) {
      awayStamina[id] = players[id].energy;
      playerRatings[id] = 6.5;
    }
  }

  const hSec = computeSectorRatings(homeClub, players, homeLineupIds, homeStamina);
  const aSec = computeSectorRatings(awayClub, players, awayLineupIds, awayStamina);

  return {
    fixtureId: fixture.id,
    minute: 0,
    isHalfTime: false,
    isFinished: false,
    homeClubId: homeClub.id,
    awayClubId: awayClub.id,
    homeGoals: 0,
    awayGoals: 0,
    homeXg: 0,
    awayXg: 0,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homePossession: 50,
    momentum: 0,
    homeStamina,
    awayStamina,
    homeLineupIds,
    awayLineupIds,
    homeBenchIds: [...homeClub.benchIds],
    awayBenchIds: [...awayClub.benchIds],
    homeSubsUsed: 0,
    awaySubsUsed: 0,
    homeRedCards: [],
    awayRedCards: [],
    homeMentality: homeClub.mentality,
    awayMentality: awayClub.mentality,
    homeVision: homeClub.tacticalVision,
    awayVision: awayClub.tacticalVision,
    playerRatings,
    events: [
      {
        minute: 0,
        type: 'CHANCE',
        clubId: homeClub.id,
        playerId: homeLineupIds[0] ?? 0,
        playerName: homeClub.shortName,
        description: `Kick-off! ${homeClub.name} host ${awayClub.name} under ${fixture.weather.toLowerCase()} skies.`,
      },
    ],
    aggravatedPlayerIds: [],
    newInjuries: {},
    homeSectors: { gk: Math.round(hSec.gk), def: Math.round(hSec.def), mid: Math.round(hSec.mid), atk: Math.round(hSec.atk) },
    awaySectors: { gk: Math.round(aSec.gk), def: Math.round(aSec.def), mid: Math.round(aSec.mid), atk: Math.round(aSec.atk) },
    weather: fixture.weather,
  };
}

export function stepLiveMatchMinute(
  live: LiveMatchState,
  homeClub: Club,
  awayClub: Club,
  players: Record<number, Player>,
  rng: () => number = Math.random
): LiveMatchState {
  if (live.isFinished) return live;

  const nextMin = live.minute + 1;
  const homeStamina = { ...live.homeStamina };
  const awayStamina = { ...live.awayStamina };
  const playerRatings = { ...live.playerRatings };
  const events = [...live.events];
  const homeRedCards = [...live.homeRedCards];
  const awayRedCards = [...live.awayRedCards];
  const aggravatedPlayerIds = [...live.aggravatedPlayerIds];
  const newInjuries = { ...live.newInjuries };

  const hDrainMult =
    VISION_MODIFIERS[live.homeVision].staminaDrainMult *
    MENTALITY_MODIFIERS[live.homeMentality].staminaDrainMult;
  const aDrainMult =
    VISION_MODIFIERS[live.awayVision].staminaDrainMult *
    MENTALITY_MODIFIERS[live.awayMentality].staminaDrainMult;

  // Drain stamina per minute on active pitch players
  for (const id of live.homeLineupIds) {
    if (homeRedCards.includes(id)) continue;
    const p = players[id];
    if (!p) continue;
    const resist = 1 - (p.attributes.stamina - 50) * 0.0055;
    homeStamina[id] = clamp((homeStamina[id] ?? p.energy) - 0.24 * resist * hDrainMult, 12, 100);
  }
  for (const id of live.awayLineupIds) {
    if (awayRedCards.includes(id)) continue;
    const p = players[id];
    if (!p) continue;
    const resist = 1 - (p.attributes.stamina - 50) * 0.0055;
    awayStamina[id] = clamp((awayStamina[id] ?? p.energy) - 0.24 * resist * aDrainMult, 12, 100);
  }

  const hSec = computeSectorRatings(
    homeClub,
    players,
    live.homeLineupIds,
    homeStamina,
    homeRedCards,
    live.homeVision,
    live.homeMentality
  );
  const aSec = computeSectorRatings(
    awayClub,
    players,
    live.awayLineupIds,
    awayStamina,
    awayRedCards,
    live.awayVision,
    live.awayMentality
  );

  const { homeXg: fullHomeXg, awayXg: fullAwayXg, homePossession } = computeExpectedGoals(
    hSec,
    aSec,
    live.weather
  );

  const homeActive = live.homeLineupIds
    .filter((id) => !homeRedCards.includes(id))
    .map((id) => players[id])
    .filter(Boolean);
  const awayActive = live.awayLineupIds
    .filter((id) => !awayRedCards.includes(id))
    .map((id) => players[id])
    .filter(Boolean);

  let homeGoals = live.homeGoals;
  let awayGoals = live.awayGoals;
  let homeXg = live.homeXg;
  let awayXg = live.awayXg;
  let homeShots = live.homeShots;
  let awayShots = live.awayShots;
  let homeShotsOnTarget = live.homeShotsOnTarget;
  let awayShotsOnTarget = live.awayShotsOnTarget;
  let momentum = clamp(
    Math.round(live.momentum * 0.85 + (homePossession - 50) * 0.9 + (rng() * 14 - 7)),
    -100,
    100
  );

  // Evaluate attacking chances per minute
  const evalAttack = (isHome: boolean) => {
    const perMinLambda = (isHome ? fullHomeXg : fullAwayXg) / 90;
    const shotProb = clamp(perMinLambda * 6.8, 0.015, 0.28);
    if (rng() >= shotProb) return;

    const squad = isHome ? homeActive : awayActive;
    const oppSquad = isHome ? awayActive : homeActive;
    const clubId = isHome ? homeClub.id : awayClub.id;
    const shooter = pickGoalScorer(squad, rng);
    if (!shooter) return;

    const shotXg = clamp(0.06 + rng() * 0.24, 0.05, 0.42);
    if (isHome) {
      homeShots++;
      homeXg = Number((homeXg + shotXg).toFixed(2));
    } else {
      awayShots++;
      awayXg = Number((awayXg + shotXg).toFixed(2));
    }

    const goalProb = clamp(perMinLambda / shotProb, 0.06, 0.34);
    if (rng() < goalProb) {
      const assister = rng() < 0.76 ? pickAssister(squad, shooter.id, rng) : null;
      if (isHome) {
        homeGoals++;
        homeShotsOnTarget++;
        momentum = clamp(momentum + 32, -100, 100);
      } else {
        awayGoals++;
        awayShotsOnTarget++;
        momentum = clamp(momentum - 32, -100, 100);
      }
      playerRatings[shooter.id] = clamp((playerRatings[shooter.id] ?? 6.5) + 0.95, 4.5, 9.9);
      if (assister) {
        playerRatings[assister.id] = clamp((playerRatings[assister.id] ?? 6.5) + 0.55, 4.5, 9.9);
      }
      events.push({
        minute: nextMin,
        type: 'GOAL',
        clubId,
        playerId: shooter.id,
        playerName: shooter.knownAs,
        assistPlayerId: assister?.id,
        assistPlayerName: assister?.knownAs,
        description: assister
          ? `GOAL! ${shooter.knownAs} scores off a slick pass by ${assister.knownAs}!`
          : `GOAL! ${shooter.knownAs} unleashes a clinical strike into the corner!`,
      });
    } else if (rng() < 0.46) {
      if (isHome) homeShotsOnTarget++;
      else awayShotsOnTarget++;
      const oppGk = oppSquad.find((p) => p.primaryPosition === 'GK') ?? oppSquad[0];
      if (oppGk) {
        playerRatings[oppGk.id] = clamp((playerRatings[oppGk.id] ?? 6.5) + 0.25, 4.5, 9.8);
      }
      if (rng() < 0.45) {
        events.push({
          minute: nextMin,
          type: 'SAVE',
          clubId,
          playerId: shooter.id,
          playerName: shooter.knownAs,
          description: `Big save by ${oppGk?.knownAs ?? 'the keeper'} to deny ${shooter.knownAs}!`,
        });
      }
    }
  };

  evalAttack(true);
  evalAttack(false);

  // Per-minute risky recovering-injury aggravation check
  const checkRiskyInjuries = (active: Player[], clubId: number, staminaMap: Record<number, number>) => {
    for (const p of active) {
      if (p.injury?.recovering && !aggravatedPlayerIds.includes(p.id)) {
        const matchRisk = calculateInjuryAggravationRisk(staminaMap[p.id] ?? p.energy, p.injury) / 100;
        const perMinRisk = 1 - Math.pow(1 - matchRisk, 1 / 90);
        if (rng() < perMinRisk) {
          const agg = createInjury(rng, true);
          aggravatedPlayerIds.push(p.id);
          newInjuries[p.id] = agg;
          staminaMap[p.id] = Math.min(staminaMap[p.id] ?? 40, 22);
          events.push({
            minute: nextMin,
            type: 'AGGRAVATION',
            clubId,
            playerId: p.id,
            playerName: p.knownAs,
            description: `INJURY AGGRAVATED: ${p.knownAs} pulls up clutching his leg (${agg.type}, ${agg.daysRemaining}d out). Sub him off!`,
          });
        }
      }
    }
  };
  checkRiskyInjuries(homeActive, homeClub.id, homeStamina);
  checkRiskyInjuries(awayActive, awayClub.id, awayStamina);

  // Occasional card events
  if (rng() < 0.032) {
    const isHome = rng() < 0.5;
    const squad = isHome ? homeActive : awayActive;
    const offender = pickWeightedPlayer(squad, (p) => p.attributes.aggression, rng);
    if (offender) {
      const clubId = isHome ? homeClub.id : awayClub.id;
      const alreadyYellow = events.some((e) => e.type === 'YELLOW' && e.playerId === offender.id);
      if (alreadyYellow && rng() < 0.35) {
        if (isHome) homeRedCards.push(offender.id);
        else awayRedCards.push(offender.id);
        playerRatings[offender.id] = clamp((playerRatings[offender.id] ?? 6.5) - 1.5, 4.0, 9.5);
        events.push({
          minute: nextMin,
          type: 'RED',
          clubId,
          playerId: offender.id,
          playerName: offender.knownAs,
          description: `RED CARD! ${offender.knownAs} receives his second booking and is sent off!`,
        });
      } else if (!alreadyYellow) {
        playerRatings[offender.id] = clamp((playerRatings[offender.id] ?? 6.5) - 0.25, 4.5, 9.5);
        events.push({
          minute: nextMin,
          type: 'YELLOW',
          clubId,
          playerId: offender.id,
          playerName: offender.knownAs,
          description: `Yellow card for ${offender.knownAs} after a tactical foul.`,
        });
      }
    }
  }

  // AI auto-substitutions around minutes 60, 72, 82 for the non-user side (handled safely if tired)
  const isHalfTime = nextMin === 45;
  const isFinished = nextMin >= 90;

  if (isHalfTime) {
    events.push({
      minute: 45,
      type: 'CHANCE',
      clubId: homeClub.id,
      playerId: 0,
      playerName: 'HT',
      description: `Half-time whistle: ${homeClub.shortName} ${homeGoals} - ${awayGoals} ${awayClub.shortName}.`,
    });
  }
  if (isFinished) {
    events.push({
      minute: 90,
      type: 'CHANCE',
      clubId: homeClub.id,
      playerId: 0,
      playerName: 'FT',
      description: `Full-time! ${homeClub.name} ${homeGoals} - ${awayGoals} ${awayClub.name}.`,
    });
  }

  return {
    ...live,
    minute: nextMin,
    isHalfTime,
    isFinished,
    homeGoals,
    awayGoals,
    homeXg,
    awayXg,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homePossession,
    momentum,
    homeStamina,
    awayStamina,
    homeRedCards,
    awayRedCards,
    playerRatings,
    events,
    aggravatedPlayerIds,
    newInjuries,
    homeSectors: {
      gk: Math.round(hSec.gk),
      def: Math.round(hSec.def),
      mid: Math.round(hSec.mid),
      atk: Math.round(hSec.atk),
    },
    awaySectors: {
      gk: Math.round(aSec.gk),
      def: Math.round(aSec.def),
      mid: Math.round(aSec.mid),
      atk: Math.round(aSec.atk),
    },
  };
}

export function applyLiveSub(
  live: LiveMatchState,
  isHome: boolean,
  outPlayerId: number,
  inPlayerId: number,
  players: Record<number, Player>
): LiveMatchState {
  const subsUsed = isHome ? live.homeSubsUsed : live.awaySubsUsed;
  if (subsUsed >= 5) return live;

  const lineupIds = isHome ? [...live.homeLineupIds] : [...live.awayLineupIds];
  const benchIds = isHome ? [...live.homeBenchIds] : [...live.awayBenchIds];
  const outIdx = lineupIds.indexOf(outPlayerId);
  const inIdx = benchIds.indexOf(inPlayerId);
  if (outIdx === -1 || inIdx === -1) return live;

  lineupIds[outIdx] = inPlayerId;
  benchIds.splice(inIdx, 1);

  const outPlayer = players[outPlayerId];
  const inPlayer = players[inPlayerId];
  const events = [
    ...live.events,
    {
      minute: live.minute,
      type: 'SUB' as const,
      clubId: isHome ? live.homeClubId : live.awayClubId,
      playerId: inPlayerId,
      playerName: inPlayer?.knownAs ?? 'Sub',
      description: `Substitution: ${inPlayer?.knownAs ?? 'Fresh legs'} replaces ${outPlayer?.knownAs ?? 'starter'}.`,
    },
  ];

  return isHome
    ? { ...live, homeLineupIds: lineupIds, homeBenchIds: benchIds, homeSubsUsed: subsUsed + 1, events }
    : { ...live, awayLineupIds: lineupIds, awayBenchIds: benchIds, awaySubsUsed: subsUsed + 1, events };
}

export function finalizeLiveMatch(
  live: LiveMatchState,
  fixture: Fixture,
  homeClub: Club,
  awayClub: Club,
  players: Record<number, Player>,
  homeMatchesBefore: number,
  awayMatchesBefore: number
): MatchCompletionOutput {
  const goalsByPlayer = new Map<number, number>();
  const assistsByPlayer = new Map<number, number>();
  const yellowsByPlayer = new Map<number, number>();
  const redsByPlayer = new Map<number, number>();

  for (const ev of live.events) {
    if (ev.type === 'GOAL') {
      goalsByPlayer.set(ev.playerId, (goalsByPlayer.get(ev.playerId) ?? 0) + 1);
      if (ev.assistPlayerId) {
        assistsByPlayer.set(ev.assistPlayerId, (assistsByPlayer.get(ev.assistPlayerId) ?? 0) + 1);
      }
    } else if (ev.type === 'YELLOW') {
      yellowsByPlayer.set(ev.playerId, (yellowsByPlayer.get(ev.playerId) ?? 0) + 1);
    } else if (ev.type === 'RED') {
      redsByPlayer.set(ev.playerId, 1);
    }
  }

  const playedHomeIds = new Set<number>([
    ...homeClub.lineup.map((s) => s.playerId ?? 0).filter(Boolean),
    ...live.homeLineupIds,
  ]);
  const playedAwayIds = new Set<number>([
    ...awayClub.lineup.map((s) => s.playerId ?? 0).filter(Boolean),
    ...live.awayLineupIds,
  ]);

  const homePlayed = Array.from(playedHomeIds).map((id) => players[id]).filter(Boolean);
  const awayPlayed = Array.from(playedAwayIds).map((id) => players[id]).filter(Boolean);

  const newInjuries: MatchCompletionOutput['newInjuries'] = Object.entries(live.newInjuries).map(
    ([pidStr, inj]) => {
      const pid = Number(pidStr);
      const p = players[pid];
      return {
        playerId: pid,
        playerName: p?.knownAs ?? 'Player',
        clubId: p?.clubId ?? homeClub.id,
        injury: inj,
        aggravated: live.aggravatedPlayerIds.includes(pid),
      };
    }
  );

  const combinedStamina = { ...live.homeStamina, ...live.awayStamina };

  const playerUpdates = computePostMatchPlayerUpdates(
    homeClub,
    awayClub,
    homePlayed,
    awayPlayed,
    live.homeGoals,
    live.awayGoals,
    goalsByPlayer,
    assistsByPlayer,
    yellowsByPlayer,
    redsByPlayer,
    newInjuries,
    homeMatchesBefore + 1,
    awayMatchesBefore + 1,
    Math.random,
    combinedStamina,
    live.playerRatings
  );

  const updatedFixture: Fixture = {
    ...fixture,
    played: true,
    homeGoals: live.homeGoals,
    awayGoals: live.awayGoals,
    homeXg: live.homeXg,
    awayXg: live.awayXg,
    homePossession: live.homePossession,
    homeShots: live.homeShots,
    awayShots: live.awayShots,
    events: live.events,
  };

  return { fixture: updatedFixture, playerUpdates, newInjuries };
}
