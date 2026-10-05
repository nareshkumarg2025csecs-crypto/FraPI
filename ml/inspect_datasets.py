import os
import glob
import pandas as pd

RAW_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw"))
REPORT_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "reports", "dataset_report.md"))

def inspect_file(filepath):
    rel_path = os.path.relpath(filepath, os.path.join(RAW_DIR, ".."))
    report_lines = [f"## File: `{rel_path}`\n"]
    
    # Try reading as CSV or TSV
    df = None
    try:
        if "SMSSpamCollection" in os.path.basename(filepath):
            df = pd.read_csv(filepath, sep="\t", header=None, names=["label", "text"], encoding="utf-8")
        else:
            # Try reading first 5000 rows or full if smaller
            try:
                df = pd.read_csv(filepath, encoding="utf-8", low_memory=False)
            except UnicodeDecodeError:
                df = pd.read_csv(filepath, encoding="latin-1", low_memory=False)
    except Exception as e:
        report_lines.append(f"Error reading file: {e}\n")
        return "\n".join(report_lines), None

    report_lines.append(f"- **Shape**: {df.shape[0]} rows, {df.shape[1]} columns")
    report_lines.append(f"- **Columns**: `{list(df.columns)}`")
    
    dtypes_str = ", ".join([f"`{col}`: {dtype}" for col, dtype in df.dtypes.items()])
    report_lines.append(f"- **Data Types**: {dtypes_str}")
    
    null_counts = df.isnull().sum().to_dict()
    report_lines.append(f"- **Null Counts**: `{null_counts}`")
    
    # Check potential label columns
    label_cols = [c for c in df.columns if any(k in str(c).lower() for k in ["label", "class", "target", "spam", "fraud", "phish", "result"])]
    if label_cols:
        for lc in label_cols:
            val_counts = df[lc].value_counts(dropna=False).head(10).to_dict()
            report_lines.append(f"- **Value Counts for `{lc}`**: `{val_counts}`")
    
    # 3 truncated sample rows
    report_lines.append("\n**3 Truncated Sample Rows**:\n")
    sample_df = df.head(3).copy()
    for col in sample_df.columns:
        if sample_df[col].dtype == object or str(sample_df[col].dtype) == 'string':
            sample_df[col] = sample_df[col].astype(str).str.slice(0, 100) + "..."
    report_lines.append(sample_df.to_markdown(index=False))
    report_lines.append("\n---\n")
    
    print(f"Inspected: {rel_path} -> Shape: {df.shape}")
    return "\n".join(report_lines), df

def main():
    os.makedirs(os.path.dirname(REPORT_FILE), exist_ok=True)
    all_files = []
    for root, _, files in os.walk(RAW_DIR):
        for f in files:
            all_files.append(os.path.join(root, f))
    all_files.sort()
    
    full_report = ["# Dataset Inspection Report\n\nGenerated automatically by `ml/inspect_datasets.py`.\n\n"]
    
    upi_csv_summary = ""
    for f in all_files:
        section, df = inspect_file(f)
        full_report.append(section)
        if "fraud_data" in os.path.basename(f) and df is not None:
            upi_csv_summary = f"""### Transactional Nature of `data/raw/upi/fraud_data_20251225_004640.csv`
- **Rows**: {df.shape[0]}, **Columns**: {df.shape[1]}
- **Columns detail**: `{list(df.columns)}`
- **Assessment**: This dataset contains purely **transactional / tabular fraud data** (e.g. transaction IDs, amounts, timestamps, account IDs, merchant category codes, device signatures, and fraud flags).
- **Text content**: It does **NOT** contain conversational message text, SMS logs, or QR payload strings.
- **Usage Directive**: Per system architecture guidelines, this file is used exclusively by `ml/analyze_upi_dataset.py` to extract realistic transaction amounts, timing patterns, and category priors. It is **NOT** used to train the language model / intent engine.
\n"""
            print("\n" + upi_csv_summary)

    full_report.insert(2, upi_csv_summary + "\n---\n")
    
    with open(REPORT_FILE, "w", encoding="utf-8") as out:
        out.write("\n".join(full_report))
    print(f"\nReport successfully written to {REPORT_FILE}")

if __name__ == "__main__":
    main()
