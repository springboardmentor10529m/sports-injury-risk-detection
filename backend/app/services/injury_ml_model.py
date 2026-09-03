import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, average_precision_score, f1_score, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit, train_test_split

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml_models" / "injury_risk_model.joblib"
REAL_MODEL_PATH = Path(__file__).resolve().parent.parent / "data" / "models" / "real_dataset_injury_risk_model.joblib"
FEATURE_COLUMNS = [
    "weekly_training_hours",
    "acute_chronic_ratio",
    "previous_injury_count",
    "days_since_last_injury",
    "current_pain_flag",
    "fatigue_score",
    "symmetry_score",
    "knee_valgus_avg_pct",
    "trunk_lean_avg_deg",
]
REAL_DATASET_PATHS = [
    Path(__file__).resolve().parent.parent / "data" / "raw" / "day_approach_maskedID_timeseries.csv",
    Path(__file__).resolve().parent.parent / "data" / "raw" / "week_approach_maskedID_timeseries.csv",
]


def _build_synthetic_training_data() -> pd.DataFrame:
    rows = []

    for weekly_hours in [5, 8, 10, 12, 15, 18, 22, 25, 30, 35]:
        for acwr in [0.7, 0.9, 1.1, 1.4, 1.7, 2.1]:
            for prev in [0, 1, 2, 3]:
                for days_since in [30, 90, 180, 365, 730, None]:
                    for pain in [False, True]:
                        for fatigue in [20, 35, 55, 72, 85, 92]:
                            for symmetry in [90, 82, 74, 65, 58]:
                                valgus = max(2.0, min(20.0, (weekly_hours / 30.0) * 8 + (acwr - 1.0) * 8 + prev * 3 + (100 - symmetry) * 0.2))
                                trunk = max(4.0, min(30.0, 8 + (fatigue / 20.0) + (acwr - 1.0) * 7 + (prev * 2)))

                                injury = 1 if (
                                    weekly_hours >= 18
                                    and acwr >= 1.3
                                    and (fatigue >= 70 or prev >= 1 or pain)
                                ) else 0

                                if injury == 1 and prev == 0 and fatigue < 60 and acwr < 1.1:
                                    injury = 0

                                rows.append({
                                    "weekly_training_hours": weekly_hours,
                                    "acute_chronic_ratio": acwr,
                                    "previous_injury_count": prev,
                                    "days_since_last_injury": days_since,
                                    "current_pain_flag": int(pain),
                                    "fatigue_score": fatigue,
                                    "symmetry_score": symmetry,
                                    "knee_valgus_avg_pct": round(valgus, 2),
                                    "trunk_lean_avg_deg": round(trunk, 2),
                                    "injury_label": injury,
                                })

    df = pd.DataFrame(rows)
    df["days_since_last_injury"] = df["days_since_last_injury"].fillna(365)
    return df


def _load_real_dataset_if_available():
    for path in REAL_DATASET_PATHS:
        if not path.exists():
            continue

        df = pd.read_csv(path)
        df = df.loc[:, ~df.columns.duplicated()]

        athlete_col = next((col for col in df.columns if str(col).strip().lower() == "athlete id"), None)
        target_col = next((col for col in df.columns if str(col).strip().lower() == "injury"), None)
        if athlete_col is None or target_col is None:
            continue

        feature_columns = [
            col for col in df.columns
            if col not in {athlete_col, target_col, "Date", "date"}
        ]
        if not feature_columns:
            continue

        prepared = df.copy()
        for col in feature_columns + [target_col]:
            prepared[col] = pd.to_numeric(prepared[col], errors="coerce")

        prepared = prepared.dropna(subset=feature_columns + [target_col]).copy()
        prepared[target_col] = prepared[target_col].astype(int)
        prepared[athlete_col] = prepared[athlete_col].astype(str)

        return prepared, feature_columns, athlete_col, target_col, path

    return None


def train_model(use_real_dataset: bool = False, model_path: str | Path | None = None) -> dict:
    default_real_available = REAL_MODEL_PATH.exists() or any(path.exists() for path in REAL_DATASET_PATHS)
    target_model_path = Path(model_path) if model_path else (
        REAL_MODEL_PATH if (use_real_dataset or default_real_available) else MODEL_PATH
    )

    if use_real_dataset:
        dataset = _load_real_dataset_if_available()
        if dataset is None:
            raise FileNotFoundError(
                "No real injury dataset was found in backend/data/raw. "
                "Expected day_approach_maskedID_timeseries.csv or week_approach_maskedID_timeseries.csv."
            )

        df, feature_columns, athlete_col, target_col, source_path = dataset
        X = df[feature_columns]
        y = df[target_col]
        groups = df[athlete_col]

        splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
        train_idx, test_idx = next(splitter.split(X, y, groups))
        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]
        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]

        preprocessor = SimpleImputer(strategy="median")
        X_train_imp = preprocessor.fit_transform(X_train)
        X_test_imp = preprocessor.transform(X_test)

        model = RandomForestClassifier(
            n_estimators=300,
            max_depth=None,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
        )
        model.fit(X_train_imp, y_train)

        preds = model.predict(X_test_imp)
        probs = model.predict_proba(X_test_imp)[:, 1]
        metrics = {
            "accuracy": round(float(accuracy_score(y_test, preds)), 4),
            "f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, probs)), 4),
            "average_precision": round(float(average_precision_score(y_test, probs)), 4),
            "rows": int(len(df)),
            "positive_rate": round(float(y.mean()), 4),
            "source": str(source_path),
        }

        artifact = {
            "model": model,
            "preprocessor": preprocessor,
            "feature_columns": feature_columns,
            "target_column": target_col,
            "group_column": athlete_col,
            "source": str(source_path),
        }
        target_model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(artifact, target_model_path)
        return metrics

    df = _build_synthetic_training_data()
    X = df[FEATURE_COLUMNS]
    y = df["injury_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = SimpleImputer(strategy="median")
    X_train_imp = preprocessor.fit_transform(X_train)
    X_test_imp = preprocessor.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        min_samples_leaf=2,
        random_state=42,
    )
    model.fit(X_train_imp, y_train)

    preds = model.predict(X_test_imp)
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, preds)), 4),
        "f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
    }

    artifact = {
        "model": model,
        "preprocessor": preprocessor,
        "feature_columns": FEATURE_COLUMNS,
    }
    target_model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, target_model_path)

    return metrics


def predict_injury_risk(features: dict) -> dict:
    model_file = REAL_MODEL_PATH if REAL_MODEL_PATH.exists() else MODEL_PATH
    artifact = joblib.load(model_file)
    model = artifact["model"]
    preprocessor = artifact["preprocessor"]
    feature_columns = artifact["feature_columns"]

    available = {col: features.get(col, 0) for col in feature_columns}
    if "days_since_last_injury" in available:
        available["days_since_last_injury"] = available["days_since_last_injury"] if available["days_since_last_injury"] is not None else 365
    if "current_pain_flag" in available:
        available["current_pain_flag"] = 1 if bool(available["current_pain_flag"]) else 0

    df = pd.DataFrame([available], columns=feature_columns)
    processed = preprocessor.transform(df)
    probability = float(model.predict_proba(processed)[0][1])

    if probability >= 0.7:
        risk_level = "CRITICAL"
    elif probability >= 0.5:
        risk_level = "HIGH"
    elif probability >= 0.3:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    return {
        "probability": round(probability, 4),
        "risk_level": risk_level,
        "features_used": feature_columns,
        "model_path": str(model_file),
    }


def _ensure_model_exists() -> None:
    if not MODEL_PATH.exists():
        train_model()
