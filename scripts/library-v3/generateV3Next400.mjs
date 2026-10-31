/** TFCLab V3.1 candidate expansion generator. No production import, no athlete data. */
import {writeFileSync} from 'node:fs';
const bounds=function bounds(base,lo,hi) {return {min:lo??base,base,max:hi??base};};
const enrich=function enrich(w) {
  const limiterByIntent={
    recovery:["fatigue_residual","recovery_tolerance"],
    moderate_lt1:["aerobic_capacity","durability"],
    mlss:["fractional_utilization","threshold_tolerance"],
    vo2max:["aerobic_ceiling","severe_domain_tolerance"],
    neuromuscular:["neuromuscular_recruitment","movement_economy"],
    max_strength:["maximal_force","force_reserve"],
    strength_endurance:["local_muscular_endurance","fatigue_resistance"],
    technique_economy:["movement_economy","technical_efficiency"],
    mobility_prevention:["movement_control","tissue_load_tolerance"],
    mixed_specific:["sport_transition","race_durability"],
    race_specific:["race_pace_durability","fueling_tolerance"],
    fatmax:["aerobic_efficiency","substrate_utilization"],
    test:["measurement_uncertainty","reassessment"],
  };
  let allDomains=new Set(), distanceDomains=new Set(), knobs=[],repEstimated=false,hasTimeMain=false;
  const walk=(blocks,prefix="")=>blocks.forEach((block,i)=>{
    const path=prefix?prefix+"."+i:String(i);
    if(block.kind==="repeat"){
      if(block.betweenSecBounds===undefined){
        const n=block.betweenSec;
        const low=n===0?0:Math.max(0,n-30);
        block.betweenSecBounds={min:low,base:n,max:n===0?0:n+60};
      }
      knobs.push({path:path+".count",unit:"count",...block.count,risk:"coach_verification_for_workset"});
      knobs.push({path:path+".betweenSec",unit:"seconds",...block.betweenSecBounds,risk:"recovery_dose"});
      walk(block.steps,path);
    }else{
      if(w.sport!=="strength" && block.domain!==null && block.domain!==undefined)allDomains.add(block.domain);
      if(block.kind==="distance")distanceDomains.add(block.domain);
      if(block.kind==="reps")repEstimated=true;
      if(block.kind==="time" && block.role==="main")hasTimeMain=true;
      const k=block.kind==="time"?"seconds":block.kind==="distance"?"meters":"reps";
      const risky=!["recovery","moderate_lt1",null].includes(block.domain);
      knobs.push({path:path+"."+k,unit:k,...block[k],risk:risky?"coach_approval_quality_dose":"bounded_session_dose"});
      if(block.repsTarget)knobs.push({path:path+".repsTarget",unit:"reps",...block.repsTarget,risk:"coach_verification_for_workset"});
    }
  });
  walk(w.blocks);
  const domains=[...allDomains].sort();
  const anchors=domains.map(domain=>{
    if(w.sport==="bike") return {domain,key:domain==="neuromuscular"?"bike_verified_sprint_power_range_w":domain==="vo2max"?"bike_ftp_w+bike_pma_w":"bike_ftp_w",transform:domain==="neuromuscular"?"no_assumed_numeric_sprint":domain==="vo2max"?"verified_ftp_and_pma":"tfclDoctrine.bike_fraction_of_ftp",missing:"unresolved"};
    if(w.sport==="run") return {domain,key:domain==="neuromuscular"?"run_verified_sprint_speed_range_mps":domain==="vo2max"?"run_threshold_pace_sec_per_km+run_vvo2_speed_mps":"run_threshold_pace_sec_per_km",transform:domain==="neuromuscular"?"no_assumed_numeric_sprint":domain==="vo2max"?"verified_threshold_and_vvo2":"tfclDoctrine.run_speed_fraction_of_threshold",missing:"unresolved"};
    return {domain,key:"swim_domain_pace_sec_per_100m."+domain,transform:domain==="mlss"?"measured_domain_pace_or_coach_confirmed_css_proxy":"measured_domain_pace_only",missing:"unresolved"};
  });
  if(w.sport==="strength")anchors.push({domain:null,key:"coach_verified_rpe_and_load",transform:"individualized_load_not_assumed_percent_1rm",missing:"unresolved"});
  w.prescription={
    physiologicalIntent:{
      statement:w.focus, primaryIntent:w.primaryIntent, primaryDomain:w.primaryDomain,
      domainIds:domains, limiterKeys:[...new Set([...(limiterByIntent[w.primaryIntent]||[]),w.sport==="swim"?"swim_technical_durability":w.sport==="strength"?"strength_mechanics":w.sport==="run"?"running_impact_tolerance":"cycling_power_durability"])],
      goal:"targeted_adaptation_not_guaranteed",uncertainty:"principle_evidence_not_session_validation",
    },
    individualization:{
      anchors, missingAnchorBehavior:"unresolved_no_numeric_target",
      coachMustConfirmMeasurements:true,
      strengthLoadSelection:"RPE_AND_technique_by_coach_no_invented_weight",
      swimCssPolicy:"CSS_may_only_proxy_MLSS_after_explicit_coach_validation_not_other_domains",
    },
    parameters:knobs,
    duration:{
      formula:"SUM(leaf.seconds OR distance.meters*measured_domain_pace/100 OR reps*seconds_per_rep_estimated) + SUM((repeat.count-1)*betweenSec); recursive repeats multiply inner duration",
      classification:repEstimated?"estimated_not_slot_confirmed":distanceDomains.size?"requires_individual_pace":w.sport==="strength"?"timeboxed_executable":"exact_time",
      requiredMeasurements:[...distanceDomains].map(d=>"swim_domain_pace_sec_per_100m."+d),
      unknownBehavior:"unresolved_not_filled_or_rounded",
      strengthRepsInterpretation:repEstimated?"estimated_movement_time_not_appointment_duration":"timeboxed_including_rest",
    },
    admissibility:{
      minimumLevel:w.minimumLevel,phases:[...w.phase],minimumRecoveryHours:w.minimumRecoveryHours,
      prerequisites:[...w.prerequisites],contraindications:[...w.contraindications],
      stopRule:w.stopRule,requiresIndividualCoachReview:true,requiresLoadAndFatigueCheck:true,
      requiresWeeklySportingValidation:true,notAutoApproved:true,
    }
  };
  return w;
};
const makeExpansion=function makeExpansion(sport) {
  // Twenty original intentions per discipline, five meaningful dose/phase variants each.
  const lines={
    bike:[
      "Décrassage circulatoire|recovery|recovery|steady|1800|0|Restaurer une sensation de pédalage souple sans dette métabolique|light",
      "Endurance basse à cadence libre|moderate_lt1|moderate_lt1|steady|3600|0|Consolider le travail sous LT1 avec maîtrise ventilatoire|light",
      "Endurance durable à volume étendu|moderate_lt1|moderate_lt1|steady|5400|0|Augmenter la durabilité sans dérive excessive|trained",
      "Deux blocs aérobie pour découplage|moderate_lt1|moderate_lt1|split|1800|120|Comparer réponse cardiovasculaire en seconde partie|trained",
      "Cadence régulière technique|technique_economy|moderate_lt1|interval|480|120|Améliorer l'économie de pédalage et la régularité gestuelle|light",
      "Couple contrôlé sans écraser la cadence|strength_endurance|moderate_lt1|interval|360|180|Renforcer la tolérance musculaire à puissance sous LT1|trained",
      "Oxydation aérobie progressive|fatmax|moderate_lt1|steady|4200|0|Soutenir l'efficacité métabolique sous LT1|trained",
      "Tempo continu maîtrisé|race_specific|tempo|steady|1800|0|Soutenir le domaine lourd sans surenchère d'intensité|trained",
      "Sous-seuil fractionné|mlss|sub_threshold|interval|480|120|Augmenter le temps cumulé juste sous le seuil|trained",
      "Seuil en fractions longues|mlss|mlss|interval|600|180|Accroître la tolérance aux répétitions proches MLSS|trained",
      "VO2 à fractions de quatre minutes|vo2max|vo2max|interval|240|180|Augmenter le temps qualitatif en domaine sévère|trained",
      "VO2 micro-fractions trente-trente|vo2max|vo2max|micro30|30|30|Accumuler une dose courte sévère avec relances contrôlées|trained",
      "VO2 micro-fractions quarante-vingt|vo2max|vo2max|micro40|40|20|Stabiliser les efforts intermittents sans sprint maximal|trained",
      "VO2 fractions longues|vo2max|vo2max|interval|300|240|Soutenir une forte consommation d'oxygène sans épuisement|highly_trained",
      "Sprints alactiques contrôlés|neuromuscular|neuromuscular|sprint|15|45|Entretenir le recrutement alactique avec récupérations complètes|trained",
      "Ironman puissance durable|race_specific|im_pace|steady|3600|0|Préserver l'économie à intensité spécifique Ironman|trained",
      "70.3 allure spécifique|race_specific|703_pace|interval|900|240|Soutenir la puissance 70.3 avec contrôle de la dérive|trained",
      "Over-under sans dérive|mlss|mlss|alternate|240|120|Alterner tempo et seuil sans dépasser les bornes individuelles|highly_trained",
      "Tempo blocs progressifs|race_specific|tempo|split|1200|120|Améliorer maintien d'allure sur deux blocs cohérents|trained",
      "Robustesse aérobie fin de sortie|moderate_lt1|moderate_lt1|split|2400|180|Résister à la baisse d'efficacité au second bloc|trained",
    ],
    run:[
      "Marche-course pour première continuité|moderate_lt1|moderate_lt1|micro60|60|120|Installer une continuité course marche sans charge brutale|untrained",
      "Footing de récupération|recovery|recovery|steady|1500|0|Entretenir mobilité circulatoire après charge intense|light",
      "Endurance tranquille continue|moderate_lt1|moderate_lt1|steady|2400|0|Consolider la base oxydative en limitant les chocs|light",
      "Sortie durable aérobie|moderate_lt1|moderate_lt1|steady|3600|0|Construire une durabilité locomotrice progressive|trained",
      "Pente régulière facile|moderate_lt1|moderate_lt1|interval|360|120|Améliorer contrôle gestuel sur pentes douces|trained",
      "Gammes et éducatifs dynamiques|technique_economy|moderate_lt1|interval|180|120|Améliorer coordination et contact au sol|light",
      "Lignes droites relâchées|neuromuscular|neuromuscular|sprint|15|45|Développer vitesse gestuelle sans volume lactique|trained",
      "Seuil contrôlé fractionné|mlss|mlss|interval|480|180|Développer capacité à répéter l'effort au seuil|trained",
      "Sous-seuil extensif|mlss|sub_threshold|interval|600|120|Accumuler du travail sous MLSS avec récupération suffisante|trained",
      "Tempo continu accessible|race_specific|tempo|steady|1200|0|Élever la résistance à allure soutenue maîtrisée|trained",
      "Marathon fraction longue|race_specific|marathon_pace|interval|900|180|Ancrer l'économie à vitesse spécifique marathon|trained",
      "Semi-marathon blocs réguliers|race_specific|semi_pace|interval|600|180|Stabiliser l'allure spécifique semi|trained",
      "70.3 course spécifique|race_specific|703_pace|interval|480|180|Conserver la mécanique à allure 70.3 en course|trained",
      "VO2 fractions trois minutes|vo2max|vo2max|interval|180|180|Accumuler un effort sévère sans sprint|trained",
      "VO2 fractions une minute|vo2max|vo2max|interval|60|120|Développer tolérance aux relances intenses|trained",
      "VO2 alternance trente-trente|vo2max|vo2max|micro30|30|30|Cumuler les expositions brèves à intensité sévère|trained",
      "Côtes en VO2 progressif|vo2max|vo2max|interval|120|180|Stimuler l'aérobie intense avec technique contrôlée en côte|trained",
      "Économie cadence naturelle|technique_economy|moderate_lt1|split|900|120|Comparer confort et régularité à cadence auto-sélectionnée|light",
      "Rythme sous-seuil progressif|mlss|sub_threshold|split|720|180|Tester stabilité du geste à effort sous-seuil|trained",
      "Endurance de fin de sortie|moderate_lt1|moderate_lt1|split|1500|180|Préserver économie en fatigue légère sans haute intensité|trained",
    ],
    swim:[
      "Récupération aquatique temporelle|recovery|recovery|steady|1200|0|Nager souple sans dette ventilatoire|light",
      "Alignement tête et tronc|technique_economy|recovery|interval|180|60|Réduire les mouvements parasites en glisse|light",
      "Coordination de la respiration|technique_economy|recovery|interval|120|60|Coordonner expiration et rotation sans apnée forcée|light",
      "Appui avant bras contrôlé|technique_economy|moderate_lt1|interval|180|60|Améliorer la qualité de prise d'appui aquatique|light",
      "Rotation équilibrée|technique_economy|moderate_lt1|interval|240|60|Intégrer rotation avec alignement stable|light",
      "Battements équilibrés|technique_economy|recovery|interval|120|60|Améliorer propulsion sans hyperflexion lombaire|light",
      "Aérobie blocs courts|moderate_lt1|moderate_lt1|interval|300|60|Soutenir le domaine modéré avec technique stable|light",
      "Aérobie blocs moyens|moderate_lt1|moderate_lt1|interval|420|90|Maintenir économie sur fractions extensives|trained",
      "Aérobie continue|moderate_lt1|moderate_lt1|steady|1800|0|Améliorer durabilité de nage sans allonger artificiellement|trained",
      "Orientation eau libre en bassin|technique_economy|moderate_lt1|interval|180|60|Insérer visée sans dégrader la nage|trained",
      "Negative split contrôlé|moderate_lt1|moderate_lt1|split|480|90|Répartir effort entre deux parties stables|trained",
      "CSS blocs courts|mlss|mlss|interval|180|90|Répéter effort contrôlé proche CSS seulement si proxy validé|trained",
      "CSS blocs moyens|mlss|mlss|interval|300|120|Soutenir l'allure seuil natation contrôlée|trained",
      "Sous seuil en échelle|mlss|sub_threshold|alternate|240|120|Développer tolérance à allure intermédiaire mesurée|trained",
      "VO2 fractions courtes|vo2max|vo2max|interval|60|120|Stimuler domaine sévère sans perte gestuelle|trained",
      "VO2 fractions moyennes|vo2max|vo2max|interval|120|150|Accumuler des durées sévères reproductibles|trained",
      "Accélérations aquatiques brèves|neuromuscular|neuromuscular|sprint|15|45|Favoriser coordination rapide sans apnée|trained",
      "Vitesse bras et fréquence contrôlée|technique_economy|moderate_lt1|interval|120|60|Augmenter efficacité du cycle à fatigue limitée|trained",
      "Spécifique Ironman temps de nage|race_specific|im_pace|steady|2400|0|Consolider tenue technique à effort spécifique Ironman|trained",
      "Spécifique 70.3 temps de nage|race_specific|703_pace|interval|600|120|Maintenir effort spécifique 70.3 et posture|trained",
    ],
    strength:[
      "Squat technique contrôlée|max_strength|null|box|45|75|Force des extenseurs du genou sans perte de gainage|trained",
      "Charnière hanche soulevé roumain|max_strength|null|box|45|90|Force de chaîne postérieure avec dos neutre|trained",
      "Fente arrière assistée|strength_endurance|null|box|45|75|Contrôle unilatéral hanche genou|light",
      "Montée de step contrôlée|strength_endurance|null|box|45|75|Stabilité du bassin en appui unipodal|light",
      "Mollets extension debout|max_strength|null|box|45|90|Renforcement triceps sural genou tendu|trained",
      "Soléaire genou fléchi|strength_endurance|null|box|45|75|Développer endurance de flexion plantaire genou fléchi|light",
      "Ischio-jambiers flexion contrôlée|max_strength|null|box|45|90|Force des fléchisseurs du genou sans crampe|trained",
      "Nordic assisté excentrique|max_strength|null|box|45|120|Tolérance excentrique ischio avec assistance|highly_trained",
      "Tirage horizontal scapulaire|strength_endurance|null|box|45|75|Stabilisation scapulaire et dos|light",
      "Poussée horizontale technique|max_strength|null|box|45|90|Force de poussée sans compensation d'épaule|trained",
      "Anti-rotation du tronc|mobility_prevention|null|box|45|75|Résistance du tronc aux rotations indésirables|light",
      "Anti-extension du tronc|mobility_prevention|null|box|45|75|Maintien position lombaire neutre|light",
      "Bassin stabilisation latérale|mobility_prevention|null|box|45|75|Contrôle frontal de hanche en appui|light",
      "Réception pliométrique préparatoire|technique_economy|null|box|30|90|Contrôler réception avec contacts limités|trained",
      "Pliométrie faible amplitude|neuromuscular|null|box|30|120|Ressort cheville avec qualité de contact|highly_trained",
      "Coordination saut latéral|minimal|null|box|30|120|Coordination latérale avec faible volume de contacts|trained",
      "Rotateurs externes épaule|mobility_prevention|null|box|45|75|Endurance de coiffe dans amplitude tolérée|light",
      "Mobilité thoracique active|mobility_prevention|null|box|45|60|Amplitude thoracique sans forcer la colonne|light",
      "Pont fessier unilatéral|strength_endurance|null|box|45|75|Extension hanche sans hyperlordose|light",
      "Circuit complet de force utile|strength_endurance|null|box|60|90|Force généralisée compatible avec endurance|trained",
    ]
  };
  const phases=["base","build","build","peak","taper"];
  const names=["maîtrise initiale","consolidation","progression contrôlée","dose extensive","rappel allégé"];
  const mult=[0.75,1,1.25,1.5,0.65], reps=[3,4,5,4,2];
  const q=(base,min,max)=>bounds(base,min??base,max??base);
  const bt=(sec,domain,role,label,more={})=>({kind:"time",seconds:q(sec,Math.max(15,Math.round(sec*.8/15)*15),Math.round(sec*1.2/15)*15),domain,role,label,...more});
  const workouts=[];
  for(let c=0;c<20;c++){
    let [title,intent,dStr,shape,w0,r0,focus,level]=lines[sport][c].split("|");const domain=dStr==="null"?null:dStr;
    if(intent==="minimal")intent="technique_economy";
    for(let v=0;v<5;v++){
      const id="V3P_"+sport.toUpperCase()+"_"+String(101+c*5+v).padStart(3,"0"), variant=names[v], phase=phases[v];
      let work=Math.round(Number(w0)*mult[v]/60)*60,rest=Math.ceil(Number(r0)/60)*60,count=reps[v], blocks=[];
      const warm=sport==="strength"?600:sport==="swim"?480:600, cool=sport==="strength"?300:sport==="swim"?360:480;
      blocks.push({kind:"time",seconds:q(warm,warm,warm),domain:sport==="strength"?null:"recovery",role:"warmup",label:"Échauffement progressif, contrôle de disponibilité"});
      const makeMain=(seconds,label)=>bt(seconds,domain,"main",label,
        sport==="strength"?{repsTarget:q(c===7||c===14||c===15?4:8,c===7||c===14||c===15?2:5,c===7||c===14||c===15?6:12),rpeRange:{min:(intent==="max_strength"?6:4),max:(intent==="max_strength"?8:7)}}:{});
      if(sport==="strength"){
        // Exact appointment duration: each 30/45/60 s slot is timeboxed, repetitions are a target, not a time estimate.
        const target=v===3?120:60; // Complete reserved sets, not continuous repetitions
        blocks.push({kind:"repeat",label:title+" — "+variant,count:q(count,Math.max(1,count-1),count+1),
          betweenSec:rest,betweenSecBounds:q(rest,Math.max(0,rest-15),rest+30),
          steps:[{kind:"time",seconds:q(target,target,target),domain:null,role:"main",
            label:title+" ; créneau avec micro-pauses et répétitions plafonnées, stop dès perte de qualité",
            repsTarget:q(c===7||c===14||c===15?4:8,c===7||c===14||c===15?2:5,c===7||c===14||c===15?6:12),
            rpeRange:{min:intent==="max_strength"?6:4,max:intent==="max_strength"?8:7}}]});
      }else if(shape==="steady"){
        work=Math.max(300,Math.round(Number(w0)*mult[v]/60)*60);
        blocks.push(makeMain(work,title));
      }else if(shape==="split"){
        work=Math.max(180,Math.round(Number(w0)*mult[v]/60)*60);
        blocks.push(makeMain(work,title+" première fraction"));
        blocks.push({kind:"time",seconds:q(rest||120,rest||120,rest||120),domain:"recovery",role:"main",label:"Récupération vérifiée entre fractions"});
        blocks.push(makeMain(work,title+" seconde fraction"));
      }else if(shape==="alternate"){
        work=Math.max(120,Math.round(Number(w0)*mult[v]/60)*60);
        const low=domain==="mlss"?"tempo":domain==="sub_threshold"?"moderate_lt1":"recovery";
        blocks.push({kind:"repeat",label:title+" alternance contrôlée",count:q(count,Math.max(1,count-1),count+1),betweenSec:rest,
          betweenSecBounds:q(rest,Math.max(0,rest-30),rest+60),
          steps:[makeMain(work,title+" fraction prioritaire"),bt(Math.max(60,Math.round((work/2)/60)*60),low,"main","Fraction basse sans surdose")]});
      }else if(shape==="micro60"||shape==="micro30"||shape==="micro40"||shape==="sprint"){
        const hard=shape==="micro60"?60:shape==="micro30"?30:shape==="micro40"?40:15;
        const easy=shape==="micro60"?120:shape==="micro30"?30:shape==="micro40"?20:45;
        count=shape==="micro30"?[8,12,16,12,8][v]:shape==="sprint"?[4,8,8,12,4][v]:shape==="micro60"?[3,4,5,4,2][v]:[6,8,10,8,4][v];
        blocks.push({kind:"repeat",label:title+" — "+variant,count:q(count,Math.max(1,count-(shape==="micro30"?4:1)),count+(shape==="micro30"?4:1)),
          betweenSec:0,betweenSecBounds:q(0,0,0),
          steps:[{kind:"time",seconds:q(hard,hard,hard),domain,role:"main",label:"Fraction cible "+title},
            {kind:"time",seconds:q(easy,easy,easy),domain:"recovery",role:"main",label:"Récupération active ou passive selon protocole"}]});
      }else{
        work=Math.max(60,Math.round(Number(w0)*mult[v]/60)*60);
        blocks.push({kind:"repeat",label:title+" — "+variant,count:q(count,Math.max(1,count-1),count+1),
          betweenSec:rest,betweenSecBounds:q(rest,Math.max(0,rest-30),rest+60),
          steps:[makeMain(work,title)]});
      }
      blocks.push({kind:"time",seconds:q(cool,cool,cool),domain:sport==="strength"?null:"recovery",role:"cooldown",label:"Retour au calme et vérification des sensations"});
      const high=["mlss","vo2max","neuromuscular"].includes(intent)||domain==="mlss"||domain==="vo2max"||domain==="neuromuscular";
      const reg={bike:high?36:18,run:high?48:24,swim:high?24:12,strength:high?48:36}[sport];
      const applicablePhases=phase==="taper"?["taper","peak"]:phase==="peak"?["build","peak"]:phase==="base"?["base"]:["base","build"];
      const contra={
        bike:["Douleur ou fatigue inappropriée","Terrain, matériel ou hydratation non sûrs"],
        run:["Douleur locomotrice ou reprise de blessure non validée","Augmentation des impacts incompatible avec charge récente"],
        swim:["Douleur d'épaule, gêne respiratoire ou technique dégradée","Absence de surveillance du bassin ou eau libre non sécurisée","Aucune apnée forcée"],
        strength:["Douleur, instabilité ou technique non maîtrisée","Charge externe non individualisée, fatigue résiduelle élevée"],
      }[sport];
      const prerequisites=high?["Repères physiologiques vérifiés, séance qualitative validée par le coach","Récupération et charge récente compatibles"]:["Niveau et charge récente vérifiés par le coach"];
      if(sport==="strength")prerequisites.push("Charge et RPE choisis par le coach selon exécution, sans 1RM inventé");
      const w={id,version:"3.1.0-candidate",sport,title:title+" — "+variant,
        primaryIntent:intent,primaryDomain:domain,phase:applicablePhases,minimumLevel:level,focus:focus+" ; variation "+variant,
        origin:"Recette originale TFCLab. Principes de la littérature seulement, sans validation individuelle de la séance",
        evidence:{referenceIds:sport==="bike"?["TID2024","BIKE2025"]:sport==="run"?["TID2024","TID2025"]:sport==="swim"?["SWIM2021","SWIM2026"]:["STR2024","STR2025"],
          evidenceLevel:"principle_support_only",sessionSpecificValidation:false},
        contraindications:contra,stopRule:sport==="swim"?"Arrêter en cas de douleur, essoufflement anormal ou perte de technique; jamais d'apnée forcée":sport==="strength"?"Arrêter si douleur, RPE hors cible ou contrôle gestuel dégradé":"Arrêter si douleur, dérive anormale, fatigue excessive ou intensité non maîtrisée",
        minimumRecoveryHours:reg,prerequisites,methodology:"Individualisation par repères athlète réels, domaine tfclDoctrine et volume de la semaine; adaptation uniquement dans les bornes déclarées",
        blocks,automaticSelection:false,status:"candidate",
        adaptationPolicy:"Aucune intensité chiffrée inventée; toute variation qualitative requiert validation coach. Charge hebdomadaire à vérifier.",
      };
      workouts.push(enrich(w));
    }
  }
  return {sport,count:workouts.length,workouts};
};
export {enrich,makeExpansion};
if(process.argv.includes('--write')){for(const sport of ['bike','run','swim','strength']){const d=makeExpansion(sport);writeFileSync(new URL('./v3'+sport[0].toUpperCase()+sport.slice(1)+'Next100.json',import.meta.url),JSON.stringify(d,null,2)+'\n');console.log(sport,d.count);}}
