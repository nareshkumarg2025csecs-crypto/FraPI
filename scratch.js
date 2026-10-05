const text = `CONGRATULATIONS! 🎉 You have been direct-selected for the Wyntrix Premium Work-From-Home Internship (Stipend: ₹35,000/month). No interview required! To secure your slot and receive your company laptop, you must pay a refundable onboarding and ID card generation fee of ₹1,499. Pay immediately via UPI to wyntrix-hr-desk@ybl or your offer will be given to the next candidate. Click here to complete payment: [http://wyntrix-careers-portal-vip.com/pay](http://wyntrix-careers-portal-vip.com/pay)`;

const PAYMENT_VERB_RE = /\b(pay|send|transfer|deposit|remit)\b/i;
const FEE_NOUN_RE = /\b(fee|charge|deposit|amount|payment|charges)\b/i;
const UPI_PLATFORM_RE = /\b(upi|gpay|google\s*pay|phonepe|paytm|bhim|neft|rtgs|imps)\b/i;
const PAY_AMOUNT_TO_RE = /\b(pay|send|transfer|deposit)\b[^.!?]*?(?:[₹%¥Z2=?]|rs\.?\s*)\s*[0-9]/i;
const PAY_VIA_RE = /\b(pay|send|transfer)\b[^.!?]*?\b(immediately|via|to)\b/i;

function hasPaymentDemand(text) {
  if (PAY_AMOUNT_TO_RE.test(text)) return { found: true, matchedPhrase: text.match(PAY_AMOUNT_TO_RE)[0] };
  if (PAY_VIA_RE.test(text)) return { found: true, matchedPhrase: text.match(PAY_VIA_RE)[0] };
  const sentences = text.split(/[.!?\n]/);
  for (const s of sentences) {
    if (PAYMENT_VERB_RE.test(s) && (FEE_NOUN_RE.test(s) || UPI_PLATFORM_RE.test(s))) {
      return { found: true, matchedPhrase: s.trim().slice(0, 80) };
    }
  }
  return { found: false };
}

const demand = hasPaymentDemand(text);
console.log('demand:', demand);

const demandIdx = text.toLowerCase().indexOf(demand.matchedPhrase.toLowerCase());
console.log('demandIdx:', demandIdx);

for (const amt of [35000, 1499]) {
  const p = new RegExp(String(amt).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(',', ',?'), 'gi');
  let match;
  while ((match = p.exec(text)) !== null) {
    console.log('amt:', amt, 'idx:', match.index, 'dist:', Math.abs(match.index - demandIdx));
  }
}
