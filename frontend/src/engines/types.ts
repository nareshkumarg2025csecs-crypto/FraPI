export type Direction = 'incoming' | 'outgoing' | 'unknown';
export type Action =
  | 'refund' | 'cashback' | 'prize' | 'lottery' | 'loan'
  | 'job' | 'internship' | 'parcel'
  | 'collect' | 'pay' | 'kyc' | 'bill' | 'support' | 'unknown';

export interface TaggedAmount {
  value: number;
  tag: 'benefit' | 'payment' | 'unknown';
  index?: number;
}

export interface PaymentStory {
  source: 'user' | 'message' | 'qr';
  direction: Direction;
  amount?: number;           // requested payment amount (nearest to payment demand)
  benefitAmount?: number;    // claimed benefit (stipend, prize, etc.)
  allAmounts?: TaggedAmount[];
  payeeVpa?: string;
  payeeName?: string;
  claimedEntity?: string;    // HR desk, bank, customer care, etc.
  action: Action;
  confidence: number;
  evidence: string[];
}

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface Reason {
  layer: 'rule' | 'intent' | 'reference' | 'language' | 'web';
  severity: Severity;
  title: string;
  detail: string;
  evidence: string[];
}

export interface LayerResult {
  available: boolean;
  score: number;
  reasons: Reason[];
  unknowns: string[];
  /** 'ran' = executed normally; 'not_applicable' = no applicable input; 'failed' = threw/timed out */
  state?: 'ran' | 'not_applicable' | 'failed';
}

export type RiskLevel = 'LOW_RISK' | 'REVIEW' | 'HIGH_RISK';

export interface ParsedQr {
  raw: string;
  kind: 'upi' | 'url' | 'unknown';
  vpa?: string;
  name?: string;
  amount?: number;
  isCollectRequest: boolean;
  isUpiUrl: boolean;
  params: Record<string, string>;
  warnings: string[];
}

export interface ParsedMessage {
  text: string;
  amounts: number[];
  vpas: string[];
  urls: string[];
  actions: Action[];
  directions: Direction[];
}

export interface UserIntentInput {
  expectedAction?: Action;
  expectedDirection?: Direction;
  expectedAmount?: number;
  expectedPayeeVpa?: string;
}
