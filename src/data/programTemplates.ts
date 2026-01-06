/**
 * Registry of available program templates
 */
import type { ProgramTemplate } from "@/lib/templates/docxTemplateLoader";

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: "im-kona",
    name: "Ironman Kona",
    target: "IM",
    source: "docx",
    docxPath: "/program-templates/TEMPLATE_IM_KONA.docx",
    weeks: [],
    multiSections: false,
  },
  {
    id: "im-703",
    name: "70.3 Qualificatif",
    target: "703",
    source: "docx",
    docxPath: "/program-templates/TEMPLATE_IM_703.docx",
    weeks: [],
    multiSections: false,
  },
  {
    id: "marathon",
    name: "Marathon (24 semaines)",
    target: "Marathon",
    source: "docx",
    docxPath: "/program-templates/TEMPLATE_MARATHON.docx",
    weeks: [],
    multiSections: false,
  },
  {
    id: "semi",
    name: "Semi-Marathon",
    target: "Semi",
    source: "docx",
    docxPath: "/program-templates/TEMPLATE_SEMI.docx",
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
