import {
  buildLineupForFormation,
  calculateCardFacets,
  calculateDynamicOVR,
  calculateMatchFitness,
  calculateTransferRoomXTV,
  calculateWeeklyWageEur,
  clamp,
  normalizePosition,
  ROLE_BY_POSITION,
} from './ratings.ts';
import {
  Club,
  Coach,
  FormationId,
  GrowthProfile,
  Player,
  PlayerAttributes,
  Position,
  RoleFamiliarity,
  Sector,
  SquadRole,
  TacticalVision,
} from './types.ts';

interface ClubMeta {
  shortName: string;
  primary: string;
  secondary: string;
  manager: string;
  formation: FormationId;
  vision: TacticalVision;
  budgetEur: number;
  worthEur: number;
  rivals: number[];
}

export const TOP_5_LEAGUES: Record<number, { name: string; country: string; flag: string; tier: number }> = {
  13: { name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 1 },
  53: { name: 'LALIGA EA SPORTS', country: 'Spain', flag: '🇪🇸', tier: 1 },
  19: { name: 'Bundesliga', country: 'Germany', flag: '🇩🇪', tier: 1 },
  31: { name: 'Serie A Enilive', country: 'Italy', flag: '🇮🇹', tier: 1 },
  16: { name: 'Ligue 1 McDonald\'s', country: 'France', flag: '🇫🇷', tier: 1 },
};

const LALIGA_CLUB_META: Record<number, ClubMeta> = {
  // Premier League (League 13)
  1: {
    shortName: 'ARS',
    primary: '#ef0107',
    secondary: '#063672',
    manager: 'Mikel Arteta',
    formation: '4-3-3 Attack',
    vision: 'Tiki-Taka',
    budgetEur: 130_000_000,
    worthEur: 3_400_000_000,
    rivals: [18, 5],
  },
  2: {
    shortName: 'AVL',
    primary: '#95bfe5',
    secondary: '#670e36',
    manager: 'Unai Emery',
    formation: '4-2-3-1 Wide',
    vision: 'Counter-Attack',
    budgetEur: 70_000_000,
    worthEur: 1_100_000_000,
    rivals: [],
  },
  5: {
    shortName: 'CHE',
    primary: '#034694',
    secondary: '#dba111',
    manager: 'Enzo Maresca',
    formation: '4-2-3-1 Wide',
    vision: 'Tiki-Taka',
    budgetEur: 145_000_000,
    worthEur: 3_100_000_000,
    rivals: [1, 18],
  },
  9: {
    shortName: 'LIV',
    primary: '#c8102e',
    secondary: '#00b2a9',
    manager: 'Arne Slot',
    formation: '4-3-3 Attack',
    vision: 'Gegenpressing',
    budgetEur: 140_000_000,
    worthEur: 4_100_000_000,
    rivals: [7, 11],
  },
  10: {
    shortName: 'MCI',
    primary: '#6cabdd',
    secondary: '#1c2c5b',
    manager: 'Pep Guardiola',
    formation: '4-3-3 Holding',
    vision: 'Tiki-Taka',
    budgetEur: 210_000_000,
    worthEur: 4_900_000_000,
    rivals: [11, 9],
  },
  11: {
    shortName: 'MUN',
    primary: '#da291c',
    secondary: '#000000',
    manager: 'Ruben Amorim',
    formation: '3-5-2',
    vision: 'Gegenpressing',
    budgetEur: 115_000_000,
    worthEur: 3_800_000_000,
    rivals: [10, 9],
  },
  13: {
    shortName: 'NEW',
    primary: '#241f20',
    secondary: '#ffffff',
    manager: 'Eddie Howe',
    formation: '4-3-3 Holding',
    vision: 'Gegenpressing',
    budgetEur: 85_000_000,
    worthEur: 1_200_000_000,
    rivals: [106],
  },
  18: {
    shortName: 'TOT',
    primary: '#132257',
    secondary: '#ffffff',
    manager: 'Ange Postecoglou',
    formation: '4-3-3 Attack',
    vision: 'Gegenpressing',
    budgetEur: 105_000_000,
    worthEur: 2_800_000_000,
    rivals: [1, 5],
  },

  // Bundesliga (League 19)
  21: {
    shortName: 'FCB',
    primary: '#dc052d',
    secondary: '#0066b2',
    manager: 'Vincent Kompany',
    formation: '4-2-3-1 Wide',
    vision: 'Gegenpressing',
    budgetEur: 160_000_000,
    worthEur: 4_200_000_000,
    rivals: [22],
  },
  22: {
    shortName: 'BVB',
    primary: '#fde100',
    secondary: '#000000',
    manager: 'Nuri Şahin',
    formation: '4-2-3-1 Wide',
    vision: 'Gegenpressing',
    budgetEur: 85_000_000,
    worthEur: 1_900_000_000,
    rivals: [21, 34],
  },
  32: {
    shortName: 'B04',
    primary: '#e32221',
    secondary: '#000000',
    manager: 'Xabi Alonso',
    formation: '3-5-2',
    vision: 'Gegenpressing',
    budgetEur: 95_000_000,
    worthEur: 1_600_000_000,
    rivals: [31],
  },
  112172: {
    shortName: 'RBL',
    primary: '#ffffff',
    secondary: '#ed1c24',
    manager: 'Marco Rose',
    formation: '4-2-2-2' as FormationId,
    vision: 'Gegenpressing',
    budgetEur: 75_000_000,
    worthEur: 1_300_000_000,
    rivals: [],
  },

  // Serie A (League 31)
  45: {
    shortName: 'JUV',
    primary: '#000000',
    secondary: '#ffffff',
    manager: 'Thiago Motta',
    formation: '4-2-3-1 Wide',
    vision: 'Standard',
    budgetEur: 90_000_000,
    worthEur: 2_100_000_000,
    rivals: [131682, 54],
  },
  131682: {
    shortName: 'INT',
    primary: '#001ea0',
    secondary: '#000000',
    manager: 'Simone Inzaghi',
    formation: '3-5-2',
    vision: 'Tiki-Taka',
    budgetEur: 100_000_000,
    worthEur: 2_200_000_000,
    rivals: [131681, 45],
  },
  131681: {
    shortName: 'MIL',
    primary: '#fb090b',
    secondary: '#000000',
    manager: 'Paulo Fonseca',
    formation: '4-2-3-1 Wide',
    vision: 'Counter-Attack',
    budgetEur: 85_000_000,
    worthEur: 1_850_000_000,
    rivals: [131682],
  },
  48: {
    shortName: 'NAP',
    primary: '#0080ff',
    secondary: '#ffffff',
    manager: 'Antonio Conte',
    formation: '4-3-3 Holding',
    vision: 'Counter-Attack',
    budgetEur: 80_000_000,
    worthEur: 1_500_000_000,
    rivals: [52],
  },

  // Ligue 1 (League 16)
  73: {
    shortName: 'PSG',
    primary: '#004170',
    secondary: '#da291c',
    manager: 'Luis Enrique',
    formation: '4-3-3 Attack',
    vision: 'Tiki-Taka',
    budgetEur: 180_000_000,
    worthEur: 4_100_000_000,
    rivals: [219],
  },
  219: {
    shortName: 'OM',
    primary: '#2faee0',
    secondary: '#ffffff',
    manager: 'Roberto De Zerbi',
    formation: '4-2-3-1 Wide',
    vision: 'Gegenpressing',
    budgetEur: 60_000_000,
    worthEur: 850_000_000,
    rivals: [73],
  },
  69: {
    shortName: 'ASM',
    primary: '#e51b24',
    secondary: '#ffffff',
    manager: 'Adi Hütter',
    formation: '4-2-3-1 Wide',
    vision: 'Wing Play',
    budgetEur: 65_000_000,
    worthEur: 900_000_000,
    rivals: [72],
  },

  // LaLiga EA Sports (League 53)
  243: {
    shortName: 'RMA',
    primary: '#f4f5f7',
    secondary: '#1d4ed8',
    manager: 'Xabi Alonso',
    formation: '4-3-3 Attack',
    vision: 'Gegenpressing',
    budgetEur: 185_000_000,
    worthEur: 4_800_000_000,
    rivals: [241, 240],
  },
  241: {
    shortName: 'BAR',
    primary: '#a50044',
    secondary: '#004d98',
    manager: 'Hansi Flick',
    formation: '4-2-3-1 Wide',
    vision: 'Tiki-Taka',
    budgetEur: 115_000_000,
    worthEur: 4_300_000_000,
    rivals: [243, 452],
  },
  240: {
    shortName: 'ATM',
    primary: '#cb3524',
    secondary: '#1c3f87',
    manager: 'Diego Simeone',
    formation: '3-5-2',
    vision: 'Counter-Attack',
    budgetEur: 105_000_000,
    worthEur: 1_950_000_000,
    rivals: [243, 241],
  },
  448: {
    shortName: 'ATH',
    primary: '#ee2523',
    secondary: '#1a1a1a',
    manager: 'Ernesto Valverde',
    formation: '4-2-3-1 Wide',
    vision: 'Wing Play',
    budgetEur: 62_000_000,
    worthEur: 840_000_000,
    rivals: [457],
  },
  457: {
    shortName: 'RSO',
    primary: '#0067b1',
    secondary: '#f4f6fa',
    manager: 'Imanol Alguacil',
    formation: '4-3-3 Holding',
    vision: 'Tiki-Taka',
    budgetEur: 58_000_000,
    worthEur: 790_000_000,
    rivals: [448],
  },
  483: {
    shortName: 'VIL',
    primary: '#f5d423',
    secondary: '#005187',
    manager: 'Marcelino',
    formation: '4-4-2 Flat',
    vision: 'Counter-Attack',
    budgetEur: 55_000_000,
    worthEur: 760_000_000,
    rivals: [461],
  },
  449: {
    shortName: 'BET',
    primary: '#0bb363',
    secondary: '#f5f7f6',
    manager: 'Manuel Pellegrini',
    formation: '4-2-3-1 Wide',
    vision: 'Tiki-Taka',
    budgetEur: 46_000_000,
    worthEur: 690_000_000,
    rivals: [481],
  },
  481: {
    shortName: 'SEV',
    primary: '#d62828',
    secondary: '#f5f5f5',
    manager: 'García Pimienta',
    formation: '4-3-3 Holding',
    vision: 'Wing Play',
    budgetEur: 42_000_000,
    worthEur: 660_000_000,
    rivals: [449],
  },
  461: {
    shortName: 'VAL',
    primary: '#f5f5f5',
    secondary: '#f97316',
    manager: 'Carlos Corberán',
    formation: '4-4-2 Flat',
    vision: 'Counter-Attack',
    budgetEur: 36_000_000,
    worthEur: 590_000_000,
    rivals: [483, 1853],
  },
  450: {
    shortName: 'CEL',
    primary: '#6bb8e8',
    secondary: '#e11d48',
    manager: 'Claudio Giráldez',
    formation: '3-5-2',
    vision: 'Gegenpressing',
    budgetEur: 34_000_000,
    worthEur: 480_000_000,
    rivals: [242],
  },
  479: {
    shortName: 'OSA',
    primary: '#b91c1c',
    secondary: '#1e3a8a',
    manager: 'Vicente Moreno',
    formation: '4-3-3 Holding',
    vision: 'Wing Play',
    budgetEur: 28_000_000,
    worthEur: 390_000_000,
    rivals: [463],
  },
  480: {
    shortName: 'RAY',
    primary: '#f5f5f5',
    secondary: '#dc2626',
    manager: 'Iñigo Pérez',
    formation: '4-2-3-1 Wide',
    vision: 'Gegenpressing',
    budgetEur: 26_000_000,
    worthEur: 350_000_000,
    rivals: [1860],
  },
  1860: {
    shortName: 'GET',
    primary: '#1d4ed8',
    secondary: '#ef4444',
    manager: 'José Bordalás',
    formation: '4-4-2 Flat',
    vision: 'Park the Bus',
    budgetEur: 24_000_000,
    worthEur: 340_000_000,
    rivals: [480],
  },
  452: {
    shortName: 'ESP',
    primary: '#2563eb',
    secondary: '#f8fafc',
    manager: 'Manolo González',
    formation: '4-4-2 Flat',
    vision: 'Counter-Attack',
    budgetEur: 25_000_000,
    worthEur: 360_000_000,
    rivals: [241],
  },
  463: {
    shortName: 'ALA',
    primary: '#1d4ed8',
    secondary: '#f8fafc',
    manager: 'Eduardo Coudet',
    formation: '4-2-3-1 Wide',
    vision: 'Standard',
    budgetEur: 22_000_000,
    worthEur: 310_000_000,
    rivals: [479],
  },
  1853: {
    shortName: 'LEV',
    primary: '#991b1b',
    secondary: '#1d4ed8',
    manager: 'Julián Calero',
    formation: '4-4-2 Flat',
    vision: 'Counter-Attack',
    budgetEur: 20_000_000,
    worthEur: 290_000_000,
    rivals: [461],
  },
  468: {
    shortName: 'ELC',
    primary: '#15803d',
    secondary: '#f8fafc',
    manager: 'Eder Sarabia',
    formation: '4-3-3 Holding',
    vision: 'Tiki-Taka',
    budgetEur: 18_000_000,
    worthEur: 265_000_000,
    rivals: [],
  },
  242: {
    shortName: 'DEP',
    primary: '#1d4ed8',
    secondary: '#f8fafc',
    manager: 'Óscar Gilsanz',
    formation: '4-2-3-1 Wide',
    vision: 'Wing Play',
    budgetEur: 19_000_000,
    worthEur: 280_000_000,
    rivals: [450],
  },
  456: {
    shortName: 'RAC',
    primary: '#16a34a',
    secondary: '#111827',
    manager: 'José Alberto López',
    formation: '4-2-3-1 Wide',
    vision: 'Gegenpressing',
    budgetEur: 17_000_000,
    worthEur: 250_000_000,
    rivals: [],
  },
  573: {
    shortName: 'MAL',
    primary: '#38bdf8',
    secondary: '#f8fafc',
    manager: 'Sergio Pellicer',
    formation: '4-3-3 Holding',
    vision: 'Standard',
    budgetEur: 16_000_000,
    worthEur: 245_000_000,
    rivals: [],
  },
};

const EXTERNAL_MANAGERS = [
  'Andoni Iraola',
  'Arne Slot',
  'Mikel Arteta',
  'Luis Enrique',
  'Vincent Kompany',
  'Simone Inzaghi',
  'Antonio Conte',
  'Unai Emery',
  'Enzo Maresca',
  'Ruben Amorim',
  'Thiago Motta',
  'Cesc Fàbregas',
];

const COACH_FIRST_NAMES = [
  'Carlos', 'Miguel', 'Javier', 'Alberto', 'Rubén', 'David', 'Sergio', 'Fernando',
  'Pablo', 'Héctor', 'Raúl', 'Andrés', 'Iker', 'Marcos', 'Álvaro', 'Diego',
];
const COACH_LAST_NAMES = [
  'Mendoza', 'Serrano', 'Vázquez', 'Navarro', 'Ortega', 'Morales', 'Castillo', 'Domínguez',
  'Ramos', 'Garrido', 'Blanco', 'Delgado', 'Herrera', 'Cano', 'Prieto', 'Reyes',
];

export function parseCsvRecords(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // skip CR
    } else if (ch === '\n') {
      row.push(field);
      if (row.length > 1 || row[0] !== '') {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function deterministicHash(num: number): number {
  let x = (num ^ 0x45d9f3b) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  return Math.abs((x >> 16) ^ x);
}

function assignGrowthProfile(
  playerId: number,
  age: number,
  ovr: number,
  potential: number,
  attrs: PlayerAttributes,
  pos: Position
): GrowthProfile {
  const potGap = potential - ovr;
  const h = deterministicHash(playerId) % 100;

  if (age <= 21 && potGap >= 9 && (attrs.acceleration + attrs.sprintspeed) / 2 >= 80) {
    return h < 55 ? 'ExplosiveStart' : 'MeteoricPeak';
  }
  if (age <= 22 && potGap >= 7) {
    return h < 45 ? 'MeteoricPeak' : 'ExplosiveStart';
  }
  if (pos === 'GK' || (age >= 25 && (attrs.vision + attrs.shortpassing + attrs.ballcontrol) / 3 >= 76)) {
    return h < 55 ? 'CompleteTechnician' : 'ConsistentPerformer';
  }
  if (age >= 23 && potGap >= 4) {
    return 'LateBloomer';
  }
  if (ovr >= 82 || attrs.composure >= 78) {
    return h < 55 ? 'ConsistentPerformer' : 'CompleteTechnician';
  }
  const pool: GrowthProfile[] = [
    'Default',
    'ConsistentPerformer',
    'LateBloomer',
    'CompleteTechnician',
    'ExplosiveStart',
    'MeteoricPeak',
  ];
  return pool[h % pool.length];
}

function generateInitialCoaches(clubId: number, prestige: number, vision: TacticalVision): Coach[] {
  const departments: Sector[] = ['GK', 'DEF', 'MID', 'ATK'];
  const visions: TacticalVision[] = ['Tiki-Taka', 'Gegenpressing', 'Wing Play', 'Counter-Attack', 'Park the Bus', 'Standard'];
  const coaches: Coach[] = [];

  // 12 coach pool (4 hired — 1 per department initially — plus 8 hireable market coaches)
  for (let i = 0; i < 12; i++) {
    const dept = departments[i % 4];
    const h = deterministicHash(clubId * 31 + i * 17);
    const hired = i < 4;
    const baseStars = hired
      ? clamp(Math.round(prestige / 2.2) + (h % 2), 2, 5)
      : clamp(2 + (h % 4), 2, 5);
    const first = COACH_FIRST_NAMES[h % COACH_FIRST_NAMES.length];
    const last = COACH_LAST_NAMES[(h >> 4) % COACH_LAST_NAMES.length];
    coaches.push({
      id: `coach-${clubId}-${i}`,
      name: `${first} ${last}`,
      department: dept,
      stars: baseStars,
      tacticalStyle: hired ? vision : visions[h % visions.length],
      weeklySalaryEur: baseStars * 12_500,
      hired,
    });
  }
  return coaches;
}

export interface ParsedDatabase {
  clubs: Record<number, Club>;
  players: Record<number, Player>;
  laLigaClubIds: number[];
  top5ClubIds: number[];
  clubsByLeague: Record<number, number[]>;
}

export function parseCareerDatabaseFromCsv(csvText: string): ParsedDatabase {
  const rows = parseCsvRecords(csvText);
  if (rows.length < 2) {
    throw new Error('CSV database appears empty or invalid.');
  }

  const headers = rows[0];
  const col = new Map<string, number>();
  headers.forEach((h, idx) => col.set(h.trim(), idx));

  const getStr = (r: string[], name: string, fallback = ''): string => {
    const idx = col.get(name);
    if (idx === undefined || idx >= r.length) return fallback;
    return r[idx]?.trim() || fallback;
  };

  const getNum = (r: string[], name: string, fallback = 0): number => {
    const raw = getStr(r, name, '');
    if (!raw || raw === '-' || raw === 'null') return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const clubs: Record<number, Club> = {};
  const players: Record<number, Player> = {};
  const playersByClub = new Map<number, Player[]>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 40) continue;

    const playerId = getNum(r, 'info.playerid', i + 100000);
    const clubId = getNum(r, 'info.teams.club_team.id', 0);
    const clubName = getStr(r, 'info.teams.club_team.name', 'Free Agents');
    const clubLeagueId = getNum(r, 'info.teams.club_team.leagueid', 0);
    const isLaLiga = clubLeagueId === 53 && Boolean(LALIGA_CLUB_META[clubId]);

    if (!clubs[clubId]) {
      const meta = LALIGA_CLUB_META[clubId];
      const prestige = clamp(getNum(r, 'info.teams.club_team.domesticprestige', 5), 1, 10);
      const profitability = clamp(getNum(r, 'info.teams.club_team.profitability', 3), 1, 10);
      const h = deterministicHash(clubId);
      const shortName =
        meta?.shortName ??
        clubName
          .replace(/[^A-Za-z ]/g, '')
          .split(' ')
          .filter(Boolean)
          .map((w) => w[0])
          .join('')
          .slice(0, 3)
          .toUpperCase()
          .padEnd(3, 'X');

      const fallbackColors = [
        ['#1e3a8a', '#f8fafc'],
        ['#991b1b', '#facc15'],
        ['#065f46', '#e2e8f0'],
        ['#581c87', '#e9d5ff'],
        ['#0f172a', '#38bdf8'],
      ];
      const [pCol, sCol] = fallbackColors[h % fallbackColors.length];
      const vision = meta?.vision ?? 'Standard';

      clubs[clubId] = {
        id: clubId,
        name: clubName,
        shortName,
        slug: getStr(r, 'info.teams.club_team.slug', clubName.toLowerCase().replace(/\s+/g, '-')),
        leagueId: clubLeagueId,
        isLaLiga,
        primaryColor: meta?.primary ?? pCol,
        secondaryColor: meta?.secondary ?? sCol,
        managerName: meta?.manager ?? EXTERNAL_MANAGERS[h % EXTERNAL_MANAGERS.length],
        domesticPrestige: prestige,
        profitability,
        transferBudgetEur: meta?.budgetEur ?? Math.round(prestige * 12_000_000),
        wageBudgetRemainingEur: Math.round((meta?.budgetEur ?? prestige * 12_000_000) * 0.015),
        budgetSplitTransferPct: 75,
        clubWorthEur: meta?.worthEur ?? prestige * 95_000_000,
        formation: meta?.formation ?? '4-3-3 Holding',
        tacticalVision: vision,
        mentality: 'Balanced',
        defensiveLineHeight: vision === 'Gegenpressing' ? 74 : vision === 'Park the Bus' ? 38 : 58,
        lineup: [],
        benchIds: [],
        captainId: null,
        penaltyTakerId: null,
        freeKickTakerId: null,
        cornerTakerId: null,
        rivalClubIds: meta?.rivals ?? [],
        relationships: {},
        coaches: generateInitialCoaches(clubId, prestige, vision),
        boardConfidence: 76,
      };
    }

    const attrs: PlayerAttributes = {
      acceleration: getNum(r, 'attributes.acceleration', 60),
      sprintspeed: getNum(r, 'attributes.sprintspeed', 60),
      agility: getNum(r, 'attributes.agility', 60),
      balance: getNum(r, 'attributes.balance', 60),
      jumping: getNum(r, 'attributes.jumping', 60),
      stamina: getNum(r, 'attributes.stamina', 65),
      strength: getNum(r, 'attributes.strength', 60),
      reactions: getNum(r, 'attributes.reactions', 60),
      aggression: getNum(r, 'attributes.aggression', 60),
      composure: getNum(r, 'attributes.composure', 60),
      interceptions: getNum(r, 'attributes.interceptions', 50),
      positioning: getNum(r, 'attributes.positioning', 55),
      vision: getNum(r, 'attributes.vision', 58),
      ballcontrol: getNum(r, 'attributes.ballcontrol', 62),
      crossing: getNum(r, 'attributes.crossing', 55),
      dribbling: getNum(r, 'attributes.dribbling', 60),
      finishing: getNum(r, 'attributes.finishing', 52),
      freekickaccuracy: getNum(r, 'attributes.freekickaccuracy', 48),
      headingaccuracy: getNum(r, 'attributes.headingaccuracy', 55),
      longpassing: getNum(r, 'attributes.longpassing', 58),
      shortpassing: getNum(r, 'attributes.shortpassing', 64),
      marking: getNum(r, 'attributes.marking', 50),
      shotpower: getNum(r, 'attributes.shotpower', 60),
      longshots: getNum(r, 'attributes.longshots', 52),
      standingtackle: getNum(r, 'attributes.standingtackle', 52),
      slidingtackle: getNum(r, 'attributes.slidingtackle', 48),
      volleys: getNum(r, 'attributes.volleys', 50),
      curve: getNum(r, 'attributes.curve', 55),
      penalties: getNum(r, 'attributes.penalties', 52),
      gkdiving: getNum(r, 'attributes.gkdiving', 10),
      gkhandling: getNum(r, 'attributes.gkhandling', 10),
      gkkicking: getNum(r, 'attributes.gkkicking', 10),
      gkreflexes: getNum(r, 'attributes.gkreflexes', 10),
      gkpositioning: getNum(r, 'attributes.gkpositioning', 10),
    };

    const primaryPosition = normalizePosition(getStr(r, 'primary_position', 'CM'));
    const rawOther = getStr(r, 'other_positions', '-');
    const otherPositions: Position[] =
      rawOther === '-' || !rawOther
        ? []
        : Array.from(
            new Set(
              rawOther
                .split('|')
                .map((p) => normalizePosition(p))
                .filter((p) => p !== primaryPosition)
            )
          ).slice(0, 6);

    const baseOvr = clamp(getNum(r, 'info.overallrating', 70), 45, 99);
    const potential = clamp(Math.max(baseOvr, getNum(r, 'info.potential', baseOvr)), baseOvr, 99);
    const age = clamp(getNum(r, 'info.age', 23), 16, 43);
    const intlRep = clamp(getNum(r, 'info.internationalrep', 1), 1, 5);

    const cardFacets = {
      pac: getNum(r, 'card_attrs.pac', 0) || calculateCardFacets(attrs, primaryPosition).pac,
      sho: getNum(r, 'card_attrs.sho', 0) || calculateCardFacets(attrs, primaryPosition).sho,
      pas: getNum(r, 'card_attrs.pas', 0) || calculateCardFacets(attrs, primaryPosition).pas,
      dri: getNum(r, 'card_attrs.dri', 0) || calculateCardFacets(attrs, primaryPosition).dri,
      def: getNum(r, 'card_attrs.def', 0) || calculateCardFacets(attrs, primaryPosition).def,
      phy: getNum(r, 'card_attrs.phy', 0) || calculateCardFacets(attrs, primaryPosition).phy,
    };

    const t1 = getStr(r, 'info.traits.trait1', '');
    const t2 = getStr(r, 'info.traits.trait2', '');
    const playStyles = [t1, t2]
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 7);

    const endDateStr = getStr(r, 'info.contract.enddate', '2029-06-01');
    const endYear = clamp(parseInt(endDateStr.slice(0, 4), 10) || 2029, 2027, 2036);
    const contractYearsLeft = Math.max(1, endYear - 2026);

    const csvValueEur = getNum(r, 'info.valueEUR', 0);
    const csvWageEur = getNum(r, 'info.wageEUR', 0);
    const csvReleaseClause = getNum(r, 'info.release_clause', 0);

    const h = deterministicHash(playerId);
    const initialMorale = 64 + (h % 20); // 64..83 (Sweet Spot range)
    const initialEnergy = 86 + (h % 13); // 86..98
    const initialSharpness = 72 + (h % 18); // 72..89
    const initialForm = Number((6.4 + ((h % 15) - 4) * 0.1).toFixed(1)); // 6.0..7.4

    const roleMeta = ROLE_BY_POSITION[primaryPosition];
    const roleFamiliarity: RoleFamiliarity =
      baseOvr >= 84 ? 'Role++' : baseOvr >= 76 ? 'Role+' : 'Base';

    const growthProfile = assignGrowthProfile(playerId, age, baseOvr, potential, attrs, primaryPosition);

    const expectedTransferValue = calculateTransferRoomXTV(
      baseOvr,
      baseOvr,
      potential,
      age,
      contractYearsLeft,
      primaryPosition,
      initialForm,
      csvValueEur
    );

    const weeklyWageEur =
      csvWageEur > 0 ? csvWageEur : calculateWeeklyWageEur(baseOvr, age, clubs[clubId].domesticPrestige);

    const knownAs = getStr(r, 'info.name.knownas', '') || `${getStr(r, 'info.name.firstname')} ${getStr(r, 'info.name.lastname')}`.trim();

    const player: Player = {
      id: playerId,
      firstName: getStr(r, 'info.name.firstname', knownAs),
      lastName: getStr(r, 'info.name.lastname', ''),
      knownAs,
      jerseyName: getStr(r, 'info.name.playerjerseyname', knownAs),
      jerseyNumber: clamp(getNum(r, 'info.teams.club_team.jerseynumber', 1 + (h % 35)), 1, 99),
      nationality: getStr(r, 'info.nation.name', 'Spain'),
      nationId: getNum(r, 'info.nation.id', 45),
      age,
      birthDate: getStr(r, 'info.birthdate', '2001-01-01').slice(0, 10),
      heightCm: clamp(getNum(r, 'info.height', 180), 158, 208),
      weightKg: clamp(getNum(r, 'info.weight', 75), 55, 105),
      preferredFoot: getStr(r, 'info.preferredfoot', 'Right') === 'Left' ? 'Left' : 'Right',
      skillMoves: clamp(getNum(r, 'info.skillmoves', 3), 1, 5),
      weakFoot: clamp(getNum(r, 'info.weafoot', 3), 1, 5),
      internationalRep: intlRep,
      headshotUrl: getStr(r, 'info.headshot', ''),
      playStyles,
      primaryPosition,
      otherPositions,
      clubId,
      clubName,
      isExternalClub: !Boolean(TOP_5_LEAGUES[clubLeagueId]),
      isLoanedOut: getNum(r, 'info.contract.isloanedout', 0) === 1,
      attributes: attrs,
      cardFacets,
      baseOvr,
      potential,
      growthProfile,
      xpProgress: h % 65,
      energy: initialEnergy,
      sharpness: initialSharpness,
      matchFitness: calculateMatchFitness(initialEnergy, initialSharpness, null),
      morale: initialMorale,
      formScore: initialForm,
      squadRole: 'Rotation',
      roleTitle: roleMeta.title,
      roleFocus: roleMeta.focus,
      roleFamiliarity,
      injury: null,
      transferListed: false,
      loanListed: age <= 20 && baseOvr <= 70 && h % 3 === 0,
      expectedTransferValue,
      weeklyWageEur,
      releaseClauseEur: csvReleaseClause > 0 ? csvReleaseClause : Math.round(expectedTransferValue * 1.9),
      contractEndYear: endYear,
      joinDate: getStr(r, 'info.contract.jointeamdate', '2024-07-01'),
      developmentPlan: {
        mode: age <= 23 ? 'RoleFocus' : 'Balanced',
        targetRole: roleMeta.title,
        weeksCompleted: 0,
        weeksRequired: 18,
        momentum: age <= 23 ? 74 + (h % 18) : 65,
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
        avgRating: initialForm,
      },
      dynamicOvr: {
        deployedPosition: primaryPosition,
        baseOvr,
        positionPenalty: 0,
        formDelta: 0,
        moraleDelta: 0,
        playtimeDelta: 0,
        fitnessDelta: 0,
        injuryDelta: 0,
        totalDelta: 0,
        dynamicOvr: baseOvr,
        formLabel: 'Okay',
        moraleLabel: 'Happy',
        fitnessLabel: 'Sharp',
        facetDeltas: { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 },
      },
    };

    player.dynamicOvr = calculateDynamicOVR(player, primaryPosition, 0);
    players[player.id] = player;
    const list = playersByClub.get(clubId) ?? [];
    list.push(player);
    playersByClub.set(clubId, list);
  }

  // Assign Squad Roles, Relationships, Starting XIs, Set Piece Takers for all Top 5 League squads
  const clubsByLeague: Record<number, number[]> = {
    13: [], // Premier League
    53: [], // LaLiga
    19: [], // Bundesliga
    31: [], // Serie A
    16: [], // Ligue 1
  };
  const top5ClubIds: number[] = [];

  for (const club of Object.values(clubs)) {
    const roster = (playersByClub.get(club.id) ?? []).sort((a, b) => b.baseOvr - a.baseOvr);
    const isDomesticLeague = Boolean(TOP_5_LEAGUES[club.leagueId]);

    if (isDomesticLeague && roster.length >= 12) {
      if (!clubsByLeague[club.leagueId]) clubsByLeague[club.leagueId] = [];
      clubsByLeague[club.leagueId].push(club.id);
      top5ClubIds.push(club.id);
    }

    // Assign Squad Roles relative to club roster
    roster.forEach((p, idx) => {
      let role: SquadRole = 'Rotation';
      if (idx < 4) role = 'Crucial';
      else if (idx < 11) role = 'Important';
      else if (idx < 18) role = 'Rotation';
      else if (p.age <= 20 && p.potential - p.baseOvr >= 7) role = 'Prospect';
      else role = 'Sporadic';
      p.squadRole = role;
      if (idx >= 18 && p.age >= 25 && deterministicHash(p.id) % 4 === 0) {
        p.transferListed = true;
      }
    });

    // Give 1 fringe/rotation player on each domestic club a Minor Recovering Injury at season start
    // so the manager immediately sees & can test the Risky Recovering Injury mechanic!
    if (isDomesticLeague && roster.length >= 14) {
      const candidate = roster[11] ?? roster[roster.length - 1];
      candidate.energy = 68;
      candidate.injury = {
        type: 'Hamstring Tightness (Recovering)',
        severity: 'Minor',
        daysRemaining: 6,
        recovering: true,
        aggravationRiskPct: 36,
      };
      candidate.matchFitness = calculateMatchFitness(candidate.energy, candidate.sharpness, candidate.injury);
      candidate.dynamicOvr = calculateDynamicOVR(candidate, candidate.primaryPosition, 0);
    }

    // Initialize Club Relationships (-2 to 10)
    for (const otherId of Object.keys(clubs).map(Number)) {
      if (otherId === club.id) continue;
      if (club.rivalClubIds.includes(otherId)) {
        club.relationships[otherId] = -2;
      } else {
        club.relationships[otherId] = 3 + (deterministicHash(club.id * 13 + otherId * 7) % 5);
      }
    }

    if (isDomesticLeague && roster.length > 0) {
      const { lineup, benchIds } = buildLineupForFormation(club.formation, roster);
      club.lineup = lineup;
      club.benchIds = benchIds;

      // Recalculate deployed Dynamic OVR for lineup players
      for (const slot of lineup) {
        if (slot.playerId && players[slot.playerId]) {
          players[slot.playerId].dynamicOvr = calculateDynamicOVR(players[slot.playerId], slot.position, 0);
        }
      }

      const starters = lineup.map((s) => (s.playerId ? players[s.playerId] : null)).filter(Boolean) as Player[];
      const captain = [...starters].sort((a, b) => b.age * 1.5 + b.baseOvr - (a.age * 1.5 + a.baseOvr))[0];
      const penTaker = [...starters].sort((a, b) => b.attributes.penalties - a.attributes.penalties)[0];
      const fkTaker = [...starters].sort((a, b) => b.attributes.freekickaccuracy - a.attributes.freekickaccuracy)[0];
      const cornerTaker = [...starters].sort((a, b) => b.attributes.crossing + b.attributes.curve - (a.attributes.crossing + a.attributes.curve))[0];

      club.captainId = captain?.id ?? null;
      club.penaltyTakerId = penTaker?.id ?? null;
      club.freeKickTakerId = fkTaker?.id ?? null;
      club.cornerTakerId = cornerTaker?.id ?? null;
    }
  }

  // Sort each league's clubs by domestic prestige
  for (const lid of Object.keys(clubsByLeague).map(Number)) {
    clubsByLeague[lid].sort(
      (a, b) => clubs[b].domesticPrestige - clubs[a].domesticPrestige || clubs[a].name.localeCompare(clubs[b].name)
    );
  }

  const laLigaClubIds = clubsByLeague[53] ?? [];

  return { clubs, players, laLigaClubIds, top5ClubIds, clubsByLeague };
}
