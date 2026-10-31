/**
 * Candidate-only V3 intensity resolver. NEVER synthesizes an athlete anchor.
 * Doctrine fractions are protocol models, not laboratory verification of LT1/MLSS.
 * Callers must retain uncertainty and obtain individual coach approval.
 */
import { getDoctrineDomain, type DoctrineDomainId } from "../../src/lib/zones/tfclDoctrine";
import type { V3Workout, Paces } from "./catalogueRuntime";

export interface V3AthleteAnchors {
  bikeFtpWatts?: number;
  bikePmaWatts?: number;
  bikeSprintPowerRangeWatts?: [number,number];
  runThresholdPaceSecPerKm?: number;
  runVvo2SpeedMps?: number;
  runSprintSpeedRangeMps?: [number,number];
  swimDomainPacesSecPer100m?: Paces;
  cssSecPer100m?: number;
  coachConfirmsCssAsMlssProxy?: true;
  coachValidatedStrengthLoadAndRpe?: true;
}
export interface V3IntensityTarget {
  domain: DoctrineDomainId | null;
  metric: "watts" | "sec_per_km" | "sec_per_100m" | "m_per_sec" | "coach_rpe_load";
  min: number | null;
  max: number | null;
  source: "athlete_measurement_with_doctrine_model" | "direct_athlete_pace" |
    "coach_approved_css_proxy" | "coach_confirmed_load" | "direct_athlete_range";
  confidence: "model" | "measured" | "proxy" | "coach_confirmed";
  note: string;
}
export interface V3IntensityResolution {
  status: "resolved" | "unresolved";
  missing: string[];
  targets: V3IntensityTarget[];
  candidateOnly: true;
  notScientificValidation: true;
}
const valid=(v:number|undefined):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>0;
const rangeValid=(v:[number,number]|undefined):v is [number,number] =>
  !!v&&v.length===2&&valid(v[0])&&valid(v[1])&&v[0]<=v[1];
export function resolveV3IntensityTargets(w:V3Workout,a:V3AthleteAnchors={}):V3IntensityResolution {
  const missing:string[]=[], targets:V3IntensityTarget[]=[];
  const domainList=w.prescription.physiologicalIntent.domainIds;
  if(w.sport==="strength") {
    if(a.coachValidatedStrengthLoadAndRpe!==true)missing.push("coach_verified_rpe_and_load");
    else targets.push({domain:null,metric:"coach_rpe_load",min:null,max:null,
      source:"coach_confirmed_load",confidence:"coach_confirmed",
      note:"RPE/charge adaptés à la technique et aux reps cibles; jamais de poids présumé"});
  }
  for(const domain of domainList) {
    const d=getDoctrineDomain(domain);
    if(w.sport==="bike"){
      if(domain==="neuromuscular"){
        if(!rangeValid(a.bikeSprintPowerRangeWatts))missing.push("bike_verified_sprint_power_range_w");
        else targets.push({domain,metric:"watts",min:a.bikeSprintPowerRangeWatts[0],max:a.bikeSprintPowerRangeWatts[1],
          source:"direct_athlete_range",confidence:"measured",note:"Sprint: repère individuel fourni, aucune conversion FTP"});
        continue;
      }
      if(!valid(a.bikeFtpWatts)){missing.push("bike_ftp_w");continue;}
      if(domain==="vo2max"){
        if(!valid(a.bikePmaWatts) || a.bikePmaWatts<=1.05*a.bikeFtpWatts){
          missing.push("bike_pma_w_validated_above_vo2_floor");continue;
        }
        targets.push({domain,metric:"watts",min:+(1.05*a.bikeFtpWatts).toFixed(1),max:a.bikePmaWatts,
          source:"athlete_measurement_with_doctrine_model",confidence:"model",
          note:"Borne basse modèle FTP + 5%; borne haute PMA individuelle mesurée"});
        continue;
      }
      if(!d.bike){missing.push("tfclDoctrine.bike."+domain);continue;}
      targets.push({domain,metric:"watts",min:+(a.bikeFtpWatts*d.bike.min).toFixed(1),
        max:+(a.bikeFtpWatts*d.bike.max).toFixed(1),
        source:"athlete_measurement_with_doctrine_model",confidence:"model",
        note:"Fourchette doctrine appliquée à FTP déclarée; LT1 ou MLSS non certifié par cette seule opération"});
    }else if(w.sport==="run"){
      if(domain==="neuromuscular"){
        if(!rangeValid(a.runSprintSpeedRangeMps))missing.push("run_verified_sprint_speed_range_mps");
        else targets.push({domain,metric:"m_per_sec",min:a.runSprintSpeedRangeMps[0],max:a.runSprintSpeedRangeMps[1],
          source:"direct_athlete_range",confidence:"measured",note:"Vitesse de sprint mesurée et revue; pas de % VMA arbitraire"});
        continue;
      }
      if(!valid(a.runThresholdPaceSecPerKm)){missing.push("run_threshold_pace_sec_per_km");continue;}
      const speedThreshold=1000/a.runThresholdPaceSecPerKm;
      if(domain==="vo2max"){
        if(!valid(a.runVvo2SpeedMps)||a.runVvo2SpeedMps<=1.03*speedThreshold) {
          missing.push("run_vvo2_speed_mps_validated_above_vo2_floor");continue;
        }
        targets.push({domain,metric:"m_per_sec",min:+(1.03*speedThreshold).toFixed(3),max:a.runVvo2SpeedMps,
          source:"athlete_measurement_with_doctrine_model",confidence:"model",
          note:"Vitesse borne haute vVO2 mesurée, sans substitution par VMA de population"});
        continue;
      }
      if(!d.run||d.run.max<=0){missing.push("tfclDoctrine.run."+domain);continue;}
      targets.push({domain,metric:"sec_per_km",min:+(a.runThresholdPaceSecPerKm/d.run.max).toFixed(1),
        max:d.run.min===0?null:+(a.runThresholdPaceSecPerKm/d.run.min).toFixed(1),
        source:"athlete_measurement_with_doctrine_model",confidence:"model",
        note:"Allure calculée par fraction de vitesse seuil; pace rapide = min secondes/km. LT1 non attesté"});
    }else if(w.sport==="swim"){
      const measured=a.swimDomainPacesSecPer100m?.[domain];
      if(valid(measured)){
        targets.push({domain,metric:"sec_per_100m",min:measured,max:measured,
          source:"direct_athlete_pace",confidence:"measured",note:"Allure propre à ce domaine fournie par le coach"});
      } else if(domain==="mlss" && valid(a.cssSecPer100m) && a.coachConfirmsCssAsMlssProxy===true) {
        targets.push({domain,metric:"sec_per_100m",min:a.cssSecPer100m,max:a.cssSecPer100m,
          source:"coach_approved_css_proxy",confidence:"proxy",note:"CSS utilisé comme proxy, pas comme MLSS biologiquement mesuré"});
      } else missing.push("swim_domain_pace_sec_per_100m."+domain);
    }
  }
  return {status:missing.length?"unresolved":"resolved",missing:[...new Set(missing)],targets,
    candidateOnly:true,notScientificValidation:true};
}
