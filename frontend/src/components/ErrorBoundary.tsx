import { Component, type ErrorInfo, type ReactNode } from 'react';
import { PillButton } from './PillButton';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export function mapErrorToPlainEnglish(error: Error | null): { title: string; message: string; suggestion: string } {
  if (!error) {
    return {
      title: 'Unexpected Application State',
      message: 'An unknown error occurred.',
      suggestion: 'Try reloading the application or resetting local data.',
    };
  }

  const name = error.name || '';
  const msg = error.message || '';

  if (name === 'QuotaExceededError' || msg.includes('QuotaExceeded') || msg.includes('quota')) {
    return {
      title: 'Storage Full',
      message: 'Your browser storage quota has been reached for local history and cached reports.',
      suggestion: 'Click "Reset local data" below to clear local cached records and free up space.',
    };
  }

  if (name === 'VersionError' || msg.includes('VersionError') || msg.includes('DatabaseClosedError') || msg.includes('IndexedDB')) {
    return {
      title: 'Local Database Issue',
      message: 'The local browser database schema encountered a conflict or corruption.',
      suggestion: 'Resetting local data will re-create clean local tables with zero risk to your privacy.',
    };
  }

  if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk') || msg.includes('dynamically imported module')) {
    return {
      title: 'App Update or Network Glitch',
      message: 'A newer version of the application was deployed or script loading was interrupted.',
      suggestion: 'Click "Retry" to fetch the latest assets from the browser cache.',
    };
  }

  if (msg.includes('Tesseract') || msg.includes('OCR') || msg.includes('Worker')) {
    return {
      title: 'Image Processing Error',
      message: 'The local OCR engine failed to initialize or read the screenshot.',
      suggestion: 'You can paste the payment text directly or try uploading a clearer image.',
    };
  }

  if (msg.includes('NetworkError') || msg.includes('Failed to fetch') || msg.includes('AbortError')) {
    return {
      title: 'Network Communication Warning',
      message: 'The online reputation proxy could not be reached. Local analysis continues to work offline.',
      suggestion: 'Check your internet connection or proceed with local-only checks.',
    };
  }

  return {
    title: 'Unexpected Error',
    message: msg || 'An unexpected error occurred while rendering this view.',
    suggestion: 'Click "Retry" to attempt rendering again, or "Reset local data" if the issue persists.',
  };
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FraPI ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public handleResetLocalData = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof window !== 'undefined' && window.indexedDB && window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      }
    } catch (e) {
      console.error('Error while resetting local storage:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const { title, message, suggestion } = mapErrorToPlainEnglish(this.state.error);

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--color-bg-secondary)] border border-red-500/20 rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xl font-bold">
                !
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
                <span className="text-xs text-[var(--color-text-tertiary)]">FraPI Sentinel Protection Boundary</span>
              </div>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {message}
            </p>

            <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-xs text-[var(--color-text-tertiary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">Recommendation: </span>
              {suggestion}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <PillButton variant="primary" onClick={this.handleRetry}>
                Retry
              </PillButton>
              <PillButton variant="ghost" onClick={this.handleResetLocalData}>
                Reset local data
              </PillButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
