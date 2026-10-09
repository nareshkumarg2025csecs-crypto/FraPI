import os
import json
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, GridSearchCV, train_test_split
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, brier_score_loss
)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PREPARED_DATA_PATH = os.path.join(BASE_DIR, "ml", "artifacts", "prepared_dataset.csv")
METRICS_JSON_PATH = os.path.join(BASE_DIR, "ml", "reports", "metrics.json")
METRICS_MD_PATH = os.path.join(BASE_DIR, "ml", "reports", "metrics.md")
MODEL_JSON_PATH = os.path.join(BASE_DIR, "frontend", "public", "model", "lang-model.json")
PARITY_FIXTURES_PATH = os.path.join(BASE_DIR, "ml", "artifacts", "parity_fixtures.json")

def ece_score(y_true, y_prob, n_bins=10):
    bins = np.linspace(0., 1., n_bins + 1)
    bin_indices = np.digitize(y_prob, bins) - 1
    ece = 0.0
    for i in range(n_bins):
        mask = bin_indices == i
        if np.any(mask):
            acc = np.mean(y_true[mask])
            conf = np.mean(y_prob[mask])
            prob = np.sum(mask) / len(y_true)
            ece += prob * np.abs(acc - conf)
    return ece

def train_and_eval():
    df = pd.read_csv(PREPARED_DATA_PATH)
    df["text"] = df["text"].fillna("")
    
    train_df, test_df = train_test_split(df, test_size=0.20, random_state=42, stratify=df["label"])
    train_df, calib_df = train_test_split(train_df, test_size=0.15, random_state=42, stratify=train_df["label"])
    
    train_var_b = train_df
    
    vec = TfidfVectorizer(
        lowercase=True, ngram_range=(1, 2), min_df=3, max_df=0.9,
        sublinear_tf=True, max_features=20000, token_pattern=r"(?u)\b\w\w+\b", norm="l2"
    )
    X_tr = vec.fit_transform(train_df["text"])
    y_tr = train_var_b["label"].values
    
    clf = LogisticRegression(class_weight="balanced", solver="liblinear", C=2.0, max_iter=1000, random_state=42)
    clf.fit(X_tr, y_tr)
    best_clf = clf
    best_vec = vec
    
    # Platt scaling
    X_cal = best_vec.transform(calib_df["text"])
    f_cal = best_clf.decision_function(X_cal).reshape(-1, 1)
    lr_calib = LogisticRegression(solver="lbfgs")
    lr_calib.fit(f_cal, calib_df["label"].values)
    
    platt_a = float(lr_calib.coef_[0][0])
    platt_b = float(lr_calib.intercept_[0])
    
    X_test_all = best_vec.transform(test_df["text"])
    y_test_all = test_df["label"].values
    
    f_test = best_clf.decision_function(X_test_all)
    # uncalibrated prob
    y_prob_uncal = 1 / (1 + np.exp(-f_test))
    
    brier_uncal = brier_score_loss(y_test_all, y_prob_uncal)
    ece_uncal = ece_score(y_test_all, y_prob_uncal)
    
    # calibrated prob
    f_test_cal = f_test * platt_a + platt_b
    y_prob_cal = 1 / (1 + np.exp(-f_test_cal))
    
    brier_cal = brier_score_loss(y_test_all, y_prob_cal)
    ece_cal = ece_score(y_test_all, y_prob_cal)
    
    y_pred_all = (y_prob_cal >= 0.5).astype(int)
    
    # ... Exporting ...
    feature_names = best_vec.get_feature_names_out()
    idfs = best_vec.idf_
    
    coefs = best_clf.coef_[0]
    intercept = float(best_clf.intercept_[0])
    
    active_vocab = {}
    active_idf = {}
    active_coef = {}
    
    for term, idx in best_vec.vocabulary_.items():
        c_val = coefs[idx]
        active_vocab[term] = int(idx)
        active_idf[term] = round(float(idfs[idx]), 5)
        active_coef[term] = round(float(c_val), 5) if abs(c_val) >= 1e-3 else 0.0
            
    model_export = {
        "version": "2.0.0",
        "lowercase": True,
        "ngram_range": [1, 2],
        "token_pattern": r"(?u)\b\w\w+\b",
        "sublinear_tf": True,
        "norm": "l2",
        "intercept": round(intercept, 5),
        "platt_a": platt_a,
        "platt_b": platt_b,
        "vocab_size": len(active_vocab),
        "vocab": active_vocab,
        "idf": active_idf,
        "coef": active_coef,
        "preprocess_steps": [
            "html_unescape_and_strip",
            "lowercase",
            "url_to_urltoken",
            "email_to_emailtoken",
            "long_num_to_numtoken",
            "collapse_whitespace"
        ]
    }
    
    os.makedirs(os.path.dirname(MODEL_JSON_PATH), exist_ok=True)
    with open(MODEL_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(model_export, f, separators=(',', ':'))
        
    print(f"Exported model with platt_a={platt_a:.4f}, platt_b={platt_b:.4f}")
    
    # Parity fixtures
    import sys
    sys.path.append(os.path.dirname(__file__))
    from prepare_data import clean_text

    fixtures_samples = df["text"].dropna().sample(60, random_state=42).tolist()
    cleaned_fixtures = [clean_text(t) for t in fixtures_samples]
    X_fix = best_vec.transform(cleaned_fixtures)
    f_fix = best_clf.decision_function(X_fix)
    f_fix_cal = f_fix * platt_a + platt_b
    probs_fix = 1 / (1 + np.exp(-f_fix_cal))
    
    parity_fixtures = []
    for raw_t, prob in zip(fixtures_samples, probs_fix):
        parity_fixtures.append({
            "text": raw_t,
            "sklearn_prob": round(float(prob), 6)
        })
        
    with open(PARITY_FIXTURES_PATH, "w", encoding="utf-8") as f:
        json.dump(parity_fixtures, f, indent=2)

    with open(METRICS_MD_PATH, "w", encoding="utf-8") as f:
        f.write(f"# FraPI Sentinel 2.0 - Language Model Training Report\n")
        f.write(f"\n## Calibration\n")
        f.write(f"- Before: Brier={brier_uncal:.4f}, ECE={ece_uncal:.4f}\n")
        f.write(f"- After: Brier={brier_cal:.4f}, ECE={ece_cal:.4f}\n")

if __name__ == "__main__":
    train_and_eval()
