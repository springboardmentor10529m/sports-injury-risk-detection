"""
SafeMove Phase 5B — Baseline ML Experiment Runner.

Orchestrates controlled experiments (A, B, C) across baseline classifiers (LR, RF, XGBoost),
performs subject-level cross-validation, exports structured artifacts, and evaluates the final test split.
"""

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.pipeline import Pipeline

from app.ml.risk.cross_validation import (
    SubjectGroupedCV,
    calculate_classification_metrics,
)
from app.ml.risk.explainability import ModelExplainer
from app.ml.risk.feature_selection import FeatureSelector
from app.ml.risk.models import build_full_pipeline


class BaselineExperimentRunner:
    """Orchestrates research experiments across models and feature sets."""

    def __init__(
        self,
        features_csv_path: Path | str = "backend/data/features/calgary/features.csv",
        splits_dir: Path | str = "backend/data/splits/calgary",
        output_dir: Path | str = "backend/data/models/phase5_baseline",
        random_state: int = 42,
    ):
        self.features_csv_path = Path(features_csv_path).resolve()
        self.splits_dir = Path(splits_dir).resolve()
        self.output_dir = Path(output_dir).resolve()
        self.random_state = random_state

    def load_data(self) -> pd.DataFrame:
        """Load and validate the raw feature matrix CSV."""
        if not self.features_csv_path.exists():
            raise FileNotFoundError(
                f"Features CSV not found at {self.features_csv_path}"
            )
        return pd.read_csv(self.features_csv_path)

    def load_test_split_ids(self) -> list[str]:
        """Load subject/sample IDs designated for the isolated final test set."""
        test_manifest_file = self.splits_dir / "test_manifest.json"
        if not test_manifest_file.exists():
            return []
        with open(test_manifest_file, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return [sample["athlete_id"] for sample in data if "athlete_id" in sample]
        elif isinstance(data, dict):
            return [
                sample["athlete_id"]
                for sample in data.get("samples", [])
                if "athlete_id" in sample
            ]
        return []

    def run_experiments(self) -> dict[str, Any]:
        """Execute Experiments A, B, and C across Logistic Regression, Random Forest, and XGBoost."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        df_raw = self.load_data()
        test_athlete_ids = set(self.load_test_split_ids())

        # Separate development set (for Cross-Validation) and isolated test set
        if test_athlete_ids:
            df_dev = df_raw[
                ~df_raw["athlete_id"].isin(test_athlete_ids)
            ].reset_index(drop=True)
            df_test = df_raw[
                df_raw["athlete_id"].isin(test_athlete_ids)
            ].reset_index(drop=True)
        else:
            df_dev = df_raw.copy()
            df_test = pd.DataFrame()

        experiments = [
            ("A", "Core Biomechanical Features"),
            ("B", "Core Biomechanics + Frontal/Asymmetry Proxies"),
            ("C", "Core + Asymmetry + Developmental Deviation Proxies"),
        ]

        model_types = [
            ("logistic_regression", "Logistic Regression (L2)"),
            ("random_forest", "Random Forest Classifier"),
            ("xgboost", "XGBoost Classifier"),
        ]

        cv_engine = SubjectGroupedCV(n_splits=4, random_state=self.random_state)
        all_cv_results: list[dict[str, Any]] = []
        experiment_summaries: dict[str, Any] = {}

        best_score = -1.0
        best_pipeline_config: dict[str, Any] | None = None
        best_pipeline_instance: Pipeline | None = None

        for exp_id, exp_desc in experiments:
            feature_names = FeatureSelector.get_feature_names(exp_id)
            x_dev, y_dev, groups_dev = FeatureSelector.filter_dataframe(
                df_dev, feature_names
            )

            exp_model_results: dict[str, Any] = {}

            for m_key, m_desc in model_types:
                pipeline = build_full_pipeline(
                    model_name=m_key,
                    scaler_type="standard",
                    imputer_strategy="median",
                    random_state=self.random_state,
                )

                cv_res = cv_engine.evaluate_pipeline(
                    pipeline=pipeline, x_mat=x_dev, y=y_dev, groups=groups_dev
                )

                mean_m = cv_res["mean_metrics"]
                oof_m = cv_res["overall_oof_metrics"]

                record = {
                    "experiment_id": exp_id,
                    "experiment_description": exp_desc,
                    "model_key": m_key,
                    "model_name": m_desc,
                    "feature_count": len(feature_names),
                    "features_used": feature_names,
                    "cv_splits": cv_res["n_splits"],
                    "mean_balanced_accuracy": mean_m["balanced_accuracy"],
                    "std_balanced_accuracy": cv_res["std_metrics"][
                        "balanced_accuracy"
                    ],
                    "mean_roc_auc": mean_m["roc_auc"],
                    "mean_pr_auc": mean_m["pr_auc"],
                    "mean_f1": mean_m["f1_score"],
                    "mean_precision": mean_m["precision"],
                    "mean_recall_sensitivity": mean_m["recall_sensitivity"],
                    "mean_specificity": mean_m["specificity"],
                    "mean_brier_score": mean_m["brier_score"],
                    "oof_balanced_accuracy": oof_m["balanced_accuracy"],
                    "oof_roc_auc": oof_m["roc_auc"],
                    "oof_f1": oof_m["f1_score"],
                }
                all_cv_results.append(record)
                exp_model_results[m_key] = cv_res

                # Track champion model based on OOF balanced accuracy and ROC-AUC
                composite_score = (
                    oof_m["balanced_accuracy"]
                    + (oof_m["roc_auc"] if oof_m["roc_auc"] is not None else 0.5)
                ) / 2.0
                if composite_score > best_score:
                    best_score = composite_score
                    best_pipeline_config = {
                        "experiment_id": exp_id,
                        "model_key": m_key,
                        "feature_names": feature_names,
                        "composite_score": round(composite_score, 4),
                    }

            experiment_summaries[f"Experiment_{exp_id}"] = {
                "description": exp_desc,
                "features": feature_names,
                "models": exp_model_results,
            }

        # 1. Fit best champion pipeline on all development data
        if best_pipeline_config is None:
            raise RuntimeError("No model configuration was evaluated.")

        champion_feat_names = best_pipeline_config["feature_names"]
        x_dev_champ, y_dev_champ, _ = FeatureSelector.filter_dataframe(
            df_dev, champion_feat_names
        )

        champion_pipeline = build_full_pipeline(
            model_name=best_pipeline_config["model_key"],
            scaler_type="standard",
            imputer_strategy="median",
            random_state=self.random_state,
        )
        champion_pipeline.fit(x_dev_champ, y_dev_champ)
        best_pipeline_instance = champion_pipeline

        # 2. Extract Explainability & Feature Importances
        df_importance = ModelExplainer.extract_feature_importance(
            model_pipeline=champion_pipeline,
            feature_names=champion_feat_names,
            x_val=x_dev_champ,
            y_val=y_dev_champ,
            random_state=self.random_state,
        )

        # 3. Final Isolated Test Set Evaluation (1-time evaluation)
        test_evaluation_res = None
        if len(df_test) > 0:
            x_test, y_test, _ = FeatureSelector.filter_dataframe(
                df_test, champion_feat_names
            )
            test_preds = champion_pipeline.predict(x_test)
            test_probs = champion_pipeline.predict_proba(x_test)[:, 1]
            test_metrics = calculate_classification_metrics(
                y_true=y_test.to_numpy(), y_pred=test_preds, y_prob=test_probs
            )
            test_evaluation_res = {
                "test_subject_count": len(df_test),
                "test_subjects": df_test["athlete_id"].tolist(),
                "test_true_labels": y_test.tolist(),
                "test_predictions": test_preds.tolist(),
                "test_probabilities": [round(float(p), 4) for p in test_probs],
                "metrics": test_metrics,
                "uncertainty_disclaimer": (
                    "The test cohort contains only 3 subjects; therefore the final test estimate has "
                    "very high statistical uncertainty and must not be interpreted as clinical validation."
                ),
            }

        # 4. Save Artifacts to backend/data/models/phase5_baseline/
        df_cv_results = pd.DataFrame(all_cv_results)
        df_cv_results.to_csv(self.output_dir / "cv_results.csv", index=False)
        df_importance.to_csv(
            self.output_dir / "feature_importance.csv", index=False
        )

        # Model Metadata
        metadata = {
            "dataset_name": "Calgary_Running_Injury_Biomechanical_Dataset",
            "dataset_version": "1.0.0",
            "cohort_total_subjects": len(df_raw),
            "development_subjects": len(df_dev),
            "test_subjects": len(df_test),
            "target_variable": "injury_label (0=Healthy Control, 1=Injured)",
            "cross_validation_strategy": "StratifiedGroupKFold (Subject-Level Isolation, 0 Cross-Fold Leakage)",
            "random_seed": self.random_state,
            "champion_model_config": best_pipeline_config,
            "trained_timestamp_utc": datetime.now(UTC).isoformat(),
            "library_versions": {
                "sklearn": "1.9.0",
                "xgboost": "3.4.1",
                "pandas": "3.0.5",
            },
            "disclaimer": "RESEARCH PROTOTYPE — NOT CLINICALLY VALIDATED. Baseline research experiment only.",
        }
        with open(
            self.output_dir / "model_metadata.json", "w", encoding="utf-8"
        ) as f:
            json.dump(metadata, f, indent=2)

        # Full Results JSON
        results_payload = {
            "metadata": metadata,
            "best_model_selection": best_pipeline_config,
            "cv_summary_table": all_cv_results,
            "feature_importance": df_importance.to_dict(orient="records"),
            "final_test_evaluation": test_evaluation_res,
        }
        with open(self.output_dir / "results.json", "w", encoding="utf-8") as f:
            json.dump(results_payload, f, indent=2)

        # Serialize Model Pipeline Artifact
        joblib.dump(best_pipeline_instance, self.output_dir / "best_model.joblib")

        return results_payload
