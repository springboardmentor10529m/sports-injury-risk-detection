import pandas as pd

df = pd.read_csv('datasets/ml_training_dataset.csv')
features = [
    'fatigue_score', 'acceleration', 'angular_velocity', 'body_orientation',
    'ground_reaction_force', 'step_count', 'cadence', 'jump_height_cm',
    'range_of_motion', 'impact_force', 'gait_symmetry', 'speed',
    'training_duration', 'previous_injury_history', 'rest_period',
    'repetition_count', 'workload_intensity', 'acc_rms'
]

print("=== DATASET FEATURE DISTRIBUTIONS (N=5,430) ===")
stats = df[features].describe().T[['min', '25%', '50%', '75%', 'max']]
for idx, row in stats.iterrows():
    print(f"{idx}: min={row['min']:.4f}, 25%={row['25%']:.4f}, median={row['50%']:.4f}, 75%={row['75%']:.4f}, max={row['max']:.4f}")
