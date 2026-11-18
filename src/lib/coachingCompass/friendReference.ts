/** FRIEND 2022, RER ≥1.10. Source: JimPeterman/FRIENDanalysis R/FRIENDpercentile.R.
 * Published population ranks, NOT athlete/race readiness or confidence. */
export const FRIEND_SOURCE = 'https://www.sciencedirect.com/science/article/pii/S0025619621006455';
export const FRIEND_TABLE_SOURCE = 'https://raw.githubusercontent.com/JimPeterman/FRIENDanalysis/master/R/FRIENDpercentile.R';
export const FRIEND_PERCENTILES = [5, 25, 50, 75, 90, 95] as const;
const tables: Record<'run' | 'bike', Record<string, number[]>> = {
  "run": {
    "m20": [
      24.8,
      37.3,
      45.4,
      52.6,
      57.8,
      62.1
    ],
    "m30": [
      20.6,
      31.3,
      38.6,
      46.5,
      54.3,
      57.9
    ],
    "m40": [
      19.7,
      28.4,
      34.8,
      41.8,
      49.5,
      53.2
    ],
    "m50": [
      16.5,
      23.9,
      29.4,
      35.5,
      42.7,
      46.8
    ],
    "m60": [
      13.8,
      19.7,
      24.4,
      29.9,
      36.4,
      40.2
    ],
    "m70": [
      11.6,
      16.8,
      20.6,
      25.0,
      29.6,
      35.2
    ],
    "m80": [
      12.2,
      15.9,
      17.7,
      20.9,
      23.6,
      25.6
    ],
    "f20": [
      19.3,
      28.6,
      35.6,
      42.2,
      47.3,
      50.1
    ],
    "f30": [
      16.6,
      23.1,
      28.3,
      34.5,
      41.1,
      45.5
    ],
    "f40": [
      15.3,
      21.3,
      25.9,
      30.9,
      37.5,
      40.7
    ],
    "f50": [
      14.5,
      19.5,
      23.1,
      27.3,
      31.8,
      35.3
    ],
    "f60": [
      12.0,
      16.4,
      19.4,
      23.1,
      27.3,
      29.7
    ],
    "f70": [
      11.3,
      14.8,
      17.1,
      20.0,
      22.8,
      24.2
    ],
    "f80": [
      10.7,
      12.8,
      15.1,
      17.2,
      19.9,
      20.7
    ]
  },
  "bike": {
    "m20": [
      24.6,
      35.7,
      43.6,
      53.8,
      61.0,
      64.4
    ],
    "m30": [
      16.2,
      24.5,
      30.1,
      36.7,
      45.6,
      53.3
    ],
    "m40": [
      18.3,
      22.8,
      27.5,
      32.6,
      40.5,
      45.2
    ],
    "m50": [
      14.9,
      21.7,
      24.7,
      30.0,
      35.8,
      42.1
    ],
    "m60": [
      12.8,
      18.7,
      21.8,
      25.2,
      30.5,
      36.0
    ],
    "m70": [
      10.1,
      16.0,
      18.5,
      21.9,
      27.1,
      30.7
    ],
    "m80": [
      7.9,
      10.8,
      13.9,
      17.3,
      18.8,
      18.9
    ],
    "f20": [
      17.3,
      24.1,
      31.4,
      38.9,
      45.0,
      50.2
    ],
    "f30": [
      13.9,
      17.9,
      21.5,
      25.8,
      31.7,
      36.5
    ],
    "f40": [
      12.7,
      16.0,
      19.0,
      22.7,
      26.8,
      30.5
    ],
    "f50": [
      12.5,
      15.2,
      17.3,
      20.0,
      22.6,
      25.0
    ],
    "f60": [
      11.3,
      14.2,
      15.9,
      18.1,
      20.3,
      21.9
    ],
    "f70": [
      10.1,
      12.8,
      14.6,
      16.5,
      18.0,
      19.1
    ],
    "f80": [
      6.8,
      9.0,
      10.9,
      13.0,
      14.1,
      15.6
    ]
  }
};
export function friendReference(age: number | null | undefined, sex: string | null | undefined, sport: 'run' | 'bike') {
  if (age == null || !Number.isFinite(age) || age < 20 || age >= 90 || (sex !== 'M' && sex !== 'F')) return null;
  const decade = Math.floor(age / 10) * 10;
  const values = tables[sport][`${sex === 'M' ? 'm' : 'f'}${decade}`];
  return values ? { ageLow: decade, ageHigh: decade + 9, values, percentiles: FRIEND_PERCENTILES } : null;
}
/** Only bracket, never extrapolate an extreme or invent an exact percentile. */
export function friendPercentileBracket(value: number | null, age: number | null, sex: string | null, sport: 'run' | 'bike', documentedCpet: boolean) {
  const ref = friendReference(age, sex, sport);
  if (!documentedCpet || !ref || value == null || !Number.isFinite(value) || value <= 0) return null;
  if (value < ref.values[0]) return { low: null, high: 5 };
  for (let i = 0; i < ref.values.length; i++) {
    if (value === ref.values[i]) return { low: ref.percentiles[i], high: ref.percentiles[i] };
    if (value < ref.values[i]) return { low: ref.percentiles[i - 1], high: ref.percentiles[i] };
  }
  return { low: 95, high: null };
}
