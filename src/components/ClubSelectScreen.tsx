import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { computeSectorRatings } from '../engine/matchSim';
import { formatMoney } from '../engine/ratings';
import { TOP_5_LEAGUES } from '../engine/csvParser';
import { Club, CurrencyCode, EnergyRecoveryPolicy } from '../engine/types';
import { useCareerStore } from '../store/careerStore';
import { ClubCrest } from './PlayerAvatar';

// Authentic Club Foundation Years
const CLUB_FOUNDED: Record<string, number> = {
  // England
  Arsenal: 1886,
  'Aston Villa': 1874,
  Bournemouth: 1899,
  'AFC Bournemouth': 1899,
  Brentford: 1889,
  'Brighton & Hove Albion': 1901,
  Chelsea: 1905,
  'Crystal Palace': 1905,
  Everton: 1878,
  Fulham: 1879,
  'Ipswich Town': 1878,
  'Leicester City': 1884,
  Liverpool: 1892,
  'Manchester City': 1880,
  'Manchester United': 1878,
  'Newcastle United': 1892,
  'Nottingham Forest': 1865,
  Southampton: 1885,
  'Tottenham Hotspur': 1882,
  'West Ham United': 1895,
  'Wolverhampton Wanderers': 1877,

  // Spain
  'Real Madrid': 1902,
  'FC Barcelona': 1899,
  'Atlético de Madrid': 1903,
  'Athletic Club': 1898,
  'Real Sociedad': 1909,
  'Real Betis': 1907,
  'Sevilla FC': 1890,
  'Villarreal CF': 1923,
  'Valencia CF': 1919,
  'Girona FC': 1930,
  'RC Celta': 1923,
  'RCD Mallorca': 1916,
  'RCD Espanyol': 1900,
  'CA Osasuna': 1920,
  'Getafe CF': 1983,
  'Deportivo Alavés': 1921,
  'UD Las Palmas': 1949,
  'Rayo Vallecano': 1924,
  'Real Valladolid': 1928,
  'CD Leganés': 1928,

  // Germany
  'FC Bayern München': 1900,
  'Borussia Dortmund': 1909,
  'Bayer 04 Leverkusen': 1904,
  'RB Leipzig': 2009,
  'VfB Stuttgart': 1893,
  'Eintracht Frankfurt': 1899,
  'VfL Wolfsburg': 1945,
  'Borussia Mönchengladbach': 1900,
  'SC Freiburg': 1904,
  '1. FC Union Berlin': 1966,
  'SV Werder Bremen': 1899,
  'FC Augsburg': 1907,
  '1. FSV Mainz 05': 1905,
  'TSG 1899 Hoffenheim': 1899,
  '1. FC Heidenheim 1846': 1846,
  'FC St. Pauli': 1910,
  'Holstein Kiel': 1900,
  'VfL Bochum 1848': 1848,
  'MSV Duisburg': 1902,

  // Italy
  Juventus: 1897,
  'FC Internazionale Milano': 1908,
  'AC Milan': 1899,
  'SSC Napoli': 1926,
  'AS Roma': 1927,
  'SS Lazio': 1900,
  'Atalanta BC': 1907,
  'ACF Fiorentina': 1926,
  'Bologna FC 1909': 1909,
  'Torino FC': 1906,
  'Udinese Calcio': 1896,
  'Genoa CFC': 1893,
  'Parma Calcio 1913': 1913,
  'Cagliari Calcio': 1920,
  'Hellas Verona FC': 1903,
  'US Lecce': 1908,
  'Empoli FC': 1920,
  'AC Monza': 1912,
  'Como 1907': 1907,
  'Venezia FC': 1907,

  // France
  'Paris Saint-Germain': 1970,
  'Olympique de Marseille': 1899,
  'Olympique Lyonnais': 1950,
  'AS Monaco': 1924,
  'LOSC Lille': 1944,
  'Stade Rennais FC': 1901,
  'OGC Nice': 1904,
  'RC Lens': 1906,
  'Stade de Reims': 1931,
  'Toulouse FC': 1970,
  'Montpellier HSC': 1974,
  'RC Strasbourg Alsace': 1906,
  'FC Nantes': 1943,
  'Stade Brestois 29': 1950,
  'AJ Auxerre': 1905,
  'Angers SCO': 1919,
  'AS Saint-Étienne': 1919,
  'Le Havre AC': 1872,
};

// Authentic Club Cities
const CLUB_CITY: Record<string, string> = {
  // England
  Arsenal: 'LONDON',
  Chelsea: 'LONDON',
  'Tottenham Hotspur': 'LONDON',
  'West Ham United': 'LONDON',
  'Crystal Palace': 'LONDON',
  Fulham: 'LONDON',
  Brentford: 'LONDON',
  Liverpool: 'LIVERPOOL',
  Everton: 'LIVERPOOL',
  'Manchester City': 'MANCHESTER',
  'Manchester United': 'MANCHESTER',
  'Aston Villa': 'BIRMINGHAM',
  'Newcastle United': 'NEWCASTLE',
  'Brighton & Hove Albion': 'BRIGHTON',
  'Wolverhampton Wanderers': 'WOLVERHAMPTON',
  'AFC Bournemouth': 'BOURNEMOUTH',
  Bournemouth: 'BOURNEMOUTH',
  'Nottingham Forest': 'NOTTINGHAM',
  'Leicester City': 'LEICESTER',
  Southampton: 'SOUTHAMPTON',
  'Ipswich Town': 'IPSWICH',

  // Spain
  'Real Madrid': 'MADRID',
  'Atlético de Madrid': 'MADRID',
  'Rayo Vallecano': 'MADRID',
  'Getafe CF': 'MADRID',
  'CD Leganés': 'MADRID',
  'FC Barcelona': 'BARCELONA',
  'RCD Espanyol': 'BARCELONA',
  'Sevilla FC': 'SEVILLE',
  'Real Betis': 'SEVILLE',
  'Valencia CF': 'VALENCIA',
  'Athletic Club': 'BILBAO',
  'Real Sociedad': 'SAN SEBASTIÁN',
  'Villarreal CF': 'VILA-REAL',
  'Girona FC': 'GIRONA',
  'RC Celta': 'VIGO',
  'RCD Mallorca': 'PALMA',
  'CA Osasuna': 'PAMPLONA',
  'Deportivo Alavés': 'VITORIA-GASTEIZ',
  'UD Las Palmas': 'LAS PALMAS',
  'Real Valladolid': 'VALLADOLID',

  // Germany
  'FC Bayern München': 'MUNICH',
  'Borussia Dortmund': 'DORTMUND',
  'Bayer 04 Leverkusen': 'LEVERKUSEN',
  'RB Leipzig': 'LEIPZIG',
  'VfB Stuttgart': 'STUTTGART',
  'Eintracht Frankfurt': 'FRANKFURT',
  'VfL Wolfsburg': 'WOLFSBURG',
  'Borussia Mönchengladbach': 'MÖNCHENGLADBACH',
  'SC Freiburg': 'FREIBURG',
  '1. FC Union Berlin': 'BERLIN',
  'SV Werder Bremen': 'BREMEN',
  'FC Augsburg': 'AUGSBURG',
  '1. FSV Mainz 05': 'MAINZ',
  'TSG 1899 Hoffenheim': 'SINSHEIM',
  '1. FC Heidenheim 1846': 'HEIDENHEIM',
  'FC St. Pauli': 'HAMBURG',
  'Holstein Kiel': 'KIEL',
  'VfL Bochum 1848': 'BOCHUM',
  'MSV Duisburg': 'DUISBURG',

  // Italy
  Juventus: 'TURIN',
  'Torino FC': 'TURIN',
  'FC Internazionale Milano': 'MILAN',
  'AC Milan': 'MILAN',
  'SSC Napoli': 'NAPLES',
  'AS Roma': 'ROME',
  'SS Lazio': 'ROME',
  'Atalanta BC': 'BERGAMO',
  'ACF Fiorentina': 'FLORENCE',
  'Bologna FC 1909': 'BOLOGNA',
  'Udinese Calcio': 'UDINE',
  'Genoa CFC': 'GENOA',
  'Parma Calcio 1913': 'PARMA',
  'Cagliari Calcio': 'CAGLIARI',
  'Hellas Verona FC': 'VERONA',
  'US Lecce': 'LECCE',
  'Empoli FC': 'EMPOLI',
  'AC Monza': 'MONZA',
  'Como 1907': 'COMO',
  'Venezia FC': 'VENICE',

  // France
  'Paris Saint-Germain': 'PARIS',
  'Olympique de Marseille': 'MARSEILLE',
  'Olympique Lyonnais': 'LYON',
  'AS Monaco': 'MONACO',
  'LOSC Lille': 'LILLE',
  'Stade Rennais FC': 'RENNES',
  'OGC Nice': 'NICE',
  'RC Lens': 'LENS',
  'Stade de Reims': 'REIMS',
  'Toulouse FC': 'TOULOUSE',
  'Montpellier HSC': 'MONTPELLIER',
  'RC Strasbourg Alsace': 'STRASBOURG',
  'FC Nantes': 'NANTES',
  'Stade Brestois 29': 'BREST',
  'AJ Auxerre': 'AUXERRE',
  'Angers SCO': 'ANGERS',
  'AS Saint-Étienne': 'SAINT-ÉTIENNE',
  'Le Havre AC': 'LE HAVRE',
};

// Trophy Cabinets
const CLUB_TROPHIES: Record<string, { leagues: number; cups: number }> = {
  // England
  Arsenal: { leagues: 13, cups: 14 },
  Chelsea: { leagues: 6, cups: 8 },
  Liverpool: { leagues: 19, cups: 8 },
  'Manchester City': { leagues: 10, cups: 7 },
  'Manchester United': { leagues: 20, cups: 13 },
  'Tottenham Hotspur': { leagues: 2, cups: 8 },
  'Aston Villa': { leagues: 7, cups: 7 },
  'Newcastle United': { leagues: 4, cups: 6 },
  Everton: { leagues: 9, cups: 5 },
  'Nottingham Forest': { leagues: 1, cups: 2 },

  // Spain
  'Real Madrid': { leagues: 36, cups: 20 },
  'FC Barcelona': { leagues: 27, cups: 31 },
  'Atlético de Madrid': { leagues: 11, cups: 10 },
  'Athletic Club': { leagues: 8, cups: 24 },
  'Valencia CF': { leagues: 6, cups: 8 },
  'Real Sociedad': { leagues: 2, cups: 3 },
  'Sevilla FC': { leagues: 1, cups: 5 },
  'Real Betis': { leagues: 1, cups: 3 },

  // Germany
  'FC Bayern München': { leagues: 33, cups: 20 },
  'Borussia Dortmund': { leagues: 8, cups: 5 },
  'Bayer 04 Leverkusen': { leagues: 1, cups: 2 },
  'Borussia Mönchengladbach': { leagues: 5, cups: 3 },
  'VfB Stuttgart': { leagues: 5, cups: 3 },
  'SV Werder Bremen': { leagues: 4, cups: 6 },
  'Eintracht Frankfurt': { leagues: 1, cups: 5 },
  'VfL Wolfsburg': { leagues: 1, cups: 1 },
  'RB Leipzig': { leagues: 0, cups: 2 },
  'MSV Duisburg': { leagues: 0, cups: 0 },

  // Italy
  Juventus: { leagues: 36, cups: 15 },
  'FC Internazionale Milano': { leagues: 20, cups: 9 },
  'AC Milan': { leagues: 19, cups: 5 },
  'AS Roma': { leagues: 3, cups: 9 },
  'SS Lazio': { leagues: 2, cups: 7 },
  'SSC Napoli': { leagues: 3, cups: 6 },
  'Torino FC': { leagues: 7, cups: 5 },
  'Bologna FC 1909': { leagues: 7, cups: 2 },
  'ACF Fiorentina': { leagues: 2, cups: 6 },
  'Genoa CFC': { leagues: 9, cups: 1 },

  // France
  'Paris Saint-Germain': { leagues: 12, cups: 15 },
  'Olympique de Marseille': { leagues: 9, cups: 10 },
  'AS Saint-Étienne': { leagues: 10, cups: 6 },
  'AS Monaco': { leagues: 8, cups: 5 },
  'Olympique Lyonnais': { leagues: 7, cups: 5 },
  'FC Nantes': { leagues: 8, cups: 4 },
  'LOSC Lille': { leagues: 4, cups: 6 },
  'OGC Nice': { leagues: 4, cups: 3 },
  'Stade de Reims': { leagues: 6, cups: 2 },
};

function getClubCity(name: string): string {
  if (CLUB_CITY[name]) return CLUB_CITY[name];
  for (const [key, city] of Object.entries(CLUB_CITY)) {
    if (name.includes(key) || key.includes(name)) return city;
  }
  const clean = name.replace(/(FC|CF|SC|RC|VfL|VfB|SV|TSG|1\.|1899|1900|1909|1904|1905|05|04)/gi, '').trim();
  return clean.toUpperCase() || 'METROPOLIS';
}

function getClubFounded(name: string, id: number): number {
  if (CLUB_FOUNDED[name]) return CLUB_FOUNDED[name];
  for (const [key, yr] of Object.entries(CLUB_FOUNDED)) {
    if (name.includes(key) || key.includes(name)) return yr;
  }
  return 1895 + (id % 35);
}

function getClubTrophies(name: string, prestige: number): { leagues: number; cups: number } {
  if (CLUB_TROPHIES[name]) return CLUB_TROPHIES[name];
  for (const [key, t] of Object.entries(CLUB_TROPHIES)) {
    if (name.includes(key) || key.includes(name)) return t;
  }
  if (prestige >= 8) return { leagues: 4, cups: 5 };
  if (prestige >= 6) return { leagues: 1, cups: 2 };
  return { leagues: 0, cups: 0 };
}

function getClubStature(prestige: number): string {
  if (prestige >= 9) {
    return 'A CRITICAL CONTINENTAL GIANT REGULARLY COMPETING FOR DOMESTIC AND EUROPEAN HONORS.';
  }
  if (prestige >= 7) {
    return 'AN ESTABLISHED DOMESTIC POWERHOUSE WITH AMBITIONS TO CHALLENGE IN EUROPE.';
  }
  if (prestige >= 5) {
    return 'A SOLID TOP-TIER SQUAD LOOKING TO CEMENT EUROPEAN QUALIFICATION SPOTS.';
  }
  if (prestige >= 3) {
    return 'A COMPETITIVE FIRST-DIVISION CLUB COMMITTED TO SUSTAINED STABILITY.';
  }
  return 'AN ESTABLISHED PROFESSIONAL CLUB WELL-KNOWN AT LOCAL LEVEL.';
}

function getClubDNA(club: Club) {
  const devotion =
    club.domesticPrestige >= 8
      ? 'VERY HIGH'
      : club.domesticPrestige >= 6
      ? 'HIGH'
      : club.domesticPrestige >= 4
      ? 'MEDIUM'
      : 'LOW';
  const youth =
    club.domesticPrestige >= 7 ? 'HIGH' : club.domesticPrestige >= 4 ? 'MEDIUM' : 'LOW';
  const stability =
    club.transferBudgetEur >= 80_000_000
      ? 'VERY HIGH'
      : club.transferBudgetEur >= 30_000_000
      ? 'HIGH'
      : club.transferBudgetEur >= 12_000_000
      ? 'MODERATE'
      : 'VERY LOW';

  return { devotion, youth, stability };
}

// 2D Vector Kit Jersey Component matching EA FC 27
const ClubKitJersey: React.FC<{
  primary: string;
  secondary: string;
  type: 'HOME' | 'AWAY' | 'THIRD';
}> = ({ primary, secondary, type }) => {
  const bodyColor =
    type === 'HOME'
      ? primary
      : type === 'AWAY'
      ? primary.toLowerCase() === '#ffffff'
        ? '#0f172a'
        : '#f8fafc'
      : '#0a1722';
  const sleeveColor =
    type === 'HOME' ? secondary : type === 'AWAY' ? primary : '#38f2c8';
  const accentColor =
    type === 'HOME' ? '#ffffff' : type === 'AWAY' ? primary : '#38f2c8';

  return (
    <svg viewBox="0 0 120 140" className="w-28 h-32 drop-shadow-2xl select-none" fill="none">
      {/* Jersey Body */}
      <path
        d="M38 18 L18 36 L30 52 L40 42 L40 122 L80 122 L80 42 L90 52 L102 36 L82 18 C74 26 46 26 38 18 Z"
        fill={bodyColor}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
      />
      {/* Sleeves */}
      <path d="M38 18 L18 36 L30 52 L40 42 Z" fill={sleeveColor} opacity="0.95" />
      <path d="M82 18 L102 36 L90 52 L80 42 Z" fill={sleeveColor} opacity="0.95" />
      {/* Collar */}
      <path d="M46 20 C54 28 66 28 74 20" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
      {/* Chest Stripes */}
      <rect x="42" y="62" width="36" height="5" rx="1.5" fill={accentColor} opacity="0.85" />
      <rect x="42" y="71" width="36" height="5" rx="1.5" fill={accentColor} opacity="0.85" />
      <rect x="42" y="80" width="36" height="5" rx="1.5" fill={accentColor} opacity="0.85" />
      {/* Sponsor Box */}
      <rect x="44" y="92" width="32" height="12" rx="2" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.2)" />
      <text
        x="60"
        y="100.5"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="5"
        fontWeight="900"
        fontFamily="Cruyff Sans, sans-serif"
      >
        FC 27
      </text>
    </svg>
  );
};

export const ClubSelectScreen: React.FC = () => {
  const database = useCareerStore((s) => s.database);
  const startNewCareer = useCareerStore((s) => s.startNewCareer);
  const resumeSavedCareer = useCareerStore((s) => s.resumeSavedCareer);

  // League IDs for Top 5: England (13), Spain (53), Germany (19), Italy (31), France (16)
  const LEAGUE_ORDER = [13, 53, 19, 31, 16];
  const [selectedLeagueIdx, setSelectedLeagueIdx] = useState(0);
  const [selectedClubId, setSelectedClubId] = useState<number>(1);
  const [isMensTeam, setIsMensTeam] = useState(true);
  const [kitType, setKitType] = useState<'HOME' | 'AWAY' | 'THIRD'>('HOME');
  const [showAllClubsModal, setShowAllClubsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [energyRecovery, setEnergyRecovery] = useState<EnergyRecoveryPolicy>('Balanced');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const currentLeagueId = LEAGUE_ORDER[selectedLeagueIdx];
  const currentLeagueMeta = TOP_5_LEAGUES[currentLeagueId] ?? {
    name: 'Premier League',
    country: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  };

  const clubsInCurrentLeague = useMemo(() => {
    if (!database) return [];
    return Object.values(database.clubs).filter((c) => c.leagueId === currentLeagueId);
  }, [database, currentLeagueId]);

  // Keep selectedClub in sync when league changes
  useEffect(() => {
    if (clubsInCurrentLeague.length > 0) {
      const match = clubsInCurrentLeague.find((c) => c.id === selectedClubId);
      if (!match) {
        setSelectedClubId(clubsInCurrentLeague[0].id);
      }
    }
  }, [clubsInCurrentLeague, selectedClubId]);

  const selectedClub = database?.clubs[selectedClubId] ?? clubsInCurrentLeague[0];

  const currentClubIndex = clubsInCurrentLeague.findIndex((c) => c.id === selectedClub?.id);

  const prevClub = () => {
    if (clubsInCurrentLeague.length === 0) return;
    const prevIdx =
      (currentClubIndex - 1 + clubsInCurrentLeague.length) % clubsInCurrentLeague.length;
    setSelectedClubId(clubsInCurrentLeague[prevIdx].id);
  };

  const nextClub = () => {
    if (clubsInCurrentLeague.length === 0) return;
    const nextIdx = (currentClubIndex + 1) % clubsInCurrentLeague.length;
    setSelectedClubId(clubsInCurrentLeague[nextIdx].id);
  };

  const prevLeague = () => {
    setSelectedLeagueIdx((prev) => (prev - 1 + LEAGUE_ORDER.length) % LEAGUE_ORDER.length);
  };

  const nextLeague = () => {
    setSelectedLeagueIdx((prev) => (prev + 1) % LEAGUE_ORDER.length);
  };

  const cycleKit = () => {
    setKitType((prev) => (prev === 'HOME' ? 'AWAY' : prev === 'AWAY' ? 'THIRD' : 'HOME'));
  };

  const hasAutoSave = useMemo(() => {
    try {
      return Boolean(localStorage.getItem('fc27_career_active_v1'));
    } catch {
      return false;
    }
  }, []);

  const clubStats = useMemo(() => {
    if (!database || !selectedClub) return null;
    const sectors = computeSectorRatings(selectedClub, database.players);
    const avg = (sectors.atk + sectors.mid + sectors.def) / 3;
    const starRating =
      avg >= 85 ? 5.0 : avg >= 82 ? 4.5 : avg >= 79 ? 4.0 : avg >= 75 ? 3.5 : avg >= 71 ? 3.0 : 2.5;

    const city = getClubCity(selectedClub.name);
    const founded = getClubFounded(selectedClub.name, selectedClub.id);
    const trophies = getClubTrophies(selectedClub.name, selectedClub.domesticPrestige);
    const stature = getClubStature(selectedClub.domesticPrestige);
    const dna = getClubDNA(selectedClub);

    return {
      atk: Math.round(sectors.atk),
      mid: Math.round(sectors.mid),
      def: Math.round(sectors.def),
      starRating,
      city,
      founded,
      trophies,
      stature,
      dna,
    };
  }, [database, selectedClub]);

  const handleStart = () => {
    if (!selectedClub) return;
    startNewCareer(selectedClub.id, { energyRecovery, currency });
  };

  // Keyboard navigation matching gamepad D-Pad / LB / RB / Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevClub();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextClub();
      } else if (e.key === 'ArrowUp' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        prevLeague();
      } else if (e.key === 'ArrowDown' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        nextLeague();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!database || !selectedClub || !clubStats) return null;

  return (
    <div
      className="min-h-screen relative flex flex-col justify-between text-white overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(ellipse 95% 65% at 50% 18%, #0d2830 0%, #081720 48%, #050d12 100%)',
      }}
    >
      {/* Stadium Arena Perspective Curved Lines & Cyan Pillars */}
      <div className="absolute inset-0 fc-facet-overlay opacity-50 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-cover bg-center"
        style={{ backgroundImage: `url('/assets/art/tunnel.png')` }}
      />
      {/* Green Turf Glow Horizon Line */}
      <div className="absolute bottom-12 left-0 right-0 h-28 bg-gradient-to-t from-[#10c482]/15 via-transparent to-transparent pointer-events-none" />

      {/* =================================================================== */}
      {/* TOP HEADER: Men's / Women's Toggle & Active Country Navigation     */}
      {/* =================================================================== */}
      <header className="relative z-10 px-8 lg:px-14 pt-8">
        <div className="flex items-center gap-6 pb-2 border-b border-white/10 max-w-sm">
          {/* Men's Teams Toggle Pill */}
          <button
            type="button"
            onClick={() => setIsMensTeam(true)}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                isMensTeam
                  ? 'border-[#38f2c8] bg-[#38f2c8] text-[#07131a]'
                  : 'border-white/40 bg-transparent text-transparent'
              }`}
            >
              <span className="text-[10px] font-black leading-none">✓</span>
            </span>
            <span
              className={`text-sm font-black uppercase tracking-wider transition-colors ${
                isMensTeam ? 'text-white' : 'text-[#8ea5b3] group-hover:text-white'
              }`}
            >
              Men's Teams
            </span>
          </button>

          {/* Women's Teams Toggle Pill */}
          <button
            type="button"
            onClick={() => setIsMensTeam(false)}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                !isMensTeam
                  ? 'border-[#38f2c8] bg-[#38f2c8] text-[#07131a]'
                  : 'border-white/30 bg-transparent text-transparent'
              }`}
            >
              <span className="text-[10px] font-black leading-none">✓</span>
            </span>
            <span
              className={`text-sm font-black uppercase tracking-wider transition-colors ${
                !isMensTeam ? 'text-white' : 'text-[#8ea5b3] group-hover:text-white'
              }`}
            >
              Women's Teams
            </span>
          </button>
        </div>

        {/* Selected Country Title with Prev / Next Arrow Switcher */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={prevLeague}
            className="p-1 text-white/50 hover:text-white transition-colors"
            title="Previous Country (Q / Up)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display text-2xl font-black uppercase tracking-wide text-white">
            {currentLeagueMeta.country}
          </h2>
          <button
            type="button"
            onClick={nextLeague}
            className="p-1 text-white/50 hover:text-white transition-colors"
            title="Next Country (E / Down)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN 3-COLUMN SELECTION STAGE (1:1 with image (9).png)              */}
      {/* =================================================================== */}
      <main className="relative z-10 mx-auto w-full max-w-[1580px] px-8 lg:px-14 py-4 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center flex-1">
        {/* ================================================================= */}
        {/* COLUMN 1: MAIN CLUB CAROUSEL CARD (Left 4 cols)                  */}
        {/* ================================================================= */}
        <div className="lg:col-span-4 flex flex-col items-center">
          {/* Glowing Frosted Glass Card */}
          <div className="w-full max-w-[390px] rounded-2xl bg-gradient-to-b from-[#13303c]/90 via-[#0a1e28]/95 to-[#061219]/95 border-2 border-white/20 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_40px_rgba(56,242,200,0.12)] flex flex-col justify-between min-h-[440px] relative">
            {/* Top Club Name */}
            <h3 className="font-display text-3xl font-black uppercase tracking-wide text-white text-center leading-tight">
              {selectedClub.name}
            </h3>

            {/* Crest with Left / Right Navigation Chevrons */}
            <div className="my-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={prevClub}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 shadow"
                title="Previous Club (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div
                className="cursor-pointer group relative transform transition-transform duration-300 hover:scale-105"
                onClick={() => setShowAllClubsModal(true)}
                title="Click to browse all clubs"
              >
                <ClubCrest club={selectedClub} size={150} className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]" />
              </div>

              <button
                type="button"
                onClick={nextClub}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 shadow"
                title="Next Club (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* 5-Star Rating Row */}
            <div className="flex flex-col items-center gap-1.5 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1 justify-center">
                {[1, 2, 3, 4, 5].map((i) => {
                  const full = i <= Math.floor(clubStats.starRating);
                  const half = !full && i === Math.floor(clubStats.starRating) + 1 && clubStats.starRating % 1 >= 0.5;
                  return (
                    <span key={i} className="text-xl">
                      {full ? (
                        <Star className="w-5 h-5 fill-amber-300 text-amber-300 inline" />
                      ) : half ? (
                        <div className="relative inline-block w-5 h-5">
                          <Star className="w-5 h-5 text-white/20 fill-white/20" />
                          <div className="absolute inset-0 overflow-hidden w-2.5">
                            <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
                          </div>
                        </div>
                      ) : (
                        <Star className="w-5 h-5 text-white/20 fill-white/20 inline" />
                      )}
                    </span>
                  );
                })}
              </div>
              <span className="text-[11px] font-mono-num text-[#8ea5b3] font-bold">
                ATK {clubStats.atk} · MID {clubStats.mid} · DEF {clubStats.def}
              </span>
            </div>
          </div>

          {/* Under-Card League Switcher Title */}
          <div className="mt-4 flex items-center gap-3 text-center">
            <button
              type="button"
              onClick={prevLeague}
              className="text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-display text-xl font-black uppercase tracking-wider text-white">
              {currentLeagueMeta.name}
            </span>
            <button
              type="button"
              onClick={nextLeague}
              className="text-white/40 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 2: 2x2 QUADRANT DATA (Center 5 cols)                      */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {/* QUADRANT 1 (Top Left): KIT PREVIEW WITH R BUTTON CAROUSEL */}
          <div
            onClick={cycleKit}
            className="rounded-2xl bg-[#091a24]/90 border border-white/10 p-5 flex flex-col justify-between min-h-[260px] cursor-pointer group hover:border-[#38f2c8]/40 transition-colors"
          >
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#8ea5b3] font-bold">
                Kit
              </div>
              <div className="font-display text-lg font-black uppercase text-white mt-0.5">
                {kitType} KIT
              </div>
            </div>

            {/* Authentic 2D Vector Jersey */}
            <div className="my-2 flex justify-center group-hover:scale-105 transition-transform">
              <ClubKitJersey
                primary={selectedClub.primaryColor}
                secondary={selectedClub.secondaryColor}
                type={kitType}
              />
            </div>

            {/* < R > Carousel Dots */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/10 text-xs text-[#8ea5b3]">
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] font-mono-num font-bold text-white">
                R
              </span>
              <div className="flex items-center gap-1.5">
                {(['HOME', 'AWAY', 'THIRD'] as const).map((kt) => (
                  <span
                    key={kt}
                    className={`w-2 h-2 rounded-full transition-all ${
                      kitType === kt ? 'bg-white w-4' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* QUADRANT 2 (Top Right): FOUNDED & TROPHIES & FINANCIALS */}
          <div className="rounded-2xl bg-[#091a24]/90 border border-white/10 p-5 flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="text-center text-[11px] uppercase tracking-widest text-[#8ea5b3] font-bold flex items-center justify-center gap-1.5">
                <span className="text-white/40">🌿</span>
                <span>Founded</span>
                <span className="text-white/40">🌿</span>
              </div>
              <div className="font-display text-4xl font-black text-white text-center mt-0.5 tracking-tight">
                {clubStats.founded}
              </div>
            </div>

            {/* Trophy Cabinet Row */}
            <div className="grid grid-cols-2 gap-2 py-3 border-y border-white/10 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#8ea5b3] font-bold">
                  <Star className="w-3.5 h-3.5 fill-white/80 text-white/80" />
                  <span>Domestic Leagues</span>
                </div>
                <div className="mt-1 flex justify-center">
                  <span className="w-7 h-7 rounded-full border border-white/30 bg-black/40 flex items-center justify-center font-mono-num text-xs font-black text-white">
                    {clubStats.trophies.leagues}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#8ea5b3] font-bold">
                  <Trophy className="w-3.5 h-3.5 text-white/80" />
                  <span>Domestic Cups</span>
                </div>
                <div className="mt-1 flex justify-center">
                  <span className="w-7 h-7 rounded-full border border-white/30 bg-black/40 flex items-center justify-center font-mono-num text-xs font-black text-white">
                    {clubStats.trophies.cups}
                  </span>
                </div>
              </div>
            </div>

            {/* Financials Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div>
                <div className="text-[10px] uppercase text-[#8ea5b3] font-bold">Club Worth</div>
                <div className="font-mono-num font-black text-white text-sm">
                  {formatMoney(selectedClub.clubWorthEur, currency)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-[#8ea5b3] font-bold">Transfer Budget</div>
                <div className="font-mono-num font-black text-[#b8fff0] text-sm">
                  {formatMoney(selectedClub.transferBudgetEur, currency)}
                </div>
              </div>
            </div>
          </div>

          {/* QUADRANT 3 (Bottom Left): CITY WITH STADIUM ICON */}
          <div className="rounded-2xl bg-[#091a24]/90 border border-white/10 p-5 flex flex-col justify-between min-h-[170px]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#8ea5b3] font-bold">
                City
              </div>
              <div className="font-display text-xl font-black uppercase text-white mt-0.5 truncate">
                {clubStats.city}
              </div>
            </div>

            {/* Stylized Stadium Icon with 3 Flags */}
            <div className="my-2 flex justify-center">
              <svg
                viewBox="0 0 48 36"
                className="w-14 h-10 text-white/80 drop-shadow"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 28 L14 16 L34 16 L42 28 Z" fill="rgba(255,255,255,0.08)" />
                <line x1="4" y1="28" x2="44" y2="28" />
                <line x1="8" y1="28" x2="16" y2="16" />
                <line x1="40" y1="28" x2="32" y2="16" />
                <line x1="16" y1="16" x2="16" y2="8" />
                <path d="M16 8 L22 10 L16 12 Z" fill="currentColor" />
                <line x1="24" y1="16" x2="24" y2="6" />
                <path d="M24 6 L30 8 L24 10 Z" fill="currentColor" />
                <line x1="32" y1="16" x2="32" y2="8" />
                <path d="M32 8 L38 10 L32 12 Z" fill="currentColor" />
              </svg>
            </div>
            <div className="text-center text-[10px] text-[#8ea5b3] font-mono-num font-bold">
              CAPACITY 50,000+
            </div>
          </div>

          {/* QUADRANT 4 (Bottom Right): CLUB STATURE */}
          <div className="rounded-2xl bg-[#091a24]/90 border border-white/10 p-5 flex flex-col justify-between min-h-[170px]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#8ea5b3] font-bold text-center">
                Club Stature
              </div>
              <p className="font-display text-xs font-black uppercase text-white/95 text-center mt-2 leading-relaxed">
                {clubStats.stature}
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 text-center">
              <span className="text-[10px] font-bold text-[#38f2c8] uppercase">
                Tactical Vision: {selectedClub.tacticalVision}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 3: 3 VERTICAL GLOWING CARDS (Right 3 cols)                 */}
        {/* ================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          {/* Card 1: Fanbase Devotion (Warm Golden Amber Glow) */}
          <div className="rounded-2xl border border-amber-400/40 p-5 shadow-[0_10px_30px_rgba(245,158,11,0.18)] bg-gradient-to-br from-[#2a1d0d]/95 via-[#1b140d]/90 to-[#0e161c]/95 min-h-[135px] flex flex-col justify-between">
            <div className="leading-tight">
              <div className="text-xs uppercase font-bold text-amber-200/80">Fanbase</div>
              <div className="text-xs uppercase font-bold text-amber-200/80">Devotion</div>
            </div>
            <div className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wider text-amber-300">
              {clubStats.dna.devotion}
            </div>
          </div>

          {/* Card 2: Youth Facilities (Warm Orange Glow) */}
          <div className="rounded-2xl border border-orange-500/40 p-5 shadow-[0_10px_30px_rgba(249,115,22,0.16)] bg-gradient-to-br from-[#28150a]/95 via-[#1a110a]/90 to-[#0d151c]/95 min-h-[135px] flex flex-col justify-between">
            <div className="leading-tight">
              <div className="text-xs uppercase font-bold text-orange-200/80">Youth</div>
              <div className="text-xs uppercase font-bold text-orange-200/80">Facilities</div>
            </div>
            <div className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wider text-orange-300">
              {clubStats.dna.youth}
            </div>
          </div>

          {/* Card 3: Financial Stability (Deep Slate Blue Glow) */}
          <div className="rounded-2xl border border-sky-500/35 p-5 shadow-[0_10px_30px_rgba(56,189,248,0.12)] bg-gradient-to-br from-[#0c2230]/95 via-[#091823]/90 to-[#07131a]/95 min-h-[135px] flex flex-col justify-between">
            <div className="leading-tight">
              <div className="text-xs uppercase font-bold text-sky-200/80">Financial</div>
              <div className="text-xs uppercase font-bold text-sky-200/80">Stability</div>
            </div>
            <div className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wider text-sky-200">
              {clubStats.dna.stability}
            </div>
          </div>
        </div>
      </main>

      {/* =================================================================== */}
      {/* BOTTOM CONTROLLER BUMPER & ACTION BAR (1:1 with image (9).png)     */}
      {/* =================================================================== */}
      <footer className="relative z-10 border-t border-white/10 bg-[#061016]/95 backdrop-blur-md px-8 lg:px-14 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left Console Gamepad Action Prompts */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-black tracking-wide">
          {/* Cross: Advance */}
          <button
            type="button"
            onClick={handleStart}
            className="flex items-center gap-2 group text-white hover:text-[#38f2c8] transition-colors focus:outline-none"
          >
            <span className="w-5 h-5 rounded-full bg-white/15 border border-white/30 flex items-center justify-center font-mono text-[11px] font-black group-hover:border-[#38f2c8]">
              ✕
            </span>
            <span className="uppercase tracking-wider font-extrabold">Advance</span>
          </button>

          {/* Circle: Back / Resume */}
          {hasAutoSave ? (
            <button
              type="button"
              onClick={() => resumeSavedCareer()}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors focus:outline-none"
            >
              <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-mono text-[11px] font-black">
                ○
              </span>
              <span className="uppercase tracking-wider">Resume Active Career</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-white/50">
              <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-mono text-[11px] font-black">
                ○
              </span>
              <span className="uppercase tracking-wider">Back</span>
            </div>
          )}

          {/* Square: Browse All Clubs Drawer */}
          <button
            type="button"
            onClick={() => setShowAllClubsModal(true)}
            className="flex items-center gap-2 text-white/80 hover:text-[#38f2c8] transition-colors focus:outline-none"
          >
            <span className="w-5 h-5 rounded-md bg-white/10 border border-white/20 flex items-center justify-center font-mono text-[11px] font-black">
              □
            </span>
            <span className="uppercase tracking-wider">Browse All 96 Clubs</span>
          </button>

          {/* Triangle: Swap / Random Club */}
          <button
            type="button"
            onClick={() => {
              const allClubs = Object.values(database.clubs);
              const rand = allClubs[Math.floor(Math.random() * allClubs.length)];
              if (rand) {
                const lIdx = LEAGUE_ORDER.indexOf(rand.leagueId);
                if (lIdx >= 0) setSelectedLeagueIdx(lIdx);
                setSelectedClubId(rand.id);
              }
            }}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors focus:outline-none"
          >
            <span className="w-5 h-5 rounded-md bg-white/10 border border-white/20 flex items-center justify-center font-mono text-[11px] font-black">
              △
            </span>
            <span className="uppercase tracking-wider">Swap Teams (Random)</span>
          </button>
        </div>

        {/* Right Console Status Bar */}
        <div className="flex items-center gap-4 text-xs font-mono-num text-white/60">
          <span className="font-display font-black text-white/80 tracking-widest uppercase">EA SPORTS</span>
          <span className="text-white/30">|</span>
          <span className="text-[#38f2c8]">● ONLINE</span>
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/80">R2</span>
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/80">L2</span>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* BROWSE ALL 96 CLUBS DRAWER MODAL                                    */}
      {/* =================================================================== */}
      {showAllClubsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-[900px] rounded-2xl border border-white/20 bg-[#07141b] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="font-display text-2xl font-black uppercase text-white">
                Select Any European Club (96 Clubs Available)
              </h3>
              <button
                type="button"
                onClick={() => setShowAllClubsModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="my-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search club name (e.g. Real Madrid, Arsenal, Bayern, PSG)..."
                className="w-full rounded-xl bg-[#0b1d28] border border-white/15 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-[#38f2c8] focus:outline-none"
                autoFocus
              />
            </div>

            {/* Club Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {Object.values(database.clubs)
                .filter((c) =>
                  searchQuery.trim() === ''
                    ? true
                    : c.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((club) => {
                  const isSel = club.id === selectedClub.id;
                  return (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => {
                        const lIdx = LEAGUE_ORDER.indexOf(club.leagueId);
                        if (lIdx >= 0) setSelectedLeagueIdx(lIdx);
                        setSelectedClubId(club.id);
                        setShowAllClubsModal(false);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
                        isSel
                          ? 'fc-panel-active border-[#38f2c8]'
                          : 'bg-[#0a1822]/80 border-white/8 hover:bg-white/10'
                      }`}
                    >
                      <ClubCrest club={club} size={42} />
                      <div className="font-bold text-xs text-white truncate max-w-[140px]">
                        {club.name}
                      </div>
                      <div className="text-[10px] text-[#8ea5b3]">
                        {TOP_5_LEAGUES[club.leagueId]?.name ?? 'League'}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
