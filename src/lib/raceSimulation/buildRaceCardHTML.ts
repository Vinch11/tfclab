/**
 * Export athlète : la carte de course sur une page (cibles par segment, temps, FC, glucides,
 * règles du jour et zones Garmin). Mêmes chiffres que la page Simulation.
 */
import { esc, reportDocument } from "@/lib/reportKit";
import { GARMIN_BOX_CSS, garminBoxHTML } from "@/lib/reportKit/garminBox";
import { anchoredBikeGrid, anchoredRunGrid } from "@/lib/zones/anchoredZoneGrid";
import { garminFiveZones } from "@/lib/zones/garminZones";
import { fmtDuration, isTriathlon, type RaceCard, type RaceCardAthlete } from "./raceCard";

const CSS = `${GARMIN_BOX_CSS}
.rc{max-width:190mm;margin:0 auto;padding:14mm 12mm;font-family:Outfit,-apple-system,sans-serif;color:#1d1b2e}
.rc h1{font-size:26px;margin:0}.rc .sub{color:#6b6880;font-size:13px;margin:4px 0 14px}
.rc .total{display:flex;gap:18px;align-items:baseline;border:1px solid #e6e3f2;border-radius:14px;padding:12px 14px;margin-bottom:14px}
.rc .total b{font-size:28px}.rc .total span{color:#6b6880;font-size:12.5px}
.rc table.seg{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.rc table.seg th{text-align:left;color:#6b6880;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:6px 6px 6px 0}
.rc table.seg td{border-top:1px solid #ecebf3;padding:8px 6px 8px 0;vertical-align:top}.rc td.t{font-weight:700;font-size:14.5px}
.rc .day{color:#6b6880;font-size:11px}.rc .note{color:#6b6880;font-size:11.5px}
.rc h2{font-size:16px;margin:18px 0 6px}.rc ol{margin:0;padding-left:18px;font-size:13px;line-height:1.55}
.rc .foot{margin-top:16px;color:#8a879c;font-size:10.5px}
@media print{.rc{padding:8mm 6mm}.rc table.seg tr,.rc li{break-inside:avoid}}`;

export function buildRaceCardHTML(o: { card: RaceCard; athleteName: string; raceLabel: string; athlete: RaceCardAthlete; generatedAt: string }): string {
  const { card, athlete } = o;
  const rows = card.segments.map(s => `<tr><td>${s.day ? `<div class="day">Jour ${s.day}</div>` : ""}${esc(s.label)}</td>
    <td class="t">${s.target ? esc(s.target.text) : s.sport.startsWith("t") ? "—" : "à compléter"}</td>
    <td>${s.timeMin != null ? esc(fmtDuration(s.timeMin)) : "—"}${s.timeRange ? `<div class="note">${esc(fmtDuration(s.timeRange[0]))} – ${esc(fmtDuration(s.timeRange[1]))}</div>` : ""}</td>
    <td>${s.hr ? esc(s.hr) : "—"}</td><td>${s.carbs ? `${esc(s.carbs.text)}<div class="note">${esc(s.carbs.why)}</div>` : "—"}</td></tr>`).join("");
  const total = card.lcw
    ? `<div class="total"><span>Trois épreuves sur trois jours : chaque jour est une course à part.</span></div>`
    : card.totalMin != null ? `<div class="total"><b>${esc(fmtDuration(card.totalMin))}</b><span>temps prévu${card.totalRange ? ` · fourchette ${esc(fmtDuration(card.totalRange[0]))} – ${esc(fmtDuration(card.totalRange[1]))}` : ""}${card.partial ? " · total partiel (données manquantes)" : ""}</span></div>` : "";
  const snap = athlete.snapshot;
  const sportsShown = new Set(card.segments.map(s => s.sport));
  const bikeGrid = snap && sportsShown.has("bike") ? anchoredBikeGrid(snap, { ambition: athlete.ambition, fcMax: athlete.fcMax }) : null;
  const runGrid = snap && sportsShown.has("run") ? anchoredRunGrid(snap, { ambition: athlete.ambition, fcMax: athlete.fcMax }) : null;
  const garmin = [bikeGrid ? garminBoxHTML(garminFiveZones(bikeGrid, athlete.fcMax), "bike", true) : "", runGrid ? garminBoxHTML(garminFiveZones(runGrid, athlete.fcMax), "run", true) : ""].join("");
  const body = `<main class="rc">
    <h1>${esc(o.athleteName)} · ${esc(o.raceLabel)}</h1>
    <p class="sub">Carte de course${isTriathlon(card.kind) && !card.lcw ? " · natation, vélo, course" : ""}${card.lcw ? " · Long Course Weekend" : ""}</p>
    ${total}
    <table class="seg"><thead><tr><th>Segment</th><th>Cible</th><th>Temps</th><th>FC repère</th><th>Glucides</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>Les règles du jour</h2><ol>${card.rules.map(r => `<li>${esc(r)}</li>`).join("")}</ol>
    ${garmin}
    <p class="foot">Prévision Two For Coaching Lab du ${esc(o.generatedAt)} : une fourchette, pas une promesse. Chaleur, vent et parcours la modifient. Les glucides tiennent compte de ta dépense estimée et de ce que tu as toléré à l’entraînement : teste-les sur une sortie longue avant la course.</p>
  </main>`;
  return reportDocument({ title: `Carte de course · ${o.athleteName}`, body, extraCSS: CSS });
}
