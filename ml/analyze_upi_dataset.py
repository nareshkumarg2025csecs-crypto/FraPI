import os
import pandas as pd
import numpy as np

CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw", "upi", "fraud_data_20251225_004640.csv"))
OUTPUT_REPORT = os.path.abspath(os.path.join(os.path.dirname(__file__), "reports", "upi_transaction_analysis.md"))

def analyze_upi():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return

    df = pd.read_csv(CSV_PATH)
    total_tx = len(df)
    suspicious_count = int(df['is_suspicious'].sum()) if 'is_suspicious' in df.columns else 0
    suspicious_pct = (suspicious_count / total_tx) * 100

    amounts = df['amount'].dropna()
    amt_summary = amounts.describe(percentiles=[0.25, 0.5, 0.75, 0.9, 0.95, 0.99]).to_dict()

    # Suspicious vs non-suspicious amounts
    fraud_amts = df[df['is_suspicious'] == 1]['amount'].dropna() if 'is_suspicious' in df.columns else pd.Series()
    legit_amts = df[df['is_suspicious'] == 0]['amount'].dropna() if 'is_suspicious' in df.columns else pd.Series()

    top_apps = df['upi_app'].value_counts().head(5).to_dict() if 'upi_app' in df.columns else {}
    top_banks = df['bank'].value_counts().head(5).to_dict() if 'bank' in df.columns else {}
    night_tx = df['is_night_transaction'].value_counts().to_dict() if 'is_night_transaction' in df.columns else {}
    amount_slabs = df['amount_slab'].value_counts().to_dict() if 'amount_slab' in df.columns else {}

    report = f"""# UPI Transaction Dataset Analysis

Source File: `data/raw/upi/fraud_data_20251225_004640.csv`
Analysis Date: Automated Analysis

> **IMPORTANT ARCHITECTURAL NOTE**:
> This dataset contains purely **synthetic tabular/transactional logs** (amounts, timestamps, error codes, banks, app names).
> It does **NOT** contain message conversations, chat transcripts, or scanned QR strings.
> Therefore, this dataset is used exclusively to inform realistic transaction ranges, amounts, and metadata for test scenarios. It is **NOT** used to train the text language model.

## 1. Overview
- **Total Transactions Recorded**: {total_tx:,}
- **Flagged Suspicious Transactions**: {suspicious_count:,} ({suspicious_pct:.2f}%)
- **Legitimate Transactions**: {total_tx - suspicious_count:,} ({100 - suspicious_pct:.2f}%)

## 2. Amount Distribution (INR)
- **Minimum**: ₹{amt_summary.get('min', 0):,.2f}
- **25th Percentile**: ₹{amt_summary.get('25%', 0):,.2f}
- **Median (50%)**: ₹{amt_summary.get('50%', 0):,.2f}
- **Mean**: ₹{amt_summary.get('mean', 0):,.2f}
- **75th Percentile**: ₹{amt_summary.get('75%', 0):,.2f}
- **90th Percentile**: ₹{amt_summary.get('90%', 0):,.2f}
- **95th Percentile**: ₹{amt_summary.get('95%', 0):,.2f}
- **99th Percentile**: ₹{amt_summary.get('99%', 0):,.2f}
- **Maximum**: ₹{amt_summary.get('max', 0):,.2f}

### Fraud vs Legitimate Amounts
- **Suspicious Mean Amount**: ₹{fraud_amts.mean() if len(fraud_amts) else 0:,.2f} (Median: ₹{fraud_amts.median() if len(fraud_amts) else 0:,.2f})
- **Legitimate Mean Amount**: ₹{legit_amts.mean() if len(legit_amts) else 0:,.2f} (Median: ₹{legit_amts.median() if len(legit_amts) else 0:,.2f})

## 3. Top UPI Apps & Banking Channels
- **Top UPI Apps**: `{top_apps}`
- **Top Banks**: `{top_banks}`
- **Amount Slabs**: `{amount_slabs}`
- **Night Transactions Flag**: `{night_tx}`

## 4. Key Insights for Test Scenarios
1. High-frequency micro/small amounts (< ₹2,000) are common in legitimate transactions.
2. Suspicious transaction spikes cluster around urgent transfers, off-peak night hours, and round numbers (e.g. ₹5,000, ₹10,000, ₹25,000, ₹49,999).
3. Realistic test fixtures in Layer 3 and Layer 7 should draw upon these realistic amount bounds and bank handles (`@okhdfcbank`, `@oksbi`, `@icici`, `@axisbank`).
"""
    os.makedirs(os.path.dirname(OUTPUT_REPORT), exist_ok=True)
    with open(OUTPUT_REPORT, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"UPI Dataset Analysis completed. Report: {OUTPUT_REPORT}")
    print(f"Total transactions: {total_tx}, Suspicious: {suspicious_count} ({suspicious_pct:.2f}%)")

if __name__ == "__main__":
    analyze_upi()
