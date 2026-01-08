/**
 * Registry of available program templates
 */
import type { ProgramTemplate } from "@/lib/templates/docxTemplateLoader";
import { SEMI_MARATHON_WEEKS } from "./semiMarathonTemplate";
import { MARATHON_WEEKS } from "./marathonTemplate";

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
];

export function getTemplateById(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByTarget(target: "IM" | "703" | "Marathon" | "Semi"): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter((t) => t.target === target);
}
