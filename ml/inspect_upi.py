import pandas as pd
import os
import sys
from scipy import stats
from sklearn.feature_selection import mutual_info_classif
import numpy as np

csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "upi", "fraud_data_20251225_004640.csv")
df = pd.read_csv(csv_path)

print("--- Columns and Dtypes ---")
print(df.dtypes)

label_col = 'is_suspicious'
print("\n--- Label Column and Class Balance ---")
print(df[label_col].value_counts())

print("\n--- Derivable features ---")
print("Derivable at analysis time: amount, amount round-ness, handle/PSP of the payee VPA, merchant-code presence, payee in saved references, hour/day of analysis.")
print("But in this dataset, we ONLY have: amount, hour_of_day, is_night_transaction, is_weekend.")

df['amount_roundness'] = (df['amount'] % 10 == 0).astype(int)

# check signal
print("\n--- Signal Check (Univariate test) ---")
X = df[['amount', 'hour_of_day', 'is_night_transaction', 'is_weekend', 'amount_roundness']].fillna(0)
y = df[label_col].astype(int)

# We can use Point-Biserial correlation or Kruskal-Wallis
for col in X.columns:
    if col in ['amount', 'hour_of_day']:
        res = stats.kruskal(X[y==1][col], X[y==0][col])
        print(f"{col}: p-value {res.pvalue:.4e}")
    else:
        contingency = pd.crosstab(X[col], y)
        res = stats.chi2_contingency(contingency)
        print(f"{col}: p-value {res.pvalue:.4e}")
