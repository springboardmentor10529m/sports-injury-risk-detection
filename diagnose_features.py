import pandas as pd
import numpy as np

df = pd.read_csv('datasets/ml_training_dataset.csv')

print("=" * 80)
print("FEATURE STATISTICS COMPARISON: CLASS 0 (LOW RISK) vs CLASS 1 (HIGH RISK)")
print("=" * 80)

c0 = df[df['injury_risk'] == 0]
c1 = df[df['injury_risk'] == 1]

features = [c for c in df.columns if c != 'injury_risk']

print(f"{'Feature Name':<25} | {'Class 0 Mean (std)':<20} | {'Class 1 Mean (std)':<20} | {'Difference':<10}")
print("-" * 80)

for f in features:
    m0, s0 = c0[f].mean(), c0[f].std()
    m1, s1 = c1[f].mean(), c1[f].std()
    diff = m1 - m0
    print(f"{f:<25} | {m0:7.2f} ({s0:6.2f})    | {m1:7.2f} ({s1:6.2f})    | {diff:+7.2f}")

print("=" * 80)
