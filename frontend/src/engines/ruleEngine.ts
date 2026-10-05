import type { LayerResult, ParsedQr, Reason } from './types';
import { extractPaymentStory } from './storyExtractor';
import { parseMessage } from './messageParser';

/**
 * Evaluates Layer 2: Hard rules encoding how UPI actually works and common attack vectors.
 */
export function evaluateRuleLayer(
  qr?: ParsedQr,
  messageText?: string
): LayerResult {
  const reasons: Reason[] = [];
  const unknowns: string[] = [];
  let score = 0;

  if (!qr && !messageText) {
    return {
      available: false,
      score: 0,
      reasons: [],
      unknowns: ['No QR code or message text provided.'],
    };
  }

  const text = messageText ? messageText.toLowerCase() : '';
  const qrStory = qr && qr.kind === 'upi' ? extractPaymentStory('qr', qr) : null;
  const msgStory = messageText ? parseMessage(messageText) : null;

  // Extract URLs for R7
  const messageUrls: string[] = [];
  if (messageText) {
    const urlRegex =
      /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|top|link|club|site|online|info|tech|cn|ru|cc|com|in)\/[^\s]*)/gi;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(messageText)) !== null) {
      messageUrls.push(urlMatch[0]);
    }
  }

  // ─── Helper: has payment demand ───────────────────────────────────────────
  function textHasPaymentDemand(): boolean {
    if (!messageText) return false;
    return (
      /\b(pay|send|transfer|deposit|remit)\b[^.!?\n]*?(?:[₹%¥Z2=?]|rs\.?\s*)\s*[0-9]/i.test(messageText) ||
      /\b(pay|send|transfer)\b[^.!?\n]*?\b(immediately|via|to)\b/i.test(messageText) ||
      messageText.split(/[.!?\n]/).some(
        (s) =>
          /\b(pay|send|transfer|deposit|remit)\b/i.test(s) &&
          /\b(fee|charge|deposit|amount|payment|charges)\b/i.test(s)
      )
    );
  }

  // ─── R1: OTP/PIN/Password sharing request ────────────────────────────────
  // Must avoid negation (e.g. "do not share", "never tell")
  if (text) {
    const sensitiveTokens = ['otp', 'pin', 'cvv', 'password', 'passcode'];
    const shareCues = ['share', 'tell', 'send', 'forward', 'give', 'bataye', 'bhejo', 'dijiye', 'provide'];
    const negationCues = [
      'do not share', 'never share', "don't share", 'dont share', 'never tell',
      'kisi ko na bataye', 'kisi se share na kare', 'nobody from bank will ask',
      'do not disclose', 'never disclose',
    ];

    const hasSensitive = sensitiveTokens.some((t) => text.includes(t));
    const hasShareCue = shareCues.some((c) => text.includes(c));
    const hasNegation = negationCues.some((n) => text.includes(n));

    if (hasSensitive && hasShareCue && !hasNegation) {
      score += 100;
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Request to share sensitive credentials',
        detail:
          'The message is asking you to share your OTP, PIN, CVV, or password. Genuine banks or companies will never ask you to share these.',
        evidence: [messageText!],
      });
    }
  }

  // ─── R2: Receive money claim but QR is an outgoing payment link ───────────
  if (qrStory && msgStory) {
    const isMsgIncoming =
      msgStory.direction === 'incoming' ||
      ['refund', 'cashback', 'prize'].includes(msgStory.action);

    if (isMsgIncoming && qrStory.direction === 'outgoing' && !qr!.isCollectRequest) {
      score += 100;
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Payment direction mismatch (Scan to Receive)',
        detail:
          'The message claims you will receive money (e.g. cashback, refund), but scanning a UPI QR code will always deduct money from your account.',
        evidence: [
          `Message claim: ${messageText!}`,
          `QR action: ${qrStory.action} to ${qrStory.payeeVpa || 'unknown'}`,
        ],
      });
    }
  }

  // ─── R3: Approve collect request to receive money ─────────────────────────
  if (text) {
    const isMsgIncoming =
      (msgStory &&
        (msgStory.direction === 'incoming' ||
          ['refund', 'cashback', 'prize'].includes(msgStory.action))) ||
      /\b(receive|claim|get)\b/i.test(text);
    const approveCollectCues = ['approve', 'accept', 'authorise', 'authorize', 'confirm', 'click pay', 'tap approve', 'tap pay'];
    const hasApproveCue = approveCollectCues.some((c) => text.includes(c));
    const mentionsRequest = text.includes('request') || text.includes('collect');

    if (isMsgIncoming && (hasApproveCue || text.includes('collect request')) && mentionsRequest) {
      score += 100;
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Collect Request Fraud',
        detail:
          'The message tells you to approve or accept a request in order to receive money. Approving a request on UPI sends money OUT of your account.',
        evidence: [messageText!],
      });
    }
  }

  // ─── R4: Enter PIN to receive money ───────────────────────────────────────
  if (text) {
    const isMsgIncoming =
      (msgStory &&
        (msgStory.direction === 'incoming' || ['refund', 'cashback', 'prize'].includes(msgStory.action))) ||
      /\b(receive|claim|get)\b/i.test(text);
    const pinCues = ['enter pin', 'upi pin', 'type pin', 'pin dale', 'enter your pin', 'enter upi pin'];
    const hasPinCue = pinCues.some((c) => text.includes(c));

    if (isMsgIncoming && hasPinCue) {
      score += 100;
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Entering PIN to receive money',
        detail:
          'You are being asked to enter your UPI PIN to receive money. You only need your PIN to send money, never to receive it.',
        evidence: [messageText!],
      });
    }
  }


  // ─── R5: Remote access tools ──────────────────────────────────────────────
  if (text) {
    const remoteTools = ['anydesk', 'teamviewer', 'quicksupport', 'rustdesk', 'screen share', 'screenshare'];
    const hasRemoteTool = remoteTools.some((t) => text.includes(t));

    if (hasRemoteTool) {
      score += 100;
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Remote Access App detected',
        detail:
          'The message mentions a screen-sharing or remote access application. Scammers use these to take control of your phone and steal money.',
        evidence: [messageText!],
      });
    }
  }

  // ─── R6: Install APK or download app from link ───────────────────────────
  if (text) {
    const installCues = ['install', 'download', 'update app'];
    const apkCues = ['.apk', 'app link', 'application link'];
    const hasInstall = installCues.some((c) => text.includes(c));
    const hasApk = apkCues.some((c) => text.includes(c));
    const hasUrl = messageUrls && messageUrls.length > 0;

    if (hasInstall && (hasApk || hasUrl)) {
      score += 100;
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Suspicious App Download',
        detail:
          'The message instructs you to download or install an application from a link. This could install malware on your device.',
        evidence: [messageText!],
      });
    }
  }

  // ─── R7: Suspicious URL patterns + payment request ────────────────────────
  if (messageUrls && messageUrls.length > 0 && msgStory) {
    const isPaymentRelated = msgStory.action !== 'unknown' || msgStory.direction !== 'unknown';

    for (const url of messageUrls) {
      const isShortened = /\b(bit\.ly|tinyurl|t\.co|is\.gd|goo\.gl|rebrand\.ly)\b/i.test(url);
      const isIp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(url);
      const hasAt = url.includes('@');
      const isPunycode = url.includes('xn--');

      if (isPaymentRelated && (isShortened || isIp || hasAt || isPunycode)) {
        score += 50;
        reasons.push({
          layer: 'rule',
          severity: 'medium',
          title: 'Suspicious Web Link',
          detail:
            'The message contains a payment request alongside a suspicious or obfuscated web link (short URL, IP address, etc.).',
          evidence: [url, messageText!],
        });
        break; // Only trigger once per message
      }
    }
  }

  // ─── R8: ADVANCE_FEE (critical) ───────────────────────────────────────────
  // Benefit promise + upfront payment demand
  if (messageText) {
    const BENEFIT_CUE_RE =
      /\b(selected|shortlisted|congratulations|winner|won|lottery|prize|reward|cashback|offer\s*letter|job|internship|stipend|salary|work\s*from\s*home|laptop|loan\s*approv|refund\s*pending|no\s*interview)\b/i;
    const UPFRONT_FEE_RE =
      /\b(registration|onboarding|processing|id\s*card|kit|training|security\s*deposit|verification|clearance|customs|delivery|insurance|gst|handling)\s*(fee|charge|deposit|payment)\b/i;
    const PAY_TO_CLAIM_INLINE =
      /\b(pay|deposit)\b[^.!?\n]*?\b(get|receive|secure|unlock|claim|release)\b/i;

    const hasBenefit = BENEFIT_CUE_RE.test(messageText);
    const hasUpfrontFee = UPFRONT_FEE_RE.test(messageText) || PAY_TO_CLAIM_INLINE.test(messageText);

    if (hasBenefit && hasUpfrontFee) {
      score += 100;
      const matchedBenefit = messageText.match(BENEFIT_CUE_RE)?.[0] ?? '';
      const matchedFee =
        messageText.match(UPFRONT_FEE_RE)?.[0] ?? messageText.match(PAY_TO_CLAIM_INLINE)?.[0] ?? '';
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Advance Fee Fraud',
        detail:
          'The message promises a benefit (prize, job, loan, refund) while simultaneously demanding an upfront payment. This is the hallmark of an advance-fee scam.',
        evidence: [
          `Benefit cue: "${matchedBenefit}"`,
          `Fee demand: "${matchedFee}"`,
        ],
      });
    }
  }

  // ─── R9: JOB_SCAM (critical) ──────────────────────────────────────────────
  if (messageText) {
    const JOB_CUE_RE =
      /\b(job|internship|work\s*from\s*home|wfh|stipend|offer\s*letter|hiring|trainee|intern)\b/i;
    const hasJobCue = JOB_CUE_RE.test(messageText);
    const hasDemand = textHasPaymentDemand();

    if (hasJobCue && hasDemand && !reasons.some((r) => r.title === 'Advance Fee Fraud')) {
      score += 100;
      const matchedJob = messageText.match(JOB_CUE_RE)?.[0] ?? '';
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Job or Internship Scam',
        detail:
          'The message offers a job, internship, or work-from-home opportunity while demanding payment. Legitimate employers never ask you to pay to get a job.',
        evidence: [`Job cue: "${matchedJob}"`],
      });
    }
  }

  // ─── R10: PAY_TO_CLAIM (critical) ─────────────────────────────────────────
  if (messageText) {
    const CLAIM_RE = /\b(claim|receive|release|collect|get|unlock)\b[^.!?\n]*?\b(prize|refund|cashback|reward|money|winnings|amount)\b/i;
    const PAY_FIRST_RE = /\b(pay\s*first|pay\s*now|deposit\s*first|transfer\s*first|send\s*first)\b/i;

    if (CLAIM_RE.test(messageText) && PAY_FIRST_RE.test(messageText)) {
      score += 100;
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Pay-to-Claim Fraud',
        detail:
          'The message instructs you to pay money first in order to claim a prize, refund, or cashback. This is always a scam.',
        evidence: [
          messageText.match(CLAIM_RE)?.[0] ?? '',
          messageText.match(PAY_FIRST_RE)?.[0] ?? '',
        ],
      });
    }
  }

  // ─── R11: SEND_SMALL_TO_VERIFY (critical) ─────────────────────────────────
  if (messageText) {
    const SMALL_AMT_RE = /\b(?:pay|send|transfer|deposit)\b[^.!?\n]*?(?:[₹%¥Z2=?]|rs\.?\s*)\s*(?:1|2|5|10)\b/i;
    const VERIFY_RE = /\b(verify|verification|activate|activation|test|confirm)\b/i;

    if (SMALL_AMT_RE.test(messageText) && VERIFY_RE.test(messageText)) {
      score += 100;
      reasons.push({
        layer: 'rule',
        severity: 'critical',
        title: 'Token Payment to Verify Account',
        detail:
          'The message asks you to send a tiny amount (₹1–₹10) to "verify" or "activate" something. This is a technique to get your UPI PIN on record.',
        evidence: [
          messageText.match(SMALL_AMT_RE)?.[0] ?? '',
          messageText.match(VERIFY_RE)?.[0] ?? '',
        ],
      });
    }
  }

  // ─── R12: URGENCY_PLUS_PAYMENT (high) ────────────────────────────────────
  if (messageText && textHasPaymentDemand()) {
    const URGENCY_RE =
      /\b(immediately|within\s+\d+\s+(minutes?|hours?|mins?|hrs?)|today\s*only|last\s*chance|offer\s*(expires?|ends?)|slot\s*(will\s*)?(be\s*)?(given|cancelled|blocked|expired)|account\s*will\s*be\s*(blocked|suspended|cancelled)|offer\s*will\s*be\s*(given|cancelled))\b/i;

    if (URGENCY_RE.test(messageText) && !reasons.some((r) => r.severity === 'critical')) {
      score += 50;
      const matchedUrgency = messageText.match(URGENCY_RE)?.[0] ?? '';
      reasons.push({
        layer: 'rule',
        severity: 'high',
        title: 'Artificial Urgency with Payment Demand',
        detail:
          'The message combines a payment demand with manufactured time pressure. This is a social-engineering technique used in scams.',
        evidence: [`Urgency phrase: "${matchedUrgency}"`],
      });
    } else if (URGENCY_RE.test(messageText)) {
      // Even when a critical already fired, still record urgency signal
      score = Math.min(100, score + 10);
      const matchedUrgency = messageText.match(URGENCY_RE)?.[0] ?? '';
      reasons.push({
        layer: 'rule',
        severity: 'high',
        title: 'Artificial Urgency with Payment Demand',
        detail:
          'The message combines a payment demand with manufactured time pressure. This is a social-engineering technique used in scams.',
        evidence: [`Urgency phrase: "${matchedUrgency}"`],
      });
    }
  }

  // ─── R13: BILL_OR_KYC_THREAT (high) ──────────────────────────────────────
  if (text) {
    const SERVICE_RE = /\b(electricity|kyc|account|sim|fastag|gas|broadband|internet)\b/i;
    const THREAT_RE = /\b(disconnect|disconnection|blocked|block|suspend|suspension|expire|expired|deactivate)\b/i;
    const ACTION_RE = /\b(pay|call|click|update|verify|submit)\b/i;

    if (SERVICE_RE.test(text) && THREAT_RE.test(text) && ACTION_RE.test(text)) {
      score += 50;
      reasons.push({
        layer: 'rule',
        severity: 'high',
        title: 'Service Threat with Payment or Action Demand',
        detail:
          'The message threatens to disconnect or block a service unless you pay or take action. Verify directly with the service provider before acting.',
        evidence: [
          `Service: "${messageText!.match(SERVICE_RE)?.[0] ?? ''}"`,
          `Threat: "${messageText!.match(THREAT_RE)?.[0] ?? ''}"`,
        ],
      });
    }
  }

  // ─── R14: PARCEL_CUSTOMS (high) ───────────────────────────────────────────
  if (text) {
    const PARCEL_RE = /\b(parcel|courier|package|customs|shipment)\b/i;
    const FEE_HOLD_RE = /\b(fee|charge|held|pending|detained|cleared)\b/i;
    const PAY_RE = /\b(pay|send|transfer|deposit)\b/i;

    if (PARCEL_RE.test(text) && FEE_HOLD_RE.test(text) && PAY_RE.test(text)) {
      score += 50;
      reasons.push({
        layer: 'rule',
        severity: 'high',
        title: 'Parcel or Customs Fee Scam',
        detail:
          'The message claims a parcel is held pending payment of customs, delivery or clearance fees. Legitimate courier companies do not request UPI payments to release parcels.',
        evidence: [
          `Parcel cue: "${messageText!.match(PARCEL_RE)?.[0] ?? ''}"`,
          `Fee cue: "${messageText!.match(FEE_HOLD_RE)?.[0] ?? ''}"`,
        ],
      });
    }
  }

  return {
    available: true,
    score: Math.min(100, score),
    reasons,
    unknowns,
  };
}
