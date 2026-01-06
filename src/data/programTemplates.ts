/**
 * Registry of available program templates
 */
import type { ProgramTemplate } from "@/lib/templates/docxTemplateLoader";

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: "im-kona-detaille",
    name: "IM Kona détaillé (Dan Lorang style)",
    target: "IM",
    source: "docx",
    docxPath: "/templates/TEMPLATE_IM_KONA_DETAILLE.docx",
    weeks: [],
    multiSections: false,
  },
  {
    id: "ironman-finisher",
    name: "Ironman Finisher",
    target: "IM",
    source: "docx",
    docxPath: "/templates/TEMPLATE_IRONMAN_FINISHER.docx",
    weeks: [],
    multiSections: false,
  },
  {
    id: "im-703-detaille",
    name: "70.3 Détaillé",
    target: "703",
    source: "docx",
    docxPath: "/templates/TEMPLATE_IM_703_DETAILLE.docx",
    weeks: [],
    multiSections: false,
  },
  {
    id: "im-703-finisher-elite",
    name: "70.3 Finisher & Elite",
    target: "703",
    source: "docx",
    docxPath: "/templates/TEMPLATE_IM_703_FINISHER_ELITE.docx",
    weeks: [],
    multiSections: true,
  },
  {
    id: "semi-1h25-dan-lorang",
    name: "Semi 1h25 (Dan Lorang style)",
    target: "Semi",
    source: "docx",
    docxPath: "/templates/TEMPLATE_SEMI_1h25_DAN_LORANG.docx",
    weeks: [],
    multiSections: false,
  },
];

export function getTemplateById(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByTarget(target: "IM" | "703" | "Marathon" | "Semi"): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter((t) => t.target === target);
}
