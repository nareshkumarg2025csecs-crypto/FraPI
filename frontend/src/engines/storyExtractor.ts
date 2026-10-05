import type { Action, Direction, ParsedMessage, ParsedQr, PaymentStory, UserIntentInput } from './types';

/**
 * Parses a UPI QR string (e.g. upi://pay?pa=name@bank&pn=Name&am=100)
 */
export function parseUpiQr(rawQr: string): ParsedQr {
  const trimmed = rawQr.trim();
  const isUpiUrl = trimmed.toLowerCase().startsWith('upi://');
  
  const params: Record<string, string> = {};
  let vpa: string | undefined;
  let name: string | undefined;
  let amount: number | undefined;
  let isCollectRequest = false;

  if (isUpiUrl) {
    try {
      // Split by ? to parse parameters manually to handle custom UPI URL variations
      const queryIndex = trimmed.indexOf('?');
      if (queryIndex !== -1) {
        const queryString = trimmed.substring(queryIndex + 1);
        const pairs = queryString.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value !== undefined) {
            params[key.toLowerCase()] = decodeURIComponent(value.replace(/\+/g, ' '));
          }
        }
      }

      vpa = params['pa'];
      name = params['pn'];
      if (params['am']) {
        const parsedAmt = parseFloat(params['am']);
        if (!isNaN(parsedAmt) && parsedAmt > 0) {
          amount = parsedAmt;
        }
      }

      if (params['mode'] === '02' || params['mode'] === '04' || trimmed.toLowerCase().includes('upi://collect')) {
        isCollectRequest = true;
      }
    } catch {
      // Parsing fallback handled gracefully
    }
  }

  return {
    raw: trimmed,
    kind: isUpiUrl ? 'upi' : trimmed.startsWith('http') ? 'url' : 'unknown',
    warnings: [],
    vpa,
    name,
    amount,
    isCollectRequest,
    isUpiUrl,
    params,
  };
}

/**
 * Parses message text to extract monetary amounts, VPAs, URLs, action keywords, and inferred payment direction.
 */
export function parseMessage(text: string): ParsedMessage {
  const amounts: number[] = [];
  const vpas: string[] = [];
  const urls: string[] = [];
  const actions: Action[] = [];
  const directions: Direction[] = [];

  if (!text) {
    return { text: '', amounts, vpas, urls, actions, directions };
  }

  // Extract Amounts (e.g. ₹ 500, Rs. 1,000, 500 INR, 5000 rupees)
  const amountRegexes = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|rupees|inr|₹)/gi,
  ];

  for (const regex of amountRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const valStr = match[1].replace(/,/g, '');
      const num = parseFloat(valStr);
      if (!isNaN(num) && num > 0 && !amounts.includes(num)) {
        amounts.push(num);
      }
    }
  }

  // Extract VPAs (e.g. john@upi, shop@okicici)
  const vpaRegex = /[a-zA-Z0-9._\-]+@[a-zA-Z0-9]+/gi;
  let vpaMatch;
  while ((vpaMatch = vpaRegex.exec(text)) !== null) {
    const candidate = vpaMatch[0].toLowerCase();
    // Exclude common email patterns if needed, but in UPI context match standard handles
    if (!vpas.includes(candidate)) {
      vpas.push(candidate);
    }
  }

  // Extract URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|top|link|club|site|online|info|tech|cn|ru|cc)\/[^\s]*)/gi;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    if (!urls.includes(urlMatch[0])) {
      urls.push(urlMatch[0]);
    }
  }

  // Detect Action Keywords
  const lower = text.toLowerCase();

  if (/\b(refund|reimburse|money back|credited back|return money)\b/.test(lower)) {
    actions.push('refund');
  }
  if (/\b(cashback|cash back|reward|scratch card|bonus)\b/.test(lower)) {
    actions.push('cashback');
  }
  if (/\b(prize|lottery|winner|won|jackpot|congratulations)\b/.test(lower)) {
    actions.push('prize');
  }
  if (/\b(kyc|pan card|aadhaar|update kyc|suspended|blocked|deactivated)\b/.test(lower)) {
    actions.push('kyc');
  }
  if (/\b(bill|electricity|power|utility|due|overdue)\b/.test(lower)) {
    actions.push('bill');
  }
  if (/\b(support|helpline|customer care|executive|helpdesk)\b/.test(lower)) {
    actions.push('support');
  }
  if (/\b(collect|requesting|approve payment|pin enter)\b/.test(lower)) {
    actions.push('collect');
  }
  if (/\b(pay|transfer|send|deposit)\b/.test(lower)) {
    actions.push('pay');
  }

  if (actions.length === 0) {
    actions.push('unknown');
  }

  // Detect Inferred Direction from Message Text
  if (/\b(receive|credited|get|claim|win|refund|cashback|bonus|won|deposit to your)\b/.test(lower)) {
    directions.push('incoming');
  }
  if (/\b(pay|transfer|send|charge|fee|deducted|bill)\b/.test(lower)) {
    directions.push('outgoing');
  }
  if (directions.length === 0) {
    directions.push('unknown');
  }

  return {
    text,
    amounts,
    vpas,
    urls,
    actions,
    directions,
  };
}

/**
 * Extracts a structured PaymentStory from user input, message, or QR code data.
 */
export function extractPaymentStory(
  source: 'user' | 'message' | 'qr',
  data: UserIntentInput | ParsedMessage | ParsedQr
): PaymentStory {
  const evidence: string[] = [];

  if (source === 'user') {
    const input = data as UserIntentInput;
    if (input.expectedAction) evidence.push(`User expected action: ${input.expectedAction}`);
    if (input.expectedDirection) evidence.push(`User expected direction: ${input.expectedDirection}`);
    if (input.expectedAmount !== undefined) evidence.push(`User expected amount: ₹${input.expectedAmount}`);
    if (input.expectedPayeeVpa) evidence.push(`User expected payee VPA: ${input.expectedPayeeVpa}`);

    return {
      source: 'user',
      direction: input.expectedDirection || 'unknown',
      amount: input.expectedAmount,
      payeeVpa: input.expectedPayeeVpa,
      action: input.expectedAction || 'unknown',
      confidence: 1.0,
      evidence,
    };
  }

  if (source === 'message') {
    const msg = data as ParsedMessage;
    const direction = msg.directions[0] || 'unknown';
    const action = msg.actions[0] || 'unknown';
    const amount = msg.amounts[0];
    const payeeVpa = msg.vpas[0];

    if (direction !== 'unknown') evidence.push(`Message suggests ${direction} money flow`);
    if (action !== 'unknown') evidence.push(`Message mentions ${action} action`);
    if (amount !== undefined) evidence.push(`Message states amount ₹${amount}`);
    if (payeeVpa) evidence.push(`Message contains VPA ${payeeVpa}`);

    const confidence = (direction !== 'unknown' ? 0.4 : 0.1) + (action !== 'unknown' ? 0.3 : 0.1) + (amount ? 0.2 : 0);

    return {
      source: 'message',
      direction,
      amount,
      payeeVpa,
      action,
      confidence: Math.min(1.0, confidence),
      evidence,
    };
  }

  // QR source
  const qr = data as ParsedQr;
  // Standard scanning of a UPI QR code ALWAYS results in an OUTGOING payment transaction from user's account
  const direction: Direction = 'outgoing';
  const action: Action = qr.isCollectRequest ? 'collect' : 'pay';

  if (qr.vpa) evidence.push(`QR encodes payee VPA: ${qr.vpa}`);
  if (qr.name) evidence.push(`QR encodes payee name: ${qr.name}`);
  if (qr.amount !== undefined) evidence.push(`QR encodes fixed payment amount: ₹${qr.amount}`);
  evidence.push('Scanning a UPI QR code always initiates an outgoing debit from your bank account');

  return {
    source: 'qr',
    direction,
    amount: qr.amount,
    payeeVpa: qr.vpa,
    payeeName: qr.name,
    action,
    confidence: qr.isUpiUrl ? 0.95 : 0.3,
    evidence,
  };
}
