import type { LayerResult, PaymentStory, Reason, ParsedQr } from './types';

function noisyOr(weights: number[]): number {
  if (weights.length === 0) return 0;
  const product = weights.reduce((acc, w) => acc * (1 - w), 1);
  return 1 - product;
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const tokens1 = str1.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  const tokens2 = str2.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

export function evaluateIntentLayer(
  userStory?: PaymentStory,
  messageStory?: PaymentStory,
  qrStory?: PaymentStory,
  _rawMessageText?: string,
  qr?: ParsedQr
): LayerResult {
  const reasons: Reason[] = [];
  const unknowns: string[] = [];
  const weights: number[] = [];
  
  const stories = [
    { label: 'User Expectation', story: userStory },
    { label: 'Message Claim', story: messageStory },
    { label: 'QR Code Action', story: qrStory }
  ].filter(s => s.story !== undefined) as { label: string; story: PaymentStory }[];

  // 0. The intent layer is 'available' whenever the message or the QR supplies at least one comparable fact (VPA, payee type, direction)
  // Not just when stories >= 2. We'll set available = true if we find at least one fact, or just if any story exists.
  // We'll set available to false ONLY if we have literally nothing, but wait, the prompt says:
  // "The intent layer is 'available' whenever the message or the QR supplies at least one comparable fact (VPA, payee type, direction), not only when two stories both have a direction."
  const hasVpa = stories.some(s => s.story.payeeVpa);
  const hasDirection = stories.some(s => s.story.direction && s.story.direction !== 'unknown');
  const hasPayeeType = !!(messageStory?.claimedEntity || qrStory?.payeeName);
  
  if (!hasVpa && !hasDirection && !hasPayeeType) {
    return {
      available: false,
      score: 0,
      reasons: [],
      unknowns: ['Not enough information. We need at least one comparable fact (VPA, payee type, direction) to evaluate intent.']
    };
  }

  // 1. Direction Mismatch (Weight: 0.90)
  let directionMismatchFound = false;
  for (let i = 0; i < stories.length; i++) {
    for (let j = i + 1; j < stories.length; j++) {
      const s1 = stories[i];
      const s2 = stories[j];
      const dir1 = s1.story.direction;
      const dir2 = s2.story.direction;

      if (dir1 === 'unknown' || dir2 === 'unknown') {
        unknowns.push(`Could not compare payment directions between ${s1.label} and ${s2.label} because one is unknown.`);
      } else if (dir1 !== dir2) {
        if (!directionMismatchFound) {
          weights.push(0.90);
          directionMismatchFound = true;
          reasons.push({
            layer: 'intent',
            severity: 'critical',
            title: 'Contradictory Payment Flow (Direction Mismatch)',
            detail: `${s1.label} indicates money is going ${dir1.toUpperCase()}, but ${s2.label} shows money going ${dir2.toUpperCase()}.`,
            evidence: [
              `${s1.label} says: ${dir1}`,
              `${s2.label} does: ${dir2}`
            ]
          });
        }
      }
    }
  }

  // 2. Amount Mismatch (Weight: 0.75)
  let amountMismatchFound = false;
  for (let i = 0; i < stories.length; i++) {
    for (let j = i + 1; j < stories.length; j++) {
      const s1 = stories[i];
      const s2 = stories[j];
      const amt1 = s1.story.amount;
      const amt2 = s2.story.amount;

      if (amt1 === undefined || amt2 === undefined) {
        unknowns.push(`Could not compare amounts between ${s1.label} and ${s2.label} because one is missing.`);
      } else {
        const isS1ValidPayment = s1.story.action !== 'unknown' || s1.story.direction !== 'unknown' || !!s1.story.payeeVpa || !!s1.story.claimedEntity || s1.label !== 'Message Claim';
        const isS2ValidPayment = s2.story.action !== 'unknown' || s2.story.direction !== 'unknown' || !!s2.story.payeeVpa || !!s2.story.claimedEntity || s2.label !== 'Message Claim';
        
        if (isS1ValidPayment && isS2ValidPayment) {
          const diff = Math.abs(amt1 - amt2);
          const max = Math.max(amt1, amt2);
          if (max > 0 && diff / max > 0.05) {
            if (!amountMismatchFound) {
              weights.push(0.75);
              amountMismatchFound = true;
              reasons.push({
                layer: 'intent',
                severity: 'high',
                title: 'Amount Discrepancy',
                detail: `The payment amount in ${s1.label} differs significantly from ${s2.label}.`,
                evidence: [
                  `${s1.label} amount: ₹${amt1}`,
                  `${s2.label} amount: ₹${amt2}`
                ]
              });
            }
          }
        }
      }
    }
  }

  // 3. Action Mismatch (Weight: 0.50)
  let actionMismatchFound = false;
  for (let i = 0; i < stories.length; i++) {
    for (let j = i + 1; j < stories.length; j++) {
      const s1 = stories[i];
      const s2 = stories[j];
      const act1 = s1.story.action;
      const act2 = s2.story.action;

      if (act1 === 'unknown' || act2 === 'unknown') {
        unknowns.push(`Could not compare actions between ${s1.label} and ${s2.label} because one is unknown.`);
      } else if (act1 !== act2) {
        if (!actionMismatchFound) {
          weights.push(0.50);
          actionMismatchFound = true;
          reasons.push({
            layer: 'intent',
            severity: 'medium',
            title: 'Conflicting Payment Action',
            detail: `The expected action (${s1.label}: ${act1}) does not match what is actually requested (${s2.label}: ${act2}).`,
            evidence: [
              `${s1.label} action: ${act1}`,
              `${s2.label} action: ${act2}`
            ]
          });
        }
      }
    }
  }

  // 4. Payee VPA Mismatch (Weight: 0.85 - HIGH)
  // "If the message names a payee VPA and the QR has a payee VPA and they differ (normalised), add a HIGH contradiction: 'The message tells you to pay X, but the QR pays Y.'"
  let vpaMismatchFound = false;
  for (let i = 0; i < stories.length; i++) {
    for (let j = i + 1; j < stories.length; j++) {
      const s1 = stories[i];
      const s2 = stories[j];
      const vpa1 = s1.story.payeeVpa?.toLowerCase();
      const vpa2 = s2.story.payeeVpa?.toLowerCase();

      if (vpa1 && vpa2) {
        if (vpa1 !== vpa2 && !vpaMismatchFound) {
          weights.push(0.85); // HIGH severity
          vpaMismatchFound = true;
          reasons.push({
            layer: 'intent',
            severity: 'high',
            title: 'Payee VPA Mismatch',
            detail: `The message tells you to pay ${vpa1}, but the QR pays ${vpa2}.`,
            evidence: [
              `${s1.label} VPA: ${vpa1}`,
              `${s2.label} VPA: ${vpa2}`
            ]
          });
        }
      } else {
        unknowns.push(`Could not compare VPAs between ${s1.label} and ${s2.label} because one is missing.`);
      }
    }
  }

  // 5. Organisation vs Individual (Weight: 0.60 - MEDIUM-HIGH)
  // "If the message claims an organisation and the QR payee looks like an individual (personal name in pn, mc=0000 or no merchant code), add a MEDIUM-HIGH contradiction."
  if (messageStory?.claimedEntity && qrStory && qr) {
    const pn = qr.params['pn'] || '';
    const mc = qr.params['mc'];
    const looksLikeIndividual = !mc || mc === '0000' || (!pn.toLowerCase().includes('ltd') && !pn.toLowerCase().includes('limited') && !pn.toLowerCase().includes('enterprise'));

    if (looksLikeIndividual) {
      weights.push(0.60);
      reasons.push({
        layer: 'intent',
        severity: 'high', // MEDIUM-HIGH
        title: 'Organisation vs Individual Mismatch',
        detail: `The message claims to be from an organisation (${messageStory.claimedEntity}), but the QR payee looks like an individual.`,
        evidence: [
          `Message Claimed Entity: ${messageStory.claimedEntity}`,
          `QR Payee Name: ${pn}`,
          `QR Merchant Code: ${mc || 'none'}`
        ]
      });
    }
  } else if (!messageStory?.claimedEntity) {
    unknowns.push('No organisation claimed in the message to compare against the QR payee type.');
  }

  // 6. Payee Name / Entity Mismatch (Weight: 0.50)
  if (qrStory && qrStory.payeeName) {
    const qrName = qrStory.payeeName;
    const claimedName = messageStory?.claimedEntity;
    
    if (claimedName) {
      const similarity = calculateSimilarity(claimedName, qrName);
      if (similarity === 0 && qrName.length >= 3 && claimedName.length >= 3) {
        weights.push(0.50);
        reasons.push({
          layer: 'intent',
          severity: 'medium',
          title: 'Unrecognized Payee Name',
          detail: 'The payee name encoded in the QR code does not appear to match the sender or merchant named in the message.',
          evidence: [
            `Message Claimed Name: ${claimedName}`,
            `QR Payee Name: ${qrName}`
          ]
        });
      }
    } else {
      unknowns.push('No named entity in the message to compare against the QR payee name.');
    }
  } else if (qrStory) {
    unknowns.push('The QR has no payee name, so we could not check entity matching.');
  }

  // Ensure unknowns are unique
  const uniqueUnknowns = Array.from(new Set(unknowns));
  const finalScore = noisyOr(weights) * 100;

  return {
    available: true,
    score: finalScore, // Returns 0 to 100
    reasons,
    unknowns: uniqueUnknowns,
  };
}
