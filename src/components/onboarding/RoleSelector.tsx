// =============================================
// SÉLECTEUR DE RÔLE UTILISATEUR
// =============================================

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Trophy } from "lucide-react";
import type { UserRole } from "@/types/profile";
import logo from "@/assets/logo-2fc.png";

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
  loading?: boolean;
}

// Le rôle "Staff / Coach" n'est plus auto-sélectionnable ici — la faille de
// sécurité corrigée dans la migration 20260827065948 (n'importe quel compte
// pouvait s'auto-attribuer STAFF_COACH via `profiles.role`) est désormais
// bloquée côté base, et ce choix libre en était le point d'entrée principal.
// L'attribution du rôle coach se fait pour l'instant manuellement par
// l'équipe TFCL, en attendant un vrai flux d'approbation.
const roles: { id: UserRole; label: string; description: string; icon: React.ElementType; color: string }[] = [
  {
    id: "ATHLETE_LOISIR",
    label: "Athlète loisir",
    description: "Je m'entraîne pour le plaisir et la santé",
    icon: User,
    color: "text-emerald-500",
  },
  {
    id: "ATHLETE_ELITE",
    label: "Athlète performance",
    description: "Je vise des objectifs chronométriques ambitieux",
    icon: Trophy,
    color: "text-blue-500",
  },
];

export function RoleSelector({ onSelect, loading }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <img src={logo} alt="Two For Coaching Lab" className="h-28 w-auto" />
      </div>

      {/* Question */}
      <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
        Bienvenue !
      </h1>
      <p className="text-muted-foreground text-center mb-8 max-w-sm">
        Quel est ton rôle principal ?
      </p>

      {/* Role options */}
      <div className="w-full max-w-sm space-y-3">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card
              key={role.id}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => !loading && onSelect(role.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-full bg-muted ${role.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{role.label}</h3>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground mt-6 animate-pulse">
          Chargement...
        </p>
      )}

      <p className="text-xs text-muted-foreground mt-8 text-center max-w-sm">
        Tu es coach ? Contacte l'équipe Two For Coaching Lab pour activer ton accès staff.
      </p>
    </div>
  );
}
