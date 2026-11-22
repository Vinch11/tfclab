/** Display-only evidence inventory. Never import this registry into prescription. */
export const COMPASS_REFERENCE_VERSION = '2026-11-22.1';
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
  {
    id: 'vlamax-wackerhage-2025', title: 'Wackerhage et al. · 2025', url: 'https://pubmed.ncbi.nlm.nih.gov/40676393/',
    population: 'Revue des modèles et tests d’accumulation du lactate.',
    protocol: 'L’interprétation dépend du sport, du sprint et de la méthode de prélèvement.',
    limitation: 'Une estimation de terrain et un antécédent de sprinteur ne déterminent pas une valeur cible par classement.',
  },
  {
    id: 'tte-fontana-2009', title: 'Fontana et al. · 2009', url: 'https://pubmed.ncbi.nlm.nih.gov/19551404/',
    population: '15 hommes modérément entraînés, course et vélo.',
    protocol: 'Tests continus jusqu’à épuisement au MLSS déterminé séparément pour chaque discipline.',
    limitation: 'Le TTE dépend du seuil et du protocole. Les minutes par ambition TFCL sont des repères de coaching.',
  },
  {
    id: 'durability-hunter-2025', title: 'Hunter et al. · 2025', url: 'https://doi.org/10.1113/EP092120',
    population: 'Revue des méthodes de mesure de la durabilité en endurance.',
    protocol: 'Comparer une même caractéristique à frais et après une charge documentée.',
    limitation: 'La durée, l’intensité et les conditions de la charge modifient le résultat. Le découplage renseigne sur cette séance.',
  },
  {
    id: 'critical-power-jones-2017', title: 'Jones & Vanhatalo · 2017', url: 'https://doi.org/10.1007/s40279-017-0688-0',
    population: 'Revue du modèle de puissance critique et de ses applications.',
    protocol: 'W′ décrit la quantité de travail réalisable au-dessus de la puissance critique.',
    limitation: 'Les données disponibles ne définissent pas une réserve cible pour chaque ambition en endurance.',
  },
  {
    id: 'gordon-2017', title: 'Gordon et al. · 2017', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5703178/',
    population: '97 marathoniens récréatifs testés (63 hommes, 34 femmes), 82 avec chrono ; 5 tranches de 2 h 30 à plus de 4 h 30.',
    protocol: 'Test incrémental sur tapis (seuils lactiques LT1 et LT2, économie) puis test à l’épuisement pour la VO₂max ; tableaux 1 et 2.',
    limitation: 'Groupes mixtes, 40 à 44 ans, effectifs de 7 à 17 par tranche. Aucun coureur élite : ne couvre pas les niveaux Qualifiable et Elite.',
  },
  {
    id: 'quittmann-2022', title: 'Quittmann et al. · Int J Sports Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10072929/',
    population: '44 coureurs et triathlètes compétitifs (29 hommes, 15 femmes) ; 5 000 m en 20 min ou moins (hommes), 22 min ou moins (femmes).',
    protocol: 'Test incrémental, sprint de 100 m pour le ċLamax, ramp test, 5 000 m chronométré.',
    limitation: 'Un seul niveau de performance. ċLamax en course : 0,74 ± 0,14 (hommes), 0,55 ± 0,13 mmol/L/s ; il n’ajoute que 4,4 % de variance au modèle du 5 000 m et n’est pas retenu chez les hommes.',
  },
  {
    id: 'casado-2022', title: 'The Training Characteristics of World-Class Distance Runners · Sports Med Open · 2022', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8975965/',
    population: 'Coureurs de classe mondiale (5 000 m au marathon), intégration de la littérature et de pratiques éprouvées.',
    protocol: 'Échelle d’intensité : 1 500–5 000 m à 90–99 % de la VO₂max, 10 000 m à 85–89 %, semi et marathon à 80–84 % ; marathonienne détentrice du record du monde, VO₂max ≈ 70 ml/kg/min.',
    limitation: 'Pas de table de VO₂max par niveau de chrono ; les chiffres sont des repères de pratique.',
  },
  {
    id: 'trail-2020', title: 'Physiological profile of adult male long-distance trail runners · Einstein · 2020', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7108817/',
    population: '44 ultra-traileurs hommes (36,5 ± 7,2 ans) : 25 de niveau régional, 19 de niveau national.',
    protocol: 'Test incrémental sur tapis (seuils ventilatoires, VO₂peak) et test de Wingate.',
    limitation: 'Hommes seulement, un pays. VO₂peak régionaux 57,3 ± 7,7, nationaux 63,4 ± 4,3 ml/kg/min.',
  },
  {
    id: 'pro-u23-junior-2022', title: 'Comparative analysis of endurance, strength and body composition indicators in professional, under-23 and junior cyclists · Front Physiol · 2022', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9388719/',
    population: '51 cyclistes sur route : 14 professionnels (26,1 ans), 24 U23, 13 juniors.',
    protocol: 'Test incrémental maximal et contre-la-montre de 8 min ; tableau 1 : VO₂max 82,6 / 79,8 / 74,5, puissance au point de compensation respiratoire 6,34 / 6,10 / 5,59 W/kg.',
    limitation: 'Hommes d’une équipe espagnole. Aucune valeur pour des amateurs adultes.',
  },
  {
    id: 'cyclists-age-2007', title: 'Age-associated changes in VO2 and power output, endurance-trained New Zealand cyclists · 2007', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3794488/',
    population: '56 cyclistes d’endurance entraînés : 36 hommes, 20 femmes, 16 à 64 ans.',
    protocol: 'Test incrémental avec lactate. VO₂max hommes 56,2 ± 9,6 ml/kg/min, puissance au VO₂max 4,4 ± 0,7 W/kg ; baisse de 0,65 ml/kg/min par an chez les hommes (0,39 chez les femmes).',
    limitation: 'Étude transversale : la pente d’âge décrit des groupes, pas l’évolution d’un athlète.',
  },
  {
    id: 'fat-normative-2018', title: 'Contextualising maximal fat oxidation during exercise: determinants and normative values · Front Physiol · 2018', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5974542/',
    population: 'Synthèse de cohortes homogènes testées à jeun sur ergocycle.',
    protocol: 'Percentiles du débit maximal d’oxydation des graisses et du FatMax (% VO₂max) ; hommes entraînés en endurance, maigres (n = 201) : FatMax 56 ± 8 %, débit 0,53 ± 0,16 g/min.',
    limitation: 'Ergocycle, à jeun, aucune donnée sur des femmes entraînées en endurance ; non convertible tel quel en % de FTP.',
  },
  {
    id: 'vlamax-cycling-2024', title: 'Reliability of power output, maximal rate of capillary blood lactate accumulation and phosphagen contribution time after 15-s sprint cycling · Physiol Rep · 2024', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11116165/',
    population: '50 cyclistes (31,2 ± 7,8 ans, VO₂max 55,4 ± 7,6 ml/kg/min).',
    protocol: 'Sprint de 15 s, prélèvements capillaires pendant 8 min ; νLamax 0,54–0,55 ± 0,13–0,14 mmol/L/s avec un temps phosphagène de 3,5 s.',
    limitation: 'La valeur dépend du temps phosphagène retenu (0,49–0,56) ; étude de fiabilité, pas une norme.',
  },
  {
    id: 'durability-cycling-2025', title: 'Durability as an independent parameter of endurance performance in cycling · BMC Sports Sci Med Rehabil · 2025', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12243304/',
    population: '20 cyclistes amateurs sur route bien entraînés.',
    protocol: '1 000 kJ à 80 % de la puissance de 20 min, puis 5 min et 20 min à fond : baisse de 10,8 ± 7,8 % et 10,1 ± 6,5 %.',
    limitation: 'Aucune corrélation avec la VO₂max ni la FTP relative : la durabilité se mesure à part. Valeur observée, pas une cible par ambition.',
  },
  {
    id: 'poole-2016', title: 'Poole et al. · 2016',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5070974/',
    population: 'Revue : relation puissance-durée hyperbolique, puissance critique (CP) et W′.',
    protocol: 'CP sépare les intensités où les réponses physiologiques peuvent se stabiliser de celles où elles ne le peuvent pas ; W′ est le travail réalisable au-dessus.',
    limitation: 'Revue conceptuelle, pas de norme par niveau ni par objectif. CP n’est pas une puissance tenable une heure.',
  },
  {
    id: 'cp-mlss-2025', title: 'CP et MLSS · revue systématique et méta-analyses · 2025',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11927562/',
    population: '10 études incluses sur 782 repérées ; vélo et autres exercices dynamiques.',
    protocol: 'Puissance à CP supérieure de 12,4 W à celle du MLSS en moyenne (limites d’accord −19 à +44 W) ; pas d’écart sur VO₂, FC ni lactate.',
    limitation: 'Grande variabilité individuelle : prescrire un seuil à partir de CP seule peut comporter une erreur notable.',
  },
  {
    id: 'cs-mlss-2021', title: 'Vitesse critique et MLSS chez des coureurs bien entraînés · 2021',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8505327/',
    population: '10 coureurs bien entraînés.',
    protocol: 'CS 16,4 ± 1,3 km/h contre MLSS 15,2 ± 0,9 km/h ; D′ 216 ± 79 m ; variabilité de CS 0,8 %, de D′ 7 %.',
    limitation: 'Petit échantillon. La définition du MLSS est contestée : la CS n’est pas une allure tenable une heure.',
  },
  {
    id: 'cs-marathon-2020', title: 'Smyth & Muniz-Pumares · 2020',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7664951/',
    population: 'Marathoniens récréatifs ; CS calculée à partir de données d’entraînement brutes.',
    protocol: 'Marathon couru à 84,8 ± 13,6 % de la CS ; les élites auraient couru à environ 96 % de leur CS.',
    limitation: 'Marathon seulement ; erreur de prédiction d’environ 7,7 %. Aucune valeur équivalente vérifiée pour 5 km, 10 km et semi.',
  },
  {
    id: 'durability-running-2025', title: 'Hunter et al. · Durabilité chez des marathoniens · 2025',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12547624/',
    population: '18 marathoniens du London Marathon 2024 (3 h 17 ± 0 h 32).',
    protocol: 'Après 90 min de course au seuil : VO₂pic −5,8 % et vitesse au seuil −5,5 % ; la baisse de vitesse au seuil est liée à la performance (r = 0,68).',
    limitation: 'Petit échantillon, étude transversale. Valeur observée, pas une cible par ambition.',
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