export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST';

export type Sector = 'GK' | 'DEF' | 'MID' | 'ATK';

export type GrowthProfile =
  | 'Default'
  | 'ExplosiveStart'
  | 'MeteoricPeak'
  | 'ConsistentPerformer'
  | 'CompleteTechnician'
  | 'LateBloomer';

export type SquadRole = 'Crucial' | 'Important' | 'Rotation' | 'Sporadic' | 'Prospect';

export type RoleFamiliarity = 'Base' | 'Role+' | 'Role++';

export type TacticalVision =
  | 'Tiki-Taka'
  | 'Gegenpressing'
  | 'Wing Play'
  | 'Counter-Attack'
  | 'Park the Bus'
  | 'Standard';

export type Mentality = 'Ultra Defensive' | 'Defensive' | 'Balanced' | 'Attacking' | 'Ultra Attacking';

export type EnergyRecoveryPolicy = 'Aggressive' | 'Balanced' | 'Conservative';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP';

export type FormationId =
  | '4-3-3 Attack'
  | '4-3-3 Holding'
  | '4-2-3-1 Wide'
  | '4-4-2 Flat'
  | '3-5-2'
  | '4-1-2-1-2 Narrow'
  | '5-3-2';

export interface PlayerAttributes {
  acceleration: number;
  sprintspeed: number;
  agility: number;
  balance: number;
  jumping: number;
  stamina: number;
  strength: number;
  reactions: number;
  aggression: number;
  composure: number;
  interceptions: number;
  positioning: number;
  vision: number;
  ballcontrol: number;
  crossing: number;
  dribbling: number;
  finishing: number;
  freekickaccuracy: number;
  headingaccuracy: number;
  longpassing: number;
  shortpassing: number;
  marking: number;
  shotpower: number;
  longshots: number;
  standingtackle: number;
  slidingtackle: number;
  volleys: number;
  curve: number;
  penalties: number;
  gkdiving: number;
  gkhandling: number;
  gkkicking: number;
  gkreflexes: number;
  gkpositioning: number;
}

export interface CardFacets {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface InjuryState {
  type: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  daysRemaining: number;
  recovering: boolean; // If true, manager may risk playing player with aggravation %
  aggravationRiskPct: number;
}

export interface DynamicOvrBreakdown {
  deployedPosition: Position;
  baseOvr: number;
  positionPenalty: number;
  formDelta: number;
  moraleDelta: number;
  playtimeDelta: number;
  fitnessDelta: number;
  injuryDelta: number;
  totalDelta: number;
  dynamicOvr: number;
  formLabel: 'Excellent' | 'Good' | 'Okay' | 'Poor' | 'Terrible';
  moraleLabel: 'Complacent' | 'Happy' | 'Content' | 'Unhappy' | 'Very Unhappy';
  fitnessLabel: 'Peak' | 'Sharp' | 'Tired' | 'Fatigued' | 'Exhausted';
  facetDeltas: CardFacets;
}

export interface DevelopmentPlan {
  mode: 'Balanced' | 'RoleFocus' | 'PositionRetrain';
  targetRole: string;
  targetPosition?: Position;
  weeksCompleted: number;
  weeksRequired: number;
  momentum: number; // 0..100 (drops when young player lacks minutes or has poor form)
}

export interface PlayerSeasonStats {
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  matchRatings: number[]; // last N ratings
  avgRating: number;
}

export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  knownAs: string;
  jerseyName: string;
  jerseyNumber: number;
  nationality: string;
  nationId: number;
  age: number;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  preferredFoot: 'Left' | 'Right';
  skillMoves: number;
  weakFoot: number;
  internationalRep: number;
  headshotUrl: string;
  playStyles: string[];
  primaryPosition: Position;
  otherPositions: Position[];
  clubId: number;
  clubName: string;
  isExternalClub: boolean;
  isLoanedOut: boolean;
  attributes: PlayerAttributes;
  cardFacets: CardFacets;
  baseOvr: number;
  potential: number;
  growthProfile: GrowthProfile;
  xpProgress: number; // 0..100 toward next attribute bump
  energy: number; // 0..100
  sharpness: number; // 0..100 (contributes 25% to Match Fitness)
  matchFitness: number; // 0..100
  morale: number; // 0..100 (Sweet spot 68..84)
  formScore: number; // 4.0..9.5 rolling index
  squadRole: SquadRole;
  roleTitle: string;
  roleFocus: 'Attack' | 'Balanced' | 'Defend' | 'Roam';
  roleFamiliarity: RoleFamiliarity;
  injury: InjuryState | null;
  transferListed: boolean;
  loanListed: boolean;
  expectedTransferValue: number; // EUR TransferRoom xTV
  weeklyWageEur: number;
  releaseClauseEur: number;
  contractEndYear: number;
  joinDate: string;
  developmentPlan: DevelopmentPlan;
  seasonStats: PlayerSeasonStats;
  isRegen?: boolean;
  isAcademyGraduate?: boolean;
  dynamicOvr: DynamicOvrBreakdown;
}

export interface Coach {
  id: string;
  name: string;
  department: Sector;
  stars: number; // 1..5
  tacticalStyle: TacticalVision;
  weeklySalaryEur: number;
  hired: boolean;
}

export interface TacticalSlot {
  slotIndex: number;
  position: Position;
  playerId: number | null;
  roleTitle: string;
  focus: 'Attack' | 'Balanced' | 'Defend' | 'Roam';
  x: number; // 0..100 (left to right)
  y: number; // 0..100 (top=attack, bottom=GK)
  withBallX: number;
  withBallY: number;
}

export interface Club {
  id: number;
  name: string;
  shortName: string;
  slug: string;
  leagueId: number;
  isLaLiga: boolean;
  primaryColor: string;
  secondaryColor: string;
  managerName: string;
  domesticPrestige: number; // 1..10
  profitability: number;
  transferBudgetEur: number;
  wageBudgetRemainingEur: number;
  budgetSplitTransferPct: number; // 0..100
  clubWorthEur: number;
  formation: FormationId;
  tacticalVision: TacticalVision;
  mentality: Mentality;
  defensiveLineHeight: number; // 30..90
  lineup: TacticalSlot[];
  benchIds: number[];
  captainId: number | null;
  penaltyTakerId: number | null;
  freeKickTakerId: number | null;
  cornerTakerId: number | null;
  rivalClubIds: number[];
  relationships: Record<number, number>; // clubId -> -2..10
  coaches: Coach[];
  boardConfidence: number; // 0..100
}

export interface YouthScout {
  id: string;
  name: string;
  nationality: string;
  experience: number; // 1..5
  judgement: number; // 1..5
  costEur: number;
  hired: boolean;
  mission: {
    country: string;
    targetPosition: Position | 'ANY';
    durationMonths: number;
    daysRemaining: number;
    costEur: number;
  } | null;
}

export interface YouthProspect {
  id: string;
  name: string;
  nationality: string;
  age: number; // 14..18
  heightCm: number;
  primaryPosition: Position;
  growthProfile: GrowthProfile;
  trueOvr: number;
  truePotential: number;
  ovrRange: [number, number];
  potRange: [number, number];
  statRanges: Record<keyof CardFacets, [number, number]>;
  monthsScouted: number;
  playStyles: string[];
  unsettled: boolean;
  inAcademy: boolean; // false = in scout report awaiting Sign/Reject
  preferredFoot: 'Left' | 'Right';
  attributes: PlayerAttributes;
}

export interface ScoutInstruction {
  id: string;
  name: string;
  position: Position | 'ANY';
  minAge: number;
  maxAge: number;
  minOvr: number;
  maxValueM: number;
  active: boolean;
}

export interface ScoutReportProgress {
  playerId: number;
  stage: 1 | 2 | 3 | 4; // 1: Tactical Fit, 2: Future, 3: Financial, 4: Complete
  daysElapsed: number;
  tacticalFit: string;
  futureVerdict: string;
  financialEstimate: string;
  statusNote: string;
}

export type NegotiationType = 'BUY' | 'SELL' | 'LOAN_IN' | 'LOAN_OUT' | 'CONTRACT';

export type NegotiationStage =
  | 'ENQUIRY'
  | 'CLUB_TALKS'
  | 'PLAYER_TALKS'
  | 'DELEGATED'
  | 'HIJACKED'
  | 'AGREED'
  | 'COMPLETED'
  | 'COLLAPSED'
  | 'REJECTED';

export interface NegotiationOffer {
  startDate: 'IMMEDIATE' | 'NEXT_WINDOW';
  transferFeeEur: number;
  instalments: 1 | 2 | 3 | 4;
  paidNowEur: number;
  futurePaymentsEur: number;
  exchangePlayerId: number | null;
  achievementBonusEur: number;
  sellOnClausePct: number;
  wageEur: number;
  contractYears: number;
  squadRole: SquadRole;
  signingBonusEur: number;
  releaseClauseEur: number;
}

export interface TransferNegotiation {
  id: string;
  type: NegotiationType;
  playerId: number;
  fromClubId: number;
  toClubId: number;
  counterpartManager: string;
  counterpartClubName: string;
  stage: NegotiationStage;
  tension: number; // 0..100 (Low <35, Medium 35..70, High >70)
  daysOpen: number;
  lastUpdatedDate: string;
  askingFeeEur: number;
  askingWageEur: number;
  desiredRole: SquadRole;
  desiredYears: number;
  currentOffer: NegotiationOffer;
  managerDialogue: string;
  scoutRecommendation: string;
  rivalClubId?: number;
  rivalClubName?: string;
  rivalBidEur?: number;
  delegatedMaxEur?: number;
  history: { date: string; actor: string; message: string }[];
}

export interface TransferRecord {
  id: string;
  date: string;
  playerId: number;
  playerName: string;
  position: Position;
  ovr: number;
  fromClubId: number;
  fromClubName: string;
  toClubId: number;
  toClubName: string;
  feeEur: number;
  instalments: number;
  futureDueEur: number;
  sellOnPct: number;
  isUserDeal: boolean;
  pressHeadline: string;
  socialComments: { handle: string; text: string; likes: number }[];
}

export interface InstallmentObligation {
  id: string;
  playerId: number;
  playerName: string;
  counterpartClubName: string;
  direction: 'PAYABLE' | 'RECEIVABLE';
  amountPerSeasonEur: number;
  seasonsRemaining: number;
  sellOnPct: number;
}

export interface Fixture {
  id: string;
  round: number;
  date: string; // YYYY-MM-DD
  homeClubId: number;
  awayClubId: number;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homePossession: number;
  homeShots: number;
  awayShots: number;
  events: MatchEvent[];
  weather: 'Clear' | 'Overcast' | 'Rain' | 'Night';
}

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'ASSIST' | 'YELLOW' | 'RED' | 'INJURY' | 'AGGRAVATION' | 'SUB' | 'SAVE' | 'CHANCE';
  clubId: number;
  playerId: number;
  playerName: string;
  assistPlayerId?: number;
  assistPlayerName?: string;
  description: string;
}

export interface LeagueStanding {
  clubId: number;
  clubName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface InboxChoice {
  id: string;
  label: string;
  effectSummary: string;
  moraleDelta?: number;
  energyDelta?: number;
  boardDelta?: number;
  budgetDeltaEur?: number;
  excuseDays?: number;
}

export interface InboxMessage {
  id: string;
  date: string;
  category: 'BOARD' | 'TRANSFER' | 'PLAYER' | 'EVENT' | 'PRESS' | 'SCOUT' | 'YOUTH';
  sender: string;
  subject: string;
  body: string;
  read: boolean;
  urgent?: boolean;
  playerId?: number;
  negotiationId?: string;
  choices?: InboxChoice[];
  resolvedChoiceId?: string;
}

export interface BoardObjective {
  id: string;
  term: 'SHORT' | 'LONG';
  category: 'Domestic' | 'Financial' | 'Youth' | 'Brand';
  title: string;
  targetDescription: string;
  progressPct: number;
  completed: boolean;
  priority: 'Critical' | 'High' | 'Medium';
}

export interface FinancialTransaction {
  id: string;
  date: string;
  category: 'Transfer' | 'Wages' | 'Matchday' | 'Broadcast' | 'Merchandise' | 'Scouting' | 'Prize';
  description: string;
  amountEur: number; // positive = income, negative = expense
}

export interface CareerSettings {
  currency: CurrencyCode;
  energyRecovery: EnergyRecoveryPolicy;
  liveSimSpeedMs: number;
  autoPauseOnOffer: boolean;
  simulationDepth: 'LaLiga + European Pool' | 'Only LALIGA EA SPORTS';
}

export interface LiveMatchState {
  fixtureId: string;
  minute: number;
  isHalfTime: boolean;
  isFinished: boolean;
  homeClubId: number;
  awayClubId: number;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePossession: number;
  momentum: number; // -100 (away) to +100 (home)
  homeStamina: Record<number, number>;
  awayStamina: Record<number, number>;
  homeLineupIds: number[];
  awayLineupIds: number[];
  homeBenchIds: number[];
  awayBenchIds: number[];
  homeSubsUsed: number;
  awaySubsUsed: number;
  homeRedCards: number[];
  awayRedCards: number[];
  homeMentality: Mentality;
  awayMentality: Mentality;
  homeVision: TacticalVision;
  awayVision: TacticalVision;
  playerRatings: Record<number, number>;
  events: MatchEvent[];
  aggravatedPlayerIds: number[];
  newInjuries: Record<number, InjuryState>;
  homeSectors: { gk: number; def: number; mid: number; atk: number };
  awaySectors: { gk: number; def: number; mid: number; atk: number };
  weather: Fixture['weather'];
}

export interface CareerState {
  version: number;
  saveName: string;
  seasonNumber: number;
  currentDate: string; // YYYY-MM-DD, starts 2026-07-01
  transferWindowOpen: boolean;
  transferWindowClosesDate: string;
  deadlineDayHoursRemaining: number | null; // 20..0 on Aug 31 or Jan 31
  userClubId: number;
  clubs: Record<number, Club>;
  players: Record<number, Player>;
  fixtures: Fixture[];
  standings: LeagueStanding[];
  negotiations: TransferNegotiation[];
  shortlistIds: number[];
  transferHistory: TransferRecord[];
  installments: InstallmentObligation[];
  scoutInstructions: ScoutInstruction[];
  scoutReports: Record<number, ScoutReportProgress>;
  youthScouts: YouthScout[];
  youthProspects: YouthProspect[];
  inbox: InboxMessage[];
  objectives: BoardObjective[];
  transactions: FinancialTransaction[];
  settings: CareerSettings;
  pendingRevealTransfer: TransferRecord | null;
  pendingEventModalId: string | null;
  seasonCompleted: boolean;
  lastSavedAt: string;
}
