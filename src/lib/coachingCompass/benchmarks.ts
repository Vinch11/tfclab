import { LITERATURE_REFERENCES, REFERENCE_DISTRIBUTIONS } from '@/lib/v2/literatureReferences';
import type { CoachingCompassInput, RadarAxis } from './types';

export interface CompassBenchmark {
  kind: 'sport' | 'population'; sport: 'run' | 'bike'; label: string;
  value: number | null; target: number | null; reference: string;
  context: string; source: string; url: string; limitation: string;
}

// FRIEND original editions: treadmill 2015 table 2; cycle 2017 table 2.
// Triplets are P25 / median / P75, not confidence or readiness probabilities.
const FRIEND: Record<'run' | 'bike', Record<'M' | 'F', number[][]>> = {
  run: {
    M: [[40.1,48,55.2],[35.9,42.4,49.2],[31.9,37.8,45],[27.1,32.6,39.7],[23.7,28.2,34.5],[20.4,24.4,30.4]],
    F: [[30.5,37.6,44.7],[25.3,30.2,36.1],[22.1,26.7,32.4],[19.9,23.4,27.6],[17.2,20,23.8],[15.6,18.3,20.8]],
  },
  bike: {
    M: [[34.7,41.9,49.5],[26.2,30.1,35],[22.9,27.1,31.8],[22.1,24.8,29.3],[19.7,22.4,25.5],[17.1,19.5,22.5]],
    F: [[23.2,31,37.1],[17.9,21.6,25.1],[16.5,19.4,22.6],[15.3,17.3,20.1],[14.4,16,18.3],[13.2,14.8,16.5]],
  },
};

export function buildCompassBenchmarks(input: CoachingCompassInput, axes: RadarAxis[], sport: 'run' | 'bike' | 'triathlon'): CompassBenchmark[] {
  const sports: ('run' | 'bike')[] = sport === 'triathlon' ? ['run', 'bike'] : [sport];
  const axis = axes.find(a => a.key === 'vo2max');
  const value = axis?.value != null && axis.value > 0 ? axis.value : null;
  const target = axis?.target ?? null;
  const rows: CompassBenchmark[] = [];
  for (const discipline of sports) {
    const subelite = /elite|world|pro/i.test(input.ambition) && discipline === 'run';
    const tier = subelite ? 'subelite' : 'trained';
    const dist = REFERENCE_DISTRIBUTIONS[discipline][tier]?.vo2max;
    const source = dist ? LITERATURE_REFERENCES[dist.source] : null;
    if (dist && source) rows.push({ kind: 'sport', sport: discipline, label: 'VO₂max', value, target,
      reference: `${dist.mean} ± ${dist.sd} ml/kg/min (moyenne ± écart-type)`,
      context: `${source.population} · N=${source.n}`, source: source.citation, url: `https://doi.org/${source.doi}`,
      limitation: `Cohorte descriptive, pas un minimum requis pour ${input.objectif}. Pas de correction âge/sexe ni d’équivalence automatique avec l’ambition. ${sport === 'triathlon' ? 'Comparateur de discipline, pas cohorte triathlon ; VO₂max du bilan non attribuée à un protocole course/vélo.' : 'Modalité du test individuel à confirmer.'}`,
    });
    const age = input.athleteAge;
    const sex = input.athleteSex;
    const validAge = age != null && Number.isFinite(age) && age >= 20 && age < 80;
    const band = validAge ? Math.floor(age / 10) * 10 : null;
    const triplet = band != null && (sex === 'M' || sex === 'F') ? FRIEND[discipline][sex][(band - 20) / 10] : null;
    rows.push({ kind: 'population', sport: discipline, label: 'VO₂max', value, target,
      reference: triplet ? `Médiane ${triplet[1]} · intervalle central ${triplet[0]}–${triplet[2]} ml/kg/min` : 'Comparaison indisponible',
      context: triplet ? `${sex === 'M' ? 'Hommes' : 'Femmes'} ${band}–${(band ?? 0) + 9} ans · ${discipline === 'run' ? 'test sur tapis' : 'cycloergomètre'}` : `${validAge ? '' : 'Âge absent ou hors 20–79 ans. '}${sex === 'M' || sex === 'F' ? '' : 'Sexe non renseigné.'}`,
      source: `FRIEND ${discipline === 'run' ? '2015 · N=7 783' : '2017 · N=4 494'}`,
      url: discipline === 'run' ? 'https://doi.org/10.1016/j.mayocp.2015.07.026' : 'https://doi.org/10.1016/j.mayocp.2016.10.003',
      limitation: 'Adultes américains sans maladie cardiovasculaire connue, pas une norme de compétiteur. Intervalle central = quartiles de population, pas pourcentage de confiance. Comparaison indicative seulement : modalité et mesure directe de VO₂max à confirmer ; aucun percentile individuel calculé.',
    });
  }
  return rows;
}

export const BENCHMARK_LIMITATION = 'FTP/kg, VMA, VLamax, W′/D′, TTE, durabilité et FatMax : pas de seuil universel validé par sport, âge et sexe dans les sources retenues. Les cibles TFCL restent propres à l’objectif ; aucune valeur de référence n’est inventée. Triathlon : course et vélo séparés, sans score ni moyenne de référence globale.';