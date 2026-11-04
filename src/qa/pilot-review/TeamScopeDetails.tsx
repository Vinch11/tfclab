/**
 * Détail PRIVÉ d'un refus Nolio `team_scope_forbidden`, visible du seul coach connecté.
 * Texte React échappé ; contexte re-validé ici (nom borné, scopes officiels, lien https://www.nolio.io).
 * Aucune ouverture automatique ; le lien n'est rendu que s'il passe la validation client.
 */
import { Button } from "@/components/ui/button";
import { projectTeamScopeContext, validateTeamOptionsUrl, type TeamScopeContext } from "../../../supabase/functions/_shared/nolioV2/teamScopeContext";

const SCOPE_LABELS: Record<string, string> = {
  "planned:write": "écrire dans le calendrier planifié (planned:write)",
  "planned:read": "lire le calendrier planifié (planned:read)",
  "planned:delete": "supprimer du calendrier planifié (planned:delete)",
  "real:read": "lire le calendrier réalisé (real:read)",
  "real:write": "écrire dans le calendrier réalisé (real:write)",
  "real:delete": "supprimer du calendrier réalisé (real:delete)",
  "metrics:read": "lire les métriques (metrics:read)",
  "metrics:write": "écrire les métriques (metrics:write)",
  "metrics:delete": "supprimer des métriques (metrics:delete)",
  "settings:read": "lire les réglages (settings:read)",
  "settings:write": "modifier les réglages (settings:write)",
  "settings:delete": "supprimer des réglages (settings:delete)",
};

export function TeamScopeDetails({ context }: { context: TeamScopeContext | null }) {
  const c = projectTeamScopeContext(context);
  const url = c ? validateTeamOptionsUrl(c.teamOptionsUrl) : null;
  return (
    <div data-testid="nolio-team-scope" className="rounded-md border border-destructive/40 p-2 space-y-1">
      {c?.teamName
        ? <p data-testid="nolio-team-name">Équipe qui bloque la demande : <b>{c.teamName}</b></p>
        : <p data-testid="nolio-team-name-missing">Nolio n'a pas fourni le nom de l'équipe qui bloque la demande. Contacter le manager de l'équipe Nolio de l'athlète.</p>}
      {c && c.scopes.length > 0
        ? <p data-testid="nolio-team-scopes">Droits refusés par l'équipe : {c.scopes.map((s) => SCOPE_LABELS[s] ?? s).join(", ")}</p>
        : <p data-testid="nolio-team-scopes-missing">Nolio n'a pas précisé quels droits sont refusés.</p>}
      {url
        ? <Button asChild size="sm" variant="outline"><a data-testid="nolio-team-options-link" href={url} target="_blank" rel="noopener noreferrer">Ouvrir les options de cette équipe Nolio</a></Button>
        : <p data-testid="nolio-team-link-missing" className="text-xs text-muted-foreground">Nolio n'a pas fourni de lien vers les options de cette équipe (information non disponible). Le manager de l'équipe peut autoriser l'accès dans « Options d'équipe &gt; API et MCP ».</p>}
    </div>
  );
}
