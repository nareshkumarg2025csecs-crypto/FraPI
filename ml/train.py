import os
import sys
import subprocess

def run_step(step_name, script_name):
    print(f"\n=======================================================")
    print(f"  RUNNING STEP: {step_name} ({script_name})")
    print(f"=======================================================")
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    res = subprocess.run([sys.executable, script_path], check=True)
    if res.returncode != 0:
        raise RuntimeError(f"Step {step_name} failed with code {res.returncode}")

def main():
    print("Starting FraPI Sentinel 2.0 ML Training Pipeline...")
    run_step("1. Inspect Datasets & Generate Profile Report", "inspect_datasets.py")
    run_step("2. Analyze Synthetic UPI Dataset (Bounds & Priors)", "analyze_upi_dataset.py")
    run_step("3. Generate India / UPI Scam & Legit Templates", "generate_upi_templates.py")
    run_step("4. Prepare Unified Cleaned Dataset", "prepare_data.py")
    run_step("5. Train Language Model & Export Browser Artifacts", "train_language_model.py")
    print("\n[SUCCESS] FraPI Sentinel 2.0 ML Pipeline Completed End-to-End!")

if __name__ == "__main__":
    main()
