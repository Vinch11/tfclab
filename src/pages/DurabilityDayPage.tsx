/**
 * DurabilityDayPage — TFCL Durability Day™
 * Deux blocs de 10 min à la même cible, au début et à la fin d'une sortie longue habituelle :
 * la perte d'efficacité (puissance ou allure par battement cardiaque) mesure la durabilité.
 * Les résultats s'enregistrent comme test « Durabilité » et alimentent le Compass et la checklist.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Button } from "@/components/ui/button";
import { TestSessionsNolioExport } from "@/components/TestSessionsNolioExport";
import { separateDay } from "@/lib/diagnostic/durabilityDay";

export default function DurabilityDayPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("diagnostic");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");
  return (
    <SidebarLayout activeTab={activeTab} onTabChange={setActiveTab} staffMode={staffMode} onStaffModeChange={setStaffMode}>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-12">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/diagnostic")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="p-2 rounded-xl bg-emerald-600/10"><Activity className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" /></div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">🔋 TFCL Durability Day™</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Durabilité vélo et course — deux blocs de 10 min à la même cible, au début et à la fin d’une sortie longue</p>
          </div>
        </div>
        <section className="space-y-2 rounded-2xl border bg-card p-5 text-sm shadow-sm">
          <p>{separateDay}</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Choisir une cible d’endurance déjà tolérée (haut de Z2) : puissance au vélo, allure en course.</li>
            <li>Échauffement 15 min, puis 10 min à la cible. Relever la moyenne réelle, la FC des 5 dernières minutes et le ressenti.</li>
            <li>Sortie longue habituelle : 2 h au vélo, 1 h en course, avec le ravitaillement de course.</li>
            <li>De nouveau 10 min à la même cible, mêmes relevés. Enregistrer les deux blocs ci-dessous.</li>
          </ol>
          <p className="text-muted-foreground">À programmer au moins 48 h après le dernier Day du même sport. Le Compass compare les deux blocs : une FC plus haute pour la même puissance ou la même allure signale une durabilité à travailler.</p>
        </section>
        <TestSessionsNolioExport routes={["durability-bike", "durability-run"]} />
      </div>
    </SidebarLayout>
  );
}
