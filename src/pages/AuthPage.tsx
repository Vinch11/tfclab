// =============================================
// PAGE LOGIN/SIGNUP COACH
// =============================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Dumbbell } from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import logo2fc from "@/assets/logo-2fc.png";

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirection robuste (évite navigate() pendant le render)
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Chargement…</span>
        </div>
      </div>
    );
  }

  // Si l'utilisateur est déjà connecté mais reste sur /auth (cache iOS / PWA), on affiche une sortie claire.
  if (user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>Vous êtes déjà connecté</CardTitle>
            <CardDescription>Accédez au tableau de bord pour saisir la fatigue et consulter VLamax/TTE.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
              Aller au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      // Use generic error message to prevent user enumeration
      toast.error("Email ou mot de passe incorrect");
    } else {
      toast.success("Connexion réussie !");
      navigate("/", { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    // Validation robuste du mot de passe
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast.error(`Mot de passe invalide: ${passwordValidation.errors[0]}`);
      return;
    }
    
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      // Use generic error message to prevent user enumeration
      toast.error("Une erreur s'est produite. Veuillez réessayer.");
    } else {
      toast.success("Compte créé ! Vous êtes connecté.");
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 safe-area-inset-top safe-area-inset-bottom">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[95vw] sm:max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img 
            src={logo2fc} 
            alt="Two For Coaching Lab" 
            className="h-24 sm:h-32 md:h-36 w-auto mb-3 sm:mb-4"
          />
          <div className="flex items-center gap-2 text-primary">
            <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-lg sm:text-xl font-bold">Two For Coaching Lab</span>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 sm:mt-2 text-center">Staff-grade Performance Intelligence</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Bienvenue Coach</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Connectez-vous pour accéder à vos athlètes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-10 sm:h-11">
                <TabsTrigger value="login" className="text-sm sm:text-base touch-target-sm">Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm sm:text-base touch-target-sm">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="login-email" className="text-sm">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="coach@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="login-password" className="text-sm">Mot de passe</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 sm:h-10 touch-target" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="coach@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">Mot de passe</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min. 8 caractères, majuscule, chiffre, spécial"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="h-11 sm:h-10"
                    />
                    <PasswordStrengthIndicator password={password} />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-10 touch-target" 
                    disabled={loading || !validatePassword(password).isValid}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer un compte"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-4 sm:mt-6 text-center">
          <Button
            variant="outline"
            className="w-full h-11 sm:h-10"
            onClick={() => navigate("/mini-rapport")}
          >
            🎯 Générer mon Mini Rapport Physiologique (gratuit)
          </Button>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 px-4">
            Profil + zones d'entraînement Z1-Z7 en 2 minutes, sans compte.
          </p>
        </div>

        <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-4 sm:mt-6 px-4">
          Two For Coaching Lab • Analyse physiologique & décision coaching
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
