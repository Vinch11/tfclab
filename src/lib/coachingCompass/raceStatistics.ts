import { goalDistance } from './performanceComparison';

type Sex = 'M' | 'F';
type RaceInput = { objectif: string; ambition: string; athleteAge?: number | null; athleteSex?: string | null };
type Statistic = { label: string; minutes: number };
export interface RaceStatistics {
  category: string;
  population: string;
  url: string;
  rows: Statistic[];
  // A coach-facing performance comparison, never a qualification rule or physiological target.
  scenario: Statistic | null;
}

// Zavorsky et al., 2017, tables 3 and 4: medians of category medians and of winning times.
// Adult-only 5-year groups, 20–24 first, 70–74 last. Durations are decimal minutes.
const marathon: Record<Sex, { middle: number[]; winners: number[] }> = {
  M: {
    middle: [241.1, 247.4, 247.1, 244.9, 244.5, 251.1, 258.1, 269.2, 283.9, 301.6, 320.1],
    winners: [133.7, 129, 129.5, 135.1, 144, 151.2, 159.5, 169.3, 177.9, 194.5, 214.5],
  },
  F: {
    middle: [272.9, 274.3, 275.4, 274.7, 275.9, 284.6, 294.5, 301.5, 320.6, 321.6, 351.1],
    winners: [152.3, 145.2, 145.1, 149.5, 160.2, 174.4, 186.3, 197.1, 212.4, 231.6, 269.4],
  },
};

// Mostar 2024, table 2: P50 and P25 of finishing times, in minutes.
// Retain the 19–59 age groups; only 5 women and 8 men in the 60–69 strata.
const half: Record<Sex, { middle: number[]; quartile: number[]; count: number[] }> = {
  M: { middle: [114.5, 109.5, 107.9, 116.6], quartile: [102.9, 99.2, 98.8, 101.9], count: [32, 55, 70, 31] },
  F: { middle: [141, 140.8, 128.5, 121.8], quartile: [135.3, 129.3, 107.6, 111.7], count: [12, 35, 21, 16] },
};

// IRONMAN 2002–2022, table 2: mean finish times for age-group athletes.
// Groups start at 18–24, then every five years. The open 75+ group is not used.
const ironman: Record<Sex, string[]> = {
  M: ['12:36:07', '12:19:28', '12:15:21', '12:20:21', '12:31:19', '12:44:21', '13:03:32', '13:27:46', '13:53:40', '14:21:44', '14:59:52'],
  F: ['13:16:04', '13:07:35', '13:11:43', '13:19:36', '13:30:14', '13:43:29', '14:01:25', '14:18:42', '14:46:36', '15:17:54', '15:43:20'],
};

export function publishedRaceStatistics(input: RaceInput): RaceStatistics | null {
  const { athleteAge: age, athleteSex: sex, ambition } = input;
  if (age == null || !Number.isInteger(age) || (sex !== 'F' && sex !== 'M')) return null;
  const distance = goalDistance(input.objectif);
  if (!distance) return null;
  const category = (low: number, high: number) => `${sex === 'F' ? 'Femmes' : 'Hommes'} ${low}–${high} ans`;
  if (distance.km === 42.195 && distance.tri && age >= 18 && age <= 74) {
    const low = Math.floor(Math.max(20, age) / 5) * 5;
    const [h, m, s] = ironman[sex][(low - 20) / 5].split(':').map(Number);
    return { category: category(low === 20 ? 18 : low, low + 4), population: 'IRONMAN, résultats de 2002 à 2022, tableau 2. Toutes les places sont regroupées.',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11458036/', rows: [{ label: 'Moyenne des finishers', minutes: h * 60 + m + s / 60 }], scenario: null };
  }
  if (distance.tri) return null;
  if (distance.km === 42.195 && age >= 20 && age <= 74) {
    const low = Math.floor(age / 5) * 5;
    const i = (low - 20) / 5;
    const rows = [{ label: 'Milieu de catégorie', minutes: marathon[sex].middle[i] }, { label: 'Victoire de catégorie', minutes: marathon[sex].winners[i] }];
    return { category: category(low, low + 4), population: 'Boston, Chicago et New York, 2001–2016. Médianes des chronos du milieu de catégorie et des vainqueurs par édition. Zavorsky et al., tableaux 3 et 4.',
      url: 'https://doi.org/10.1371/journal.pone.0172121', rows, scenario: ambition === 'age_group' ? rows[0] : null };
  }
  if (distance.km === 21.0975 && age >= 19 && age <= 59) {
    const low = Math.max(20, Math.floor(age / 10) * 10);
    const i = (low - 20) / 10;
    const rows = [{ label: 'Milieu de catégorie', minutes: half[sex].middle[i] }, { label: 'Premier quart de la catégorie', minutes: half[sex].quartile[i] }];
    return { category: category(low === 20 ? 19 : low, low + 9), population: `Semi-marathon de Mostar 2024. Percentiles de temps, tableau 2. Groupe de ${half[sex].count[i]} finishers. Une seule édition.`,
      url: 'https://akinesiologica.com/ojs_3.3.0-7/index.php/akinesiologica/article/download/446/130', rows,
      scenario: ambition === 'age_group' ? rows[0] : ambition === 'competitor' ? rows[1] : null };
  }
  return null;
}
