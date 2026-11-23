import {
  CardFacets,
  Club,
  CurrencyCode,
  DynamicOvrBreakdown,
  FormationId,
  InjuryState,
  Player,
  PlayerAttributes,
  Position,
  Sector,
  SquadRole,
  TacticalSlot,
} from './types.ts';

export const ALL_POSITIONS: Position[] = [
  'GK',
  'CB',
  'LB',
  'RB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'ST',
];

export function positionToSector(pos: Position): Sector {
  if (pos === 'GK') return 'GK';
  if (pos === 'CB' || pos === 'LB' || pos === 'RB') return 'DEF';
  if (pos === 'CDM' || pos === 'CM' || pos === 'CAM' || pos === 'LM' || pos === 'RM') return 'MID';
  return 'ATK';
}

export function normalizePosition(raw: string): Position {
  const cleaned = raw.trim().toUpperCase();
  if (cleaned === 'LWB') return 'LB';
  if (cleaned === 'RWB') return 'RB';
  if (cleaned === 'CF' || cleaned === 'LF' || cleaned === 'RF') return 'ST';
  if ((ALL_POSITIONS as string[]).includes(cleaned)) {
    return cleaned as Position;
  }
  return 'CM';
}

export const POSITION_WEIGHTS: Record<Position, Partial<Record<keyof PlayerAttributes, number>>> = {
  GK: {
    gkdiving: 0.21,
    gkhandling: 0.21,
    gkpositioning: 0.21,
    gkreflexes: 0.21,
    reactions: 0.11,
    gkkicking: 0.05,
  },
  CB: {
    marking: 0.14,
    standingtackle: 0.17,
    slidingtackle: 0.10,
    headingaccuracy: 0.10,
    strength: 0.10,
    aggression: 0.07,
    interceptions: 0.13,
    reactions: 0.05,
    shortpassing: 0.05,
    ballcontrol: 0.04,
    sprintspeed: 0.02,
    jumping: 0.03,
  },
  LB: {
    slidingtackle: 0.14,
    standingtackle: 0.11,
    interceptions: 0.12,
    marking: 0.08,
    stamina: 0.08,
    reactions: 0.08,
    crossing: 0.09,
    headingaccuracy: 0.04,
    ballcontrol: 0.07,
    shortpassing: 0.07,
    sprintspeed: 0.07,
    acceleration: 0.05,
  },
  RB: {
    slidingtackle: 0.14,
    standingtackle: 0.11,
    interceptions: 0.12,
    marking: 0.08,
    stamina: 0.08,
    reactions: 0.08,
    crossing: 0.09,
    headingaccuracy: 0.04,
    ballcontrol: 0.07,
    shortpassing: 0.07,
    sprintspeed: 0.07,
    acceleration: 0.05,
  },
  CDM: {
    shortpassing: 0.14,
    interceptions: 0.14,
    longpassing: 0.10,
    marking: 0.09,
    standingtackle: 0.12,
    ballcontrol: 0.10,
    reactions: 0.07,
    vision: 0.04,
    stamina: 0.06,
    strength: 0.04,
    aggression: 0.05,
    slidingtackle: 0.05,
  },
  CM: {
    shortpassing: 0.17,
    longpassing: 0.13,
    vision: 0.13,
    ballcontrol: 0.14,
    dribbling: 0.07,
    reactions: 0.08,
    interceptions: 0.05,
    positioning: 0.06,
    standingtackle: 0.05,
    stamina: 0.06,
    longshots: 0.04,
    finishing: 0.02,
  },
  CAM: {
    shortpassing: 0.16,
    vision: 0.14,
    ballcontrol: 0.15,
    positioning: 0.09,
    dribbling: 0.13,
    reactions: 0.07,
    longshots: 0.05,
    finishing: 0.07,
    shotpower: 0.04,
    acceleration: 0.04,
    sprintspeed: 0.03,
    agility: 0.03,
  },
  LM: {
    crossing: 0.10,
    dribbling: 0.15,
    ballcontrol: 0.13,
    shortpassing: 0.11,
    positioning: 0.08,
    acceleration: 0.07,
    sprintspeed: 0.06,
    reactions: 0.07,
    vision: 0.07,
    stamina: 0.05,
    finishing: 0.06,
    longpassing: 0.05,
  },
  RM: {
    crossing: 0.10,
    dribbling: 0.15,
    ballcontrol: 0.13,
    shortpassing: 0.11,
    positioning: 0.08,
    acceleration: 0.07,
    sprintspeed: 0.06,
    reactions: 0.07,
    vision: 0.07,
    stamina: 0.05,
    finishing: 0.06,
    longpassing: 0.05,
  },
  LW: {
    dribbling: 0.16,
    ballcontrol: 0.14,
    finishing: 0.10,
    positioning: 0.09,
    crossing: 0.09,
    shortpassing: 0.09,
    acceleration: 0.07,
    sprintspeed: 0.06,
    reactions: 0.07,
    vision: 0.06,
    longshots: 0.04,
    agility: 0.03,
  },
  RW: {
    dribbling: 0.16,
    ballcontrol: 0.14,
    finishing: 0.10,
    positioning: 0.09,
    crossing: 0.09,
    shortpassing: 0.09,
    acceleration: 0.07,
    sprintspeed: 0.06,
    reactions: 0.07,
    vision: 0.06,
    longshots: 0.04,
    agility: 0.03,
  },
  ST: {
    finishing: 0.18,
    positioning: 0.13,
    headingaccuracy: 0.10,
    shotpower: 0.10,
    reactions: 0.08,
    dribbling: 0.07,
    ballcontrol: 0.10,
    sprintspeed: 0.05,
    acceleration: 0.04,
    strength: 0.05,
    shortpassing: 0.05,
    longshots: 0.03,
    volleys: 0.02,
  },
};

export const ROLE_BY_POSITION: Record<Position, { title: string; focus: 'Attack' | 'Balanced' | 'Defend' | 'Roam' }> = {
  GK: { title: 'Sweeper Keeper', focus: 'Balanced' },
  CB: { title: 'Ball-Playing Defender', focus: 'Defend' },
  LB: { title: 'Wingback', focus: 'Balanced' },
  RB: { title: 'Fullback', focus: 'Balanced' },
  CDM: { title: 'Holding', focus: 'Defend' },
  CM: { title: 'Box-to-Box', focus: 'Balanced' },
  CAM: { title: 'Playmaker', focus: 'Roam' },
  LM: { title: 'Wide Midfielder', focus: 'Balanced' },
  RM: { title: 'Wide Midfielder', focus: 'Balanced' },
  LW: { title: 'Inside Forward', focus: 'Attack' },
  RW: { title: 'Inside Forward', focus: 'Attack' },
  ST: { title: 'Advanced Forward', focus: 'Attack' },
};

export const FORMATIONS: Record<
  FormationId,
  Array<{ position: Position; x: number; y: number; withBallX: number; withBallY: number }>
> = {
  '4-3-3 Attack': [
    { position: 'GK', x: 50, y: 89, withBallX: 50, withBallY: 86 },
    { position: 'LB', x: 14, y: 69, withBallX: 11, withBallY: 54 },
    { position: 'CB', x: 37, y: 74, withBallX: 35, withBallY: 67 },
    { position: 'CB', x: 63, y: 74, withBallX: 65, withBallY: 67 },
    { position: 'RB', x: 86, y: 69, withBallX: 89, withBallY: 54 },
    { position: 'CDM', x: 35, y: 52, withBallX: 39, withBallY: 48 },
    { position: 'CM', x: 65, y: 52, withBallX: 61, withBallY: 45 },
    { position: 'CAM', x: 50, y: 36, withBallX: 50, withBallY: 28 },
    { position: 'LW', x: 17, y: 24, withBallX: 22, withBallY: 16 },
    { position: 'RW', x: 83, y: 24, withBallX: 78, withBallY: 16 },
    { position: 'ST', x: 50, y: 14, withBallX: 50, withBallY: 10 },
  ],
  '4-3-3 Holding': [
    { position: 'GK', x: 50, y: 89, withBallX: 50, withBallY: 86 },
    { position: 'LB', x: 14, y: 70, withBallX: 12, withBallY: 56 },
    { position: 'CB', x: 37, y: 75, withBallX: 36, withBallY: 69 },
    { position: 'CB', x: 63, y: 75, withBallX: 64, withBallY: 69 },
    { position: 'RB', x: 86, y: 70, withBallX: 88, withBallY: 56 },
    { position: 'CDM', x: 50, y: 57, withBallX: 50, withBallY: 53 },
    { position: 'CM', x: 31, y: 43, withBallX: 32, withBallY: 34 },
    { position: 'CM', x: 69, y: 43, withBallX: 68, withBallY: 34 },
    { position: 'LW', x: 17, y: 24, withBallX: 21, withBallY: 16 },
    { position: 'RW', x: 83, y: 24, withBallX: 79, withBallY: 16 },
    { position: 'ST', x: 50, y: 14, withBallX: 50, withBallY: 10 },
  ],
  '4-2-3-1 Wide': [
    { position: 'GK', x: 50, y: 89, withBallX: 50, withBallY: 86 },
    { position: 'LB', x: 14, y: 70, withBallX: 12, withBallY: 55 },
    { position: 'CB', x: 37, y: 75, withBallX: 36, withBallY: 68 },
    { position: 'CB', x: 63, y: 75, withBallX: 64, withBallY: 68 },
    { position: 'RB', x: 86, y: 70, withBallX: 88, withBallY: 55 },
    { position: 'CDM', x: 36, y: 55, withBallX: 38, withBallY: 49 },
    { position: 'CDM', x: 64, y: 55, withBallX: 62, withBallY: 49 },
    { position: 'LM', x: 17, y: 34, withBallX: 20, withBallY: 22 },
    { position: 'CAM', x: 50, y: 34, withBallX: 50, withBallY: 26 },
    { position: 'RM', x: 83, y: 34, withBallX: 80, withBallY: 22 },
    { position: 'ST', x: 50, y: 14, withBallX: 50, withBallY: 10 },
  ],
  '4-4-2 Flat': [
    { position: 'GK', x: 50, y: 89, withBallX: 50, withBallY: 86 },
    { position: 'LB', x: 14, y: 70, withBallX: 13, withBallY: 56 },
    { position: 'CB', x: 37, y: 75, withBallX: 36, withBallY: 68 },
    { position: 'CB', x: 63, y: 75, withBallX: 64, withBallY: 68 },
    { position: 'RB', x: 86, y: 70, withBallX: 87, withBallY: 56 },
    { position: 'LM', x: 15, y: 44, withBallX: 16, withBallY: 28 },
    { position: 'CM', x: 38, y: 47, withBallX: 39, withBallY: 41 },
    { position: 'CM', x: 62, y: 47, withBallX: 61, withBallY: 41 },
    { position: 'RM', x: 85, y: 44, withBallX: 84, withBallY: 28 },
    { position: 'ST', x: 37, y: 17, withBallX: 38, withBallY: 12 },
    { position: 'ST', x: 63, y: 17, withBallX: 62, withBallY: 12 },
  ],
  '3-5-2': [
    { position: 'GK', x: 50, y: 89, withBallX: 50, withBallY: 86 },
    { position: 'CB', x: 25, y: 73, withBallX: 25, withBallY: 67 },
    { position: 'CB', x: 50, y: 76, withBallX: 50, withBallY: 70 },
    { position: 'CB', x: 75, y: 73, withBallX: 75, withBallY: 67 },
    { position: 'LM', x: 13, y: 46, withBallX: 12, withBallY: 28 },
    { position: 'CDM', x: 36, y: 54, withBallX: 37, withBallY: 48 },
    { position: 'CDM', x: 64, y: 54, withBallX: 63, withBallY: 48 },
    { position: 'RM', x: 87, y: 46, withBallX: 88, withBallY: 28 },
    { position: 'CAM', x: 50, y: 35, withBallX: 50, withBallY: 26 },
    { position: 'ST', x: 37, y: 16, withBallX: 37, withBallY: 11 },
    { position: 'ST', x: 63, y: 16, withBallX: 63, withBallY: 11 },
  ],
  '4-1-2-1-2 Narrow': [
    { position: 'GK', x: 50, y: 89, withBallX: 50, withBallY: 86 },
    { position: 'LB', x: 14, y: 69, withBallX: 11, withBallY: 48 },
    { position: 'CB', x: 37, y: 75, withBallX: 37, withBallY: 69 },
    { position: 'CB', x: 63, y: 75, withBallX: 63, withBallY: 69 },
    { position: 'RB', x: 86, y: 69, withBallX: 89, withBallY: 48 },
    { position: 'CDM', x: 50, y: 58, withBallX: 50, withBallY: 54 },
    { position: 'CM', x: 32, y: 44, withBallX: 32, withBallY: 36 },
    { position: 'CM', x: 68, y: 44, withBallX: 68, withBallY: 36 },
    { position: 'CAM', x: 50, y: 32, withBallX: 50, withBallY: 25 },
    { position: 'ST', x: 37, y: 16, withBallX: 38, withBallY: 11 },
    { position: 'ST', x: 63, y: 16, withBallX: 62, withBallY: 11 },
  ],
  '5-3-2': [
    { position: 'GK', x: 50, y: 89, withBallX: 50, withBallY: 86 },
    { position: 'LB', x: 12, y: 64, withBallX: 11, withBallY: 44 },
    { position: 'CB', x: 30, y: 74, withBallX: 30, withBallY: 68 },
    { position: 'CB', x: 50, y: 77, withBallX: 50, withBallY: 71 },
    { position: 'CB', x: 70, y: 74, withBallX: 70, withBallY: 68 },
    { position: 'RB', x: 88, y: 64, withBallX: 89, withBallY: 44 },
    { position: 'CM', x: 30, y: 46, withBallX: 31, withBallY: 38 },
    { position: 'CDM', x: 50, y: 52, withBallX: 50, withBallY: 46 },
    { position: 'CM', x: 70, y: 46, withBallX: 69, withBallY: 38 },
    { position: 'ST', x: 37, y: 18, withBallX: 37, withBallY: 12 },
    { position: 'ST', x: 63, y: 18, withBallX: 63, withBallY: 12 },
  ],
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateCardFacets(attrs: PlayerAttributes, pos: Position): CardFacets {
  if (pos === 'GK') {
    return {
      pac: Math.round(attrs.gkdiving),
      sho: Math.round(attrs.gkhandling),
      pas: Math.round(attrs.gkkicking),
      dri: Math.round(attrs.gkreflexes),
      def: Math.round(attrs.sprintspeed * 0.55 + attrs.acceleration * 0.45),
      phy: Math.round(attrs.gkpositioning),
    };
  }
  return {
    pac: Math.round(attrs.acceleration * 0.45 + attrs.sprintspeed * 0.55),
    sho: Math.round(
      attrs.finishing * 0.45 +
        attrs.shotpower * 0.2 +
        attrs.longshots * 0.2 +
        attrs.positioning * 0.05 +
        attrs.volleys * 0.05 +
        attrs.penalties * 0.05
    ),
    pas: Math.round(
      attrs.shortpassing * 0.35 +
        attrs.vision * 0.2 +
        attrs.crossing * 0.2 +
        attrs.longpassing * 0.15 +
        attrs.curve * 0.05 +
        attrs.freekickaccuracy * 0.05
    ),
    dri: Math.round(
      attrs.dribbling * 0.5 +
        attrs.ballcontrol * 0.35 +
        attrs.agility * 0.1 +
        attrs.balance * 0.05
    ),
    def: Math.round(
      attrs.marking * 0.3 +
        attrs.standingtackle * 0.3 +
        attrs.interceptions * 0.2 +
        attrs.headingaccuracy * 0.1 +
        attrs.slidingtackle * 0.1
    ),
    phy: Math.round(
      attrs.strength * 0.5 +
        attrs.stamina * 0.25 +
        attrs.aggression * 0.2 +
        attrs.jumping * 0.05
    ),
  };
}

export function calculateBaseOVRForPosition(
  attrs: PlayerAttributes,
  pos: Position,
  internationalRep: number = 1
): number {
  const weights = POSITION_WEIGHTS[pos];
  let weighted = 0;
  for (const [k, w] of Object.entries(weights)) {
    weighted += attrs[k as keyof PlayerAttributes] * (w ?? 0);
  }
  const repBonus = internationalRep >= 5 ? 2 : internationalRep >= 4 ? 1 : 0;
  return clamp(Math.round(weighted + repBonus), 40, 99);
}

export function getPositionPenalty(player: Pick<Player, 'primaryPosition' | 'otherPositions'>, deployed: Position): number {
  if (deployed === player.primaryPosition) return 0;
  if (player.otherPositions.includes(deployed)) return 0;
  if (player.primaryPosition === 'GK' || deployed === 'GK') return -18;
  const s1 = positionToSector(player.primaryPosition);
  const s2 = positionToSector(deployed);
  if (s1 === s2) return -3;
  if ((s1 === 'MID' && s2 === 'ATK') || (s1 === 'ATK' && s2 === 'MID')) return -6;
  if ((s1 === 'DEF' && s2 === 'MID') || (s1 === 'MID' && s2 === 'DEF')) return -7;
  return -12;
}

export function calculateMatchFitness(energy: number, sharpness: number, injury: InjuryState | null): number {
  const injuryFatigue = injury ? (injury.recovering ? (injury.severity === 'Minor' ? 14 : 24) : 45) : 0;
  return clamp(Math.round(0.75 * energy + 0.25 * sharpness - injuryFatigue), 0, 100);
}

export function calculateInjuryAggravationRisk(energy: number, injury: InjuryState | null): number {
  if (!injury || !injury.recovering) return 0;
  const severityWeight = injury.severity === 'Minor' ? 1 : injury.severity === 'Moderate' ? 2.4 : 4;
  return clamp(Math.round(12 + (100 - energy) * 0.45 + severityWeight * 10), 10, 78);
}

export const TARGET_MINUTE_SHARE: Record<SquadRole, number> = {
  Crucial: 0.80,
  Important: 0.60,
  Rotation: 0.35,
  Sporadic: 0.15,
  Prospect: 0.08,
};

export function calculateDynamicOVR(
  player: Pick<
    Player,
    | 'baseOvr'
    | 'attributes'
    | 'primaryPosition'
    | 'otherPositions'
    | 'internationalRep'
    | 'formScore'
    | 'morale'
    | 'energy'
    | 'sharpness'
    | 'injury'
    | 'squadRole'
    | 'seasonStats'
  >,
  deployedPosition?: Position,
  clubMatchesPlayed: number = 0
): DynamicOvrBreakdown {
  const pos = deployedPosition ?? player.primaryPosition;
  const posPenalty = getPositionPenalty(player, pos);

  // If deployed in a secondary recognized position, derive position-specific baseOvr blended with primary baseOvr
  const rawPosBase =
    pos === player.primaryPosition
      ? player.baseOvr
      : player.otherPositions.includes(pos)
      ? Math.round(player.baseOvr * 0.55 + calculateBaseOVRForPosition(player.attributes, pos, player.internationalRep) * 0.45)
      : player.baseOvr;

  // 1. Form modifier [-3, +3]
  let formDelta = 0;
  let formLabel: DynamicOvrBreakdown['formLabel'] = 'Okay';
  if (player.formScore >= 8.2) {
    formDelta = 3;
    formLabel = 'Excellent';
  } else if (player.formScore >= 7.5) {
    formDelta = 2;
    formLabel = 'Excellent';
  } else if (player.formScore >= 6.9) {
    formDelta = 1;
    formLabel = 'Good';
  } else if (player.formScore >= 6.2) {
    formDelta = 0;
    formLabel = 'Okay';
  } else if (player.formScore >= 5.6) {
    formDelta = -1;
    formLabel = 'Poor';
  } else if (player.formScore >= 5.0) {
    formDelta = -2;
    formLabel = 'Poor';
  } else {
    formDelta = -3;
    formLabel = 'Terrible';
  }

  // 2. Morale modifier [-2, +2] with Sweet Spot (68..84 -> +2; >=85 Complacent -> +1)
  let moraleDelta = 0;
  let moraleLabel: DynamicOvrBreakdown['moraleLabel'] = 'Content';
  if (player.morale >= 85) {
    moraleDelta = 1;
    moraleLabel = 'Complacent';
  } else if (player.morale >= 68) {
    moraleDelta = 2;
    moraleLabel = 'Happy';
  } else if (player.morale >= 52) {
    moraleDelta = 0;
    moraleLabel = 'Content';
  } else if (player.morale >= 35) {
    moraleDelta = -1;
    moraleLabel = 'Unhappy';
  } else {
    moraleDelta = -2;
    moraleLabel = 'Very Unhappy';
  }

  // 3. Playtime vs Squad Role modifier [-2, +1] once season has 4+ club fixtures
  let playtimeDelta = 0;
  if (clubMatchesPlayed >= 4) {
    const possibleMinutes = clubMatchesPlayed * 90;
    const actualShare = possibleMinutes > 0 ? player.seasonStats.minutes / possibleMinutes : 0;
    const target = TARGET_MINUTE_SHARE[player.squadRole];
    const gap = actualShare - target;
    if (gap < -0.25) playtimeDelta = -2;
    else if (gap < -0.12) playtimeDelta = -1;
    else if (gap >= 0.15) playtimeDelta = 1;
  }

  // 4. Match Fitness modifier [-6, 0] (penalty-only)
  const fitness = calculateMatchFitness(player.energy, player.sharpness, player.injury);
  let fitnessDelta = 0;
  let fitnessLabel: DynamicOvrBreakdown['fitnessLabel'] = 'Peak';
  if (fitness >= 88) {
    fitnessDelta = 0;
    fitnessLabel = 'Peak';
  } else if (fitness >= 78) {
    fitnessDelta = 0;
    fitnessLabel = 'Sharp';
  } else if (fitness >= 62) {
    fitnessDelta = -1;
    fitnessLabel = 'Tired';
  } else if (fitness >= 45) {
    fitnessDelta = -2;
    fitnessLabel = 'Fatigued';
  } else if (fitness >= 30) {
    fitnessDelta = -4;
    fitnessLabel = 'Fatigued';
  } else {
    fitnessDelta = -6;
    fitnessLabel = 'Exhausted';
  }

  // 5. Injury / Recovering modifier
  let injuryDelta = 0;
  if (player.injury) {
    if (player.injury.recovering) {
      injuryDelta = player.injury.severity === 'Minor' ? -2 : -4;
    } else {
      injuryDelta = -8;
    }
  }

  const rawDynamicShift = formDelta + moraleDelta + playtimeDelta + fitnessDelta + injuryDelta;
  const clampedShift = clamp(rawDynamicShift, -9, 5);
  const totalDelta = posPenalty + clampedShift;
  const dynamicOvr = clamp(rawPosBase + totalDelta, 40, 99);

  // Card facet live deltas (visible green +1..+3 / red -1..-4 on Team Management inspector)
  const facetDeltas: CardFacets = {
    pac: clamp(Math.round(formDelta * 0.6 + fitnessDelta * 0.7 + injuryDelta * 0.5), -5, 4),
    sho: clamp(Math.round(formDelta * 0.7 + moraleDelta * 0.4 + injuryDelta * 0.3), -4, 4),
    pas: clamp(Math.round(moraleDelta * 0.6 + formDelta * 0.4 + playtimeDelta * 0.4), -4, 4),
    dri: clamp(Math.round(formDelta * 0.6 + moraleDelta * 0.4 + fitnessDelta * 0.4), -4, 4),
    def: clamp(Math.round(moraleDelta * 0.4 + fitnessDelta * 0.5 + playtimeDelta * 0.4), -4, 4),
    phy: clamp(Math.round(fitnessDelta * 0.9 + injuryDelta * 0.6 + (formDelta > 1 ? 1 : 0)), -6, 3),
  };

  return {
    deployedPosition: pos,
    baseOvr: rawPosBase,
    positionPenalty: posPenalty,
    formDelta,
    moraleDelta,
    playtimeDelta,
    fitnessDelta,
    injuryDelta,
    totalDelta,
    dynamicOvr,
    formLabel,
    moraleLabel,
    fitnessLabel,
    facetDeltas,
  };
}

export function calculateTransferRoomXTV(
  baseOvr: number,
  dynamicOvr: number,
  potential: number,
  age: number,
  contractYearsRemaining: number,
  position: Position,
  formScore: number,
  seedValueEur?: number
): number {
  // Exponential market curve calibrated to EA FC 27 / TransferRoom xTV
  const effectiveOvr = baseOvr * 0.72 + dynamicOvr * 0.28;
  const potUpside = Math.max(0, potential - baseOvr);
  let ageFactor = 1.0;
  if (age <= 20) ageFactor = 1.32;
  else if (age <= 23) ageFactor = 1.24;
  else if (age <= 26) ageFactor = 1.12;
  else if (age <= 29) ageFactor = 0.92;
  else if (age <= 31) ageFactor = 0.68;
  else if (age <= 33) ageFactor = 0.42;
  else ageFactor = 0.24;

  const contractFactor =
    contractYearsRemaining <= 0
      ? 0.35
      : contractYearsRemaining === 1
      ? 0.66
      : contractYearsRemaining === 2
      ? 0.88
      : contractYearsRemaining >= 4
      ? 1.12
      : 1.0;

  const posFactor =
    position === 'ST' || position === 'LW' || position === 'RW' || position === 'CAM'
      ? 1.14
      : position === 'GK'
      ? 0.76
      : 1.0;

  const formFactor = clamp(1 + (formScore - 6.6) * 0.06, 0.85, 1.18);

  const syntheticVal =
    Math.pow(Math.max(1, effectiveOvr - 52), 2.55) * 2900 * (1 + potUpside * 0.055) * ageFactor * contractFactor * posFactor * formFactor;

  const blended = seedValueEur && seedValueEur > 0 ? seedValueEur * 0.55 + syntheticVal * 0.45 : syntheticVal;
  // Round neatly to nearest 100k (or 50k for low values)
  if (blended >= 10_000_000) return Math.round(blended / 500_000) * 500_000;
  if (blended >= 1_000_000) return Math.round(blended / 100_000) * 100_000;
  return Math.max(250_000, Math.round(blended / 50_000) * 50_000);
}

export function calculateWeeklyWageEur(ovr: number, age: number, clubPrestige: number): number {
  const base = Math.pow(Math.max(1, ovr - 55), 2.25) * 82;
  const ageMult = age >= 25 && age <= 31 ? 1.15 : age < 21 ? 0.68 : 0.92;
  const prestigeMult = 0.72 + clubPrestige * 0.065;
  return Math.max(3_500, Math.round((base * ageMult * prestigeMult) / 500) * 500);
}

export function calculatePlayerInterest(
  player: Player,
  buyerClub: Club,
  sellerClub: Club | undefined,
  offeredRole: SquadRole,
  offeredWageEur: number
): { label: 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'; score: number; reason: string } {
  let score = 50;
  const sellerPrestige = sellerClub?.domesticPrestige ?? 6;
  score += (buyerClub.domesticPrestige - sellerPrestige) * 7;

  // Rivalry penalty
  if (sellerClub && sellerClub.rivalClubIds.includes(buyerClub.id)) {
    score -= 22;
  }

  // Wage ratio
  const wageRatio = offeredWageEur / Math.max(1, player.weeklyWageEur);
  if (wageRatio >= 1.25) score += 18;
  else if (wageRatio >= 1.05) score += 10;
  else if (wageRatio < 0.85) score -= 18;

  // Squad role bump
  const roleOrder: SquadRole[] = ['Prospect', 'Sporadic', 'Rotation', 'Important', 'Crucial'];
  const roleDiff = roleOrder.indexOf(offeredRole) - roleOrder.indexOf(player.squadRole);
  score += roleDiff * 9;

  // Unhappy / transfer-listed bonus
  if (player.transferListed) score += 15;
  if (player.morale < 50) score += 12;

  score = clamp(Math.round(score), 5, 98);
  if (score >= 76) return { label: 'VERY HIGH', score, reason: 'Eager to join and elevate his career' };
  if (score >= 60) return { label: 'HIGH', score, reason: 'Interested in the project and squad role' };
  if (score >= 42) return { label: 'MEDIUM', score, reason: 'Open to talks if financial terms are convincing' };
  return { label: 'LOW', score, reason: 'Reluctant to leave current club without major incentive' };
}

export function buildLineupForFormation(
  formation: FormationId,
  clubPlayers: Player[]
): { lineup: TacticalSlot[]; benchIds: number[] } {
  const template = FORMATIONS[formation];
  const available = [...clubPlayers].sort((a, b) => b.dynamicOvr.dynamicOvr - a.dynamicOvr.dynamicOvr);
  const used = new Set<number>();

  const lineup: TacticalSlot[] = template.map((slot, idx) => {
    // 1. Healthy natural primary match
    let chosen = available.find(
      (p) => !used.has(p.id) && (!p.injury || p.injury.recovering) && p.primaryPosition === slot.position
    );
    // 2. Healthy secondary position match
    if (!chosen) {
      chosen = available.find(
        (p) => !used.has(p.id) && (!p.injury || p.injury.recovering) && p.otherPositions.includes(slot.position)
      );
    }
    // 3. Same sector fallback (never put outfield in GK unless forced)
    if (!chosen) {
      const targetSector = positionToSector(slot.position);
      chosen = available.find(
        (p) =>
          !used.has(p.id) &&
          (!p.injury || p.injury.recovering) &&
          positionToSector(p.primaryPosition) === targetSector
      );
    }
    // 4. Best remaining non-GK (or any)
    if (!chosen) {
      chosen = available.find(
        (p) => !used.has(p.id) && (slot.position === 'GK' || p.primaryPosition !== 'GK')
      );
    }
    if (!chosen) {
      chosen = available.find((p) => !used.has(p.id));
    }
    if (chosen) used.add(chosen.id);
    const defaultRole = ROLE_BY_POSITION[slot.position];
    return {
      slotIndex: idx,
      position: slot.position,
      playerId: chosen ? chosen.id : null,
      roleTitle: chosen?.roleTitle ?? defaultRole.title,
      focus: chosen?.roleFocus ?? defaultRole.focus,
      x: slot.x,
      y: slot.y,
      withBallX: slot.withBallX,
      withBallY: slot.withBallY,
    };
  });

  const benchIds = available
    .filter((p) => !used.has(p.id))
    .slice(0, 9)
    .map((p) => p.id);

  return { lineup, benchIds };
}

export function formatMoney(amountEur: number, currency: CurrencyCode = 'EUR', compact = true): string {
  const rate = currency === 'USD' ? 1.1 : currency === 'GBP' ? 0.85 : 1.0;
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  const val = amountEur * rate;
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);

  if (!compact) {
    return `${sign}${symbol}${Math.round(abs).toLocaleString('en-US')}`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000).toFixed(abs >= 100_000_000 ? 1 : 2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${symbol}${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  }
  return `${sign}${symbol}${Math.round(abs)}`;
}
