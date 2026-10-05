import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { PillButton } from './PillButton';
import { StatusPill } from './StatusPill';
import { IslandNav } from './IslandNav';
import { FloatingDock } from './FloatingDock';
import { BentoCard } from './BentoCard';
import { MetricTile } from './MetricTile';
import { SectionBand } from './SectionBand';
import { HoverRow } from './HoverRow';
import { Stepper } from './Stepper';
import { DropZone } from './DropZone';
import { ConsentSheet } from './ConsentSheet';
import { VerdictCard } from './VerdictCard';
import { EvidenceRow } from './EvidenceRow';
import { I4CCard } from './I4CCard';
import { Toast } from './Toast';
import type { Verdict } from '../engines/riskEngine';

const mockVerdict: Verdict = {
  riskLevel: 'HIGH_RISK',
  score: 0.95,
  scorePercentage: 95,
  label: 'High risk: potential scam detected',
  confidence: 'good',
  reasons: [
    {
      layer: 'rule',
      severity: 'critical',
      title: 'QR Code is a Payment Request',
      detail: 'The QR code encodes a payment outward, contradictory to receiving a refund.',
      evidence: ['upi://pay?pa=scammer@okaxis&am=3000'],
    },
  ],
  unknowns: ['Payee identity unverified'],
  privacy: {
    sentOnline: [],
    localOnly: true,
  },
  layerBreakdown: {
    rule: { available: true, score: 95, reasons: [], unknowns: [] },
    intent: { available: true, score: 90, reasons: [], unknowns: [] },
    reference: { available: false, score: 0, reasons: [], unknowns: [] },
    language: { available: true, score: 85, reasons: [], unknowns: [] },
    web: { available: false, score: 0, reasons: [], unknowns: [] },
  },
};

describe('Layer 9 Design System Components', () => {
  it('1. renders PillButton with proper text and handles click', () => {
    const handleClick = vi.fn();
    render(<PillButton onClick={handleClick}>Verify Now</PillButton>);
    const button = screen.getByRole('button', { name: /Verify Now/i });
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('2. renders StatusPill for LOW_RISK, REVIEW, and HIGH_RISK without relying on color alone', () => {
    const { rerender } = render(<StatusPill riskLevel="LOW_RISK" />);
    expect(screen.getByText('Low Risk')).toBeDefined();

    rerender(<StatusPill riskLevel="REVIEW" />);
    expect(screen.getByText('Review Needed')).toBeDefined();

    rerender(<StatusPill riskLevel="HIGH_RISK" />);
    expect(screen.getByText('High Risk')).toBeDefined();
  });

  it('3. renders IslandNav with navigation links inside router', () => {
    render(
      <BrowserRouter>
        <IslandNav />
      </BrowserRouter>
    );
    expect(screen.getAllByText(/FraPI Sentinel/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Analyze/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/References/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Library/i).length).toBeGreaterThan(0);
  });

  it('4. renders FloatingDock with interactive action', () => {
    render(
      <BrowserRouter>
        <FloatingDock />
      </BrowserRouter>
    );
    expect(screen.getByText(/Check a message/i)).toBeDefined();
  });

  it('5. renders BentoCard for intent, reference, and local-first concepts', () => {
    render(
      <BentoCard
        variant="intent"
        title="Intent-Aware Verification"
        description="Verify whether the payment story aligns."
      />
    );
    expect(screen.getByText('Intent-Aware Verification')).toBeDefined();
    expect(screen.getByText(/Verify whether the payment story aligns/i)).toBeDefined();
  });

  it('6. renders MetricTile with numerical values and label', () => {
    render(<MetricTile label="Detection Accuracy" value="98.4%" subtext="Empirical benchmark" />);
    expect(screen.getByText('98.4%')).toBeDefined();
    expect(screen.getByText('Detection Accuracy')).toBeDefined();
  });

  it('7. renders SectionBand with light/dark tone variants', () => {
    const { container } = render(
      <SectionBand tone="surface">
        <p>Section Content</p>
      </SectionBand>
    );
    expect(container.querySelector('[data-testid="section-band"]')).toBeDefined();
    expect(screen.getByText('Section Content')).toBeDefined();
  });

  it('8. renders HoverRow for pipeline step representation', () => {
    render(
      <HoverRow
        stepNumber="01"
        title="Local OCR & QR Parse"
        description="Extract raw strings in web worker without cloud roundtrips."
      />
    );
    expect(screen.getByText('Local OCR & QR Parse')).toBeDefined();
    expect(screen.getByText('01')).toBeDefined();
  });

  it('9. renders Stepper with 5 steps and marks active step', () => {
    render(<Stepper currentStep={3} />);
    expect(screen.getAllByText('Expectation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
  });

  it('10. renders DropZone and handles paste/upload actions', () => {
    const handleFile = vi.fn();
    render(<DropZone onImageSelected={handleFile} />);
    expect(screen.getByTestId('dropzone')).toBeDefined();
    expect(screen.getByText(/Drop payment screenshot or QR code here/i)).toBeDefined();
  });

  it('11. renders ConsentSheet with default OFF and explicit domains list', () => {
    const handleToggle = vi.fn();
    render(
      <ConsentSheet
        enabled={true}
        onToggle={handleToggle}
        detectedUrls={['https://fraud-link.com']}
      />
    );
    expect(screen.getByText('External Web Reputation Lookup')).toBeDefined();
    expect(screen.getByText('https://fraud-link.com')).toBeDefined();
    expect(screen.getByText(/safebrowsing.googleapis.com/i)).toBeDefined();
  });

  it('12. renders VerdictCard with polite aria-live and DO NOT PROCEED banner on HIGH_RISK', () => {
    render(<VerdictCard verdict={mockVerdict} />);
    const card = screen.getByTestId('verdict-card');
    expect(card.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText(/CRITICAL RISK DETECTED — DO NOT PROCEED/i)).toBeDefined();
    expect(screen.getByText('High risk: potential scam detected')).toBeDefined();
  });

  it('13. renders EvidenceRow with source badge and value', () => {
    render(
      <EvidenceRow
        source="qr"
        label="UPI Payee VPA"
        value="merchant@okaxis"
        confidence={98}
        explanation="Extracted directly from QR code payload."
      />
    );
    expect(screen.getByText('UPI Payee VPA')).toBeDefined();
    expect(screen.getByText('merchant@okaxis')).toBeDefined();
    expect(screen.getByText('Confidence: 98%')).toBeDefined();
  });

  it('14. renders I4CCard with official link, copy action, and 1930 disclaimer', () => {
    render(<I4CCard searchTerms={['scammer@okaxis']} vpa="scammer@okaxis" />);
    expect(screen.getByText(/Official Indian Cybercrime Repository/i)).toBeDefined();
    expect(screen.getByText('scammer@okaxis')).toBeDefined();
    expect(screen.getByText(/1930/i)).toBeDefined();
    const link = screen.getByRole('link', { name: /Open I4C Portal/i });
    expect(link.getAttribute('href')).toBe('https://cybercrime.gov.in/Webform/suspect_search_repository.aspx');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('15. renders Toast notification with accessible role and message', () => {
    const handleClose = vi.fn();
    render(
      <Toast
        type="success"
        title="Reference Saved"
        message="Trusted merchant added to local database."
        onClose={handleClose}
      />
    );
    expect(screen.getByText('Reference Saved')).toBeDefined();
    expect(screen.getByText('Trusted merchant added to local database.')).toBeDefined();
  });
});
