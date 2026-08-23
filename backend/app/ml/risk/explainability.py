"""
SafeMove Phase 5B — Model Explainability and Feature Association Module.

Computes model-intrinsic feature coefficients/importances and permutation importances.
Strictly adopts non-causal research terminology (predictive feature association,
model contribution, importance ranking).
"""

from typing import Any

import pandas as pd
from sklearn.inspection import permutation_importance


class ModelExplainer:
    """Extracts non-causal predictive feature associations and importances from trained models."""

    @staticmethod
    def extract_feature_importance(
        model_pipeline: Any,
        feature_names: list[str],
        x_val: pd.DataFrame | None = None,
        y_val: pd.Series | None = None,
        random_state: int = 42,
    ) -> pd.DataFrame:
        """
        Extract model-intrinsic importance/coefficients and permutation importance.

        Args:
            model_pipeline: Trained scikit-learn Pipeline
            feature_names: List of feature names matching x_mat input columns
            x_val: Optional validation DataFrame for permutation importance
            y_val: Optional validation target for permutation importance
            random_state: Random state for permutation test

        Returns:
            DataFrame with columns: [feature, model_contribution, contribution_type,
            permutation_importance_mean, permutation_importance_std]
        """
        classifier = model_pipeline.named_steps.get("classifier", model_pipeline)

        records: list[dict[str, Any]] = []

        # 1. Model-intrinsic weights / feature importances
        if hasattr(classifier, "coef_"):
            # Logistic Regression coefficients
            coefs = classifier.coef_[0]
            for feat, val in zip(feature_names, coefs):
                records.append({
                    "feature": feat,
                    "model_contribution": round(float(val), 5),
                    "contribution_type": "Logistic Regression Coefficient (Log-Odds Ratio)",
                })
        elif hasattr(classifier, "feature_importances_"):
            # Random Forest or XGBoost Gini / Gain importance
            importances = classifier.feature_importances_
            for feat, val in zip(feature_names, importances):
                records.append({
                    "feature": feat,
                    "model_contribution": round(float(val), 5),
                    "contribution_type": "Tree Split Importance (Normalized Gini / Gain)",
                })
        else:
            for feat in feature_names:
                records.append({
                    "feature": feat,
                    "model_contribution": 0.0,
                    "contribution_type": "Unavailable",
                })

        df_importance = pd.DataFrame(records)

        # 2. Permutation Importance (if validation set provided)
        if x_val is not None and y_val is not None and len(x_val) > 0:
            perm_res = permutation_importance(
                model_pipeline,
                x_val,
                y_val,
                n_repeats=10,
                random_state=random_state,
                scoring="balanced_accuracy",
            )
            df_importance["permutation_importance_mean"] = [
                round(float(val), 5) for val in perm_res.importances_mean
            ]
            df_importance["permutation_importance_std"] = [
                round(float(val), 5) for val in perm_res.importances_std
            ]
        else:
            df_importance["permutation_importance_mean"] = None
            df_importance["permutation_importance_std"] = None

        # Sort by absolute model contribution descending
        df_importance["abs_contribution"] = df_importance[
            "model_contribution"
        ].abs()
        df_importance = df_importance.sort_values(
            by="abs_contribution", ascending=False
        ).drop(columns=["abs_contribution"])

        return df_importance
