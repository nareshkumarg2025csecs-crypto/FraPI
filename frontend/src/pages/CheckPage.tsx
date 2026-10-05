import React, { useState, useRef, useEffect } from 'react';
import { Stepper } from '../components/Stepper';
import { DropZone } from '../components/DropZone';
import { PillButton } from '../components/PillButton';
import { ConsentSheet } from '../components/ConsentSheet';
import { VerdictCard } from '../components/VerdictCard';
import { I4CCard } from '../components/I4CCard';
import { Toast, type ToastType } from '../components/Toast';
import { performOcr, getOcrWorker, terminateOcrWorker } from '../ocr/ocrService';
import { decodeQrFromImage, parseQrData, startLiveDecodeLoop } from '../engines/qrParser';
import { analyze } from '../engines/pipeline';
import type { Direction, Action, UserIntentInput, ParsedQr } from '../engines/types';
import type { Verdict } from '../engines/riskEngine';
import { listReferences } from '../storage/references';
import { listReports, addReport } from '../storage/reports';
import { addHistoryItem } from '../storage/history';
import { checkReputationOnline } from '../engines/reputationClient';
import { extractCandidateUrls, normalizeUrlCandidate } from '../engines/entityExtractor';
import { DEMO_SCENARIOS, type DemoScenario } from './demoScenarios';
import { getAndClearSharedData } from '../storage/shareTarget';

import {
  FileText,
  QrCode,
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

export const CheckPage: React.FC = () => {
  // Step State (1: Input, 2: Expectation, 3: Review, 4: Privacy, 5: Verdict)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Input Type Tab: 'screenshot' | 'qr' | 'paste'
  const [inputTab, setInputTab] = useState<'screenshot' | 'qr' | 'paste'>('screenshot');

  // Input data
  const [rawText, setRawText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(undefined);
  const [qrPayload, setQrPayload] = useState<string>('');
  const [parsedQr, setParsedQr] = useState<ParsedQr | undefined>(undefined);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingLabel, setProcessingLabel] = useState<string>('Processing...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera state for live QR
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // User Intent (Step 2)
  const [expectedDirection, setExpectedDirection] = useState<Direction>('unknown');
  const [expectedAmount, setExpectedAmount] = useState<string>('');
  const [expectedAction, setExpectedAction] = useState<Action>('unknown');

  // Privacy / Reputation Lookup (Step 4)
  const [reputationOptIn, setReputationOptIn] = useState<boolean>(false);

  // Verdict Result (Step 5)
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Toast notifications
  const [toast, setToast] = useState<{ type: ToastType; title: string; message?: string } | null>(null);

  // Demo scenarios modal/selector
  const [showDemoSelector, setShowDemoSelector] = useState<boolean>(false);

  // Update parsedQr whenever qrPayload changes
  useEffect(() => {
    if (qrPayload.trim()) {
      setParsedQr(parseQrData(qrPayload));
    } else {
      setParsedQr(undefined);
    }
  }, [qrPayload]);

  // Prewarm OCR worker on mount
  useEffect(() => {
    getOcrWorker().catch(() => {});
    return () => {
      terminateOcrWorker();
    };
  }, []);

  // Web Share Target incoming payload detection (from IndexedDB or URL params)
  useEffect(() => {
    const checkIncomingShare = async () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const sharedText = params.get('text') || params.get('shared_text');
        if (sharedText) {
          setRawText(decodeURIComponent(sharedText));
          setCurrentStep(3);
          return;
        }
      }

      const shared = await getAndClearSharedData();
      if (shared) {
        if (shared.text) {
          setRawText(shared.text);
          setCurrentStep(3);
        } else if (shared.file && shared.file.buffer) {
          const blob = new Blob([shared.file.buffer], { type: shared.file.type });
          handleImageSelected(blob);
        }
      }
    };

    checkIncomingShare();
  }, []);


  // Handle uploaded image (Runs both QR decode and OCR concurrently)
  const handleImageSelected = async (imageFile: File | Blob) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingLabel('Reading image...');

    try {
      const img = new Image();
      const imageUrl = URL.createObjectURL(imageFile);
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = imageUrl;
      });

      setProcessingLabel('Extracting text and decoding QR...');
      
      const [qrCode, ocrRes] = await Promise.all([
        decodeQrFromImage(img, { tryUpscaling: true }),
        performOcr(imageFile, (p) => {
          if (p.status === 'recognizing text') {
            setProcessingLabel(`Reading text ${Math.round(p.progress * 100)}%...`);
          }
        })
      ]);

      if (qrCode) setQrPayload(qrCode);
      if (ocrRes && ocrRes.text.trim()) {
        setRawText(ocrRes.text.trim());
        setOcrConfidence(ocrRes.confidence);
      }

      setIsProcessing(false);
      // Auto-advance to Step 2 if data found
      setCurrentStep(2);
      setToast({
        type: 'success',
        title: 'Image Processed',
        message: qrCode ? 'Found QR payload & extracted text.' : 'Extracted message text via local OCR.',
      });
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      setErrorMsg('Failed to process image. You can paste text or enter QR payload manually.');
    }
  };

  // Start live camera QR scanner
  const handleStartCamera = () => {
    setIsCameraActive(true);
    setTimeout(() => {
      if (videoRef.current) {
        startLiveDecodeLoop(videoRef.current, (decoded) => {
          setQrPayload(decoded);
          setIsCameraActive(false);
          // Stop media tracks
          if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((t) => t.stop());
          }
          setCurrentStep(2);
          setToast({
            type: 'success',
            title: 'QR Scanned',
            message: 'Successfully scanned payment QR code.',
          });
        });
      }
    }, 100);
  };

  const handleStopCamera = () => {
    setIsCameraActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
  };

  // Preload Demo Scenario
  const handleApplyDemo = (scenario: DemoScenario) => {
    setRawText(scenario.rawText);
    setOcrConfidence(95);
    setQrPayload(scenario.qrPayload || '');
    if (scenario.userIntent) {
      setExpectedDirection(scenario.userIntent.expectedDirection || 'unknown');
      setExpectedAmount(scenario.userIntent.expectedAmount ? String(scenario.userIntent.expectedAmount) : '');
      setExpectedAction(scenario.userIntent.expectedAction || 'unknown');
    }
    setShowDemoSelector(false);
    setCurrentStep(3); // Jump to Review step
    setToast({
      type: 'info',
      title: `Loaded: ${scenario.title}`,
      message: scenario.description,
    });
  };

  // Final Execution of Pipeline Analysis
  const handleExecuteAnalysis = async () => {
    setIsAnalyzing(true);
    setProcessingLabel('Initializing engines...');

    try {
      const userIntent: UserIntentInput = {
        expectedDirection,
        expectedAction,
        expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
      };

      const [references, reports] = await Promise.all([listReferences(), listReports()]);

      let reputationPromise: Promise<any> | null = null;
      if (reputationOptIn) {
        // Extract candidate URLs from text and QR
        const urlMatches: string[] = rawText.match(/https?:\/\/[^\s]+/gi) || [];
        if (parsedQr?.params?.url) urlMatches.push(parsedQr.params.url);
        const uniqueUrls = Array.from(new Set(urlMatches)).slice(0, 5);

        if (uniqueUrls.length > 0) {
          reputationPromise = checkReputationOnline(uniqueUrls, true);
        }
      }

      // Initial fast local analysis
      const result = await analyze({
        text: rawText,
        qrPayload,
        userIntent,
        references,
        reports,
        reputation: undefined,
        onlineCheckAttempted: false,
        ocrConfidence,
        onProgress: setProcessingLabel
      });

      setVerdict(result);
      setCurrentStep(5);

      // If reputation check is running, update when it finishes
      if (reputationPromise) {
        reputationPromise.then(async (repRes) => {
          if (repRes && repRes.success) {
            const updatedResult = await analyze({
              text: rawText,
              qrPayload,
              userIntent,
              references,
              reports,
              reputation: repRes.data,
              onlineCheckAttempted: true,
              ocrConfidence,
            });
            setVerdict(updatedResult);
          }
        }).catch(err => console.error("Reputation check failed progressively", err));
      }

      // Save to local history
      await addHistoryItem({
        riskLevel: result.riskLevel,
        scorePercentage: result.scorePercentage,
        label: result.label,
        rawTextSnippet: rawText || qrPayload,
        reasonsCount: result.reasons.length,
        sources: [
          ...(rawText ? ['Message / OCR'] : []),
          ...(qrPayload ? ['QR Code'] : []),
        ],
      });
      
      // Print performance metrics
      import('../perf').then(mod => mod.perf.print());

    } catch (err: any) {
      console.error('Analysis failed', err);
      setToast({
        type: 'error',
        title: 'Analysis Error',
        message: err.message || 'An error occurred during evaluation.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add current suspect VPA or identifier to local blocklist
  const handleReportCurrent = async () => {
    if (!parsedQr?.vpa && !rawText) return;
    try {
      if (parsedQr?.vpa) {
        await addReport({
          entityType: 'vpa',
          value: parsedQr.vpa,
          category: 'User flagged scam',
          source: 'user',
        });
      }
      setToast({
        type: 'success',
        title: 'Report Saved Locally',
        message: 'Identifier added to your on-device blocklist.',
      });
    } catch {
      setToast({
        type: 'error',
        title: 'Failed to Save',
        message: 'Could not store report in local database.',
      });
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setRawText('');
    setOcrConfidence(undefined);
    setQrPayload('');
    setParsedQr(undefined);
    setExpectedDirection('unknown');
    setExpectedAmount('');
    setExpectedAction('unknown');
    setVerdict(null);
    handleStopCamera();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Top Header & Demo Mode Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <span>Payment Intent Analyzer</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
            Triangulate message claims, user expectations, and QR code geometry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDemoSelector(!showDemoSelector)}
            className="px-3.5 py-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 transition-colors min-h-[44px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Try an Example</span>
          </button>

          {currentStep > 1 && (
            <button
              onClick={handleReset}
              className="p-2.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Reset analyzer"
              title="Reset analyzer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Demo Scenario Picker Modal / Drawer */}
      {showDemoSelector && (
        <div className="mb-8 p-5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Select a Preloaded Scam/Legit Scenario:</span>
            </h3>
            <button
              onClick={() => setShowDemoSelector(false)}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] px-2 py-1"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DEMO_SCENARIOS.map((demo) => (
              <button
                key={demo.id}
                onClick={() => handleApplyDemo(demo)}
                className="p-3.5 text-left rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors flex flex-col justify-between group"
              >
                <div>
                  <span className="text-[10px] font-mono text-[var(--color-accent)] uppercase">
                    {demo.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] mt-1">
                    {demo.title}
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                    {demo.description}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-[var(--color-accent)] font-semibold">
                  <span>Load scenario</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5-Step Progress Stepper */}
      <Stepper
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step < currentStep) setCurrentStep(step);
        }}
        className="mb-8"
      />

      {/* STEP 1: INPUT */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Input Selection Tabs */}
          <div className="flex items-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-1.5 gap-1.5">
            <button
              onClick={() => {
                setInputTab('screenshot');
                handleStopCamera();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px] ${
                inputTab === 'screenshot'
                  ? 'bg-[var(--color-accent)] text-slate-950 shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Screenshot / Image</span>
            </button>

            <button
              onClick={() => {
                setInputTab('qr');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px] ${
                inputTab === 'qr'
                  ? 'bg-[var(--color-accent)] text-slate-950 shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Code</span>
            </button>

            <button
              onClick={() => {
                setInputTab('paste');
                handleStopCamera();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px] ${
                inputTab === 'paste'
                  ? 'bg-[var(--color-accent)] text-slate-950 shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Text</span>
            </button>
          </div>

          {/* Screenshot Mode */}
          {inputTab === 'screenshot' && (
            <div className="space-y-4">
              <DropZone
                onImageSelected={handleImageSelected}
                isProcessing={isProcessing}
                processingLabel={processingLabel}
                error={errorMsg}
              />
            </div>
          )}

          {/* QR Code Mode */}
          {inputTab === 'qr' && (
            <div className="space-y-6">
              {isCameraActive ? (
                <div className="relative rounded-3xl overflow-hidden border border-[var(--color-border)] bg-black flex flex-col items-center justify-center min-h-[300px]">
                  <video ref={videoRef} className="w-full h-full max-h-[400px] object-cover" />
                  <div className="absolute inset-0 border-4 border-dashed border-[var(--color-accent)]/60 pointer-events-none rounded-3xl m-8"></div>
                  <div className="absolute bottom-4 inset-x-0 flex justify-center">
                    <PillButton onClick={handleStopCamera} variant="secondary" size="sm">
                      Cancel Camera
                    </PillButton>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={handleStartCamera}
                    className="p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] cursor-pointer flex flex-col items-center justify-center text-center gap-3 transition-colors select-none min-h-[200px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)] flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-base text-[var(--color-text-primary)]">
                      Scan with Live Camera
                    </h4>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Point device camera at any payment QR code
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-[var(--color-text-primary)]">
                        Or Paste QR Payload String
                      </h4>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        e.g., <code>upi://pay?pa=merchant@okaxis&am=500</code>
                      </p>
                    </div>
                    <textarea
                      value={qrPayload}
                      onChange={(e) => setQrPayload(e.target.value)}
                      placeholder="upi://pay?pa=..."
                      rows={3}
                      className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-3 text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <PillButton
                      disabled={!qrPayload.trim()}
                      onClick={() => setCurrentStep(2)}
                      size="sm"
                      variant="primary"
                    >
                      Continue with QR
                    </PillButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paste Text Mode */}
          {inputTab === 'paste' && (
            <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
              <label className="block text-sm font-bold text-[var(--color-text-primary)]">
                Paste SMS, WhatsApp message, or payment claim:
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="e.g. Your electricity bill of Rs 1,420 is overdue. Pay immediately to avoid disconnection..."
                rows={6}
                className="w-full rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] leading-relaxed"
              />
              <div className="flex justify-end">
                <PillButton
                  disabled={!rawText.trim()}
                  onClick={() => setCurrentStep(2)}
                  size="md"
                  variant="primary"
                >
                  Continue to Expectation
                </PillButton>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: EXPECTATION */}
      {currentStep === 2 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
              What is your intent in this transaction?
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
              FraPI compares your intent against the message claim and QR parameters.
            </p>
          </div>

          {/* Direction Choice */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Direction: Do you expect to receive or pay money?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: 'incoming', label: 'Receive Money (Refund/Reward/Cashback)' },
                { val: 'outgoing', label: 'Pay Money (Merchant/Bill/Transfer)' },
                { val: 'unknown', label: 'Not Sure / Just Checking' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setExpectedDirection(item.val as Direction)}
                  className={`p-4 rounded-2xl border text-center transition-all min-h-[64px] flex flex-col items-center justify-center ${
                    expectedDirection === item.val
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text-primary)] font-bold ring-2 ring-[var(--color-accent)]/20'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-subtle)]'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Amount */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Expected Amount (Optional):
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-tertiary)]">
                ₹
              </span>
              <input
                type="number"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                placeholder="e.g. 3000"
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <PillButton onClick={() => setCurrentStep(3)} size="md" variant="primary">
              Review Extracted Data
            </PillButton>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW EXTRACTED DATA */}
      {currentStep === 3 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
              Review Extracted Data Before Analysis
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
              Verify and edit text recognized by local OCR or QR decoding.
            </p>
          </div>

          {/* OCR Confidence Warning if low */}
          {ocrConfidence !== undefined && ocrConfidence < 60 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold">Please check this text</p>
                <p className="mt-0.5">
                  OCR confidence was {Math.round(ocrConfidence)}%. Please correct any misspelled phone numbers, amounts, or VPAs before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Message Text Editable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Message Content (Editable):
              </label>
              {ocrConfidence !== undefined && (
                <span className="text-[11px] font-mono text-[var(--color-text-tertiary)]">
                  OCR Confidence: {Math.round(ocrConfidence)}%
                </span>
              )}
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="No text extracted. You can type or paste message text here..."
              rows={4}
              className="w-full rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4 text-xs sm:text-sm text-[var(--color-text-primary)] font-sans focus:outline-none focus:border-[var(--color-accent)] leading-relaxed"
            />
          </div>

          {/* Decoded QR Fields */}
          {parsedQr && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Decoded QR Code Parameters:
              </label>
              <div className="rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 p-3 border-b border-[var(--color-border-subtle)] gap-2">
                  <div>
                    <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase">Payee VPA</span>
                    <strong className="text-[var(--color-accent)] font-mono">{parsedQr.vpa || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase">Payee Name</span>
                    <strong className="text-[var(--color-text-primary)]">{parsedQr.name || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase">Amount</span>
                    <strong className="text-[var(--color-text-primary)] font-mono">
                      {parsedQr.amount ? `₹${parsedQr.amount}` : 'Open (Any)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase">UPI Type</span>
                    <span className="font-mono text-purple-400">
                      {parsedQr.isCollectRequest ? 'Collect Request' : 'Standard Pay'}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 bg-black/20 text-[11px] font-mono text-[var(--color-text-tertiary)] break-all">
                  Raw: {parsedQr.raw}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <PillButton onClick={() => setCurrentStep(4)} size="md" variant="primary">
              Privacy Settings
            </PillButton>
          </div>
        </div>
      )}

      {/* STEP 4: PRIVACY */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <ConsentSheet
            enabled={reputationOptIn}
            onToggle={(val) => setReputationOptIn(val)}
            detectedUrls={(() => {
              const candidates: string[] = [];
              if (rawText) candidates.push(...extractCandidateUrls(rawText));
              if (parsedQr?.params?.url) candidates.push(parsedQr.params.url);
              const normalized: string[] = [];
              for (const c of candidates) {
                const n = normalizeUrlCandidate(c);
                if (n && !normalized.includes(n)) normalized.push(n);
              }
              return normalized;
            })()}
          />

          <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <PillButton
              disabled={isAnalyzing}
              onClick={handleExecuteAnalysis}
              size="lg"
              variant="primary"
            >
              {isAnalyzing ? processingLabel || 'Running Analysis...' : 'Evaluate Payment Risk'}
            </PillButton>
          </div>
        </div>
      )}

      {/* STEP 5: VERDICT */}
      {currentStep === 5 && verdict && (
        <div className="space-y-6">
          <VerdictCard verdict={verdict} onReport={handleReportCurrent} />

          {/* Official I4C Card for REVIEW and HIGH_RISK */}
          {(verdict.riskLevel === 'HIGH_RISK' || verdict.riskLevel === 'REVIEW') && (
            <I4CCard
              searchTerms={verdict.i4c?.searchTerms}
              vpa={parsedQr?.vpa}
            />
          )}

          {/* Reset / Check Another Button */}
          <div className="flex justify-center pt-4">
            <PillButton onClick={handleReset} variant="secondary" size="lg">
              Check Another Payment
            </PillButton>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
