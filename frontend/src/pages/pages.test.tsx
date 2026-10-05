// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { LandingPage } from './LandingPage';
import { CheckPage } from './CheckPage';
import { ReferencesPage } from './ReferencesPage';
import { LibraryPage } from './LibraryPage';
import { HistoryPage } from './HistoryPage';
import { AboutPage } from './AboutPage';
import { DesignPreviewPage } from './DesignPreviewPage';
import { ErrorBoundary } from '../components/ErrorBoundary';


vi.mock('../ocr/ocrService', () => ({
  getOcrWorker: vi.fn().mockResolvedValue({
    terminate: vi.fn(),
    setParameters: vi.fn().mockResolvedValue({}),
    recognize: vi.fn().mockResolvedValue({ data: { text: '', confidence: 0, words: [] } }),
  }),
  terminateOcrWorker: vi.fn(),
  performOcr: vi.fn().mockResolvedValue({ text: '', confidence: 0, words: [] }),
}));


describe('Layer 10 Pages and Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. LandingPage renders hero, tagline, bento cards, and What UPI never does axioms', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Don’t just scan the QR./i)).toBeDefined();
    expect(screen.getByText(/Verify the intent./i)).toBeDefined();
    expect(screen.getByText(/Analyze Payment Now/i)).toBeDefined();
    expect(screen.getByText(/Three Pillars of Intent-Aware Protection/i)).toBeDefined();
    expect(screen.getByText(/What UPI Never Does/i)).toBeDefined();
    expect(screen.getByText(/A QR scan never receives money./i)).toBeDefined();
    expect(screen.getByText(/No PIN or OTP is ever needed to receive money./i)).toBeDefined();
    expect(screen.getByText(/Real support never needs screen sharing./i)).toBeDefined();
    expect(screen.getByText(/Team Trust me Bro/i)).toBeDefined();
    expect(screen.getByText(/Rajalakshmi Engineering College/i)).toBeDefined();
  });

  it('2. CheckPage renders 5-step analyzer and loads demo scenarios', async () => {
    render(
      <BrowserRouter>
        <CheckPage />
      </BrowserRouter>
    );

    // Initial step 1 Input
    expect(screen.getByText(/Payment Intent Analyzer/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Screenshot \/ Image/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /QR Code/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Paste Text/i })).toBeDefined();

    // Open demo selector
    const tryExampleBtn = screen.getByRole('button', { name: /Try an Example/i });
    fireEvent.click(tryExampleBtn);

    expect(screen.getByText(/Select a Preloaded Scam\/Legit Scenario/i)).toBeDefined();
    expect(screen.getByText(/₹3,000 Refund QR Scam/i)).toBeDefined();

    // Click on ₹3,000 Refund QR Scam scenario
    const refundDemo = screen.getByText(/₹3,000 Refund QR Scam/i);
    fireEvent.click(refundDemo);

    // Should advance to step 3 Review Extracted Data with prefilled text
    await waitFor(() => {
      expect(screen.getByText(/Review Extracted Data Before Analysis/i)).toBeDefined();
      expect(screen.getByDisplayValue(/Flipkart refund of Rs 3000/i)).toBeDefined();
    });
  });

  it('3. ReferencesPage renders trusted merchants and search functionality', async () => {
    render(
      <BrowserRouter>
        <ReferencesPage />
      </BrowserRouter>
    );
    expect(screen.getAllByText(/Trusted References/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Search by merchant name/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Add Reference/i })).toBeDefined();
  });

  it('4. LibraryPage renders all 7 required scam categories with red flags', () => {
    render(
      <BrowserRouter>
        <LibraryPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/UPI Scam Pattern Library/i)).toBeDefined();
    expect(screen.getByText(/1. Collect-Request Trap/i)).toBeDefined();
    expect(screen.getByText(/2. Fake \/ Swapped QR/i)).toBeDefined();
    expect(screen.getByText(/3. Remote Access Software/i)).toBeDefined();
    expect(screen.getByText(/4. Bank \/ Support Impersonation/i)).toBeDefined();
    expect(screen.getByText(/5. Look-alike VPA/i)).toBeDefined();
    expect(screen.getByText(/6. Small "Test" Payment/i)).toBeDefined();
    expect(screen.getByText(/7. Refund \/ Cashback PIN Scams/i)).toBeDefined();
  });

  it('5. HistoryPage renders local scan history and opt-out toggle', () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Local Scan History/i)).toBeDefined();
    expect(screen.getByText(/Don't Keep History \(Opt-Out\)/i)).toBeDefined();
  });

  it('6. AboutPage renders privacy data boundary table, system boundaries, and credits', () => {
    render(
      <BrowserRouter>
        <AboutPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Zero-Compromise Privacy Architecture/i)).toBeDefined();
    expect(screen.getByText(/Data Boundary Table/i)).toBeDefined();
    expect(screen.getByText(/Uploaded Screenshots & Images/i)).toBeDefined();
    expect(screen.getByText(/System Limitations & Disclaimers/i)).toBeDefined();
    expect(screen.getByText(/Team Trust me Bro/i)).toBeDefined();
    expect(screen.getByText(/Rajalakshmi Engineering College/i)).toBeDefined();
  });

  it('7. DesignPreviewPage renders all 15 design components across tonal bands', () => {
    render(
      <BrowserRouter>
        <DesignPreviewPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Design System & Component Showcase/i)).toBeDefined();
    expect(screen.getByText(/Core Interactive Components/i)).toBeDefined();
    expect(screen.getByText(/Safety, Evidence & Verdict Components/i)).toBeDefined();
    expect(screen.getByText(/1. PillButton Variants/i)).toBeDefined();
    expect(screen.getByText(/10. VerdictCard/i)).toBeDefined();
    expect(screen.getByText(/CRITICAL RISK DETECTED — DO NOT PROCEED/i)).toBeDefined();
  });

  it('8. ErrorBoundary renders plain-English error fallback with Retry and Reset local data', () => {
    const ProblemChild = () => {
      throw new Error('QuotaExceededError: Local database quota exceeded');
    };

    // Suppress console.error in test output for intentional throw
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Storage Full/i)).toBeDefined();
    expect(screen.getByText(/Your browser storage quota has been reached/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Reset local data/i })).toBeDefined();

    consoleSpy.mockRestore();
  });
});

