/**
 * Registry of available program templates
 */
import type { ProgramTemplate } from "@/lib/templates/docxTemplateLoader";
import { SEMI_MARATHON_WEEKS } from "./semiMarathonTemplate";
import { MARATHON_WEEKS } from "./marathonTemplate";
import { IRONMAN_KONA_WEEKS } from "./ironmanKonaTemplate";
import { IRONMAN_703_WEEKS } from "./ironman703Template";

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: "semi-marathon",
    name: "Semi-Marathon (12 semaines)",
    target: "Semi",
    source: "static",
    docxPath: "",
    weeks: SEMI_MARATHON_WEEKS,
    multiSections: false,
  },
  {
    id: "marathon",
    name: "Marathon (24 semaines)",
    target: "Marathon",
    source: "static",
    docxPath: "",
    weeks: MARATHON_WEEKS,
    multiSections: false,
  },
  {
    id: "ironman-kona",
    name: "Ironman Kona (24 semaines)",
    target: "IM",
    source: "static",
    docxPath: "",
    weeks: IRONMAN_KONA_WEEKS,
    multiSections: false,
  },
  {
    id: "ironman-703",
    name: "Ironman 70.3 (24 semaines)",
    target: "703",
    source: "static",
    docxPath: "",
    weeks: IRONMAN_703_WEEKS,
    multiSections: false,
  },
];

export function getTemplateById(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByTarget(target: "IM" | "703" | "Marathon" | "Semi"): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter((t) => t.target === target);
}
