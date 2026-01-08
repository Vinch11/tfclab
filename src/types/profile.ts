// =============================================
// TYPES PROFIL UTILISATEUR
// =============================================

export type UserRole = 'ATHLETE_LOISIR' | 'ATHLETE_ELITE' | 'STAFF_COACH';

export interface UserProfile {
  id: string;
  user_id: string;
  role: UserRole;
  onboarding_completed: boolean;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}
