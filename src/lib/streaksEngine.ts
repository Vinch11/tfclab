/**
 * ═══════════════════════════════════════════════════════════════
 * STREAKS & PROGRESSION ENGINE
 * Calcule streaks, XP, niveau et progression à la volée
 * depuis les données existantes (snapshots, checkins, tests)
 * ═══════════════════════════════════════════════════════════════
 */

import type { DbSnapshot } from "@/hooks/useCloudData";

// ── Types ──────────────────────────────────────────────────────

export interface StreakData {
  /** Nombre de semaines consécutives avec activité */
  currentStreak: number;
  /** Meilleur streak historique */
  bestStreak: number;
  /** XP total (points d'expérience) */
  xp: number;
  /** Niveau actuel */
  level: number;
  /** XP nécessaire pour le prochain niveau */
  xpToNextLevel: number;
  /** Progression vers le prochain niveau (0-100) */
  levelProgress: number;
  /** Badges de progression */
  progressionBadges: ProgressionBadge[];
}

export interface ProgressionBadge {
  id: string;
  label: string;
  icon: string;
  description: string;
  earned: boolean;
  progress: number; // 0-100
}

// ── XP Constants ───────────────────────────────────────────────

const XP_PER_SNAPSHOT = 25;
const XP_PER_STREAK_WEEK = 15;
const XP_STREAK_BONUS_5 = 50;
const XP_STREAK_BONUS_10 = 150;
const XP_MULTI_SPORT_BONUS = 100;

/** XP thresholds per level (cumulative) */
const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000, 4000];
const LEVEL_NAMES = [
  "Débutant", "Initié", "Régulier", "Engagé", "Confirmé",
  "Avancé", "Expert", "Élite", "Master", "Champion", "Légende"
];
const LEVEL_ICONS = ["🌱", "🌿", "🌳", "💪", "⭐", "🔥", "💎", "🏆", "👑", "🎖️", "🌟"];

// ── Core calculation ───────────────────────────────────────────

export function calculateStreaks(snapshots: DbSnapshot[]): StreakData {
  if (!snapshots || snapshots.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      xp: 0,
      level: 0,
      xpToNextLevel: LEVEL_THRESHOLDS[1],
      levelProgress: 0,
      progressionBadges: getProgressionBadges([], 0, 0),
    };
  }

  // Sort by date
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // ── Streaks (weekly) ──
  const { currentStreak, bestStreak } = computeWeeklyStreaks(sorted);

  // ── XP ──
  let xp = sorted.length * XP_PER_SNAPSHOT;
  xp += currentStreak * XP_PER_STREAK_WEEK;
  if (bestStreak >= 5) xp += XP_STREAK_BONUS_5;
  if (bestStreak >= 10) xp += XP_STREAK_BONUS_10;

  // Multi-sport bonus
  const sports = new Set(sorted.map(s => s.source).filter(Boolean));
  if (sports.size >= 3) xp += XP_MULTI_SPORT_BONUS;

  // ── Level ──
  const level = computeLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000;
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const levelProgress = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return {
    currentStreak,
    bestStreak,
    xp,
    level,
    xpToNextLevel: nextThreshold - xp,
    levelProgress,
    progressionBadges: getProgressionBadges(sorted, currentStreak, bestStreak),
  };
}

// ── Weekly streak computation ──────────────────────────────────

function computeWeeklyStreaks(sorted: DbSnapshot[]) {
  // Group snapshots by ISO week
  const weekSet = new Set<string>();
  for (const s of sorted) {
    const d = new Date(s.date);
    const week = getISOWeekKey(d);
    weekSet.add(week);
  }

  const weeks = [...weekSet].sort();
  if (weeks.length === 0) return { currentStreak: 0, bestStreak: 0 };

  // Count consecutive weeks from end
  let currentStreak = 1;
  let bestStreak = 1;
  let streak = 1;

  // Check if most recent week is current week
  const now = new Date();
  const currentWeek = getISOWeekKey(now);
  const lastWeek = getISOWeekKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const mostRecentWeek = weeks[weeks.length - 1];

  if (mostRecentWeek !== currentWeek && mostRecentWeek !== lastWeek) {
    currentStreak = 0;
  }

  for (let i = weeks.length - 1; i > 0; i--) {
    const thisW = parseISOWeekKey(weeks[i]);
    const prevW = parseISOWeekKey(weeks[i - 1]);
    const diffDays = (thisW.getTime() - prevW.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays >= 6 && diffDays <= 8) {
      streak++;
      if (currentStreak > 0) currentStreak = streak;
    } else {
      bestStreak = Math.max(bestStreak, streak);
      streak = 1;
      if (currentStreak > 0 && i < weeks.length - 1) currentStreak = 0;
    }
  }
  bestStreak = Math.max(bestStreak, streak);
  if (currentStreak === 0) currentStreak = mostRecentWeek === currentWeek || mostRecentWeek === lastWeek ? 1 : 0;

  return { currentStreak, bestStreak };
}

function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function parseISOWeekKey(key: string): Date {
  const [year, week] = key.split("-W").map(Number);
  const jan1 = new Date(year, 0, 1);
  const days = (week - 1) * 7 - ((jan1.getDay() + 6) % 7) + 3;
  return new Date(year, 0, 1 + days);
}

// ── Level computation ──────────────────────────────────────────

function computeLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

export function getLevelName(level: number): string {
  return LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)];
}

export function getLevelIcon(level: number): string {
  return LEVEL_ICONS[Math.min(level, LEVEL_ICONS.length - 1)];
}

// ── Progression badges ─────────────────────────────────────────

function getProgressionBadges(
  snapshots: DbSnapshot[],
  currentStreak: number,
  bestStreak: number
): ProgressionBadge[] {
  const count = snapshots.length;
  const sports = new Set(snapshots.map(s => s.source).filter(Boolean));

  return [
    {
      id: "first_snapshot",
      label: "Premier pas",
      icon: "👣",
      description: "Créer votre premier snapshot",
      earned: count >= 1,
      progress: Math.min(100, count >= 1 ? 100 : 0),
    },
    {
      id: "streak_3",
      label: "Série de 3",
      icon: "🔥",
      description: "3 semaines consécutives d'activité",
      earned: bestStreak >= 3,
      progress: Math.min(100, Math.round((Math.max(currentStreak, bestStreak) / 3) * 100)),
    },
    {
      id: "streak_8",
      label: "Endurant",
      icon: "💪",
      description: "8 semaines consécutives",
      earned: bestStreak >= 8,
      progress: Math.min(100, Math.round((Math.max(currentStreak, bestStreak) / 8) * 100)),
    },
    {
      id: "data_10",
      label: "Data-driven",
      icon: "📊",
      description: "10 snapshots cumulés",
      earned: count >= 10,
      progress: Math.min(100, Math.round((count / 10) * 100)),
    },
    {
      id: "multi_sport",
      label: "Triathlète",
      icon: "🏊‍♂️🚴🏃",
      description: "Données sur 3 disciplines",
      earned: sports.size >= 3,
      progress: Math.min(100, Math.round((sports.size / 3) * 100)),
    },
    {
      id: "streak_12",
      label: "Légende",
      icon: "🌟",
      description: "12 semaines de streak",
      earned: bestStreak >= 12,
      progress: Math.min(100, Math.round((Math.max(currentStreak, bestStreak) / 12) * 100)),
    },
  ];
}
