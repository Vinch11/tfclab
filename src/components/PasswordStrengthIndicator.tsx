// =============================================
// INDICATEUR FORCE MOT DE PASSE
// =============================================

import { validatePassword, PasswordStrength } from "@/lib/passwordValidation";
import { Check, X } from "lucide-react";

interface Props {
  password: string;
  showRequirements?: boolean;
}

const PasswordStrengthIndicator = ({ password, showRequirements = true }: Props) => {
  const strength: PasswordStrength = validatePassword(password);

  if (!password) return null;

  const requirements = [
    { label: "8 caractères minimum", met: password.length >= 8 },
    { label: "Une majuscule", met: /[A-Z]/.test(password) },
    { label: "Une minuscule", met: /[a-z]/.test(password) },
    { label: "Un chiffre", met: /[0-9]/.test(password) },
    { label: "Un caractère spécial", met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password) },
  ];

  return (
    <div className="space-y-2 mt-2">
      {/* Barre de force */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground min-w-[70px]">
          {strength.label}
        </span>
      </div>

      {/* Liste des exigences */}
      {showRequirements && (
        <ul className="text-xs space-y-0.5">
          {requirements.map((req) => (
            <li
              key={req.label}
              className={`flex items-center gap-1.5 ${
                req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              }`}
            >
              {req.met ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {req.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
