import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { IslandNav } from './components/IslandNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { CheckPage } from './pages/CheckPage';
import { ReferencesPage } from './pages/ReferencesPage';
import { LibraryPage } from './pages/LibraryPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import { DesignPreviewPage } from './pages/DesignPreviewPage';
import EvaluationPage from './pages/Evaluation';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans antialiased selection:bg-[var(--color-accent)]/20 selection:text-[var(--color-accent)]">
        {/* Floating Island Navigation */}
        <IslandNav />

        {/* Main Routed Page Content */}
        <main>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/check" element={<CheckPage />} />
              <Route path="/references" element={<ReferencesPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/design" element={<DesignPreviewPage />} />
              <Route path="/evaluation" element={<EvaluationPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

