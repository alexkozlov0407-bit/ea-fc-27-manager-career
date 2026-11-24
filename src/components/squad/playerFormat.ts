import { Player } from '../../engine/types';

/** "B. Fernandes" style short name used in FC 27 lists. */
export function shortName(p: Pick<Player, 'firstName' | 'lastName' | 'knownAs'>): string {
  const parts = p.knownAs.split(' ');
  if (parts.length > 1) return `${(p.firstName || parts[0])[0]}. ${parts.slice(1).join(' ')}`;
  return p.knownAs;
}

/** First name + surname split for the big two-line name headers. */
export function splitName(p: Pick<Player, 'firstName' | 'lastName' | 'knownAs'>): { first: string; last: string } {
  const parts = p.knownAs.split(' ');
  if (parts.length > 1) return { first: p.firstName || parts[0], last: parts.slice(1).join(' ') };
  return { first: p.firstName && p.firstName !== p.knownAs ? p.firstName : '', last: p.knownAs };
}

/** Contracts run to 30 June of `contractEndYear`. */
export function contractMonthsLeft(contractEndYear: number, currentDate: string): number {
  const [y, m] = currentDate.split('-').map(Number);
  return Math.max(0, (contractEndYear - y) * 12 + (6 - m) + 1);
}

/** "1y 0m" contract length label. */
export function contractLengthLabel(contractEndYear: number, currentDate: string): string {
  const months = contractMonthsLeft(contractEndYear, currentDate);
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}

/** FC acceleration type derived from build and athleticism (not stored in the data set). */
export function accelerationType(p: Player): 'Explosive' | 'Controlled' | 'Lengthy' {
  const a = p.attributes;
  if (p.heightCm <= 182 && a.acceleration >= 80 && a.agility >= 78 && a.acceleration - a.strength >= 8) return 'Explosive';
  if (p.heightCm >= 185 && a.strength >= 70 && a.sprintspeed - a.acceleration >= 2) return 'Lengthy';
  return 'Controlled';
}

export const heightLabel = (cm: number) => {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
};

export const signedOvr = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `${d}` : '0');
export const deltaTone = (d: number) => (d > 0 ? '#45e07c' : d < 0 ? '#ff6b5a' : 'rgba(255,255,255,0.85)');
