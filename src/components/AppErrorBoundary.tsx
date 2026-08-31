import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * Filet de sécurité global : sans error boundary React, une exception non
 * interceptée pendant un rendu (n'importe où dans l'arbre) démonte toute
 * l'app et laisse un écran blanc — aucun message, aucune option de reprise.
 * Symptôme observé : écran blanc après la régénération d'un plan (une
 * exception de rendu sur les nouvelles données regénérées, jamais capturée
 * faute de boundary). Ce composant ne corrige pas la cause exacte d'un bug
 * de rendu donné, mais garantit qu'aucun bug de ce type ne produit plus
 * jamais un écran blanc silencieux — l'app affiche un message récupérable
 * à la place.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary] Erreur de rendu non interceptée:", error, errorInfo.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-lg font-semibold">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">
              L'application a rencontré un problème d'affichage inattendu. Vos données ne sont pas
              perdues — un rechargement de la page suffit généralement à résoudre le problème.
            </p>
            <p className="text-xs text-muted-foreground/70 font-mono break-all">
              {this.state.error.message}
            </p>
            <Button onClick={this.handleReload}>Recharger la page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
