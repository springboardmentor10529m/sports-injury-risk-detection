"""
SafeMove Phase 5B — Baseline ML Research Experiment Execution Script.

Runs reproducible Experiments A, B, and C across Logistic Regression, Random Forest,
and XGBoost, logs metrics, generates structured artifacts, and produces the scientific report.
"""

import sys
from pathlib import Path

# Ensure backend root is on sys.path before local imports
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.risk.experiment_runner import BaselineExperimentRunner  # noqa: E402


def generate_markdown_report(results: dict, output_path: Path) -> None:
    """Generate comprehensive PHASE_5B_BASELINE_REPORT.md markdown document."""
    meta = results["metadata"]
    best = results["best_model_selection"]
    cv_table = results["cv_summary_table"]
    feat_imp = results["feature_importance"]
    test_eval = results["final_test_evaluation"]

    md_lines = [
        "# SafeMove Phase 5B: Baseline Machine Learning Research Experiment Report",
        "",
        "> **DISCLAIMER**: RESEARCH PROTOTYPE ONLY — NOT CLINICALLY VALIDATED.",
        "> This report documents baseline machine learning experiments conducted on the currently",
        "> integrated 20-subject research cohort. It does not provide medical diagnoses or guaranteed",
        "> injury predictions.",
        "",
        "---",
        "",
        "## 1. Dataset Description & Cohort Size",
        f"- **Source Dataset**: {meta['dataset_name']}",
        f"- **Dataset Version**: {meta['dataset_version']}",
        f"- **Integrated SafeMove Cohort**: **{meta['cohort_total_subjects']} subjects** "
        f"(12 Injured runners, 8 Healthy controls)",
        f"- **Cohort Split**: {meta['development_subjects']} Development subjects (used for CV), "
        f"{meta['test_subjects']} Holdout Test subjects",
        "- **Important Scale Note**: The full published Calgary biomechanical dataset contains 1,798 subjects.",
        "  This research baseline is strictly evaluated on the current 20-subject prototype cohort.",
        "",
        "---",
        "",
        "## 2. Target Definition & Task",
        f"- **Target Variable**: `{meta['target_variable']}`",
        "- **Task**: Binary injury-status classification (0 = Healthy Control, 1 = Documented Injury).",
        "- **Multiclass Status**: Multiclass injury-type prediction is deferred to future scaled iterations.",
        "",
        "---",
        "",
        "## 3. Feature Sets & Experiments",
        "- **Experiment A (Core Biomechanics)**: Sagittal kinematics (Knee ROM, Peak Knee Flexion, Hip ROM, "
        "Ankle ROM, Trunk Lean, Hip Adduction, Hip Internal Rotation) and GRF (Peak Vertical GRF, Loading Rate).",
        "- **Experiment B (Core + Asymmetry)**: Core features + frontal plane proxy (`knee_valgus_proxy_left_max`).",
        "- **Experiment C (Core + Asymmetry + Deviations)**: Core + Asymmetry + statistical deviations from "
        "developmental normative baselines (`knee_flexion_deviation_proxy`, `hip_flexion_deviation_proxy`).",
        "- **Strict Leakage Filters**: All identifiers (`sample_id`, `athlete_id`, `video_id`, `source_dataset`) "
        "and outcome proxies (`injury_type`) are strictly excluded from predictive features.",
        "",
        "---",
        "",
        "## 4. Subject-Level Cross-Validation Results",
        "",
        f"Cross-Validation Strategy: `{meta['cross_validation_strategy']}`.",
        "",
        "| Experiment | Model | Features | Mean Bal Acc | Mean ROC-AUC | Mean PR-AUC | Mean F1 | Mean Brier | "
        "OOF Bal Acc | OOF ROC-AUC |",
        "| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for row in cv_table:
        roc_str = f"{row['mean_roc_auc']:.3f}" if row['mean_roc_auc'] is not None else "N/A"
        pr_str = f"{row['mean_pr_auc']:.3f}" if row['mean_pr_auc'] is not None else "N/A"
        oof_roc = f"{row['oof_roc_auc']:.3f}" if row['oof_roc_auc'] is not None else "N/A"
        md_lines.append(
            f"| **Exp {row['experiment_id']}** | {row['model_name']} | {row['feature_count']} | "
            f"{row['mean_balanced_accuracy']:.3f} | {roc_str} | {pr_str} | {row['mean_f1']:.3f} | "
            f"{row['mean_brier_score']:.3f} | **{row['oof_balanced_accuracy']:.3f}** | **{oof_roc}** |"
        )

    md_lines.extend([
        "",
        "---",
        "",
        "## 5. Champion Model Selection & Explainability",
        f"- **Selected Champion Configuration**: **Experiment {best['experiment_id']}** with **{best['model_key']}**",
        f"- **Composite CV Score**: {best['composite_score']}",
        "- **Explainability Nomenclature**: Predictive feature associations and model contributions (non-causal).",
        "",
        "### Top Predictive Feature Associations",
        "| Feature | Model Contribution | Contribution Type | Permutation Importance (Mean ± Std) |",
        "| :--- | :---: | :--- | :---: |",
    ])

    for rec in feat_imp[:8]:
        perm_mean = rec.get("permutation_importance_mean")
        perm_std = rec.get("permutation_importance_std")
        perm_str = f"{perm_mean:.4f} ± {perm_std:.4f}" if perm_mean is not None else "N/A"
        contrib = rec['model_contribution']
        md_lines.append(
            f"| `{rec['feature']}` | **{contrib:.4f}** | {rec['contribution_type']} | {perm_str} |"
        )

    md_lines.extend([
        "",
        "---",
        "",
        "## 6. Final Isolated Test Set Evaluation (1-Time Holdout Evaluation)",
    ])

    if test_eval:
        subj_list = ', '.join(test_eval['test_subjects'])
        md_lines.extend([
            f"- **Test Cohort Size**: {test_eval['test_subject_count']} subjects ({subj_list})",
            f"- **True Labels**: `{test_eval['test_true_labels']}`",
            f"- **Model Predictions**: `{test_eval['test_predictions']}` "
            f"(Probabilities: `{test_eval['test_probabilities']}`)",
            f"- **Test Balanced Accuracy**: **{test_eval['metrics']['balanced_accuracy']}**",
            f"- **Test Sensitivity / Recall**: **{test_eval['metrics']['recall_sensitivity']}**",
            f"- **Test Specificity**: **{test_eval['metrics']['specificity']}**",
            f"- **Statistical Uncertainty Warning**: *\"{test_eval['uncertainty_disclaimer']}\"*",
        ])

    md_lines.extend([
        "",
        "---",
        "",
        "## 7. Scientific & Statistical Limitations",
        "1. **Sample Size Constraint**: The current integrated prototype cohort ($N=20$) provides proof of pipeline "
        "architecture, but empirical estimates carry wide confidence intervals.",
        "2. **Generalizability**: Motion-capture tabular stance phase data may not fully translate to markerless "
        "in-the-wild single-camera video estimation without domain adaptation.",
        "3. **Non-Causal Inference**: Observed high-loading rate or knee flexion associations reflect statistical "
        "predictive correlations, not proven physiological injury etiologies.",
        "",
        "---",
        "",
        "## 8. Next Recommended Phase (Phase 6)",
        "- Scale ingestion to the full Calgary cohort ($N=1,798$ subjects).",
        "- Implement Calibrated Probability outputs (Platt scaling / Isotonic regression).",
        "- Integrate SHAP (SHapley Additive exPlanations) visual summary plots for physiotherapist review.",
        "",
    ])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))


def main():
    print("=" * 70)
    print("SafeMove Phase 5B — Baseline ML Research Experiment Pipeline")
    print("=" * 70)

    runner = BaselineExperimentRunner(
        features_csv_path="backend/data/features/calgary/features.csv",
        splits_dir="backend/data/splits/calgary",
        output_dir="backend/data/models/phase5_baseline",
        random_state=42,
    )

    print("\n1. [Executing Controlled Experiments A, B, and C across Models...]")
    results = runner.run_experiments()

    best = results["best_model_selection"]
    print(f"\n   -> Champion Model: Exp {best['experiment_id']} ({best['model_key']})")
    print(f"   -> Composite CV Score: {best['composite_score']}")

    print("\n2. [Writing Scientific Report (PHASE_5B_BASELINE_REPORT.md)...]")
    report_path = Path("backend/data/models/phase5_baseline/PHASE_5B_BASELINE_REPORT.md")
    generate_markdown_report(results, report_path)
    print(f"   -> Report successfully saved to: {report_path.resolve()}")

    print("\n3. [Generated Artifacts Checklist]:")
    out_dir = Path("backend/data/models/phase5_baseline")
    for f in out_dir.iterdir():
        print(f"   * {f.name} ({f.stat().st_size} bytes)")

    print("\n" + "=" * 70)
    print("SafeMove Phase 5B Baseline ML Research Experiment COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
