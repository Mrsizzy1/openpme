import React from 'react';
import { RotateCw, ServerCrash } from 'lucide-react';
import { ErrorState } from './ErrorState';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Change de valeur (ex. le chemin courant) pour réinitialiser l'erreur. */
  resetKey?: unknown;
  /** Rendu personnalisé de l'erreur. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Erreur de téléchargement d'un module (nouvelle version déployée, réseau coupé…). */
function isChunkLoadError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
    .test(`${error.name} ${error.message}`);
}

/**
 * Capture les erreurs de rendu d'une page et affiche un état d'erreur propre
 * avec « Recharger », sans faire disparaître le menu ni l'en-tête.
 */
export class RouteErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Erreur d’affichage de la page :', error, info.componentStack);
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private reset = () => this.setState({ error: null });

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    const chunkError = isChunkLoadError(error);
    return (
      <div className="page-error">
        <ErrorState
          icon={ServerCrash}
          title={chunkError ? 'Cette page n’a pas pu être chargée' : 'Impossible d’afficher cette page'}
          message={chunkError
            ? 'La connexion a été interrompue ou une nouvelle version de l’application est disponible. Rechargez pour continuer.'
            : 'Une erreur inattendue s’est produite. Rechargez la page ; si le problème persiste, contactez votre administrateur.'}
          actions={(
            <>
              <Button variant="primary" size="sm" icon={<RotateCw />} onClick={() => window.location.reload()}>
                Recharger
              </Button>
              {!chunkError ? (
                <Button size="sm" onClick={this.reset}>
                  Réessayer sans recharger
                </Button>
              ) : null}
            </>
          )}
        />
        {!chunkError && error.message ? (
          <details className="page-error-details">
            <summary>Détails techniques</summary>
            <pre>{error.message}</pre>
          </details>
        ) : null}
      </div>
    );
  }
}
