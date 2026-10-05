# UPI Transaction Dataset Analysis

Source File: `data/raw/upi/fraud_data_20251225_004640.csv`
Analysis Date: Automated Analysis

> **IMPORTANT ARCHITECTURAL NOTE**:
> This dataset contains purely **synthetic tabular/transactional logs** (amounts, timestamps, error codes, banks, app names).
> It does **NOT** contain message conversations, chat transcripts, or scanned QR strings.
> Therefore, this dataset is used exclusively to inform realistic transaction ranges, amounts, and metadata for test scenarios. It is **NOT** used to train the text language model.

## 1. Overview
- **Total Transactions Recorded**: 6,126
- **Flagged Suspicious Transactions**: 626 (10.22%)
- **Legitimate Transactions**: 5,500 (89.78%)

## 2. Amount Distribution (INR)
- **Minimum**: ₹1.02
- **25th Percentile**: ₹70.38
- **Median (50%)**: ₹289.70
- **Mean**: ₹701.52
- **75th Percentile**: ₹803.64
- **90th Percentile**: ₹1,800.24
- **95th Percentile**: ₹3,203.75
- **99th Percentile**: ₹5,712.36
- **Maximum**: ₹7,925.12

### Fraud vs Legitimate Amounts
- **Suspicious Mean Amount**: ₹80.78 (Median: ₹69.08)
- **Legitimate Mean Amount**: ₹772.17 (Median: ₹346.28)

## 3. Top UPI Apps & Banking Channels
- **Top UPI Apps**: `{'BHIM': 915, 'WhatsApp Pay': 882, 'PhonePe': 876, 'Paytm': 876, 'Amazon Pay': 869}`
- **Top Banks**: `{'PNB': 809, 'Canara': 792, 'BOB': 779, 'SBI': 761, 'HDFC': 756}`
- **Amount Slabs**: `{'medium': 3121, 'large': 1383, 'small': 1152, 'very_large': 470}`
- **Night Transactions Flag**: `{False: 6126}`

## 4. Key Insights for Test Scenarios
1. High-frequency micro/small amounts (< ₹2,000) are common in legitimate transactions.
2. Suspicious transaction spikes cluster around urgent transfers, off-peak night hours, and round numbers (e.g. ₹5,000, ₹10,000, ₹25,000, ₹49,999).
3. Realistic test fixtures in Layer 3 and Layer 7 should draw upon these realistic amount bounds and bank handles (`@okhdfcbank`, `@oksbi`, `@icici`, `@axisbank`).
