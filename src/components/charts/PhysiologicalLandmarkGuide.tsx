import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const landmarks = [
  {
    id: 'vo2max', title: 'VO₂max', subtitle: 'Le plafond aérobie, pas un seuil',
    definition: 'Quantité maximale d’oxygène utilisée par minute lors d’un effort intense, souvent exprimée en ml/kg/min. Elle décrit la capacité aérobie maximale, pas l’intensité tenable pendant une course entière.',
    bike: 'Elle contribue au potentiel de puissance aérobie. La puissance réellement produite dépend aussi du rendement et de la fraction de VO₂max soutenable.',
    run: 'Elle contribue au potentiel de vitesse. Deux coureurs avec la même VO₂max peuvent courir à des vitesses différentes selon leur économie et leurs seuils ; VMA et VO₂max ne sont pas la même mesure.',
    evidence: 'Mesure directe : analyse des gaz respiratoires lors d’un test maximal adapté au sport. Une valeur issue d’une montre ou d’un modèle reste une estimation. Un test vélo ne documente pas automatiquement la VO₂max course.',
  },
  {
    id: 'vlamax', title: 'VLamax', subtitle: 'Le débit glycolytique maximal, pas un seuil',
    definition: 'Indicateur du débit maximal de production de lactate associé à la glycolyse, exprimé en mmol/L/s. Ce n’est ni une concentration de lactate, ni une mesure de force, ni la réserve W′.',
    bike: 'Un débit élevé peut soutenir les efforts explosifs, mais peut aussi accroître la sollicitation glucidique et la production de lactate à certaines intensités. Une valeur basse n’est pas systématiquement meilleure : son intérêt dépend de l’objectif.',
    run: 'Le même principe s’applique, mais les estimations doivent rester propres à la course. Un passé de sprinteur ou des watts de course ne suffisent pas à établir la VLamax actuelle.',
    evidence: 'Un protocole sprint avec prélèvements lactate donne une estimation dépendante du protocole et de sa correction temporelle. Les modèles sans prélèvements sont indirects ; une saisie seule ne prouve pas un test documenté.',
  },
  {
    id: 'cp', title: 'CP · puissance critique', subtitle: 'Un repère puissance–durée',
    definition: 'Paramètre d’un modèle construit à partir de plusieurs efforts maximaux de durées différentes, exprimé en watts. Il estime la frontière entre un effort lourd et un effort sévère ; ce n’est pas une puissance soutenable indéfiniment.',
    bike: 'Au-dessus de CP, la réserve de travail W′ est progressivement sollicitée. CP aide à interpréter les efforts intenses ; W′ décrit un travail au-dessus de CP, pas une force ni une VLamax.',
    run: 'Le repère vitesse–durée est la vitesse critique (VC/CS), associée à D′ en mètres. Une CP calculée en watts avec un capteur de course reste une estimation propre à ce capteur, distincte de la VC et de la CP vélo.',
    evidence: 'CP et VC sont des paramètres estimés à partir d’efforts observés. Leur qualité dépend des durées, de l’engagement maximal et du capteur. Des records non comparables ou un ajustement confirmé par le coach ne deviennent pas une mesure de lactate.',
  },
  {
    id: 'mlss', title: 'MLSS · état stable maximal du lactate', subtitle: 'Le plus haut effort avec lactate stable',
    definition: 'Plus haute intensité à laquelle le lactate sanguin reste suffisamment stable selon un protocole défini, lors d’efforts constants prolongés. Au-delà, l’équilibre devient progressivement impossible ; la durée avant épuisement reste individuelle.',
    bike: 'Exprimé en puissance, ce repère éclaire le travail au seuil et la fraction aérobie soutenable. La FTP est un repère pratique de performance, pas une mesure automatique du MLSS.',
    run: 'Exprimé en vitesse ou en allure, il éclaire le travail au seuil course. Il doit être évalué en course ; ni la FTP ni le MLSS vélo ne donnent directement une allure seuil course.',
    evidence: 'Mesure de terrain ou de laboratoire : plusieurs efforts constants avec prélèvements lactate et critères de stabilité documentés. Un MLSS calculé reste modélisé ; LT2, CP et FTP peuvent être proches sans être interchangeables.',
  },
];

export function PhysiologicalLandmarkGuide() {
  return <section className="border-y border-border py-5" data-testid="physiological-landmark-guide">
    <h4 className="text-lg font-semibold">Comprendre les capacités et les seuils</h4>
    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">VO₂max et VLamax décrivent des capacités maximales ; CP et MLSS sont des repères d’intensité. Aucun de ces indicateurs ne prédit seul un chrono ni la robustesse sur plusieurs heures.</p>
    <Accordion type="multiple" className="mt-3">
      {landmarks.map(item => <AccordionItem key={item.id} value={item.id} className="border-border last:border-b-0">
        <AccordionTrigger className="min-h-11 gap-4 text-left hover:no-underline">
          <span className="min-w-0"><span className="block font-semibold">{item.title}</span><span className="block text-xs text-muted-foreground font-normal mt-1">{item.subtitle}</span></span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 leading-relaxed">
          <p>{item.definition}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div><h5 className="font-semibold text-primary mb-1">Vélo</h5><p className="text-muted-foreground">{item.bike}</p></div>
            <div><h5 className="font-semibold text-primary mb-1">Course à pied</h5><p className="text-muted-foreground">{item.run}</p></div>
          </div>
          <div className="border-t border-border pt-3"><h5 className="font-medium mb-1">Mesure ou estimation ?</h5><p className="text-muted-foreground">{item.evidence}</p></div>
        </AccordionContent>
      </AccordionItem>)}
    </Accordion>
    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">LT1 marque le passage du domaine modéré au domaine lourd ; le MLSS sert de repère supérieur du domaine lourd dans la doctrine TFCL. Le TTE renseigne le temps jusqu’à épuisement à une intensité donnée, pas la durabilité sur toute une épreuve. Les zones dérivées restent des repères tant que leurs frontières n’ont pas été mesurées.</p>
  </section>;
}