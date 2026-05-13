import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SUGGESTIONS = [
  "Études récentes (2023-2025) sur VLamax et performance en cyclisme",
  "Méta-analyses sur MLSS vs FTP",
  "Running economy : valeurs de référence par niveau d'élite",
  "Critical Power : nouveaux protocoles de terrain validés",
];

export function LiteratureSearchWidget() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);
    setCitations([]);
    try {
      const { data, error } = await supabase.functions.invoke("literature-search", {
        body: { query },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnswer((data as any).content || "");
      setCitations((data as any).citations || []);
    } catch (e: any) {
      toast({
        title: "Recherche échouée",
        description: e.message || "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runAutoExtract = async () => {
    setAutoLoading(true);
    try {
      const focus = query.trim() || undefined;
      const { data, error } = await supabase.functions.invoke("auto-extract-recent-literature", {
        body: focus ? { focus } : {},
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      toast({
        title: "Extraction réussie ✅",
        description: `Version ${d.version} : ${d.total_profiles} profils, ${d.total_studies} études ajoutés à la cohorte.`,
      });
    } catch (e: any) {
      toast({
        title: "Extraction échouée",
        description: e.message || "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setAutoLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Recherche littérature (web temps réel)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Powered by Lovable AI + Google Search grounding. Aucune clé API externe requise.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Ex : Études récentes sur la calibration VLamax via tests de terrain en course à pied..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
        />

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => setQuery(s)}
            >
              {s}
            </Badge>
          ))}
        </div>

        <Button onClick={run} disabled={loading || !query.trim()} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Lancer la recherche
            </>
          )}
        </Button>

        {answer && (
          <div className="space-y-3 pt-4 border-t">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {answer}
            </div>
            {citations.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Sources web :</p>
                <ul className="space-y-1">
                  {citations.map((url, i) => (
                    <li key={i} className="text-xs">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
