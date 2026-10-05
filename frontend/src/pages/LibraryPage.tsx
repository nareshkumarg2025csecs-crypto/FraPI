import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Smartphone,
  ScanLine,
  Send,
  UserCheck,
  Percent,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PillButton } from '../components/PillButton';

interface ScamCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  explanation: string;
  redFlags: string[];
  whatUpiNeverDoes: string;
  exampleStory: string;
}

const SCAM_CATEGORIES: ScamCategory[] = [
  {
    id: 'collect-request-trap',
    title: '1. Collect-Request Trap',
    icon: <Send className="w-5 h-5 text-amber-400" />,
    subtitle: 'Buyer sends collect request claiming it will transfer money to you.',
    explanation: 'Scammers on OLX, Quikr, or Facebook Marketplace pretend to purchase an item from you and send a UPI Collect Request via PhonePe/GooglePay, telling you to "Approve and enter your PIN to claim payment".',
    redFlags: [
      'Buyer claims: "I sent the advance via collect request, please approve it".',
      'The banking notification says "PAY / APPROVE" instead of credit alert.',
      'You are asked to enter your 4-6 digit UPI PIN to receive funds.',
    ],
    whatUpiNeverDoes: 'Approving a collect request ALWAYS deducts money from your bank account. You NEVER approve a request to receive funds.',
    exampleStory: '“I am an army officer transferred to your city. I paid ₹15,000 for your sofa. Check PhonePe, click Approve and enter PIN to accept money into your account.”',
  },
  {
    id: 'fake-swapped-qr',
    title: '2. Fake / Swapped QR',
    icon: <ScanLine className="w-5 h-5 text-red-400" />,
    subtitle: 'Physical or digital QR codes swapped to redirect payments or claim rewards.',
    explanation: 'Scammers paste fraudulent printed QR stickers over legitimate merchant standees, or send a QR image over WhatsApp claiming it is a refund/reward ticket.',
    redFlags: [
      'A QR image sent on WhatsApp claiming "Scan this QR to receive ₹3,000 cashback".',
      'The QR payee name does not match the store or merchant you are visiting.',
      'Paper QR sticker placed over an existing shop standee without verified branding.',
    ],
    whatUpiNeverDoes: 'A QR code scan ALWAYS initiates an OUTWARD payment from the scanner’s bank account. Scanning a QR code can NEVER credit money to you.',
    exampleStory: '“Flipkart Support: Your ₹2,499 refund is processed. Scan the barcode image attached below using GPay to receive credit.”',
  },
  {
    id: 'remote-access',
    title: '3. Remote Access Software',
    icon: <Smartphone className="w-5 h-5 text-purple-400" />,
    subtitle: 'Coercing victims to install AnyDesk, TeamViewer, or QuickSupport.',
    explanation: 'Scammers posing as electricity board officers, courier customer care, or KYC executives ask you to install a remote desktop tool to "fix a technical glitch". Once installed, they capture your screen and UPI PIN.',
    redFlags: [
      'Caller demands you download AnyDesk, RustDesk, TeamViewer QuickSupport, or AnyConnect.',
      'Caller asks you to read a 9-digit session code.',
      'Caller instructs you to open your UPI banking app and enter your PIN while screen sharing.',
    ],
    whatUpiNeverDoes: 'Legitimate customer support from banks, NPCI, or utilities will NEVER request screen sharing or remote device access.',
    exampleStory: '“Electricity Board: Your power supply will be cut tonight at 9:30 PM due to pending KYC. Download QuickSupport app now to verify meter.”',
  },
  {
    id: 'bank-support-impersonation',
    title: '4. Bank / Support Impersonation (OTP / PIN)',
    icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
    subtitle: 'Urgent calls claiming your bank account, card, or SIM is suspended.',
    explanation: 'Social engineering attack where fraudster calls posing as a bank manager, TRAI officer, or police officer creating artificial panic and asking you to share an OTP or PIN to prevent account freezing.',
    redFlags: [
      'Extreme urgency: "Your SIM / PAN will be blocked within 30 minutes".',
      'Caller asks for the OTP or SMS verification code sent to your mobile.',
      'Caller asks you to verify your identity by sharing debit card details or UPI PIN.',
    ],
    whatUpiNeverDoes: 'Banks and NPCI systems NEVER need you to state your OTP or UPI PIN to verify account status.',
    exampleStory: '“Dear Customer, your SBI YONO account will be deactivated today. Call our branch officer at 9876543210 immediately with OTP to update PAN.”',
  },
  {
    id: 'lookalike-vpa',
    title: '5. Look-alike VPA (Handle / Homoglyph Swaps)',
    icon: <UserCheck className="w-5 h-5 text-cyan-400" />,
    subtitle: 'Deceptive handles mimicking trusted brands (zomat0@upi, swiggy-support@okaxis).',
    explanation: 'Fraudsters register UPI handles with subtle letter replacements (number 0 instead of O, rn instead of m, or unofficial bank suffixes) to mimic authentic brands or utility billing departments.',
    redFlags: [
      'Handle uses number substitutions (e.g. `bescom0@okaxis` instead of official `bescom@hdfcbank`).',
      'Merchant name says "Customer Support" or "Refund Desk" instead of registered corporate legal entity.',
      'VPA handle differs from the brand’s verified public domain.',
    ],
    whatUpiNeverDoes: 'Official merchant VPAs do not use unofficial suffixes or arbitrary personal banking handles.',
    exampleStory: '“Paytm Customer Care: Please transfer ₹10 to `paytm.support01@paytm` to initiate wallet verification.”',
  },
  {
    id: 'small-test-payment',
    title: '6. Small "Test" Payment Followed by Bigger Request',
    icon: <Percent className="w-5 h-5 text-emerald-400" />,
    subtitle: 'Building false trust with a tiny payment before requesting a larger sum.',
    explanation: 'Scammer sends ₹1 or ₹5 to your account first to demonstrate "the connection works", then immediately asks you to scan a QR code or send ₹15,000 for "processing charges / tax clearance".',
    redFlags: [
      'Scammer sends ₹5 first and says: "See, the transfer works, now send the remaining balance".',
      'Part-time job / Telegram task scams requiring you to send increasing deposits to unlock earnings.',
      'Fake lottery or customs gift fee requests.',
    ],
    whatUpiNeverDoes: 'Legitimate financial settlements or earnings never require advance "security deposits" or release payments.',
    exampleStory: '“Like 3 YouTube videos to earn ₹150. Now transfer ₹2,000 to VIP merchant account to unlock ₹10,000 earnings package.”',
  },
  {
    id: 'refund-cashback-pin',
    title: '7. Refund / Cashback PIN Scams',
    icon: <Lock className="w-5 h-5 text-amber-300" />,
    subtitle: 'Falsely claiming that entering your UPI PIN is needed to "receive" cashback.',
    explanation: 'Fake Google Pay or PhonePe scratch card links that redirect to a UPI payment page with the text "Enter PIN to credit ₹1,999 cashback reward".',
    redFlags: [
      'Links claiming "You won a ₹2,500 Diwali Scratch Card! Tap to claim in Google Pay".',
      'Payment page shows "Paying ₹2,500" with a prompt to enter PIN.',
      'Scammer claims: "UPI PIN is required for bank server authorization of incoming transfer".',
    ],
    whatUpiNeverDoes: 'Entering your UPI PIN NEVER credits money to your bank. Entering your PIN ONLY authorizes debiting money out of your account.',
    exampleStory: '“Congratulations! You won ₹1,800 cashback on your last PhonePe transaction. Click here and enter your UPI PIN to claim reward directly into bank.”',
  },
];

export const LibraryPage: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('collect-request-trap');

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
          Knowledge Base
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] mt-3">
          UPI Scam Pattern Library
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-2">
          The 7 most prevalent UPI social engineering patterns in India, analyzed with red flags and protocol safety axioms.
        </p>
      </div>

      {/* Accordion Categories */}
      <div className="space-y-4">
        {SCAM_CATEGORIES.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-3xl border transition-all overflow-hidden ${
                isOpen
                  ? 'border-[var(--color-accent)]/50 bg-[var(--color-surface)] shadow-xl'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-subtle)]'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleAccordion(item.id)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 select-none min-h-[56px]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-[var(--color-border-subtle)] space-y-5">
                  {/* Detailed explanation */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1">
                      How The Scam Works
                    </h4>
                    <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>

                  {/* Real Example Claim */}
                  <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] mb-1">
                      Typical Fraudulent Message / Claim:
                    </h4>
                    <p className="text-xs sm:text-sm font-mono text-[var(--color-text-primary)] italic">
                      {item.exampleStory}
                    </p>
                  </div>

                  {/* Red Flags List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-danger)] mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Key Red Flags:</span>
                    </h4>
                    <ul className="space-y-1.5 pl-2">
                      {item.redFlags.map((flag, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
                          <XCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What UPI Never Does Rule */}
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-[var(--color-text-primary)]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>What UPI Never Does</span>
                    </h4>
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                      {item.whatUpiNeverDoes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Encountered a suspicious message matching these patterns?
        </h3>
        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 mb-4">
          Test it with our intent-aware engine in 100% private offline mode.
        </p>
        <Link to="/check">
          <PillButton variant="primary" size="md">
            Analyze Suspicious Payment
          </PillButton>
        </Link>
      </div>
    </div>
  );
};
