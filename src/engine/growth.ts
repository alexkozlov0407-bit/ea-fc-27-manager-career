import {
  ALL_POSITIONS,
  calculateBaseOVRForPosition,
  calculateCardFacets,
  calculateDynamicOVR,
  calculateMatchFitness,
  calculateTransferRoomXTV,
  calculateWeeklyWageEur,
  clamp,
  POSITION_WEIGHTS,
  positionToSector,
  ROLE_BY_POSITION,
  TARGET_MINUTE_SHARE,
} from './ratings.ts';
import {
  CardFacets,
  Club,
  GrowthProfile,
  Player,
  PlayerAttributes,
  Position,
  YouthProspect,
  YouthScout,
} from './types.ts';

export interface GrowthProfileCurve {
  id: GrowthProfile;
  label: string;
  summary: string;
  peakStartAge: number;
  peakEndAge: number;
  declineStartAge: number;
  earlyRate: number;
  midRate: number;
  lateRate: number;
  declineRate: number;
  volatility: number;
}

export const GROWTH_PROFILES: Record<GrowthProfile, GrowthProfileCurve> = {
  Default: {
    id: 'Default',
    label: 'Steady Pro',
    summary: 'Balanced development curve peaking between 25 and 29 with gradual decline after 31.',
    peakStartAge: 25,
    peakEndAge: 29,
    declineStartAge: 31,
    earlyRate: 1.0,
    midRate: 1.0,
    lateRate: 0.55,
    declineRate: 1.0,
    volatility: 0.1,
  },
  ExplosiveStart: {
    id: 'ExplosiveStart',
    label: 'Early Peak',
    summary: 'Surges rapidly from 17–22, hits ceiling early, and faces earlier physical decline after 29.',
    peakStartAge: 22,
    peakEndAge: 26,
    declineStartAge: 29,
    earlyRate: 1.65,
    midRate: 0.72,
    lateRate: 0.25,
    declineRate: 1.38,
    volatility: 0.18,
  },
  MeteoricPeak: {
    id: 'MeteoricPeak',
    label: 'Volatile Prodigy',
    summary: 'Huge upside momentum when playing regularly, but stalls sharply if starved of minutes or in poor form.',
    peakStartAge: 23,
    peakEndAge: 27,
    declineStartAge: 30,
    earlyRate: 1.85,
    midRate: 0.95,
    lateRate: 0.35,
    declineRate: 1.25,
    volatility: 0.35,
  },
  ConsistentPerformer: {
    id: 'ConsistentPerformer',
    label: 'Sustained Elite',
    summary: 'Reliable growth into a long prime (26–32) with elite resistance to age decline.',
    peakStartAge: 26,
    peakEndAge: 32,
    declineStartAge: 34,
    earlyRate: 0.92,
    midRate: 1.08,
    lateRate: 0.82,
    declineRate: 0.55,
    volatility: 0.06,
  },
  CompleteTechnician: {
    id: 'CompleteTechnician',
    label: 'Complete Technician',
    summary: 'Technical and mental attributes keep sharpening well into the early 30s despite slower pace.',
    peakStartAge: 26,
    peakEndAge: 31,
    declineStartAge: 33,
    earlyRate: 0.95,
    midRate: 1.12,
    lateRate: 0.85,
    declineRate: 0.75,
    volatility: 0.08,
  },
  LateBloomer: {
    id: 'LateBloomer',
    label: 'Late Bloomer',
    summary: 'Modest teenage growth followed by a breakout surge from 23–28 that unlocks late potential.',
    peakStartAge: 27,
    peakEndAge: 31,
    declineStartAge: 33,
    earlyRate: 0.65,
    midRate: 1.55,
    lateRate: 0.95,
    declineRate: 0.85,
    volatility: 0.12,
  },
};

export function getDepartmentCoachStars(club: Club | undefined, pos: Position): number {
  if (!club) return 3;
  const sector = positionToSector(pos);
  const hired = club.coaches.filter((c) => c.hired && c.department === sector);
  if (hired.length === 0) return 2;
  return Math.min(5, hired.reduce((sum, c) => sum + c.stars, 0));
}

/**
 * Weekly attribute progression & development momentum engine (applied to BOTH User & AI clubs).
 */
export function applyWeeklyPlayerGrowth(
  player: Player,
  club: Club | undefined,
  clubMatchesPlayed: number,
  rng: () => number = Math.random
): { player: Player; ovrChanged: number; retrainedPosition?: Position } {
  const curve = GROWTH_PROFILES[player.growthProfile];
  const coachStars = getDepartmentCoachStars(club, player.primaryPosition);
  const updated: Player = {
    ...player,
    attributes: { ...player.attributes },
    developmentPlan: { ...player.developmentPlan },
    otherPositions: [...player.otherPositions],
  };

  // 1. Calculate Development Momentum (young players <=24 lose momentum if starved of minutes or poor form)
  const possibleMinutes = Math.max(90, clubMatchesPlayed * 90);
  const actualShare = updated.seasonStats.minutes / possibleMinutes;
  const expectedShare = Math.max(0.22, TARGET_MINUTE_SHARE[updated.squadRole] * 0.75);

  let momentumDelta = 0;
  if (updated.age <= 24) {
    if (clubMatchesPlayed >= 3 && actualShare < expectedShare * 0.55) {
      momentumDelta -= updated.growthProfile === 'MeteoricPeak' ? 7 : 4.5;
    } else if (actualShare >= expectedShare) {
      momentumDelta += 3.5;
    }
    if (updated.formScore < 6.1) {
      momentumDelta -= updated.growthProfile === 'MeteoricPeak' ? 6 : 3.5;
    } else if (updated.formScore >= 7.2) {
      momentumDelta += 4;
    }
    if (updated.morale >= 68 && updated.morale <= 86) {
      momentumDelta += 1.5;
    } else if (updated.morale < 45) {
      momentumDelta -= 2.5;
    }
  } else {
    momentumDelta = updated.formScore >= 6.8 ? 1 : -1;
  }

  updated.developmentPlan.momentum = clamp(Math.round(updated.developmentPlan.momentum + momentumDelta), 10, 100);

  // 2. Position Retraining progression
  let retrainedPosition: Position | undefined;
  if (
    updated.developmentPlan.mode === 'PositionRetrain' &&
    updated.developmentPlan.targetPosition &&
    !updated.otherPositions.includes(updated.developmentPlan.targetPosition) &&
    updated.developmentPlan.targetPosition !== updated.primaryPosition
  ) {
    const progressStep = coachStars >= 4 ? 1.25 : 1;
    updated.developmentPlan.weeksCompleted += progressStep;
    if (updated.developmentPlan.weeksCompleted >= updated.developmentPlan.weeksRequired) {
      const targetPos = updated.developmentPlan.targetPosition;
      if (updated.otherPositions.length < 6) {
        updated.otherPositions.push(targetPos);
      }
      retrainedPosition = targetPos;
      updated.developmentPlan.mode = 'RoleFocus';
      updated.developmentPlan.targetPosition = undefined;
      updated.developmentPlan.weeksCompleted = 0;
    }
  }

  // 3. Weekly XP gain or age decline
  const prevOvr = updated.baseOvr;

  if (updated.age < curve.declineStartAge) {
    const headroom = Math.max(0, updated.potential - updated.baseOvr);
    if (headroom > 0) {
      const agePhaseRate =
        updated.age <= 21
          ? curve.earlyRate
          : updated.age <= curve.peakStartAge
          ? curve.midRate
          : curve.lateRate;

      const momentumFactor = 0.25 + (updated.developmentPlan.momentum / 100) * 1.15;
      const coachFactor = 0.8 + coachStars * 0.09;
      const formFactor = clamp(0.65 + (updated.formScore - 5.5) * 0.22, 0.35, 1.45);
      const noise = 1 + (rng() * 2 - 1) * curve.volatility;

      const weeklyXp = clamp(
        (4.8 + headroom * 0.48) * agePhaseRate * momentumFactor * coachFactor * formFactor * noise,
        0.5,
        24
      );
      updated.xpProgress += weeklyXp;

      if (updated.xpProgress >= 100) {
        updated.xpProgress -= 100;
        // Pick 2-3 weighted attributes for primary position (or Role Focus) to increment
        const weights = POSITION_WEIGHTS[updated.primaryPosition];
        const attrKeys = Object.keys(weights) as (keyof PlayerAttributes)[];
        const bumps = updated.developmentPlan.mode === 'RoleFocus' ? 3 : 2;
        for (let b = 0; b < bumps; b++) {
          const pick = attrKeys[Math.floor(rng() * attrKeys.length)];
          updated.attributes[pick] = clamp(updated.attributes[pick] + 1, 1, 99);
        }
        updated.cardFacets = calculateCardFacets(updated.attributes, updated.primaryPosition);
        const calcOvr = calculateBaseOVRForPosition(
          updated.attributes,
          updated.primaryPosition,
          updated.internationalRep
        );
        updated.baseOvr = clamp(Math.max(updated.baseOvr, Math.min(updated.potential, calcOvr)), 40, 99);
      }
    }
  } else {
    // Post-decline curve: physical attributes decline faster; CompleteTechnician retains mental/technical longer
    const yearsOver = updated.age - curve.declineStartAge + 1;
    const declineProb = clamp(0.055 * yearsOver * curve.declineRate * (updated.formScore >= 7.2 ? 0.65 : 1.1), 0.03, 0.45);
    if (rng() < declineProb) {
      const physicalKeys: (keyof PlayerAttributes)[] = ['acceleration', 'sprintspeed', 'stamina', 'agility', 'jumping'];
      const key = physicalKeys[Math.floor(rng() * physicalKeys.length)];
      updated.attributes[key] = clamp(updated.attributes[key] - 1, 25, 99);
      if (updated.growthProfile !== 'CompleteTechnician' && rng() < 0.35) {
        const weights = POSITION_WEIGHTS[updated.primaryPosition];
        const keys = Object.keys(weights) as (keyof PlayerAttributes)[];
        const k2 = keys[Math.floor(rng() * keys.length)];
        updated.attributes[k2] = clamp(updated.attributes[k2] - 1, 25, 99);
      }
      updated.cardFacets = calculateCardFacets(updated.attributes, updated.primaryPosition);
      const calcOvr = calculateBaseOVRForPosition(
        updated.attributes,
        updated.primaryPosition,
        updated.internationalRep
      );
      if (calcOvr < updated.baseOvr) {
        updated.baseOvr = Math.max(52, updated.baseOvr - 1);
      }
    }
  }

  updated.matchFitness = calculateMatchFitness(updated.energy, updated.sharpness, updated.injury);
  updated.dynamicOvr = calculateDynamicOVR(updated, updated.dynamicOvr.deployedPosition, clubMatchesPlayed);

  return {
    player: updated,
    ovrChanged: updated.baseOvr - prevOvr,
    retrainedPosition,
  };
}

// Youth Academy & Randomized Regen Engine
const YOUTH_FIRST_NAMES: Record<string, string[]> = {
  Spain: ['Mateo', 'Hugo', 'Martín', 'Lucas', 'Leo', 'Daniel', 'Alejandro', 'Pablo', 'Álvaro', 'Adrián', 'Izan', 'Gael'],
  Brazil: ['Gabriel', 'Matheus', 'Enzo', 'Kauã', 'Vitor', 'Pedro', 'Rafael', 'Caio', 'Breno', 'Lucas'],
  Argentina: ['Thiago', 'Bautista', 'Benjamín', 'Valentín', 'Joaquín', 'Lautaro', 'Santino', 'Franco'],
  France: ['Léo', 'Raphaël', 'Maël', 'Noah', 'Jules', 'Théo', 'Kylian', 'Yanis', 'Rayane'],
  Portugal: ['Rodrigo', 'Afonso', 'Tomás', 'Martim', 'Gonçalo', 'Diogo', 'Duarte', 'Tiago'],
  England: ['Jude', 'Oliver', 'Alfie', 'Archie', 'Charlie', 'Harry', 'Callum', 'Ethan'],
};

const YOUTH_LAST_NAMES: Record<string, string[]> = {
  Spain: ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Hernández', 'Díaz', 'Navarro', 'Torres', 'Vidal'],
  Brazil: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Mendes'],
  Argentina: ['González', 'Rodríguez', 'Fernández', 'Romero', 'Álvarez', 'Benítez', 'Acosta', 'Medina'],
  France: ['Diallo', 'Moreau', 'Laurent', 'Lefèvre', 'Camara', 'Fofana', 'Kone', 'Dubois'],
  Portugal: ['Silva', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Sousa', 'Mendes', 'Teixeira'],
  England: ['Wright', 'Taylor', 'Clarke', 'Walker', 'Green', 'Hall', 'Lewis', 'Ward'],
};

const YOUTH_PLAYSTYLES = [
  'Technical', 'Quick Step', 'First Touch', 'Incisive Pass', 'Finesse Shot',
  'Anticipate', 'Intercept', 'Rapid', 'Tiki Taka', 'Relentless', 'Aerial',
];

function buildAttributesForOvr(pos: Position, ovr: number, rng: () => number): PlayerAttributes {
  const base = clamp(ovr - 4, 38, 92);
  const rand = (offset: number) => clamp(Math.round(base + offset + (rng() * 12 - 6)), 18, 96);
  const isGk = pos === 'GK';
  const isDef = pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'CDM';
  const isAtk = pos === 'ST' || pos === 'LW' || pos === 'RW' || pos === 'CAM';

  return {
    acceleration: isGk ? rand(-22) : rand(isAtk ? 8 : 2),
    sprintspeed: isGk ? rand(-22) : rand(isAtk ? 8 : 2),
    agility: isGk ? rand(-12) : rand(4),
    balance: isGk ? rand(-16) : rand(3),
    jumping: rand(pos === 'CB' || pos === 'ST' ? 8 : 0),
    stamina: isGk ? rand(-25) : rand(5),
    strength: rand(pos === 'CB' || pos === 'ST' ? 7 : -2),
    reactions: rand(2),
    aggression: rand(isDef ? 6 : -4),
    composure: rand(1),
    interceptions: isGk ? rand(-35) : rand(isDef ? 9 : -14),
    positioning: isGk ? rand(-40) : rand(isAtk ? 8 : -5),
    vision: isGk ? rand(-25) : rand(pos === 'CAM' || pos === 'CM' ? 9 : -2),
    ballcontrol: isGk ? rand(-35) : rand(isAtk ? 7 : 1),
    crossing: isGk ? rand(-38) : rand(pos === 'LB' || pos === 'RB' || pos === 'LW' || pos === 'RW' ? 8 : -8),
    dribbling: isGk ? rand(-38) : rand(isAtk ? 9 : -4),
    finishing: isGk ? rand(-42) : rand(pos === 'ST' ? 11 : isAtk ? 6 : -16),
    freekickaccuracy: rand(-10),
    headingaccuracy: isGk ? rand(-40) : rand(pos === 'CB' || pos === 'ST' ? 8 : -8),
    longpassing: isGk ? rand(-26) : rand(pos === 'CM' || pos === 'CDM' ? 8 : -4),
    shortpassing: isGk ? rand(-26) : rand(4),
    marking: isGk ? rand(-42) : rand(isDef ? 10 : -18),
    shotpower: rand(isAtk ? 6 : -6),
    longshots: isGk ? rand(-42) : rand(isAtk ? 4 : -14),
    standingtackle: isGk ? rand(-42) : rand(isDef ? 10 : -18),
    slidingtackle: isGk ? rand(-42) : rand(isDef ? 8 : -19),
    volleys: isGk ? rand(-42) : rand(isAtk ? 3 : -14),
    curve: rand(-4),
    penalties: rand(-6),
    gkdiving: isGk ? rand(6) : clamp(Math.round(8 + rng() * 8), 5, 18),
    gkhandling: isGk ? rand(5) : clamp(Math.round(8 + rng() * 8), 5, 18),
    gkkicking: isGk ? rand(4) : clamp(Math.round(8 + rng() * 8), 5, 18),
    gkreflexes: isGk ? rand(7) : clamp(Math.round(8 + rng() * 8), 5, 18),
    gkpositioning: isGk ? rand(6) : clamp(Math.round(8 + rng() * 8), 5, 18),
  };
}

export function generateYouthProspect(
  scout: YouthScout,
  country: string,
  targetPosition: Position | 'ANY',
  idSeed: string,
  rng: () => number = Math.random
): YouthProspect {
  const nation = YOUTH_FIRST_NAMES[country] ? country : 'Spain';
  const fNames = YOUTH_FIRST_NAMES[nation];
  const lNames = YOUTH_LAST_NAMES[nation];
  const name = `${fNames[Math.floor(rng() * fNames.length)]} ${lNames[Math.floor(rng() * lNames.length)]}`;
  const pos: Position =
    targetPosition === 'ANY' ? ALL_POSITIONS[Math.floor(rng() * ALL_POSITIONS.length)] : targetPosition;

  const age = 14 + Math.floor(rng() * 4); // 14..17
  const trueOvr = clamp(Math.round(52 + scout.judgement * 2.4 + rng() * 12), 48, 72);
  const truePotential = clamp(
    Math.round(trueOvr + 12 + scout.judgement * 3.1 + rng() * 14),
    Math.max(trueOvr + 6, 70),
    95
  );
  const attrs = buildAttributesForOvr(pos, trueOvr, rng);
  const facets = calculateCardFacets(attrs, pos);
  const fog = clamp(14 - scout.judgement * 2, 4, 12);

  const profiles: GrowthProfile[] = [
    'ExplosiveStart',
    'MeteoricPeak',
    'ConsistentPerformer',
    'CompleteTechnician',
    'LateBloomer',
    'Default',
  ];

  const makeRange = (val: number, spread: number): [number, number] => [
    clamp(val - Math.floor(spread * 0.55), 35, 95),
    clamp(val + Math.ceil(spread * 0.65), 45, 97),
  ];

  const playStyleCount = scout.judgement >= 4 && rng() < 0.7 ? 2 : 1;
  const playStyles: string[] = [];
  for (let i = 0; i < playStyleCount; i++) {
    const ps = YOUTH_PLAYSTYLES[Math.floor(rng() * YOUTH_PLAYSTYLES.length)];
    if (!playStyles.includes(ps)) playStyles.push(ps);
  }

  return {
    id: idSeed,
    name,
    nationality: nation,
    age,
    heightCm: age <= 15 ? Math.round(166 + rng() * 14) : Math.round(172 + rng() * 18),
    primaryPosition: pos,
    growthProfile: profiles[Math.floor(rng() * profiles.length)],
    trueOvr,
    truePotential,
    ovrRange: makeRange(trueOvr, fog),
    potRange: makeRange(truePotential, fog + 4),
    statRanges: {
      pac: makeRange(facets.pac, fog),
      sho: makeRange(facets.sho, fog),
      pas: makeRange(facets.pas, fog),
      dri: makeRange(facets.dri, fog),
      def: makeRange(facets.def, fog),
      phy: makeRange(facets.phy, fog),
    },
    monthsScouted: 1,
    playStyles,
    unsettled: false,
    inAcademy: false,
    preferredFoot: rng() < 0.28 ? 'Left' : 'Right',
    attributes: attrs,
  };
}

export function promoteProspectToSeniorPlayer(
  prospect: YouthProspect,
  club: Club,
  newPlayerId: number,
  currentDate: string
): Player {
  const [firstName, ...rest] = prospect.name.split(' ');
  const lastName = rest.join(' ') || firstName;
  const roleMeta = ROLE_BY_POSITION[prospect.primaryPosition];
  const cardFacets = calculateCardFacets(prospect.attributes, prospect.primaryPosition);
  const xtv = calculateTransferRoomXTV(
    prospect.trueOvr,
    prospect.trueOvr,
    prospect.truePotential,
    prospect.age,
    4,
    prospect.primaryPosition,
    6.7
  );
  const wage = calculateWeeklyWageEur(prospect.trueOvr, prospect.age, club.domesticPrestige);
  const year = parseInt(currentDate.slice(0, 4), 10) || 2026;

  const player: Player = {
    id: newPlayerId,
    firstName,
    lastName,
    knownAs: prospect.name,
    jerseyName: lastName,
    jerseyNumber: 30 + (newPlayerId % 40),
    nationality: prospect.nationality,
    nationId: 45,
    age: prospect.age,
    birthDate: `${year - prospect.age}-04-12`,
    heightCm: prospect.heightCm,
    weightKg: Math.round(prospect.heightCm - 108),
    preferredFoot: prospect.preferredFoot,
    skillMoves: 3,
    weakFoot: 3,
    internationalRep: 1,
    headshotUrl: '',
    playStyles: prospect.playStyles,
    primaryPosition: prospect.primaryPosition,
    otherPositions: [],
    clubId: club.id,
    clubName: club.name,
    isExternalClub: false,
    isLoanedOut: false,
    attributes: prospect.attributes,
    cardFacets,
    baseOvr: prospect.trueOvr,
    potential: prospect.truePotential,
    growthProfile: prospect.growthProfile,
    xpProgress: 15,
    energy: 95,
    sharpness: 78,
    matchFitness: 91,
    morale: 76,
    formScore: 6.7,
    squadRole: 'Prospect',
    roleTitle: roleMeta.title,
    roleFocus: roleMeta.focus,
    roleFamiliarity: 'Role+',
    injury: null,
    transferListed: false,
    loanListed: false,
    expectedTransferValue: xtv,
    weeklyWageEur: wage,
    releaseClauseEur: Math.round(xtv * 2.2),
    contractEndYear: year + 4,
    joinDate: currentDate,
    developmentPlan: {
      mode: 'RoleFocus',
      targetRole: roleMeta.title,
      weeksCompleted: 0,
      weeksRequired: 16,
      momentum: 82,
    },
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
    isAcademyGraduate: true,
    dynamicOvr: {
      deployedPosition: prospect.primaryPosition,
      baseOvr: prospect.trueOvr,
      positionPenalty: 0,
      formDelta: 0,
      moraleDelta: 2,
      playtimeDelta: 0,
      fitnessDelta: 0,
      injuryDelta: 0,
      totalDelta: 2,
      dynamicOvr: prospect.trueOvr + 2,
      formLabel: 'Okay',
      moraleLabel: 'Happy',
      fitnessLabel: 'Peak',
      facetDeltas: { pac: 0, sho: 1, pas: 1, dri: 1, def: 1, phy: 0 },
    },
  };
  player.dynamicOvr = calculateDynamicOVR(player, player.primaryPosition, 0);
  return player;
}

export function createRandomizedRegen(
  retiredPlayer: Player,
  targetClub: Club,
  newPlayerId: number,
  currentYear: number,
  rng: () => number = Math.random
): Player {
  // FC 27 Randomized Regen: keeps position & similar ceiling, randomizes nationality, birthday & growth profile
  const nations = Object.keys(YOUTH_FIRST_NAMES);
  const nationality = nations[Math.floor(rng() * nations.length)];
  const f = YOUTH_FIRST_NAMES[nationality];
  const l = YOUTH_LAST_NAMES[nationality];
  const name = `${f[Math.floor(rng() * f.length)]} ${l[Math.floor(rng() * l.length)]}`;
  const age = 17 + Math.floor(rng() * 3); // 17..19
  const ovr = clamp(Math.round(retiredPlayer.potential - 14 + rng() * 6), 63, 76);
  const potential = clamp(Math.round(retiredPlayer.potential + (rng() * 6 - 3)), ovr + 8, 94);

  const prospect: YouthProspect = {
    id: `regen-${newPlayerId}`,
    name,
    nationality,
    age,
    heightCm: Math.round(173 + rng() * 19),
    primaryPosition: retiredPlayer.primaryPosition,
    growthProfile: (['ExplosiveStart', 'MeteoricPeak', 'ConsistentPerformer', 'LateBloomer'] as GrowthProfile[])[
      Math.floor(rng() * 4)
    ],
    trueOvr: ovr,
    truePotential: potential,
    ovrRange: [ovr, ovr],
    potRange: [potential, potential],
    statRanges: {
      pac: [65, 65],
      sho: [65, 65],
      pas: [65, 65],
      dri: [65, 65],
      def: [65, 65],
      phy: [65, 65],
    },
    monthsScouted: 6,
    playStyles: retiredPlayer.playStyles.slice(0, 2),
    unsettled: false,
    inAcademy: true,
    preferredFoot: rng() < 0.3 ? 'Left' : 'Right',
    attributes: buildAttributesForOvr(retiredPlayer.primaryPosition, ovr, rng),
  };

  const regen = promoteProspectToSeniorPlayer(prospect, targetClub, newPlayerId, `${currentYear}-07-01`);
  regen.isRegen = true;
  regen.isAcademyGraduate = false;
  return regen;
}

export function createInitialYouthScouts(): YouthScout[] {
  return [
    {
      id: 'ys-1',
      name: 'Álvaro Benítez',
      nationality: 'Spain',
      experience: 4,
      judgement: 4,
      costEur: 1_850_000,
      hired: true,
      mission: {
        country: 'Spain',
        targetPosition: 'ANY',
        durationMonths: 3,
        daysRemaining: 22,
        costEur: 320_000,
      },
    },
    {
      id: 'ys-2',
      name: 'Nuno Carvalho',
      nationality: 'Portugal',
      experience: 3,
      judgement: 4,
      costEur: 1_400_000,
      hired: false,
      mission: null,
    },
    {
      id: 'ys-3',
      name: 'Luciano Ferretti',
      nationality: 'Argentina',
      experience: 5,
      judgement: 5,
      costEur: 3_600_000,
      hired: false,
      mission: null,
    },
  ];
}
