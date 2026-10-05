import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Scenario {
  id: string;
  category: string;
  message: string;
  qrPayload?: string;
  userIntent?: {
    expectedDirection?: 'incoming' | 'outgoing' | 'unknown';
    expectedAction?: 'refund' | 'cashback' | 'prize' | 'collect' | 'pay' | 'kyc' | 'bill' | 'support' | 'unknown';
    expectedAmount?: number;
    expectedPayeeVpa?: string;
  };
  trustedRefs?: any[];
  expectedLevel: 'LOW_RISK' | 'REVIEW' | 'HIGH_RISK';
  tags: string[];
}

function generateScenarios(): Scenario[] {
  const scenarios: Scenario[] = [];
  let idCounter = 1;
  const getId = () => `SCN-${String(idCounter++).padStart(3, '0')}`;

  // =========================================================================
  // 1. HARD LEGITIMATE CASES (100 Scenarios)
  // =========================================================================

  // Genuine bank alerts with links (20)
  for (let i = 0; i < 20; i++) {
    scenarios.push({
      id: getId(),
      category: 'legit_bank_alert_link',
      message: `Dear SBI Customer, Rs.${(Math.random() * 4000 + 500).toFixed(2)} debited from A/c ending in ${1000 + i} at Retail Store. If not done by you, visit https://www.onlinesbi.sbi or call 1800112211.`,
      expectedLevel: 'LOW_RISK',
      tags: ['legitimate', 'bank_alert', 'official_link'],
    });
  }

  // Real OTP messages with warnings (20)
  for (let i = 0; i < 20; i++) {
    scenarios.push({
      id: getId(),
      category: 'legit_otp_warning',
      message: `${Math.floor(100000 + Math.random() * 900000)} is your secret OTP for transaction of Rs ${Math.floor(100 + Math.random() * 2500)} at Flipkart. Bank never asks for OTP or PIN. Do NOT share with anyone.`,
      expectedLevel: 'LOW_RISK',
      tags: ['legitimate', 'otp', 'security_warning'],
    });
  }

  // Real merchant receipts and scan-to-pay QR (20)
  for (let i = 0; i < 20; i++) {
    const amt = Math.floor(50 + Math.random() * 800);
    scenarios.push({
      id: getId(),
      category: 'legit_merchant_qr',
      message: `Payment of Rs ${amt} to Cafe Coffee Day counter ${i + 1}.`,
      qrPayload: `upi://pay?pa=ccd.store${i}@okhdfcbank&pn=Cafe%20Coffee%20Day&am=${amt}&cu=INR`,
      userIntent: { expectedDirection: 'outgoing', expectedAction: 'pay', expectedAmount: amt },
      expectedLevel: 'LOW_RISK',
      tags: ['legitimate', 'merchant', 'qr_pay'],
    });
  }

  // Real refunds with NO QR code (20)
  for (let i = 0; i < 20; i++) {
    const amt = (Math.random() * 1500 + 100).toFixed(2);
    scenarios.push({
      id: getId(),
      category: 'legit_refund_no_qr',
      message: `Dear Amazon Customer, your refund of Rs ${amt} for order #${8000 + i} has been successfully credited directly to your bank account. No action is required.`,
      userIntent: { expectedDirection: 'incoming', expectedAction: 'refund' },
      expectedLevel: 'LOW_RISK',
      tags: ['legitimate', 'refund', 'no_qr'],
    });
  }

  // Friends asking for money / splitting dinner bills (20)
  for (let i = 0; i < 20; i++) {
    const amt = Math.floor(100 + Math.random() * 600);
    scenarios.push({
      id: getId(),
      category: 'legit_friend_split',
      message: `Hey bro, here is my share of yesterday's dinner bill Rs ${amt}. See you in college!`,
      expectedLevel: 'LOW_RISK',
      tags: ['legitimate', 'p2p', 'split_bill'],
    });
  }

  // =========================================================================
  // 2. SCAM SCENARIOS (100 Scenarios)
  // =========================================================================

  // A. Job / Internship Fee Scams (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_job_internship',
      message: `Congratulations! You are selected for Remote Data Entry Internship with stipend ₹25,000/month. Pay refundable registration fee ₹${999 + i * 50} to book your onboarding slot immediately.`,
      qrPayload: `upi://pay?pa=hr.onboarding${i}@ybl&pn=HR%20Desk&am=${999 + i * 50}&cu=INR`,
      userIntent: { expectedDirection: 'outgoing', expectedAction: 'pay' },
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'job_scam', 'advance_fee'],
    });
  }

  // B. Lottery / Prize Scams (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_lottery_prize',
      message: `KBC Lucky Draw Winner! You have won cash prize of Rs 25,00,000. Deposit processing fee Rs ${2500 + i * 100} to release your prize money.`,
      qrPayload: `upi://pay?pa=kbc.lottery${i}@oksbi&pn=KBC%20Rewards&am=${2500 + i * 100}&cu=INR`,
      userIntent: { expectedDirection: 'incoming', expectedAction: 'prize' },
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'lottery', 'pay_to_claim'],
    });
  }

  // C. KYC / Electricity / SIM Threats (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_kyc_electricity_threat',
      message: `Dear user, your electricity power connection will be disconnect tonight at 9:30 PM due to unpaid bill. Pay immediately to avoid disconnection: http://bit.ly/power-bill-pay`,
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'electricity_threat', 'service_threat'],
    });
  }

  // D. Parcel / Customs Fees (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_parcel_customs',
      message: `IndiaPost Notice: Your international parcel package #IN${90000 + i} is detained at customs. Pay clearance fee Rs ${450 + i * 20} immediately to release shipment.`,
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'parcel_customs', 'advance_fee'],
    });
  }

  // E. Fake Customer Care Numbers / Remote Access Tools (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_remote_support',
      message: `GooglePay Customer Support: To resolve your pending refund of Rs 4,000, please download AnyDesk app and share the 9-digit code with our technician.`,
      userIntent: { expectedDirection: 'incoming', expectedAction: 'support' },
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'remote_access', 'support_impersonation'],
    });
  }

  // F. Collect-Request Traps (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_collect_trap',
      message: `OLX Buyer: I have sent a payment request on PhonePe. Please accept the collect request and enter your UPI PIN to receive Rs ${3000 + i * 500}.`,
      userIntent: { expectedDirection: 'incoming', expectedAction: 'refund' },
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'collect_trap', 'pin_fraud'],
    });
  }

  // G. Look-Alike VPAs & Homoglyphs (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_lookalike_vpa',
      message: `Pay your monthly electricity bill to official DISCOM account.`,
      qrPayload: `upi://pay?pa=powerdiscom0@okaxis&pn=Electricity%20Board&am=1420&cu=INR`,
      userIntent: { expectedDirection: 'outgoing', expectedAction: 'bill', expectedPayeeVpa: 'powerdiscom@okhdfcbank' },
      trustedRefs: [{
        id: 'ref-discom',
        label: 'Electricity Board',
        vpa: 'powerdiscom@okhdfcbank',
        normalizedVpa: 'powerdiscom@okhdfcbank',
        payeeName: 'State Electricity Board',
        hash: 'hash-discom',
        createdAt: 1000,
        isTampered: false
      }],
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'lookalike_vpa', 'homoglyph'],
    });
  }

  // H. Refund-QR Scams & QR Swaps (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_refund_qr_swap',
      message: `Special Cashback of Rs 2,500! Scan this QR code in GPay or Paytm to receive the cashback amount straight into your account.`,
      qrPayload: `upi://pay?pa=reward.cashback${i}@icici&pn=Cashback%20Reward&am=2500&cu=INR`,
      userIntent: { expectedDirection: 'incoming', expectedAction: 'cashback', expectedAmount: 2500 },
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'direction_mismatch', 'qr_swap'],
    });
  }

  // I. Hinglish Scam Variants (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_hinglish',
      message: `Aapka internship selection ho gaya hai. Registration fee Rs ${999 + i * 50} turant pay karein aur apna offer letter unlock karein.`,
      qrPayload: `upi://pay?pa=internship.reg${i}@oksbi&pn=Intern%20Desk&am=${999 + i * 50}&cu=INR`,
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'hinglish', 'job_scam'],
    });
  }

  // J. OCR-Garbled Scam Variants (10)
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      id: getId(),
      category: 'scam_ocr_garbled',
      message: `C0ngratu1ati0ns! Y0u are se1ected f0r internsh1p st1pend Rs 2500O. P@y reg1strat10n fee Rs 999 1mmed1ate1y.`,
      qrPayload: `upi://pay?pa=garbled.desk${i}@ybl&pn=Desk&am=999&cu=INR`,
      expectedLevel: 'HIGH_RISK',
      tags: ['scam', 'ocr_garbled', 'advance_fee'],
    });
  }

  return scenarios;
}

const scenarios = generateScenarios();
const outputPath = path.join(__dirname, 'scenarios.json');
fs.writeFileSync(outputPath, JSON.stringify(scenarios, null, 2));
console.log(`Generated ${scenarios.length} evaluation scenarios at ${outputPath}`);
