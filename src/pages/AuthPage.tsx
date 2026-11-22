// =============================================
// PAGE LOGIN/SIGNUP COACH
// =============================================

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChartNoAxesColumnIncreasing, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import logo2fc from "@/assets/logo-2fc.png";
import "@/styles/auth.css";

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);

  // Redirection robuste (évite navigate() pendant le render)
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

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
    <main className="auth-page">
      <div className="auth-spread">
        <div className="auth-cover">
          <div className="auth-brand">
            <img src={logo2fc} width="56" height="56" alt="" />
            <span>Two For Coaching Lab</span>
          </div>
          <div className="auth-caption">
            <p>Staff-grade Performance Intelligence</p>
            <div>Analyse physiologique<br />&amp; décision coaching</div>
          </div>
        </div>

        <div className="auth-sheet">
          <div className="auth-content">
            {authLoading ? (
              <p className="auth-status" role="status">
                <Loader2 className="animate-spin" aria-hidden="true" />
                Chargement…
              </p>
            ) : user ? (
              <>
                <h1>Vous êtes déjà connecté</h1>
                <p className="auth-intro">Accédez au tableau de bord pour saisir la fatigue et consulter VLamax/TTE.</p>
                <Button className="auth-submit" onClick={() => navigate("/", { replace: true })}>
                  Aller au tableau de bord
                </Button>
              </>
            ) : (
              <>
                <h1>{mode === "login" ? "Bienvenue Coach" : "Créer un compte"}</h1>
                <p className="auth-intro">
                  {mode === "login" ? "Connectez-vous pour accéder à vos athlètes." : "Inscrivez-vous pour accéder à votre espace coach."}
                </p>
                <Tabs value={mode} onValueChange={(value) => { setMode(value); setShowPassword(false); }}>
                  <TabsList className="auth-tabs" aria-label="Accès à l’espace coach">
                    <TabsTrigger value="login" disabled={loading}>Connexion</TabsTrigger>
                    <TabsTrigger value="signup" disabled={loading}>Inscription</TabsTrigger>
                  </TabsList>
                  {(["login", "signup"] as const).map((tab) => {
                    const creating = tab === "signup";
                    return (
                      <TabsContent key={tab} value={tab} className="auth-panel">
                        <form onSubmit={creating ? handleSignUp : handleSignIn} aria-busy={loading}>
                          <div className="auth-field">
                            <Label htmlFor={tab + "-email"}>Adresse e-mail</Label>
                            <div className="auth-input-wrap">
                              <Mail aria-hidden="true" />
                              <Input
                                id={tab + "-email"}
                                name="email"
                                type="email"
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="coach@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                              />
                            </div>
                          </div>
                          <div className="auth-field">
                            <Label htmlFor={tab + "-password"}>Mot de passe</Label>
                            <div className="auth-input-wrap auth-password">
                              <LockKeyhole aria-hidden="true" />
                              <Input
                                id={tab + "-password"}
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete={creating ? "new-password" : "current-password"}
                                autoCapitalize="none"
                                spellCheck={false}
                                aria-describedby={creating ? "signup-rules" : undefined}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                              />
                              <button
                                type="button"
                                className="auth-reveal"
                                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                aria-controls={tab + "-password"}
                                onClick={() => setShowPassword((visible) => !visible)}
                                disabled={loading}
                              >
                                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                              </button>
                            </div>
                            {creating && (
                              <div id="signup-rules" className="auth-rules">
                                {password ? <PasswordStrengthIndicator password={password} /> : (
                                  <p>8 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.</p>
                                )}
                              </div>
                            )}
                          </div>
                          <Button type="submit" className="auth-submit" disabled={loading || (creating && !validatePassword(password).isValid)}>
                            {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
                            {creating ? (loading ? "Création…" : "Créer un compte") : (loading ? "Connexion…" : "Se connecter")}
                          </Button>
                        </form>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                <Link to="/mini-rapport" className="auth-report">
                  <span className="auth-report-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span>
                  <span>
                    <strong>Mini Rapport Physiologique</strong>
                    <span>Profil et zones Z1–Z7 en 2 minutes. Gratuit, sans compte.</span>
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default AuthPage;
