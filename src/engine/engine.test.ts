import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parseCareerDatabaseFromCsv } from './csvParser.ts';
import { applyWeeklyPlayerGrowth, GROWTH_PROFILES } from './growth.ts';
import {
  applyLiveSub,
  computeExpectedGoals,
  computeSectorRatings,
  createLiveMatch,
  simulateQuickMatch,
  stepLiveMatchMinute,
} from './matchSim.ts';
import {
  calculateDynamicOVR,
  calculateInjuryAggravationRisk,
  calculateTransferRoomXTV,
} from './ratings.ts';
import {
  advanceSingleDay,
  advanceToNextSeason,
  createInitialCareerState,
  generateLaLigaSchedule,
} from './season.ts';
import {
  completeTransferInState,
  evaluateClubOffer,
  evaluateContractOffer,
  initiateNegotiation,
} from './transfers.ts';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const csvPath = path.resolve(process.cwd(), 'public/assets/aistudio/combined_f33bd40d.csv');
const csvText = fs.readFileSync(csvPath, 'utf8');
const parsedDb = parseCareerDatabaseFromCsv(csvText);

describe('EA FC 27 Manager Career Simulation Engine', () => {
  it('loads all 550 real players and 20 LaLiga clubs from combined.csv', () => {
    const playerCount = Object.keys(parsedDb.players).length;
    assert.equal(playerCount, 550, 'Expected exactly 550 players from CSV');
    assert.equal(parsedDb.laLigaClubIds.length, 20, 'Expected exactly 20 LaLiga EA Sports clubs');

    // Verify Real Madrid (243) and FC Barcelona (241) loaded with full 11-player lineups
    const rma = parsedDb.clubs[243];
    const bar = parsedDb.clubs[241];
    assert.ok(rma && rma.name === 'Real Madrid');
    assert.ok(bar && bar.name === 'FC Barcelona');
    assert.equal(rma.lineup.length, 11);
    assert.equal(bar.lineup.length, 11);
    assert.equal(rma.coaches.length, 12);
  });

  it('computes Dynamic OVR with Form, Morale Sweet Spot, Playtime, Match Fitness, and Risky Injuries', () => {
    const sample = Object.values(parsedDb.players).find((p) => p.clubId === 243 && p.baseOvr >= 85)!;
    assert.ok(sample);

    // Peak state: Great form + Sweet Spot morale (76) + Sharp fitness -> positive Dynamic OVR boost
    const peak = calculateDynamicOVR(
      {
        ...sample,
        formScore: 8.4,
        morale: 76,
        energy: 94,
        sharpness: 90,
        injury: null,
      },
      sample.primaryPosition,
      10
    );
    assert.equal(peak.formDelta, 3);
    assert.equal(peak.moraleDelta, 2);
    assert.equal(peak.fitnessDelta, 0);
    assert.ok(peak.dynamicOvr > sample.baseOvr, 'Peak Dynamic OVR should exceed Base OVR');

    // Complacency check: morale >= 85 drops from +2 Sweet Spot to +1
    const complacent = calculateDynamicOVR({ ...sample, morale: 92, formScore: 6.5, energy: 95, sharpness: 90, injury: null }, sample.primaryPosition, 0);
    assert.equal(complacent.moraleLabel, 'Complacent');
    assert.equal(complacent.moraleDelta, 1);

    // Recovering Injury penalty & aggravation risk %
    const recoveringInjury = {
      type: 'Hamstring Tightness',
      severity: 'Moderate' as const,
      daysRemaining: 4,
      recovering: true,
      aggravationRiskPct: 0,
    };
    const riskPct = calculateInjuryAggravationRisk(60, recoveringInjury);
    assert.ok(riskPct >= 40 && riskPct <= 78, `Expected significant aggravation risk %, got ${riskPct}`);

    const injuredDyn = calculateDynamicOVR(
      { ...sample, energy: 55, sharpness: 50, formScore: 5.4, morale: 40, injury: recoveringInjury },
      sample.primaryPosition,
      0
    );
    assert.ok(injuredDyn.injuryDelta < 0);
    assert.ok(injuredDyn.fitnessDelta < 0);
    assert.ok(injuredDyn.dynamicOvr < sample.baseOvr);
  });

  it('implements all 6 Growth Profiles and penalizes young players starved of minutes', () => {
    assert.equal(Object.keys(GROWTH_PROFILES).length, 6);
    const rng = mulberry32(42);
    const young = Object.values(parsedDb.players).find((p) => p.age <= 20 && p.potential - p.baseOvr >= 6)!;
    assert.ok(young);

    const club = parsedDb.clubs[young.clubId];

    // Starved of minutes & poor form -> loses development momentum
    const starved = {
      ...young,
      growthProfile: 'MeteoricPeak' as const,
      formScore: 5.5,
      seasonStats: { ...young.seasonStats, minutes: 0 },
      developmentPlan: { ...young.developmentPlan, momentum: 70 },
    };
    const resStarved = applyWeeklyPlayerGrowth(starved, club, 10, rng);
    assert.ok(
      resStarved.player.developmentPlan.momentum < 70,
      'Young player starved of minutes should lose development momentum'
    );

    // Regular starter & strong form -> gains development momentum & XP
    const thriving = {
      ...young,
      growthProfile: 'ExplosiveStart' as const,
      formScore: 7.8,
      seasonStats: { ...young.seasonStats, minutes: 850 },
      developmentPlan: { ...young.developmentPlan, momentum: 70 },
    };
    const resThriving = applyWeeklyPlayerGrowth(thriving, club, 10, rng);
    assert.ok(resThriving.player.developmentPlan.momentum > 70);
    assert.ok(resThriving.player.xpProgress !== thriving.xpProgress || resThriving.ovrChanged > 0);
  });

  it('drives Match Sim via Sector Strengths (stronger team produces higher xG) and runs Live Tactical Sim', () => {
    const rma = parsedDb.clubs[243];
    const mal = parsedDb.clubs[573];
    const rmaSectors = computeSectorRatings(rma, parsedDb.players);
    const malSectors = computeSectorRatings(mal, parsedDb.players);

    assert.ok(rmaSectors.atk > malSectors.atk, 'Real Madrid attack sector should exceed Malaga');
    const xg = computeExpectedGoals(rmaSectors, malSectors, 'Clear');
    assert.ok(xg.homeXg > xg.awayXg + 0.6, `Expected clear xG advantage for Real Madrid, got ${xg.homeXg} vs ${xg.awayXg}`);

    // Quick Sim test
    const fix = {
      id: 'test-fix',
      round: 1,
      date: '2026-08-16',
      homeClubId: 243,
      awayClubId: 573,
      played: false,
      homeGoals: 0,
      awayGoals: 0,
      homeXg: 0,
      awayXg: 0,
      homePossession: 50,
      homeShots: 0,
      awayShots: 0,
      events: [],
      weather: 'Clear' as const,
    };
    const quick = simulateQuickMatch(fix, rma, mal, parsedDb.players, 0, 0, mulberry32(99));
    assert.equal(quick.fixture.played, true);
    assert.ok(Object.keys(quick.playerUpdates).length >= 22);

    // Live Tactical Sim test: 90 minutes + live substitution
    let live = createLiveMatch(fix, rma, mal, parsedDb.players);
    const rng = mulberry32(101);
    for (let m = 0; m < 60; m++) {
      live = stepLiveMatchMinute(live, rma, mal, parsedDb.players, rng);
    }
    assert.equal(live.minute, 60);
    const starterId = live.homeLineupIds[10];
    const subId = live.homeBenchIds[0];
    const staminaBeforeSub = live.homeStamina[starterId];
    assert.ok(staminaBeforeSub < parsedDb.players[starterId].energy, 'Live match must drain player stamina');

    live = applyLiveSub(live, true, starterId, subId, parsedDb.players);
    assert.equal(live.homeSubsUsed, 1);
    assert.ok(live.homeLineupIds.includes(subId));

    for (let m = 60; m < 90; m++) {
      live = stepLiveMatchMinute(live, rma, mal, parsedDb.players, rng);
    }
    assert.equal(live.isFinished, true);
  });

  it('runs TransferRoom xTV and Multi-Stage 2D Negotiations (Club Talks -> Player Talks -> Transfer Completion)', () => {
    const state = createInitialCareerState(parsedDb.clubs, parsedDb.players, parsedDb.laLigaClubIds, 243);
    // Pick a non-rival player affordable for Real Madrid
    const target = Object.values(state.players).find(
      (p) => p.clubId === 483 && p.baseOvr >= 76 && p.expectedTransferValue < 60_000_000
    )!;
    assert.ok(target);

    const xtv = calculateTransferRoomXTV(
      target.baseOvr,
      target.dynamicOvr.dynamicOvr,
      target.potential,
      target.age,
      3,
      target.primaryPosition,
      target.formScore
    );
    assert.ok(xtv >= 1_000_000);

    const init = initiateNegotiation(state, target.id, 'BUY');
    assert.ok(init.negotiation);
    assert.equal(init.negotiation.stage, 'CLUB_TALKS');

    // Offer 100% of asking fee across 2 instalments -> advances to PLAYER_TALKS
    const clubRes = evaluateClubOffer(
      state,
      init.negotiation,
      {
        ...init.negotiation.currentOffer,
        transferFeeEur: Math.round(init.negotiation.askingFeeEur * 1.04),
        instalments: 2,
      },
      mulberry32(7)
    );
    assert.equal(clubRes.updated.stage, 'PLAYER_TALKS');
    assert.ok(clubRes.updated.currentOffer.futurePaymentsEur > 0);

    // Meet player's wage & role -> COMPLETED
    const contractRes = evaluateContractOffer(state, clubRes.updated, {
      ...clubRes.updated.currentOffer,
      wageEur: Math.round(clubRes.updated.askingWageEur * 1.05),
      squadRole: clubRes.updated.desiredRole,
      contractYears: clubRes.updated.desiredYears,
    });
    assert.equal(contractRes.stage, 'COMPLETED');

    const completed = completeTransferInState(state, contractRes);
    assert.equal(completed.players[target.id].clubId, 243);
    assert.ok(completed.transferRecord !== null);
    assert.ok(completed.installment !== null && completed.installment.direction === 'PAYABLE');
  });

  it('generates full 38-round schedule, advances calendar days, and rolls cleanly into Season 2', () => {
    const schedule = generateLaLigaSchedule(parsedDb.laLigaClubIds, 2026, mulberry32(12));
    assert.equal(schedule.length, 380, '20-team double round-robin must produce 380 fixtures');

    let state = createInitialCareerState(parsedDb.clubs, parsedDb.players, parsedDb.laLigaClubIds, 243);
    const rng = mulberry32(55);
    for (let i = 0; i < 10; i++) {
      state = advanceSingleDay(state, rng).state;
    }
    assert.equal(state.currentDate, '2026-07-11');

    // Rollover into Season 2
    const season2 = advanceToNextSeason(state, mulberry32(77));
    assert.equal(season2.seasonNumber, 2);
    assert.equal(season2.currentDate, '2027-07-01');
    assert.equal(season2.fixtures.length, 380);
    assert.equal(season2.seasonCompleted, false);
  });
});
