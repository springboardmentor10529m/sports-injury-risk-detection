import pandas as pd

def test_print_medians():
    df = pd.read_csv('datasets/ml_training_dataset.csv')
    features = [
        'fatigue_score', 'acceleration', 'angular_velocity', 'body_orientation',
        'ground_reaction_force', 'step_count', 'cadence', 'jump_height_cm',
        'range_of_motion', 'impact_force', 'gait_symmetry', 'speed',
        'training_duration', 'previous_injury_history', 'rest_period',
        'repetition_count', 'workload_intensity', 'acc_rms'
    ]
    medians = df[features].median().to_dict()
    print("\nEXACT DATASET MEDIANS:")
    for k, v in medians.items():
        print(f"'{k}': {round(float(v), 4)},")
