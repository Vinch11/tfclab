/**
 * Registry of available program templates
 */
import type { ProgramTemplate } from "@/lib/templates/docxTemplateLoader";

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [];

export function getTemplateById(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByTarget(target: "IM" | "703" | "Marathon" | "Semi"): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter((t) => t.target === target);
}
