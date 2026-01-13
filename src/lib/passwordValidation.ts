// =============================================
// VALIDATION MOT DE PASSE
// =============================================

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  isValid: boolean;
  errors: string[];
}

export const validatePassword = (password: string): PasswordStrength => {
  const errors: string[] = [];
  let score = 0;

  // Minimum 8 caractères
  if (password.length < 8) {
    errors.push("Au moins 8 caractères");
  } else {
    score++;
  }

  // Au moins une majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push("Au moins une majuscule");
  } else {
    score++;
  }

  // Au moins une minuscule
  if (!/[a-z]/.test(password)) {
    errors.push("Au moins une minuscule");
  } else {
    score++;
  }

  // Au moins un chiffre
  if (!/[0-9]/.test(password)) {
    errors.push("Au moins un chiffre");
  } else {
    score++;
  }

  // Au moins un caractère spécial
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password)) {
    errors.push("Au moins un caractère spécial (!@#$%...)");
  } else {
    score++;
  }

  // Bonus pour longueur > 12
  if (password.length >= 12) {
    score = Math.min(score + 1, 5);
  }

  const getLabel = (s: number): string => {
    if (s === 0) return "Très faible";
    if (s <= 2) return "Faible";
    if (s === 3) return "Moyen";
    if (s === 4) return "Fort";
    return "Très fort";
  };

  const getColor = (s: number): string => {
    if (s === 0) return "bg-destructive";
    if (s <= 2) return "bg-orange-500";
    if (s === 3) return "bg-yellow-500";
    if (s === 4) return "bg-green-500";
    return "bg-green-600";
  };

  return {
    score,
    label: getLabel(score),
    color: getColor(score),
    isValid: errors.length === 0,
    errors,
  };
};
