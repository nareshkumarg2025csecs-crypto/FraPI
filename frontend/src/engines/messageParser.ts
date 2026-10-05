import type { Action, Direction, PaymentStory, TaggedAmount } from './types';
import { extractEntities } from './entityExtractor';

// ─── Amount OCR tolerance ──────────────────────────────────────────────────────
// Match ₹, %, ¥, Z, 2, =, ? followed by Indian-grouped number, plus Rs/INR/rupees
const AMOUNT_PATTERN =
  /(?:(?:rs\.?\s*|inr\s*|rupees?\s*)|(?:[₹%¥Z2=?])\s*)([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;

function extractAllAmounts(text: string): { value: number; index: number }[] {
  const results: { value: number; index: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(AMOUNT_PATTERN.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(n) && n > 0 && !results.find(r => r.value === n && r.index === m!.index)) {
      results.push({ value: n, index: m.index });
    }
  }
  // Also catch "N INR" / "N rupees" suffix form
  const suffixRe = /([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|rupees?)\b/gi;
  while ((m = suffixRe.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(n) && n > 0 && !results.find(r => r.value === n && r.index === m!.index)) {
      results.push({ value: n, index: m.index });
    }
  }
  return results;
}

// ─── Payment-demand detection ─────────────────────────────────────────────────
const PAYMENT_VERB_RE =
  /\b(pay|send|transfer|deposit|remit)\b/i;

const FEE_NOUN_RE =
  /\b(fee|charge|deposit|amount|payment|charges)\b/i;

const UPI_PLATFORM_RE =
  /\b(upi|gpay|google\s*pay|phonepe|paytm|bhim|neft|rtgs|imps)\b/i;

// "pay ₹N to <vpa|handle>"
const PAY_AMOUNT_TO_RE =
  /\b(pay|send|transfer|deposit)\b[^.!?]*?(?:[₹%¥Z2=?]|rs\.?\s*)\s*[0-9]/i;

// "pay immediately via UPI / pay to <vpa>"
const PAY_VIA_RE =
  /\b(pay|send|transfer)\b[^.!?]*?\b(immediately|via|to)\b/i;

// fee/charge/deposit + payment verb within 120 chars
function hasPaymentDemand(text: string): { found: boolean; matchedPhrase: string } {
  // Case 1: explicit "pay|send|transfer ₹N"
  if (PAY_AMOUNT_TO_RE.test(text)) {
    const m = text.match(PAY_AMOUNT_TO_RE);
    return { found: true, matchedPhrase: m?.[0] ?? 'pay amount' };
  }

  // Case 2: "pay immediately" / "pay via UPI" / "pay to <vpa>"
  if (PAY_VIA_RE.test(text)) {
    const m = text.match(PAY_VIA_RE);
    return { found: true, matchedPhrase: m?.[0] ?? 'pay via' };
  }

  // Case 3: payment verb + fee noun in same sentence
  const sentences = text.split(/[.!?\n]/);
  for (const s of sentences) {
    if (PAYMENT_VERB_RE.test(s) && (FEE_NOUN_RE.test(s) || UPI_PLATFORM_RE.test(s))) {
      return { found: true, matchedPhrase: s.trim().slice(0, 80) };
    }
  }

  return { found: false, matchedPhrase: '' };
}

// ─── "refundable" / "refunded" modifying fee — not a real incoming claim ─────
function hasRefundableQualifier(text: string): boolean {
  return /\brefundable\b/i.test(text) || /\brefunded\b[^.!?]*\bfee\b/i.test(text);
}

// ─── Tag amounts as benefit vs payment ───────────────────────────────────────
const BENEFIT_CONTEXT_RE =
  /\b(stipend|salary|prize|cashback|reward|bonus|package|ctc|lpa|per\s*month|per\s*annum|monthly)\b/i;
const PAYMENT_CONTEXT_RE =
  /\b(fee|charge|deposit|registration|onboarding|processing|security|handling|gst|customs|delivery|insurance|clearance|kit|training|id\s*card)\b/i;

function tagAmounts(text: string, allAmounts: { value: number; index: number }[]): TaggedAmount[] {
  return allAmounts.map((amt) => {
    const idx = amt.index;
    const window = text.slice(Math.max(0, idx - 60), idx + 60);
    if (BENEFIT_CONTEXT_RE.test(window)) return { value: amt.value, tag: 'benefit' as const, index: idx };
    if (PAYMENT_CONTEXT_RE.test(window)) return { value: amt.value, tag: 'payment' as const, index: idx };
    return { value: amt.value, tag: 'unknown' as const, index: idx };
  });
}

// ─── Claimed entity ───────────────────────────────────────────────────────────
function extractClaimedEntity(text: string): string | undefined {
  const m = text.match(
    /\b(hr\s*desk|hr\s*team|customer\s*care|customer\s*service|support\s*team|helpline|bank|government|court|customs|police|income\s*tax|company|organization|org)\b/i
  );
  return m?.[0] ?? undefined;
}

// ─── Main parser ─────────────────────────────────────────────────────────────
export function parseMessage(text: string): PaymentStory {
  const evidence: string[] = [];
  const entities = extractEntities(text);
  const lower = text.toLowerCase();

  if (entities.amounts.length > 0) evidence.push(`Message states amount: ₹${entities.amounts[0]}`);
  if (entities.vpas.length > 0) evidence.push(`Message mentions VPA: ${entities.vpas[0]}`);

  // ── 1. Payment demand check ────────────────────────────────────────────────
  const demand = hasPaymentDemand(text);
  const refundableModifiesFee = hasRefundableQualifier(text);

  // ── 2. Incoming / outgoing cues (raw) ─────────────────────────────────────
  const incomingCues = [
    'receive', 'credited', 'refund', 'cashback', 'prize', 'reward',
    'claim', 'mila', 'mil gaya', 'jeeta', 'prapt', 'aaye',
  ];
  const outgoingCues = [
    'pay', 'send', 'transfer', 'due', 'fee', 'bill',
    'bhejo', 'kato', 'deducted', 'bhugtan', 'payment karo',
  ];

  const matchedIncoming = incomingCues.filter((cue) => lower.includes(cue));
  const matchedOutgoing = outgoingCues.filter((cue) => lower.includes(cue));

  let direction: Direction;

  if (demand.found) {
    // A payment demand unambiguously means money is going OUT, even if bait
    // words like "refundable", "receive your laptop" appear.
    direction = 'outgoing';
    evidence.push(`Payment demand detected: "${demand.matchedPhrase}"`);
    if (refundableModifiesFee) {
      evidence.push('Note: "refundable" qualifies a fee/deposit, not an actual incoming transfer.');
    }
  } else if (matchedIncoming.length > 0 && matchedOutgoing.length === 0) {
    direction = 'incoming';
    evidence.push(`Found incoming cues: ${matchedIncoming.join(', ')}`);
  } else if (matchedOutgoing.length > 0 && matchedIncoming.length === 0) {
    direction = 'outgoing';
    evidence.push(`Found outgoing cues: ${matchedOutgoing.join(', ')}`);
  } else if (matchedIncoming.length > 0 && matchedOutgoing.length > 0) {
    direction = 'unknown';
    evidence.push('Conflicting direction cues found in message.');
    evidence.push(`Incoming: ${matchedIncoming.join(', ')} | Outgoing: ${matchedOutgoing.join(', ')}`);
  } else {
    direction = 'unknown';
    evidence.push('No clear payment direction cues found.');
  }

  // ── 3. Action ─────────────────────────────────────────────────────────────
  let action: Action = 'unknown';
  if (/\b(internship|work.from.home|wfh|intern)\b/i.test(text)) action = 'internship';
  else if (/\b(job|hiring|vacancy|appointment)\b/i.test(text)) action = 'job';
  else if (/\b(lottery|lucky\s*draw)\b/i.test(lower)) action = 'lottery';
  else if (/\b(prize|winner|won|jackpot)\b/i.test(lower)) action = 'prize';
  else if (/\b(loan\s*approved|loan\s*sanctioned|loan\s*disbursal)\b/i.test(lower)) action = 'loan';
  else if (/\b(refund|reimburse|money\s*back|credited\s*back)\b/i.test(lower)) action = 'refund';
  else if (/\b(cashback|cash\s*back|reward|scratch\s*card)\b/i.test(lower)) action = 'cashback';
  else if (/\b(kyc|pan\s*card|aadhaar|account\s*suspended|blocked)\b/i.test(lower)) action = 'kyc';
  else if (/\b(parcel|courier|package|customs|delivery)\b/i.test(lower)) action = 'parcel';
  else if (/\b(electricity|bill|due|overdue|gas|water)\b/i.test(lower)) action = 'bill';
  else if (/\b(support|customer\s*care|helpline)\b/i.test(lower)) action = 'support';
  else if (/\b(collect|requesting\s*money|approve\s*payment)\b/i.test(lower)) action = 'collect';
  else if (/\b(pay|transfer|send)\b/i.test(lower)) action = 'pay';

  if (action !== 'unknown') evidence.push(`Message suggests action: ${action}`);

  // ── 4. Amount tagging ─────────────────────────────────────────────────────
  const allRaw = extractAllAmounts(text);
  // Also include amounts already found by entityExtractor with approx index search
  for (const a of entities.amounts) {
    if (!allRaw.some(r => r.value === a)) {
      const idx = text.indexOf(String(a));
      allRaw.push({ value: a, index: Math.max(0, idx) });
    }
  }
  const tagged = tagAmounts(text, allRaw);

  const paymentAmounts = tagged.filter((t) => t.tag === 'payment').map((t) => t.value);
  const benefitAmounts = tagged.filter((t) => t.tag === 'benefit').map((t) => t.value);
  const unknownTagged = tagged.filter((t) => t.tag === 'unknown').map((t) => t.value);

  let requestedAmount: number | undefined;

  if (demand.found && allRaw.length > 0) {
    const demandIdx = text.toLowerCase().indexOf(demand.matchedPhrase.toLowerCase());
    if (demandIdx !== -1) {
      let minDistance = Infinity;
      for (const amt of allRaw) {
        const distance = Math.abs(amt.index - demandIdx);
        if (distance < minDistance) {
          minDistance = distance;
          requestedAmount = amt.value;
        }
      }
    }
  }

  if (requestedAmount === undefined) {
    requestedAmount = paymentAmounts[0];
    if (requestedAmount === undefined && demand.found && unknownTagged.length > 0) {
      requestedAmount = unknownTagged[0];
    }
    if (requestedAmount === undefined && !demand.found) {
      requestedAmount = entities.amounts[0];
    }
  }

  const benefitAmount = benefitAmounts[0];

  // ── 5. VPA extraction (from entityExtractor + raw text) ───────────────────
  const vpaFromText = entities.vpas[0];

  // ── 6. Claimed entity ──────────────────────────────────────────────────────
  const claimedEntity = extractClaimedEntity(text);

  // ── 7. Confidence ──────────────────────────────────────────────────────────
  let confidence = 0.1;
  if (direction !== 'unknown') confidence += 0.4;
  if (action !== 'unknown') confidence += 0.3;
  if (requestedAmount !== undefined) confidence += 0.2;

  return {
    source: 'message',
    direction,
    amount: requestedAmount,
    benefitAmount,
    allAmounts: tagged,
    payeeVpa: vpaFromText,
    claimedEntity,
    action,
    confidence: Math.min(1.0, confidence),
    evidence,
  };
}
