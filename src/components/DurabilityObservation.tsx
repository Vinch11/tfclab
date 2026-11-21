import { useState } from "react";
import { format } from "date-fns";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { durabilityProtocol, validPair, type EnduranceSport } from "@/lib/diagnostic/durabilityDay";

export function DurabilityObservation({athleteId,sport,between,target}:{athleteId:string;sport:EnduranceSport;between:number;target:string}) {
  const {addTest} = useCloudDataContext();
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState("");
  const today = format(new Date(),"yyyy-MM-dd");
  const unit = sport==="run" ? "min/km" : "W";
  return <details className="rounded-2xl border bg-card p-4"><summary className="cursor-pointer py-2 font-semibold">Enregistrer les deux blocs réalisés</summary>
    <form className="mt-3 grid gap-3" onSubmit={async e=>{
      e.preventDefault(); if(busy) return;
      const form=e.currentTarget;
      const f=new FormData(form);
      const val=(key:string)=>String(f.get(key)??"").trim();
      const pair={sport,between,target,day:val("day"),early:val("early"),late:val("late"),hr1:Number(val("hr1")),hr2:Number(val("hr2")),rpe1:Number(val("rpe1")),rpe2:Number(val("rpe2")),context:val("context")};
      if(!validPair(pair) || pair.day>today){setStatus("Vérifie la cible, les durées et les valeurs des deux blocs.");return;}
      setBusy(true);
      try {
        if(!await addTest(athleteId,durabilityProtocol,"Durabilité · deux blocs",sport,null,null,pair)) throw new Error();
        form.reset(); setStatus("Comparaison enregistrée dans le Compass.");
      } catch {setStatus("Enregistrement non confirmé. Les valeurs restent disponibles.");} finally {setBusy(false);}
    }}>
    <p className="text-sm">Vérifie ci-dessus la cible et les minutes réellement effectuées entre les deux blocs de 10 min.</p>
    <label>Date de la séance<Input type="date" name="day" required max={today} /></label>
    {["Début","Fin"].map((label,i)=><fieldset key={label} className="grid gap-3 rounded-xl bg-muted/60 p-3 sm:grid-cols-3"><legend className="font-semibold">{label}</legend>
      <label>{sport==="run"?"Allure":"Puissance"} ({unit})<Input required name={i?"late":"early"} /></label>
      <label>FC des 5 dernières min (bpm)<Input required type="number" min="1" max="260" name={'hr'+(i+1)} /></label>
      <label>Ressenti sur 10<Input required type="number" min="0" max="10" name={'rpe'+(i+1)} /></label>
    </fieldset>)}
    <label>Conditions et écarts au protocole<Input name="context" required placeholder="Terrain, chaleur, ravitaillement, interruptions…" /></label>
    <Button disabled={busy} type="submit">Enregistrer la comparaison</Button><p role="status">{status}</p></form></details>;
}
