import { GROWTH_PROFILES } from '../../engine/growth';
import { positionToSector } from '../../engine/ratings';
import { Club, Player, Sector } from '../../engine/types';

export const DEPARTMENTS: { sector: Sector; label: string }[] = [
  { sector: 'ATK', label: 'Attack' },
  { sector: 'MID', label: 'Midfield' },
  { sector: 'DEF', label: 'Defence' },
  { sector: 'GK', label: 'Goalkeeping' },
];

/** Department "ideal" star count shown on Ideal Quality / Coach Management (depth + quality). */
export function idealStars(players: number, ovr: number): number {
  if (players === 0) return 0;
  return Math.max(1, Math.round(2 + players * 0.4 + (ovr - 65) * 0.45));
}

/** Coach factor used by the weekly growth engine (growth.ts): 0.8 + 0.09 × min(5, Σ stars); 2★ when no coach. */
export function coachFactor(achievedStars: number): number {
  const effective = achievedStars === 0 ? 2 : Math.min(5, achievedStars);
  return 0.8 + effective * 0.09;
}

/** Development boost vs the no-coach baseline (2★), in percent. Max ≈ +27.6% at 5★. */
export function developmentBoostPct(achievedStars: number): number {
  return Math.round((coachFactor(achievedStars) / coachFactor(0) - 1) * 100);
}
export const MAX_BOOST_PCT = developmentBoostPct(5);

export function departmentSummary(club: Club, squad: Player[], sector: Sector) {
  const players = squad.filter((p) => positionToSector(p.primaryPosition) === sector);
  const ovr = players.length
    ? Math.round(players.reduce((s, p) => s + p.dynamicOvr.dynamicOvr, 0) / players.length)
    : 0;
  const coaches = club.coaches.filter((c) => c.hired && c.department === sector).sort((a, b) => b.stars - a.stars);
  const achieved = coaches.reduce((s, c) => s + c.stars, 0);
  return { players, ovr, coaches, achieved, ideal: idealStars(players.length, ovr), boostPct: developmentBoostPct(achieved) };
}

/**
 * Expected weeks until the player's next attribute bump (xpProgress reaches 100), using the same
 * weekly-XP formula as applyWeeklyPlayerGrowth with the noise term at its mean.
 */
export function weeksToLevelUp(p: Player, achievedStars: number): number | null {
  const curve = GROWTH_PROFILES[p.growthProfile];
  const headroom = Math.max(0, p.potential - p.baseOvr);
  if (headroom === 0 || p.age >= curve.declineStartAge) return null;
  const agePhaseRate = p.age <= 21 ? curve.earlyRate : p.age <= curve.peakStartAge ? curve.midRate : curve.lateRate;
  const momentumFactor = 0.25 + (p.developmentPlan.momentum / 100) * 1.15;
  const formFactor = Math.min(1.45, Math.max(0.35, 0.65 + (p.formScore - 5.5) * 0.22));
  const weeklyXp = Math.min(24, Math.max(0.5, (4.8 + headroom * 0.48) * agePhaseRate * momentumFactor * coachFactor(achievedStars) * formFactor));
  return Math.max(1, Math.ceil((100 - p.xpProgress) / weeklyXp));
}

export const COACH_TIER = ['Novice', 'Novice', 'Competent', 'Accomplished', 'Expert', 'Elite'] as const;

export const shortPersonName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : name;
};
