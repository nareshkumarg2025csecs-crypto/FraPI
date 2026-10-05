# FraPI Sentinel 2.0 Evaluation Report

> Automatically generated via `npm run eval` across 200 realistic UPI scenarios.

## 1. Held-Out Evaluation (Generalization Benchmark, N = 100)
| Model / Pipeline | Precision | Recall | F1 Score | Accuracy |
|---|---|---|---|---|
| **FraPI Full Pipeline** | **71.4%** | **100.0%** | **83.3%** | **80.0%** |
| Keyword-Only Baseline | 66.7% | 80.0% | 72.7% | 70.0% |

## 2. Tuning Set Benchmark (N = 100)
| Model / Pipeline | Precision | Recall | F1 Score | Accuracy |
|---|---|---|---|---|
| **FraPI Full Pipeline** | **71.4%** | **100.0%** | **83.3%** | **80.0%** |
| Keyword-Only Baseline | 66.7% | 80.0% | 72.7% | 70.0% |

## 3. False Positive & False Negative Analysis (Section 32)
- **Held-Out False Positives:** 20
- **Held-Out False Negatives:** 0

- [FP] Scenario SCN-002 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-004 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-006 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-008 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-010 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-012 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-014 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-016 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-018 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-020 (legit_bank_alert_link): Caused by layer 'language'
- [FP] Scenario SCN-062 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-064 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-066 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-068 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-070 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-072 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-074 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-076 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-078 (legit_refund_no_qr): Caused by layer 'language'
- [FP] Scenario SCN-080 (legit_refund_no_qr): Caused by layer 'language'

## 4. Latency
- Average pipeline processing time: **89.58 ms / scenario**
