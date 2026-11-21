import { Link } from "react-router-dom";
import { criticalGuide, separateDay, type EnduranceSport } from "@/lib/diagnostic/durabilityDay";

export function DurabilityDayLink({sport}: {sport: EnduranceSport}) {
  return <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
    <h3 className="text-lg font-semibold">Que reste-t-il après une sortie longue ?</h3>
    <p className="text-sm">{separateDay}</p>
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3 text-sm font-medium"><span>10 min de référence</span><span aria-hidden="true">→</span><span>Endurance</span><span aria-hidden="true">→</span><span>10 min à la même cible</span></div>
    <Link className="inline-block py-2 font-semibold underline" to={'/diagnostic/tests?module=durability-'+sport}>Préparer le test de durabilité</Link>
    <details><summary className="cursor-pointer py-2 font-medium">Utiliser une référence critique pour les séances</summary>
    <p className="my-2 text-sm">{criticalGuide[sport]} Vérifier la qualité des efforts et confirmer le résultat avant de l’utiliser pour guider une séance.</p>
    <Link className="mr-4 underline" to={'/diagnostic/tests?module='+(sport==='run'?'cs-run':'cp-bike')}>Voir les essais détaillés</Link><Link className="underline" to="/critical-metrics">Mesures critiques</Link></details>
  </section>;
}
