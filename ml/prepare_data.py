import os
import re
import json
import html
import glob
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
LEXICON_DIR = os.path.join(BASE_DIR, "data", "lexicon")
OUTPUT_PATH = os.path.join(BASE_DIR, "ml", "artifacts", "prepared_dataset.csv")

URL_REGEX = re.compile(r"https?://\S+|www\.\S+|bit\.ly/\S+|tinyurl\.com/\S+", re.IGNORECASE)
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
NUM_REGEX = re.compile(r"\b\d{4,}\b")
HTML_REGEX = re.compile(r"<[^>]+>")
WHITESPACE_REGEX = re.compile(r"\s+")

def clean_text(text: str, is_email: bool = False) -> str:
    if not isinstance(text, str) or not text.strip():
        return ""
    # 1. Unescape & strip HTML
    t = html.unescape(text)
    t = HTML_REGEX.sub(" ", t)
    # 2. Lowercase
    t = t.lower()
    # 3. Replace URLs
    t = URL_REGEX.sub("URLTOKEN", t)
    # 4. Replace emails
    t = EMAIL_REGEX.sub("EMAILTOKEN", t)
    # 5. Replace long numbers (>=4 digits)
    t = NUM_REGEX.sub("NUMTOKEN", t)
    # 6. Collapse whitespace
    t = WHITESPACE_REGEX.sub(" ", t).strip()
    # 7. Truncate if email
    if is_email and len(t) > 1000:
        t = t[:1000].rsplit(" ", 1)[0]
    return t

def load_sms():
    sms_path = os.path.join(RAW_DIR, "sms", "SMSSpamCollection")
    if not os.path.exists(sms_path):
        print(f"Warning: SMS path {sms_path} not found.")
        return []
    
    records = []
    with open(sms_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            parts = line.strip().split("\t", 1)
            if len(parts) == 2:
                label_str, raw_text = parts
                label = 1 if label_str.strip().lower() == "spam" else 0
                cleaned = clean_text(raw_text, is_email=False)
                if cleaned:
                    records.append({"text": cleaned, "label": label, "source": "sms"})
    print(f"Loaded {len(records)} cleaned SMS messages.")
    return records

def load_synthetic_in():
    synth_path = os.path.join(LEXICON_DIR, "upi_scam_templates.json")
    if not os.path.exists(synth_path):
        print(f"Generating synthetic templates first...")
        from generate_upi_templates import generate_templates
        generate_templates()
    
    with open(synth_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    records = []
    for item in data:
        cleaned = clean_text(item["text"], is_email=False)
        if cleaned:
            records.append({
                "text": cleaned,
                "label": int(item["label"]),
                "source": "synthetic_in"
            })
    print(f"Loaded {len(records)} cleaned synthetic Indian/UPI messages.")
    return records

def load_email_files():
    email_records = []
    email_files = glob.glob(os.path.join(RAW_DIR, "emails", "*.csv"))
    
    for f in email_files:
        fname = os.path.basename(f).replace(".csv", "").lower()
        source_name = f"email_{fname}"
        try:
            try:
                df = pd.read_csv(f, encoding="utf-8", low_memory=False)
            except UnicodeDecodeError:
                df = pd.read_csv(f, encoding="latin-1", low_memory=False)
            
            # Detect text column
            if "text_combined" in df.columns:
                text_series = df["text_combined"].fillna("")
            elif "subject" in df.columns and "body" in df.columns:
                text_series = df["subject"].fillna("") + " " + df["body"].fillna("")
            elif "body" in df.columns:
                text_series = df["body"].fillna("")
            else:
                continue

            if "label" not in df.columns:
                continue

            # To keep training balanced and fast, sample up to 3000 per email file (stratified by label)
            sub_df = df.copy()
            sub_df["raw_text"] = text_series
            sub_df = sub_df[sub_df["raw_text"].str.strip().str.len() > 10]
            
            # Sample up to 1500 per class per file to ensure balanced representation
            sampled_dfs = []
            for lbl, grp in sub_df.groupby("label"):
                n = min(len(grp), 1500)
                sampled_dfs.append(grp.sample(n=n, random_state=42))
            
            if sampled_dfs:
                combined_sample = pd.concat(sampled_dfs)
                for _, row in combined_sample.iterrows():
                    cleaned = clean_text(row["raw_text"], is_email=True)
                    if len(cleaned) > 15:
                        email_records.append({
                            "text": cleaned,
                            "label": int(row["label"]),
                            "source": source_name
                        })
                print(f"Loaded {len(combined_sample)} samples from {fname}")
        except Exception as e:
            print(f"Error reading {f}: {e}")
            
    print(f"Total cleaned email samples loaded: {len(email_records)}")
    return email_records

def prepare_data():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    sms_data = load_sms()
    synth_data = load_synthetic_in()
    email_data = load_email_files()
    
    all_data = sms_data + synth_data + email_data
    df = pd.DataFrame(all_data)
    
    # De-duplicate on text
    initial_len = len(df)
    df = df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    dedup_len = len(df)
    
    # Save to artifacts
    df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")
    
    print("\n--- Data Preparation Summary ---")
    print(f"Total Rows before deduplication: {initial_len}")
    print(f"Total Rows after deduplication: {dedup_len}")
    print(f"Distribution by label:\n{df['label'].value_counts()}")
    print(f"Distribution by source:\n{df['source'].value_counts()}")
    print(f"Saved prepared dataset to: {OUTPUT_PATH}")
    return df

if __name__ == "__main__":
    prepare_data()
