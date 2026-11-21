import { Link } from "react-router-dom";
import { criticalGuide, separateDay, type EnduranceSport } from "@/lib/diagnostic/durabilityDay";

export function DurabilityDayLink({sport}: {sport: EnduranceSport}) {
  return <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
    <h3 className="text-lg font-semibold">Durabilité · à programmer un autre jour</h3>
    <p className="text-sm">{separateDay}</p>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm"><span><strong className="block text-xl tabular-nums">10 min</strong>À frais</span><span className="text-muted-foreground">Endurance →</span><span><strong className="block text-xl tabular-nums">10 min</strong>Même cible</span></div>
    <Link className="inline-block py-2 font-semibold underline" to={'/diagnostic/tests?module=durability-'+sport}>Préparer le test de durabilité</Link>
    <details><summary className="cursor-pointer py-2 font-medium">Utiliser une référence critique pour les séances</summary>
    <p className="my-2 text-sm">{criticalGuide[sport]} Vérifier la qualité des efforts et confirmer le résultat avant de l’utiliser pour guider une séance.</p>
    <Link className="mr-4 underline" to={'/diagnostic/tests?module='+(sport==='run'?'cs-run':'cp-bike')}>Voir les essais détaillés</Link><Link className="underline" to="/critical-metrics">Mesures critiques</Link></details>
  </section>;
}
