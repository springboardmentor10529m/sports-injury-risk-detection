"""
Model Training Script for Sports Injury Risk Detection
Trains Random Forest and XGBoost classifiers on real biomechanical and workload datasets.
Saves models, scalers, and genuine scikit-learn evaluation metrics to disk.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_severity_model():
    print("\n" + "="*60)
    print("1. TRAINING INJURY SEVERITY CLASSIFIER")
    print("="*60)
    
    csv_path = os.path.join(DATA_DIR, "sports_injury_biomechanics.csv")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} records from {csv_path}")
    
    # Selected kinematic and physiological features
    feature_cols = [
        "Age", "Height_cm", "Weight_kg",
        "Knee_Angle_deg", "Jump_Height_cm", "Ankle_Flexion_deg",
        "Speed_m_s", "Reaction_Time_ms", "Injury_Recurrence"
    ]
    
    X = df[feature_cols].copy()
    y = df["Injury_Severity"].copy()
    
    # Severity label encoding: Mild, Moderate, Severe
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    classes = list(le.classes_)
    print(f"Target classes: {classes}")
    
    # 80/20 train/test split with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest Classifier
    rf = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_scaled, y_train)
    y_pred_rf = rf.predict(X_test_scaled)
    acc_rf = accuracy_score(y_test, y_pred_rf)
    
    # Train XGBoost Classifier
    xgb_clf = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        random_state=42,
        eval_metric="mlogloss"
    )
    xgb_clf.fit(X_train_scaled, y_train)
    y_pred_xgb = xgb_clf.predict(X_test_scaled)
    acc_xgb = accuracy_score(y_test, y_pred_xgb)
    
    print(f"Random Forest Accuracy: {acc_rf:.4f}")
    print(f"XGBoost Accuracy:       {acc_xgb:.4f}")
    
    # Select best model
    best_model = xgb_clf if acc_xgb >= acc_rf else rf
    best_name = "XGBoost" if acc_xgb >= acc_rf else "RandomForest"
    y_pred_best = y_pred_xgb if acc_xgb >= acc_rf else y_pred_rf
    
    # Calculate complete authentic metrics
    metrics = {
        "model_name": best_name,
        "features": feature_cols,
        "classes": classes,
        "accuracy": float(accuracy_score(y_test, y_pred_best)),
        "macro_precision": float(precision_score(y_test, y_pred_best, average="macro")),
        "macro_recall": float(recall_score(y_test, y_pred_best, average="macro")),
        "macro_f1": float(f1_score(y_test, y_pred_best, average="macro")),
        "confusion_matrix": confusion_matrix(y_test, y_pred_best).tolist(),
        "classification_report": classification_report(y_test, y_pred_best, target_names=classes, output_dict=True)
    }
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred_best, target_names=classes))
    
    # Save artifacts
    joblib.dump(best_model, os.path.join(MODELS_DIR, "severity_model.joblib"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "severity_scaler.joblib"))
    joblib.dump(le, os.path.join(MODELS_DIR, "severity_encoder.joblib"))
    
    return metrics


def train_injury_type_model():
    print("\n" + "="*60)
    print("2. TRAINING ANATOMICAL INJURY TYPE CLASSIFIER")
    print("="*60)
    
    csv_path = os.path.join(DATA_DIR, "sports_injury_biomechanics.csv")
    df = pd.read_csv(csv_path)
    
    # Group top pathologies into clinically coherent target categories:
    # 1. Ankle Sprain
    # 2. ACL / Knee Injury
    # 3. Hamstring / Muscle Strain
    # 4. Shoulder / Upper Body
    # 5. Spinal / Back Pain
    # 6. Other
    def map_pathology(t):
        t_low = str(t).lower()
        if "ankle" in t_low:
            return "Ankle Sprain"
        elif "acl" in t_low or "knee" in t_low:
            return "Knee / ACL Tear"
        elif "hamstring" in t_low or "muscle strain" in t_low:
            return "Hamstring / Muscle Strain"
        elif "shoulder" in t_low or "rotator" in t_low or "elbow" in t_low or "wrist" in t_low:
            return "Upper Body / Shoulder"
        elif "back" in t_low:
            return "Spinal / Back Pain"
        else:
            return "Other Musculoskeletal"
            
    df["Injury_Category"] = df["Injury_Type"].apply(map_pathology)
    print("Mapped Categories:")
    print(df["Injury_Category"].value_counts())
    
    feature_cols = [
        "Age", "Height_cm", "Weight_kg",
        "Knee_Angle_deg", "Jump_Height_cm", "Ankle_Flexion_deg",
        "Speed_m_s", "Reaction_Time_ms"
    ]
    
    X = df[feature_cols].copy()
    y = df["Injury_Category"].copy()
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    classes = list(le.classes_)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    rf = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_scaled, y_train)
    y_pred = rf.predict(X_test_scaled)
    
    metrics = {
        "model_name": "RandomForest",
        "features": feature_cols,
        "classes": classes,
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "macro_precision": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_test, y_pred, average="macro")),
        "macro_f1": float(f1_score(y_test, y_pred, average="macro")),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "classification_report": classification_report(y_test, y_pred, target_names=classes, output_dict=True, zero_division=0)
    }
    
    print("\nInjury Category Report:")
    print(classification_report(y_test, y_pred, target_names=classes, zero_division=0))
    
    joblib.dump(rf, os.path.join(MODELS_DIR, "injury_type_model.joblib"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "injury_type_scaler.joblib"))
    joblib.dump(le, os.path.join(MODELS_DIR, "injury_type_encoder.joblib"))
    
    return metrics


def train_workload_model():
    print("\n" + "="*60)
    print("3. TRAINING WORKLOAD & CONDITIONING RISK MODEL")
    print("="*60)
    
    csv_path = os.path.join(DATA_DIR, "kaggle_injury_data.csv")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} records from {csv_path}")
    
    feature_cols = [
        "Player_Age", "Player_Weight", "Player_Height",
        "Previous_Injuries", "Training_Intensity", "Recovery_Time"
    ]
    
    X = df[feature_cols].copy()
    y = df["Likelihood_of_Injury"].copy()
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    xgb_clf = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        random_state=42,
        eval_metric="logloss"
    )
    xgb_clf.fit(X_train_scaled, y_train)
    y_pred = xgb_clf.predict(X_test_scaled)
    
    metrics = {
        "model_name": "XGBoost",
        "features": feature_cols,
        "classes": ["No Injury Risk", "High Injury Risk"],
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred)),
        "recall": float(recall_score(y_test, y_pred)),
        "f1": float(f1_score(y_test, y_pred)),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "classification_report": classification_report(y_test, y_pred, output_dict=True)
    }
    
    print("\nWorkload Model Report:")
    print(classification_report(y_test, y_pred))
    
    joblib.dump(xgb_clf, os.path.join(MODELS_DIR, "workload_model.joblib"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "workload_scaler.joblib"))
    
    return metrics


def main():
    severity_metrics = train_severity_model()
    type_metrics = train_injury_type_model()
    workload_metrics = train_workload_model()
    
    all_metrics = {
        "severity_model": severity_metrics,
        "injury_type_model": type_metrics,
        "workload_model": workload_metrics
    }
    
    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(all_metrics, f, indent=2)
        
    print("\n" + "="*60)
    print(f"ALL MODELS SUCCESSFULLY TRAINED & SAVED TO {MODELS_DIR}")
    print(f"Metrics saved to {metrics_path}")
    print("="*60)

if __name__ == "__main__":
    main()
