import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Keyboard,
  Search,
  Sparkles,
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

export interface ClubDNA {
  devotion: 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  youth: 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  stability: 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'VERY LOW';
}

const CLUB_DNA_PROFILES: Record<string, ClubDNA> = {
  // Spain (LaLiga)
  'FC Barcelona': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'MODERATE' }, // La Masia, legacy debt
  'Real Madrid': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'VERY HIGH' }, // La Fábrica, record revenue
  'Athletic Club': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'HIGH' }, // Lezama cantera policy
  'Atlético de Madrid': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Real Sociedad': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'HIGH' }, // Zubieta
  'Valencia CF': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'MODERATE' }, // Paterna
  'Villarreal CF': { devotion: 'HIGH', youth: 'VERY HIGH', stability: 'HIGH' }, // Miralcamp
  'Sevilla FC': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'Real Betis': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Girona FC': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'HIGH' },
  'RC Celta': { devotion: 'HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'RCD Espanyol': { devotion: 'HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'CA Osasuna': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'Deportivo Alavés': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'Rayo Vallecano': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'LOW' },
  'Getafe CF': { devotion: 'MEDIUM', youth: 'MEDIUM', stability: 'MODERATE' },
  'RCD Mallorca': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'UD Las Palmas': { devotion: 'HIGH', youth: 'HIGH', stability: 'LOW' },
  'Real Valladolid': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'LOW' },
  'CD Leganés': { devotion: 'MEDIUM', youth: 'LOW', stability: 'LOW' },

  // England (Premier League)
  Arsenal: { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'HIGH' }, // Hale End
  'Manchester City': { devotion: 'HIGH', youth: 'VERY HIGH', stability: 'VERY HIGH' }, // CFA
  Liverpool: { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'VERY HIGH' }, // Kirkby
  'Manchester United': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'HIGH' }, // Carrington
  Chelsea: { devotion: 'HIGH', youth: 'VERY HIGH', stability: 'HIGH' }, // Cobham
  'Tottenham Hotspur': { devotion: 'HIGH', youth: 'HIGH', stability: 'VERY HIGH' },
  'Aston Villa': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Newcastle United': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'VERY HIGH' },
  Everton: { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'LOW' },
  'West Ham United': { devotion: 'HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Brighton & Hove Albion': { devotion: 'HIGH', youth: 'VERY HIGH', stability: 'VERY HIGH' },
  'Wolverhampton Wanderers': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'AFC Bournemouth': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'HIGH' },
  Bournemouth: { devotion: 'HIGH', youth: 'MEDIUM', stability: 'HIGH' },
  Brentford: { devotion: 'HIGH', youth: 'MEDIUM', stability: 'HIGH' },
  'Crystal Palace': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  Fulham: { devotion: 'HIGH', youth: 'MEDIUM', stability: 'HIGH' },
  'Nottingham Forest': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'Leicester City': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  Southampton: { devotion: 'HIGH', youth: 'VERY HIGH', stability: 'MODERATE' },
  'Ipswich Town': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'MODERATE' },

  // Germany (Bundesliga)
  'FC Bayern München': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'VERY HIGH' },
  'Borussia Dortmund': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'HIGH' },
  'Bayer 04 Leverkusen': { devotion: 'HIGH', youth: 'HIGH', stability: 'VERY HIGH' },
  'RB Leipzig': { devotion: 'HIGH', youth: 'HIGH', stability: 'VERY HIGH' },
  'VfB Stuttgart': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'HIGH' },
  'Eintracht Frankfurt': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'SC Freiburg': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'HIGH' },
  'Borussia Mönchengladbach': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'SV Werder Bremen': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'MODERATE' },
  '1. FC Union Berlin': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'FC St. Pauli': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'VfL Wolfsburg': { devotion: 'MEDIUM', youth: 'HIGH', stability: 'VERY HIGH' },
  '1. FSV Mainz 05': { devotion: 'HIGH', youth: 'HIGH', stability: 'HIGH' },
  'FC Augsburg': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'HIGH' },
  'TSG 1899 Hoffenheim': { devotion: 'MEDIUM', youth: 'HIGH', stability: 'HIGH' },
  '1. FC Heidenheim 1846': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'VfL Bochum 1848': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'LOW' },
  'Holstein Kiel': { devotion: 'HIGH', youth: 'LOW', stability: 'LOW' },

  // Italy (Serie A)
  Juventus: { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'FC Internazionale Milano': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'AC Milan': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'SSC Napoli': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'HIGH' },
  'AS Roma': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'SS Lazio': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'Atalanta BC': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'HIGH' },
  'ACF Fiorentina': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Bologna FC 1909': { devotion: 'HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Torino FC': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'Genoa CFC': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'Udinese Calcio': { devotion: 'HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Parma Calcio 1913': { devotion: 'HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Como 1907': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'VERY HIGH' },
  'Cagliari Calcio': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'Hellas Verona FC': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'LOW' },
  'US Lecce': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'Empoli FC': { devotion: 'HIGH', youth: 'VERY HIGH', stability: 'MODERATE' },
  'AC Monza': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'HIGH' },
  'Venezia FC': { devotion: 'HIGH', youth: 'MEDIUM', stability: 'MODERATE' },

  // France (Ligue 1)
  'Paris Saint-Germain': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'VERY HIGH' },
  'Olympique de Marseille': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Olympique Lyonnais': { devotion: 'VERY HIGH', youth: 'VERY HIGH', stability: 'MODERATE' },
  'AS Monaco': { devotion: 'MEDIUM', youth: 'VERY HIGH', stability: 'HIGH' },
  'LOSC Lille': { devotion: 'HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Stade Rennais FC': { devotion: 'HIGH', youth: 'VERY HIGH', stability: 'HIGH' },
  'OGC Nice': { devotion: 'HIGH', youth: 'HIGH', stability: 'VERY HIGH' },
  'RC Lens': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'RC Strasbourg Alsace': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Stade de Reims': { devotion: 'HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Toulouse FC': { devotion: 'HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Montpellier HSC': { devotion: 'HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'FC Nantes': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'Stade Brestois 29': { devotion: 'VERY HIGH', youth: 'MEDIUM', stability: 'MODERATE' },
  'AJ Auxerre': { devotion: 'HIGH', youth: 'HIGH', stability: 'MODERATE' },
  'Angers SCO': { devotion: 'MEDIUM', youth: 'MEDIUM', stability: 'LOW' },
  'AS Saint-Étienne': { devotion: 'VERY HIGH', youth: 'HIGH', stability: 'HIGH' },
  'Le Havre AC': { devotion: 'HIGH', youth: 'VERY HIGH', stability: 'MODERATE' },
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

function getClubDNA(club: Club): ClubDNA {
  if (CLUB_DNA_PROFILES[club.name]) return CLUB_DNA_PROFILES[club.name];
  for (const [key, profile] of Object.entries(CLUB_DNA_PROFILES)) {
    if (club.name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(club.name.toLowerCase())) {
      return profile;
    }
  }

  const devotion =
    club.domesticPrestige >= 8
      ? 'VERY HIGH'
      : club.domesticPrestige >= 6
      ? 'HIGH'
      : club.domesticPrestige >= 4
      ? 'MEDIUM'
      : 'LOW';

  const youth =
    club.domesticPrestige >= 8
      ? 'VERY HIGH'
      : club.domesticPrestige >= 6
      ? 'HIGH'
      : club.domesticPrestige >= 4
      ? 'MEDIUM'
      : 'LOW';

  const stability =
    club.transferBudgetEur >= 80_000_000
      ? 'VERY HIGH'
      : club.transferBudgetEur >= 30_000_000
      ? 'HIGH'
      : club.transferBudgetEur >= 12_000_000
      ? 'MODERATE'
      : club.transferBudgetEur >= 4_000_000
      ? 'LOW'
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
      <path
        d="M38 18 L18 36 L30 52 L40 42 L40 122 L80 122 L80 42 L90 52 L102 36 L82 18 C74 26 46 26 38 18 Z"
        fill={bodyColor}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
      />
      <path d="M38 18 L18 36 L30 52 L40 42 Z" fill={sleeveColor} opacity="0.95" />
      <path d="M82 18 L102 36 L90 52 L80 42 Z" fill={sleeveColor} opacity="0.95" />
      <path d="M46 20 C54 28 66 28 74 20" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
      <rect x="42" y="62" width="36" height="5" rx="1.5" fill={accentColor} opacity="0.85" />
      <rect x="42" y="71" width="36" height="5" rx="1.5" fill={accentColor} opacity="0.85" />
      <rect x="42" y="80" width="36" height="5" rx="1.5" fill={accentColor} opacity="0.85" />
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

// ============================================================================
// 2D SPATIAL FOCUS SELECTOR SYSTEM (EA FC 27 TILE CURSOR)
// ============================================================================
export type SelectableTile =
  | 'header_mens'
  | 'header_womens'
  | 'header_country'
  | 'club_card'
  | 'kit_card'
  | 'founded_card'
  | 'city_card'
  | 'stature_card'
  | 'devotion_card'
  | 'youth_card'
  | 'stability_card'
  | 'btn_advance'
  | 'btn_back'
  | 'btn_browse'
  | 'btn_random';

const SPATIAL_MAP: Record<
  SelectableTile,
  { up?: SelectableTile; down?: SelectableTile; left?: SelectableTile; right?: SelectableTile }
> = {
  header_mens: {
    down: 'club_card',
    right: 'header_womens',
  },
  header_womens: {
    left: 'header_mens',
    right: 'header_country',
    down: 'kit_card',
  },
  header_country: {
    left: 'header_womens',
    right: 'devotion_card',
    down: 'founded_card',
  },
  club_card: {
    up: 'header_mens',
    right: 'kit_card',
    down: 'btn_advance',
  },
  kit_card: {
    up: 'header_womens',
    left: 'club_card',
    right: 'founded_card',
    down: 'city_card',
  },
  founded_card: {
    up: 'header_country',
    left: 'kit_card',
    right: 'devotion_card',
    down: 'stature_card',
  },
  city_card: {
    up: 'kit_card',
    left: 'club_card',
    right: 'stature_card',
    down: 'btn_back',
  },
  stature_card: {
    up: 'founded_card',
    left: 'city_card',
    right: 'youth_card',
    down: 'btn_browse',
  },
  devotion_card: {
    up: 'header_country',
    left: 'founded_card',
    down: 'youth_card',
  },
  youth_card: {
    up: 'devotion_card',
    left: 'stature_card',
    down: 'stability_card',
  },
  stability_card: {
    up: 'youth_card',
    left: 'stature_card',
    down: 'btn_random',
  },
  btn_advance: {
    up: 'club_card',
    right: 'btn_back',
  },
  btn_back: {
    up: 'city_card',
    left: 'btn_advance',
    right: 'btn_browse',
  },
  btn_browse: {
    up: 'stature_card',
    left: 'btn_back',
    right: 'btn_random',
  },
  btn_random: {
    up: 'stability_card',
    left: 'btn_browse',
  },
};

// Signature EA FC 27 Tile Selection Cursor Indicator with Neon Corner Brackets
const TileFocusIndicator: React.FC<{ active: boolean; label?: string }> = ({
  active,
  label = 'SELECT',
}) => {
  if (!active) return null;
  return (
    <>
      {/* 4 Neon Cyan Glowing Corner Brackets matching EA FC 27 Tactical HUD */}
      <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#38f2c8] pointer-events-none z-30 drop-shadow-[0_0_8px_#38f2c8]" />
      <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#38f2c8] pointer-events-none z-30 drop-shadow-[0_0_8px_#38f2c8]" />
      <span className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#38f2c8] pointer-events-none z-30 drop-shadow-[0_0_8px_#38f2c8]" />
      <span className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#38f2c8] pointer-events-none z-30 drop-shadow-[0_0_8px_#38f2c8]" />

      {/* Floating Active Neon Pill Tag */}
      <div className="absolute -top-3.5 right-4 z-40 bg-[#38f2c8] text-[#051117] font-black text-[9px] uppercase px-2 py-0.5 rounded shadow-[0_0_18px_rgba(56,242,200,0.9)] tracking-wider flex items-center gap-1.5 animate-pulse pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#051117]" />
        <span>{label}</span>
        <span className="font-mono text-[8px] bg-black/25 px-1 py-0.2 rounded text-white font-extrabold">
          SPACE
        </span>
      </div>
    </>
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
  const [modalFocusedIndex, setModalFocusedIndex] = useState(0);
  const [energyRecovery] = useState<EnergyRecoveryPolicy>('Balanced');
  const [currency] = useState<CurrencyCode>('USD');

  // Active WASD Selector Tile (defaults to Hero Club Card)
  const [focusedTile, setFocusedTile] = useState<SelectableTile>('club_card');

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

  const handleRandomClub = () => {
    if (!database) return;
    const allClubs = Object.values(database.clubs);
    const rand = allClubs[Math.floor(Math.random() * allClubs.length)];
    if (rand) {
      const lIdx = LEAGUE_ORDER.indexOf(rand.leagueId);
      if (lIdx >= 0) setSelectedLeagueIdx(lIdx);
      setSelectedClubId(rand.id);
    }
  };

  const handleTileAction = (tile: SelectableTile) => {
    switch (tile) {
      case 'header_mens':
        setIsMensTeam(true);
        break;
      case 'header_womens':
        setIsMensTeam(false);
        break;
      case 'header_country':
        nextLeague();
        break;
      case 'club_card':
        setShowAllClubsModal(true);
        setModalFocusedIndex(0);
        break;
      case 'kit_card':
        cycleKit();
        break;
      case 'btn_advance':
        handleStart();
        break;
      case 'btn_back':
        if (hasAutoSave) resumeSavedCareer();
        break;
      case 'btn_browse':
        setShowAllClubsModal(true);
        setModalFocusedIndex(0);
        break;
      case 'btn_random':
        handleRandomClub();
        break;
      default:
        break;
    }
  };

  const filteredModalClubs = useMemo(() => {
    if (!database) return [];
    return Object.values(database.clubs).filter((c) =>
      searchQuery.trim() === ''
        ? true
        : c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [database, searchQuery]);

  // ==========================================================================
  // EA FC 27 WASD SPATIAL TILE SELECTOR EVENT LISTENER
  // [W / A / S / D] Move Selector Box around screen tiles
  // [Space / Enter / X] Activate focused tile action
  // [Q / E] Cycle Clubs left / right
  // [R] Cycle Kit (when kit tile is selected or global)
  // [Escape / B] Close modal or back
  // ==========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputFocused =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'SELECT' ||
        activeEl?.tagName === 'TEXTAREA';

      // Escape always closes modal or deselects input
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showAllClubsModal) {
          setShowAllClubsModal(false);
          return;
        }
        if (isInputFocused) {
          activeEl?.blur();
          return;
        }
      }

      // In search input: let user type normally
      if (isInputFocused) {
        if (e.key === 'Enter' && showAllClubsModal && filteredModalClubs.length > 0) {
          e.preventDefault();
          const targetClub = filteredModalClubs[modalFocusedIndex] || filteredModalClubs[0];
          if (targetClub) {
            const lIdx = LEAGUE_ORDER.indexOf(targetClub.leagueId);
            if (lIdx >= 0) setSelectedLeagueIdx(lIdx);
            setSelectedClubId(targetClub.id);
            setShowAllClubsModal(false);
          }
        }
        return;
      }

      const key = e.key.toLowerCase();

      // Modal navigation with 60% WASD keys
      if (showAllClubsModal) {
        const total = filteredModalClubs.length;
        if (total === 0) return;

        if (key === 'a' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setModalFocusedIndex((prev) => (prev - 1 + total) % total);
        } else if (key === 'd' || e.key === 'ArrowRight') {
          e.preventDefault();
          setModalFocusedIndex((prev) => (prev + 1) % total);
        } else if (key === 'w' || e.key === 'ArrowUp') {
          e.preventDefault();
          setModalFocusedIndex((prev) => (prev - 4 + total) % total);
        } else if (key === 's' || e.key === 'ArrowDown') {
          e.preventDefault();
          setModalFocusedIndex((prev) => (prev + 4) % total);
        } else if (key === 'enter' || key === ' ' || key === 'x') {
          e.preventDefault();
          const targetClub = filteredModalClubs[modalFocusedIndex] || filteredModalClubs[0];
          if (targetClub) {
            const lIdx = LEAGUE_ORDER.indexOf(targetClub.leagueId);
            if (lIdx >= 0) setSelectedLeagueIdx(lIdx);
            setSelectedClubId(targetClub.id);
            setShowAllClubsModal(false);
          }
        } else if (key === 'b') {
          e.preventDefault();
          setShowAllClubsModal(false);
        }
        return;
      }

      // ======================================================================
      // MAIN SCREEN WASD SPATIAL FOCUS SELECTOR
      // ======================================================================
      if (key === 'w' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = SPATIAL_MAP[focusedTile]?.up;
        if (next) setFocusedTile(next);
      } else if (key === 's' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = SPATIAL_MAP[focusedTile]?.down;
        if (next) setFocusedTile(next);
      } else if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = SPATIAL_MAP[focusedTile]?.left;
        if (next) setFocusedTile(next);
      } else if (key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = SPATIAL_MAP[focusedTile]?.right;
        if (next) setFocusedTile(next);
      } else if (key === ' ' || key === 'enter' || key === 'x') {
        e.preventDefault();
        handleTileAction(focusedTile);
      } else if (key === 'q') {
        e.preventDefault();
        prevClub();
      } else if (key === 'e') {
        e.preventDefault();
        nextClub();
      } else if (key === 'r') {
        e.preventDefault();
        cycleKit();
      } else if (key === 'f') {
        e.preventDefault();
        setShowAllClubsModal(true);
        setModalFocusedIndex(0);
      } else if (key === 't' || key === 'y') {
        e.preventDefault();
        handleRandomClub();
      } else if (key === 'b') {
        e.preventDefault();
        if (hasAutoSave) resumeSavedCareer();
      } else if (key === '1') {
        e.preventDefault();
        setIsMensTeam(true);
        setFocusedTile('header_mens');
      } else if (key === '2') {
        e.preventDefault();
        setIsMensTeam(false);
        setFocusedTile('header_womens');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showAllClubsModal,
    filteredModalClubs,
    modalFocusedIndex,
    focusedTile,
    currentClubIndex,
    clubsInCurrentLeague,
    selectedLeagueIdx,
    hasAutoSave,
    database,
    selectedClub,
  ]);

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
          {/* Men's Teams Toggle Pill (Selectable Tile) */}
          <button
            type="button"
            onClick={() => {
              setIsMensTeam(true);
              setFocusedTile('header_mens');
            }}
            onMouseEnter={() => setFocusedTile('header_mens')}
            className={`relative flex items-center gap-2 group cursor-pointer p-1.5 rounded-lg transition-all ${
              focusedTile === 'header_mens'
                ? 'bg-white/15 ring-2 ring-[#38f2c8] shadow-[0_0_20px_rgba(56,242,200,0.5)] scale-105'
                : 'hover:bg-white/5'
            }`}
            title="Press [Space] to select Men's Teams"
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
            <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-mono-num font-bold text-white/50">
              1
            </span>
            <TileFocusIndicator active={focusedTile === 'header_mens'} label="TOGGLE" />
          </button>

          {/* Women's Teams Toggle Pill (Selectable Tile) */}
          <button
            type="button"
            onClick={() => {
              setIsMensTeam(false);
              setFocusedTile('header_womens');
            }}
            onMouseEnter={() => setFocusedTile('header_womens')}
            className={`relative flex items-center gap-2 group cursor-pointer p-1.5 rounded-lg transition-all ${
              focusedTile === 'header_womens'
                ? 'bg-white/15 ring-2 ring-[#38f2c8] shadow-[0_0_20px_rgba(56,242,200,0.5)] scale-105'
                : 'hover:bg-white/5'
            }`}
            title="Press [Space] to select Women's Teams"
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
            <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-mono-num font-bold text-white/50">
              2
            </span>
            <TileFocusIndicator active={focusedTile === 'header_womens'} label="TOGGLE" />
          </button>
        </div>

        {/* Selected Country Title (Selectable Tile) */}
        <div
          onClick={() => {
            setFocusedTile('header_country');
            nextLeague();
          }}
          onMouseEnter={() => setFocusedTile('header_country')}
          className={`relative mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            focusedTile === 'header_country'
              ? 'bg-white/15 ring-2 ring-[#38f2c8] shadow-[0_0_25px_rgba(56,242,200,0.5)] scale-105'
              : 'hover:bg-white/5'
          }`}
          title="Click or press [Space] to switch country"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevLeague();
            }}
            className="p-1 text-white/50 hover:text-white transition-colors flex items-center gap-1 group"
            title="Previous Country"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display text-2xl font-black uppercase tracking-wide text-white">
            {currentLeagueMeta.country}
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextLeague();
            }}
            className="p-1 text-white/50 hover:text-white transition-colors flex items-center gap-1 group"
            title="Next Country"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <TileFocusIndicator active={focusedTile === 'header_country'} label="CYCLE LEAGUE" />
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN 3-COLUMN SELECTION STAGE (1:1 with EA FC 27 HUD)               */}
      {/* =================================================================== */}
      <main className="relative z-10 mx-auto w-full max-w-[1580px] px-8 lg:px-14 py-4 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center flex-1">
        {/* ================================================================= */}
        {/* COLUMN 1: MAIN CLUB CAROUSEL HERO CARD (Left 4 cols)             */}
        {/* ================================================================= */}
        <div className="lg:col-span-4 flex flex-col items-center">
          {/* Glowing Frosted Glass Card with EA FC 27 Focus Select Box */}
          <div
            onClick={() => {
              setFocusedTile('club_card');
              setShowAllClubsModal(true);
            }}
            onMouseEnter={() => setFocusedTile('club_card')}
            className={`w-full max-w-[390px] rounded-2xl bg-gradient-to-b from-[#13303c]/90 via-[#0a1e28]/95 to-[#061219]/95 p-6 flex flex-col justify-between min-h-[440px] relative transition-all duration-200 cursor-pointer ${
              focusedTile === 'club_card'
                ? 'border-2 border-[#38f2c8] ring-2 ring-[#38f2c8]/80 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_45px_rgba(56,242,200,0.55),inset_0_0_25px_rgba(56,242,200,0.18)] scale-[1.03] z-20'
                : 'border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_30px_rgba(56,242,200,0.08)] hover:border-white/40'
            }`}
          >
            <TileFocusIndicator active={focusedTile === 'club_card'} label="BROWSE CLUBS" />

            {/* Top Club Name */}
            <h3 className="font-display text-3xl font-black uppercase tracking-wide text-white text-center leading-tight">
              {selectedClub.name}
            </h3>

            {/* Crest with Left / Right Navigation Chevrons + [Q] / [E] Badges */}
            <div className="my-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevClub();
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 shadow group relative"
                title="Previous Club [Q]"
              >
                <ChevronLeft className="w-6 h-6" />
                <span className="absolute -bottom-2 rounded bg-black/75 border border-white/25 px-1 text-[8px] font-mono-num font-bold text-[#38f2c8]">
                  Q
                </span>
              </button>

              <div
                className="cursor-pointer group relative transform transition-transform duration-300 hover:scale-105"
                title="Click to browse all clubs"
              >
                <ClubCrest club={selectedClub} size={150} className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]" />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextClub();
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 shadow group relative"
                title="Next Club [E]"
              >
                <ChevronRight className="w-6 h-6" />
                <span className="absolute -bottom-2 rounded bg-black/75 border border-white/25 px-1 text-[8px] font-mono-num font-bold text-[#38f2c8]">
                  E
                </span>
              </button>
            </div>

            {/* 5-Star Rating Row */}
            <div className="flex flex-col items-center gap-1.5 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1 justify-center">
                {[1, 2, 3, 4, 5].map((i) => {
                  const full = i <= Math.floor(clubStats.starRating);
                  const half =
                    !full &&
                    i === Math.floor(clubStats.starRating) + 1 &&
                    clubStats.starRating % 1 >= 0.5;
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
              className="text-white/40 hover:text-white transition-colors flex items-center gap-1"
              title="Previous Country"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-display text-xl font-black uppercase tracking-wider text-white">
              {currentLeagueMeta.name}
            </span>
            <button
              type="button"
              onClick={nextLeague}
              className="text-white/40 hover:text-white transition-colors flex items-center gap-1"
              title="Next Country"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 2: 2x2 QUADRANT DATA (Center 5 cols)                      */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {/* QUADRANT 1 (Top Left): KIT PREVIEW TILE */}
          <div
            onClick={() => {
              setFocusedTile('kit_card');
              cycleKit();
            }}
            onMouseEnter={() => setFocusedTile('kit_card')}
            className={`rounded-2xl bg-[#091a24]/90 p-5 flex flex-col justify-between min-h-[260px] cursor-pointer group transition-all duration-200 relative ${
              focusedTile === 'kit_card'
                ? 'border-2 border-[#38f2c8] ring-2 ring-[#38f2c8]/70 shadow-[0_0_35px_rgba(56,242,200,0.5),inset_0_0_20px_rgba(56,242,200,0.12)] scale-[1.025] z-20'
                : 'border border-white/10 hover:border-white/30'
            }`}
            title="Click or press [Space] to cycle kit"
          >
            <TileFocusIndicator active={focusedTile === 'kit_card'} label="CYCLE KIT" />
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
              <span className="px-1.5 py-0.2 rounded bg-white/15 text-[9px] font-mono-num font-bold text-[#38f2c8] border border-white/20">
                [R] Cycle
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

          {/* QUADRANT 2 (Top Right): FOUNDED & TROPHIES & FINANCIALS TILE */}
          <div
            onClick={() => setFocusedTile('founded_card')}
            onMouseEnter={() => setFocusedTile('founded_card')}
            className={`rounded-2xl bg-[#091a24]/90 p-5 flex flex-col justify-between min-h-[260px] transition-all duration-200 relative cursor-pointer ${
              focusedTile === 'founded_card'
                ? 'border-2 border-[#38f2c8] ring-2 ring-[#38f2c8]/70 shadow-[0_0_35px_rgba(56,242,200,0.5),inset_0_0_20px_rgba(56,242,200,0.12)] scale-[1.025] z-20'
                : 'border border-white/10 hover:border-white/30'
            }`}
          >
            <TileFocusIndicator active={focusedTile === 'founded_card'} label="HISTORY" />
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

          {/* QUADRANT 3 (Bottom Left): CITY WITH STADIUM ICON TILE */}
          <div
            onClick={() => setFocusedTile('city_card')}
            onMouseEnter={() => setFocusedTile('city_card')}
            className={`rounded-2xl bg-[#091a24]/90 p-5 flex flex-col justify-between min-h-[170px] transition-all duration-200 relative cursor-pointer ${
              focusedTile === 'city_card'
                ? 'border-2 border-[#38f2c8] ring-2 ring-[#38f2c8]/70 shadow-[0_0_35px_rgba(56,242,200,0.5),inset_0_0_20px_rgba(56,242,200,0.12)] scale-[1.025] z-20'
                : 'border border-white/10 hover:border-white/30'
            }`}
          >
            <TileFocusIndicator active={focusedTile === 'city_card'} label="VENUE" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#8ea5b3] font-bold">
                City
              </div>
              <div className="font-display text-xl font-black uppercase text-white mt-0.5 truncate">
                {clubStats.city}
              </div>
            </div>

            {/* Stylized Stadium Icon */}
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

          {/* QUADRANT 4 (Bottom Right): CLUB STATURE TILE */}
          <div
            onClick={() => setFocusedTile('stature_card')}
            onMouseEnter={() => setFocusedTile('stature_card')}
            className={`rounded-2xl bg-[#091a24]/90 p-5 flex flex-col justify-between min-h-[170px] transition-all duration-200 relative cursor-pointer ${
              focusedTile === 'stature_card'
                ? 'border-2 border-[#38f2c8] ring-2 ring-[#38f2c8]/70 shadow-[0_0_35px_rgba(56,242,200,0.5),inset_0_0_20px_rgba(56,242,200,0.12)] scale-[1.025] z-20'
                : 'border border-white/10 hover:border-white/30'
            }`}
          >
            <TileFocusIndicator active={focusedTile === 'stature_card'} label="STATURE" />
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
          {/* Card 1: Fanbase Devotion TILE */}
          <div
            onClick={() => setFocusedTile('devotion_card')}
            onMouseEnter={() => setFocusedTile('devotion_card')}
            className={`rounded-2xl p-5 min-h-[135px] flex flex-col justify-between transition-all duration-200 relative cursor-pointer ${
              focusedTile === 'devotion_card'
                ? 'border-2 border-[#38f2c8] ring-2 ring-amber-400 shadow-[0_10px_35px_rgba(245,158,11,0.35),0_0_25px_rgba(56,242,200,0.5)] scale-[1.03] z-20 bg-gradient-to-br from-[#3b270f]/95 via-[#231a0e]/95 to-[#0e161c]/95'
                : 'border border-amber-400/40 shadow-[0_10px_30px_rgba(245,158,11,0.18)] bg-gradient-to-br from-[#2a1d0d]/95 via-[#1b140d]/90 to-[#0e161c]/95 hover:border-amber-400/70'
            }`}
          >
            <TileFocusIndicator active={focusedTile === 'devotion_card'} label="DNA: DEVOTION" />
            <div className="leading-tight">
              <div className="text-xs uppercase font-bold text-amber-200/80">Fanbase</div>
              <div className="text-xs uppercase font-bold text-amber-200/80">Devotion</div>
            </div>
            <div className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wider text-amber-300">
              {clubStats.dna.devotion}
            </div>
          </div>

          {/* Card 2: Youth Facilities TILE */}
          <div
            onClick={() => setFocusedTile('youth_card')}
            onMouseEnter={() => setFocusedTile('youth_card')}
            className={`rounded-2xl p-5 min-h-[135px] flex flex-col justify-between transition-all duration-200 relative cursor-pointer ${
              focusedTile === 'youth_card'
                ? 'border-2 border-[#38f2c8] ring-2 ring-orange-500 shadow-[0_10px_35px_rgba(249,115,22,0.35),0_0_25px_rgba(56,242,200,0.5)] scale-[1.03] z-20 bg-gradient-to-br from-[#3a1d0d]/95 via-[#22160d]/95 to-[#0d151c]/95'
                : 'border border-orange-500/40 shadow-[0_10px_30px_rgba(249,115,22,0.16)] bg-gradient-to-br from-[#28150a]/95 via-[#1a110a]/90 to-[#0d151c]/95 hover:border-orange-500/70'
            }`}
          >
            <TileFocusIndicator active={focusedTile === 'youth_card'} label="DNA: YOUTH" />
            <div className="leading-tight">
              <div className="text-xs uppercase font-bold text-orange-200/80">Youth</div>
              <div className="text-xs uppercase font-bold text-orange-200/80">Facilities</div>
            </div>
            <div className="font-display text-2xl lg:text-3xl font-black uppercase tracking-wider text-orange-300">
              {clubStats.dna.youth}
            </div>
          </div>

          {/* Card 3: Financial Stability TILE */}
          <div
            onClick={() => setFocusedTile('stability_card')}
            onMouseEnter={() => setFocusedTile('stability_card')}
            className={`rounded-2xl p-5 min-h-[135px] flex flex-col justify-between transition-all duration-200 relative cursor-pointer ${
              focusedTile === 'stability_card'
                ? 'border-2 border-[#38f2c8] ring-2 ring-sky-400 shadow-[0_10px_35px_rgba(56,189,248,0.35),0_0_25px_rgba(56,242,200,0.5)] scale-[1.03] z-20 bg-gradient-to-br from-[#123146]/95 via-[#0d202e]/95 to-[#07131a]/95'
                : 'border border-sky-500/35 shadow-[0_10px_30px_rgba(56,189,248,0.12)] bg-gradient-to-br from-[#0c2230]/95 via-[#091823]/90 to-[#07131a]/95 hover:border-sky-500/60'
            }`}
          >
            <TileFocusIndicator active={focusedTile === 'stability_card'} label="DNA: FINANCES" />
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
      {/* BOTTOM ACTION BAR (Selectable Tiles & EA FC 27 Legend)              */}
      {/* =================================================================== */}
      <footer className="relative z-10 border-t border-white/10 bg-[#061016]/95 backdrop-blur-md px-8 lg:px-14 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left Action Prompts (Selectable Tiles) */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-black tracking-wide">
          {/* Tile: Advance */}
          <button
            type="button"
            onClick={() => {
              setFocusedTile('btn_advance');
              handleStart();
            }}
            onMouseEnter={() => setFocusedTile('btn_advance')}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              focusedTile === 'btn_advance'
                ? 'bg-[#38f2c8] text-[#07131a] ring-2 ring-white shadow-[0_0_25px_rgba(56,242,200,0.8)] scale-105 font-black'
                : 'text-white hover:text-[#38f2c8] bg-white/5'
            }`}
            title="Press [Space] to Advance"
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-black ${
                focusedTile === 'btn_advance' ? 'bg-[#07131a] text-[#38f2c8]' : 'bg-white/15'
              }`}
            >
              ✕
            </span>
            <span className="uppercase tracking-wider">Advance</span>
            <TileFocusIndicator active={focusedTile === 'btn_advance'} label="START CAREER" />
          </button>

          {/* Tile: Back / Resume */}
          {hasAutoSave ? (
            <button
              type="button"
              onClick={() => {
                setFocusedTile('btn_back');
                resumeSavedCareer();
              }}
              onMouseEnter={() => setFocusedTile('btn_back')}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                focusedTile === 'btn_back'
                  ? 'bg-white/20 text-white ring-2 ring-[#38f2c8] shadow-[0_0_20px_rgba(56,242,200,0.6)] scale-105'
                  : 'text-white/80 hover:text-white bg-white/5'
              }`}
              title="Press [Space] or [B] to Resume Active Career"
            >
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-mono text-[11px] font-black">
                ○
              </span>
              <span className="uppercase tracking-wider">Resume Active Career</span>
              <TileFocusIndicator active={focusedTile === 'btn_back'} label="RESUME" />
            </button>
          ) : (
            <div
              onClick={() => setFocusedTile('btn_back')}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/50 transition-all ${
                focusedTile === 'btn_back'
                  ? 'bg-white/10 ring-2 ring-[#38f2c8] shadow-[0_0_15px_rgba(56,242,200,0.4)] scale-105'
                  : ''
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-mono text-[11px] font-black">
                ○
              </span>
              <span className="uppercase tracking-wider">Back</span>
              <TileFocusIndicator active={focusedTile === 'btn_back'} label="BACK" />
            </div>
          )}

          {/* Tile: Browse All Clubs */}
          <button
            type="button"
            onClick={() => {
              setFocusedTile('btn_browse');
              setShowAllClubsModal(true);
              setModalFocusedIndex(0);
            }}
            onMouseEnter={() => setFocusedTile('btn_browse')}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              focusedTile === 'btn_browse'
                ? 'bg-white/20 text-[#38f2c8] ring-2 ring-[#38f2c8] shadow-[0_0_25px_rgba(56,242,200,0.6)] scale-105 font-bold'
                : 'text-white/80 hover:text-[#38f2c8] bg-white/5'
            }`}
            title="Press [Space] or [F] to browse all 96 clubs"
          >
            <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-mono text-[11px] font-black">
              □
            </span>
            <span className="uppercase tracking-wider">Browse All 96 Clubs</span>
            <TileFocusIndicator active={focusedTile === 'btn_browse'} label="ALL CLUBS" />
          </button>

          {/* Tile: Swap Teams (Random) */}
          <button
            type="button"
            onClick={() => {
              setFocusedTile('btn_random');
              handleRandomClub();
            }}
            onMouseEnter={() => setFocusedTile('btn_random')}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              focusedTile === 'btn_random'
                ? 'bg-white/20 text-[#38f2c8] ring-2 ring-[#38f2c8] shadow-[0_0_25px_rgba(56,242,200,0.6)] scale-105 font-bold'
                : 'text-white/80 hover:text-white bg-white/5'
            }`}
            title="Press [Space] or [T] to pick a random club"
          >
            <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-mono text-[11px] font-black">
              △
            </span>
            <span className="uppercase tracking-wider">Swap Teams (Random)</span>
            <TileFocusIndicator active={focusedTile === 'btn_random'} label="RANDOM" />
          </button>
        </div>

        {/* Right Active Spatial Selector Status Legend */}
        <div className="flex items-center gap-3 text-xs font-mono-num text-white/70">
          <div className="flex items-center gap-2 rounded-full bg-[#38f2c8]/10 border border-[#38f2c8]/40 px-3 py-1 text-[11px] text-[#38f2c8] shadow-[0_0_15px_rgba(56,242,200,0.2)]">
            <Keyboard className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-extrabold uppercase tracking-wide">
              [WASD] MOVE SELECTOR
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white font-bold">[SPACE] ACTIVATE</span>
            <span className="text-white/40">|</span>
            <span className="text-white font-bold">[Q / E] CLUB</span>
          </div>
          <span className="text-[#38f2c8] font-bold">● ONLINE</span>
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/80">
            R2
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/80">
            L2
          </span>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* BROWSE ALL 96 CLUBS DRAWER MODAL (With Active WASD Selector)        */}
      {/* =================================================================== */}
      {showAllClubsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-[920px] rounded-2xl border border-white/20 bg-[#07141b] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="font-display text-2xl font-black uppercase text-white">
                  Select Any European Club (96 Clubs Available)
                </h3>
                <p className="text-xs text-[#8ea5b3] mt-0.5">
                  Move selector with <span className="text-[#38f2c8] font-bold">[W / A / S / D]</span>, confirm with{' '}
                  <span className="text-[#38f2c8] font-bold">[Space / Enter]</span>, close with{' '}
                  <span className="text-white/80 font-bold">[Esc / B]</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllClubsModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                title="Close [Esc / B]"
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setModalFocusedIndex(0);
                }}
                placeholder="Search club name (e.g. Real Madrid, Barcelona, Bayern, Arsenal, PSG)..."
                className="w-full rounded-xl bg-[#0b1d28] border border-white/15 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-[#38f2c8] focus:outline-none"
                autoFocus
              />
            </div>

            {/* Club Grid with Active Glowing Selector Box */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {filteredModalClubs.map((club, idx) => {
                const isSel = club.id === selectedClub.id;
                const isFocused = idx === modalFocusedIndex;
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
                    onMouseEnter={() => setModalFocusedIndex(idx)}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all relative ${
                      isFocused
                        ? 'border-2 border-[#38f2c8] ring-2 ring-[#38f2c8]/80 shadow-[0_0_25px_rgba(56,242,200,0.55)] scale-[1.04] bg-white/15 z-10'
                        : isSel
                        ? 'fc-panel-active border-[#38f2c8]/60 shadow-[0_0_15px_rgba(56,242,200,0.3)]'
                        : 'bg-[#0a1822]/80 border-white/8 hover:bg-white/10'
                    }`}
                  >
                    <TileFocusIndicator active={isFocused} label="SELECT" />
                    <ClubCrest club={club} size={42} />
                    <div className="font-bold text-xs text-white truncate max-w-[140px]">
                      {club.name}
                    </div>
                    <div className="text-[10px] text-[#8ea5b3]">
                      {TOP_5_LEAGUES[club.leagueId]?.name ?? 'League'}
                    </div>
                    {isSel && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#38f2c8]" />
                    )}
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
