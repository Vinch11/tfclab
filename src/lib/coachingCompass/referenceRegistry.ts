/** Display-only evidence inventory. Never import this registry into prescription. */
export const COMPASS_REFERENCE_VERSION = '2026-11-15.1';
export const compassEvidence = [
  {
    id: 'joyner-coyle-2008', title: 'Joyner & Coyle · 2008',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2375555/',
    population: 'Revue de la performance en endurance, course et vélo ; pas de cohorte normative par ambition TFCL.',
    protocol: 'Synthèse : VO₂max, seuil et efficacité interagissent dans la performance.',
    limitation: 'Justifie les dimensions du profil, pas les chiffres des cibles TFCL ni des percentiles par objectif.',
  },
  {
    id: 'assis-2024', title: 'Assis et al. · 2024',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10950087/',
    population: '13 triathlètes amateurs compétitifs : 7 hommes et 6 femmes ; préparation 70.3 / Ironman.',
    protocol: 'Test maximal cardiorespiratoire sur tapis ; tableau 2, première évaluation.',
    limitation: 'Petit échantillon mixte, sans correspondance validée avec les ambitions TFCL. MAS sur tapis ≠ tout protocole VMA terrain ; aucune référence vélo ni MLSS déduite des seuils ventilatoires.',
  },
  {
    id: 'machado-2025', title: 'Machado et al. · 2025',
    url: 'https://www.aimspress.com/article/doi/10.3934/biophy.2025021?viewType=HTML',
    population: 'Revue systématique : 30 études, 18 formats courts et 12 formats de moyenne distance.',
    protocol: 'PRISMA 2020 ; efforts continus simulant des segments ou des courses.',
    limitation: 'Ne valide pas une grille physiologique Ironman finisher → élite ; hétérogénéité des formats et protocoles.',
  },
] as const;

/** Published mean and SD, not an optimal interval, percentile or readiness threshold. */
export const contextualTriathlonCohort = {
  evidenceId: 'assis-2024', sport: 'run', objectiveScope: ['half', 'ironman'],
  ambitionMapping: 'indirect', sampleSize: 13,
  metrics: {
    vo2max: { mean: 56.3, sd: 5.56, unit: 'ml/kg/min' },
    vma: { mean: 16.69, sd: 1.65, unit: 'km/h' },
  },
} as const;