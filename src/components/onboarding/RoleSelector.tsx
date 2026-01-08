// =============================================
// SÉLECTEUR DE RÔLE UTILISATEUR
// =============================================

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Trophy, Users } from "lucide-react";
import type { UserRole } from "@/types/profile";
import logo from "@/assets/logo-2fc.png";

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
  loading?: boolean;
}

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
  {
    id: "STAFF_COACH",
    label: "Staff / Coach",
    description: "Je gère et accompagne des athlètes",
    icon: Users,
    color: "text-purple-500",
  },
];

export function RoleSelector({ onSelect, loading }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <img src={logo} alt="Two For Coaching Lab" className="h-16 w-auto" />
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
    </div>
  );
}
