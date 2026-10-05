import type { UserIntentInput, ParsedQr } from '../engines/types';

export interface DemoScenario {
  id: string;
  title: string;
  category: string;
  description: string;
  rawText: string;
  qrPayload?: string;
  parsedQr?: ParsedQr;
  userIntent: UserIntentInput;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'refund-qr-scam',
    title: '₹3,000 Refund QR Scam',
    category: 'QR Direction Contradiction',
    description: 'Scammer promises a ₹3,000 refund/cashback and asks you to scan a QR code.',
    rawText: 'Congratulations! Your Flipkart refund of Rs 3000 is approved. Scan the attached QR code to receive the money directly into your bank account immediately.',
    qrPayload: 'upi://pay?pa=refunds.support@okaxis&pn=Flipkart%20Refund%20Desk&am=3000&cu=INR&tn=Refund%20Transfer',
    parsedQr: {
      raw: 'upi://pay?pa=refunds.support@okaxis&pn=Flipkart%20Refund%20Desk&am=3000&cu=INR&tn=Refund%20Transfer',
      kind: 'upi',
      vpa: 'refunds.support@okaxis',
      name: 'Flipkart Refund Desk',
      amount: 3000,
      isCollectRequest: false,
      isUpiUrl: true,
      params: { pa: 'refunds.support@okaxis', pn: 'Flipkart Refund Desk', am: '3000', cu: 'INR', tn: 'Refund Transfer' },
      warnings: [],
    },
    userIntent: {
      expectedDirection: 'incoming',
      expectedAction: 'refund',
      expectedAmount: 3000,
    },
  },
  {
    id: 'genuine-otp-alert',
    title: 'Genuine Bank OTP Alert',
    category: 'Legitimate Notification',
    description: 'Legitimate bank security alert with standard negative warning.',
    rawText: 'Dear Customer, 482910 is your OTP for transaction of Rs 1,250.00 at Amazon. Do NOT share your OTP or PIN with anyone, including bank staff. If not done by you, call 18002584455.',
    userIntent: {
      expectedDirection: 'outgoing',
      expectedAction: 'pay',
      expectedAmount: 1250,
    },
  },
  {
    id: 'collect-request-trap',
    title: 'Collect-Request Trap',
    category: 'Collect Request Scam',
    description: 'Buyer on OLX says "I sent a collect request, please click Approve and enter PIN to receive payment".',
    rawText: 'I have transferred the payment of Rs 5,000 for your used sofa via PhonePe collect request. Please open PhonePe, tap Approve, and enter your UPI PIN to claim the payment in your account.',
    userIntent: {
      expectedDirection: 'incoming',
      expectedAction: 'refund',
      expectedAmount: 5000,
    },
  },
  {
    id: 'lookalike-merchant-vpa',
    title: 'Look-alike Merchant VPA',
    category: 'VPA Impersonation',
    description: 'Fake electricity bill SMS with a deceptive look-alike handle (powerdiscom0@okaxis instead of powerdiscom@okhdfcbank).',
    rawText: 'Urgent notice: Your electricity power supply will be disconnected tonight at 9:30 PM due to unpaid bill of Rs 1,420. Pay immediately via UPI to avoid disconnection.',
    qrPayload: 'upi://pay?pa=powerdiscom0@okaxis&pn=Electricity%20Support&am=1420&cu=INR',
    parsedQr: {
      raw: 'upi://pay?pa=powerdiscom0@okaxis&pn=Electricity%20Support&am=1420&cu=INR',
      kind: 'upi',
      vpa: 'powerdiscom0@okaxis',
      name: 'Electricity Support',
      amount: 1420,
      isCollectRequest: false,
      isUpiUrl: true,
      params: { pa: 'powerdiscom0@okaxis', pn: 'Electricity Support', am: '1420', cu: 'INR' },
      warnings: [],
    },
    userIntent: {
      expectedDirection: 'outgoing',
      expectedAction: 'bill',
      expectedAmount: 1420,
      expectedPayeeVpa: 'powerdiscom@okhdfcbank',
    },
  },
  {
    id: 'anydesk-support-scam',
    title: 'AnyDesk Support Scam',
    category: 'Remote Access Tool',
    description: 'Fake customer executive directing victim to install screen-sharing software.',
    rawText: 'SBI Customer Support: Your KYC is suspended. Download AnyDesk or TeamViewer QuickSupport app immediately and share the 9-digit code with our verification officer to avoid account block.',
    userIntent: {
      expectedDirection: 'unknown',
      expectedAction: 'kyc',
    },
  },
  {
    id: 'matching-merchant-payment',
    title: 'Matching Merchant Payment',
    category: 'Legitimate Payment',
    description: 'Normal merchant checkout where user intent, QR, and amount are in full alignment.',
    rawText: 'Swiggy Food Order #89218 total amount payable Rs 450.00. Scan QR code to complete payment.',
    qrPayload: 'upi://pay?pa=swiggy@hdfcbank&pn=Swiggy%20India&am=450&cu=INR&tn=Order%2089218',
    parsedQr: {
      raw: 'upi://pay?pa=swiggy@hdfcbank&pn=Swiggy%20India&am=450&cu=INR&tn=Order%2089218',
      kind: 'upi',
      vpa: 'swiggy@hdfcbank',
      name: 'Swiggy India',
      amount: 450,
      isCollectRequest: false,
      isUpiUrl: true,
      params: { pa: 'swiggy@hdfcbank', pn: 'Swiggy India', am: '450', cu: 'INR', tn: 'Order 89218' },
      warnings: [],
    },
    userIntent: {
      expectedDirection: 'outgoing',
      expectedAction: 'pay',
      expectedAmount: 450,
      expectedPayeeVpa: 'swiggy@hdfcbank',
    },
  },
];
