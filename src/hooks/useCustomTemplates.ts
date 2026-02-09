/**
 * Hook for managing custom templates stored in the database
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateWeek } from "@/lib/templates/docxTemplateLoader";
import { toast } from "sonner";

export interface CustomTemplate {
  id: string;
  coach_id: string;
  name: string;
  target: "IM" | "703" | "Marathon" | "Semi";
  description: string | null;
  weeks: TemplateWeek[];
  weeks_count: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export function useCustomTemplates() {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("custom_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading custom templates:", error);
    } else {
      setTemplates((data || []).map(row => ({
        id: row.id,
        coach_id: row.coach_id,
        name: row.name,
        target: row.target as CustomTemplate["target"],
        description: row.description,
        weeks: (row.weeks_json as unknown as TemplateWeek[]) || [],
        weeks_count: row.weeks_count,
        source: row.source,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const addTemplate = useCallback(async (
    name: string,
    target: CustomTemplate["target"],
    weeks: TemplateWeek[],
    description?: string
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Connexion requise"); return false; }

    const { error } = await supabase.from("custom_templates").insert([{
      coach_id: user.id,
      name,
      target,
      description: description || null,
      weeks_json: JSON.parse(JSON.stringify(weeks)),
      weeks_count: weeks.length,
      source: "csv",
    }]);

    if (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de la sauvegarde");
      return false;
    }

    await loadTemplates();
    return true;
  }, [loadTemplates]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("custom_templates").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return false;
    }
    setTemplates(prev => prev.filter(t => t.id !== id));
    return true;
  }, []);

  return { templates, loading, loadTemplates, addTemplate, deleteTemplate };
}
