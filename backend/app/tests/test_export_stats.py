import pandas as pd
import sys

def test_export():
    df = pd.read_csv('datasets/ml_training_dataset.csv')
    features = [
        'fatigue_score', 'acceleration', 'angular_velocity', 'body_orientation',
        'ground_reaction_force', 'step_count', 'cadence', 'jump_height_cm',
        'range_of_motion', 'impact_force', 'gait_symmetry', 'speed',
        'training_duration', 'previous_injury_history', 'rest_period',
        'repetition_count', 'workload_intensity', 'acc_rms'
    ]

    print("\n=== EXACT DATASET RANGES (N=5430) ===", file=sys.stderr)
    for feat in features:
        s = df[feat]
        print(f"STAT: {feat} | min={s.min():.4f} | median={s.median():.4f} | max={s.max():.4f}", file=sys.stderr)

