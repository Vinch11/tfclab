/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING FOCUS WRAPPER — Composant de Filtrage UI
 * 
 * Enveloppe les composants pour les masquer automatiquement quand
 * le Running Focus Mode est actif et qu'ils concernent le vélo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { ReactNode } from "react";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";

interface RunningFocusWrapperProps {
  children: ReactNode;
  /**
   * Si true, le contenu est masqué en Running Focus Mode (contenu vélo)
   * Si false, le contenu est toujours affiché
   */
  hiddenInRunningMode?: boolean;
  /**
   * Si true, le contenu n'est affiché QUE en Running Focus Mode (contenu CAP spécifique)
   */
  onlyInRunningMode?: boolean;
  /**
   * Message optionnel à afficher quand le contenu est masqué
   */
  fallbackMessage?: string;
  /**
   * Classe CSS du fallback
   */
  fallbackClassName?: string;
}

export function RunningFocusWrapper({
  children,
  hiddenInRunningMode = false,
  onlyInRunningMode = false,
  fallbackMessage,
  fallbackClassName = "text-sm text-muted-foreground italic p-4",
}: RunningFocusWrapperProps) {
  const { isRunningOnly } = useRunningFocusMode();
  
  // Logique de visibilité
  if (hiddenInRunningMode && isRunningOnly) {
    // Masquer le contenu vélo en mode running
    if (fallbackMessage) {
      return <div className={fallbackClassName}>{fallbackMessage}</div>;
    }
    return null;
  }
  
  if (onlyInRunningMode && !isRunningOnly) {
    // Masquer le contenu CAP-only en mode triathlon/vélo
    return null;
  }
  
  return <>{children}</>;
}

/**
 * Composant utilitaire pour afficher un badge Running Focus Mode
 */
export function RunningFocusModeBadge() {
  const { isRunningOnly, raceLabel } = useRunningFocusMode();
  
  if (!isRunningOnly) return null;
  
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
      <span>🏃</span>
      <span>Running Focus Mode™</span>
      {raceLabel && (
        <span className="text-primary/70">• {raceLabel}</span>
      )}
    </div>
  );
}

/**
 * HOC pour envelopper un composant avec le filtrage Running Focus Mode
 */
export function withRunningFocusFilter<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: { hiddenInRunningMode?: boolean; onlyInRunningMode?: boolean } = {}
) {
  return function RunningFocusFilteredComponent(props: P) {
    return (
      <RunningFocusWrapper
        hiddenInRunningMode={options.hiddenInRunningMode}
        onlyInRunningMode={options.onlyInRunningMode}
      >
        <WrappedComponent {...props} />
      </RunningFocusWrapper>
    );
  };
}
