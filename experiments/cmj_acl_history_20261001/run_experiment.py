"""Train and evaluate a CMJ prior-ACL-history classifier.

This is an isolated research experiment, not the KINETIQ production scorer.
Run from the repository root with .venv/python.exe.
"""
from __future__ import annotations

import hashlib
import json
import platform
import re
import zipfile
from collections import defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET

import joblib
import numpy as np
import pandas as pd
import scipy
import sklearn
from scipy.io import loadmat
from sklearn.base import clone
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score,
                             balanced_accuracy_score, confusion_matrix,
                             f1_score, precision_score, recall_score,
                             roc_auc_score)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/external/kinetiq_jump_landing"
OUT = Path(__file__).resolve().parent
LABEL_FILE = DATA / "labeling_CMJ.xlsx"
ANGLE_LABELS = DATA / "IK_column_labels.xlsx"
MAT_FILE = DATA / "CMJ.mat"
SEEDS = list(range(42, 52))
WINDOW_FRAMES = 50  # 200 ms at the source sampling rate of 250 Hz.
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def xlsx_rows(path: Path, sheet="xl/worksheets/sheet1.xml"):
    """Read a simple worksheet using the standard library (no Excel engine)."""
    with zipfile.ZipFile(path) as book:
        strings = []
        if "xl/sharedStrings.xml" in book.namelist():
            root = ET.fromstring(book.read("xl/sharedStrings.xml"))
            strings = ["".join(t.text or "" for t in si.findall(".//m:t", NS))
                       for si in root.findall("m:si", NS)]
        root = ET.fromstring(book.read(sheet))
    rows = []
    for row in root.findall(".//m:sheetData/m:row", NS):
        values = {}
        for cell in row.findall("m:c", NS):
            ref = cell.attrib["r"]
            col = re.sub(r"\d", "", ref)
            value_node = cell.find("m:v", NS)
            value = value_node.text if value_node is not None else "".join(
                t.text or "" for t in cell.findall(".//m:t", NS))
            if cell.attrib.get("t") == "s" and value:
                value = strings[int(value)]
            values[col] = value
        rows.append(values)
    return rows


def cell(row, column, cast=str):
    value = row.get(column, "")
    if value == "":
        return None
    return cast(value)


def angle_columns():
    rows = xlsx_rows(ANGLE_LABELS)
    header = next(row for row in rows if row.get("A") == "time")
    return [header.get(excel_col(i), "") for i in range(1, 45)]


def excel_col(index):
    result = ""
    while index:
        index, rem = divmod(index - 1, 26)
        result = chr(65 + rem) + result
    return result


def feature_row(trial, columns):
    joint = np.asarray(trial["Joint_Angles"], dtype=float)
    if joint.ndim != 2 or joint.shape[1] != len(columns):
        raise ValueError(f"Unexpected joint-angle matrix shape {joint.shape}")
    event = int(np.asarray(trial["IC_K"]).squeeze()) - 1  # MATLAB index -> Python index.
    if event < 0 or event >= len(joint):
        raise ValueError(f"Invalid knee initial-contact index: {event + 1}")
    window = joint[event:min(event + WINDOW_FRAMES + 1, len(joint)), :]
    idx = {name: columns.index(name) for name in (
        "knee_angle_r", "knee_angle_l", "knee_adduction_r",
        "knee_adduction_l", "hip_flexion_r", "hip_flexion_l",
        "lumbar_extension")}

    def values(name):
        result = window[:, idx[name]]
        result = result[np.isfinite(result)]
        if not len(result):
            raise ValueError(f"No finite values for {name}")
        return result

    kr, kl = values("knee_angle_r"), values("knee_angle_l")
    adr, adl = values("knee_adduction_r"), values("knee_adduction_l")
    hr = float(np.mean(values("hip_flexion_r")))
    hl = float(np.mean(values("hip_flexion_l")))
    return {
        "knee_angle_r_mean": float(np.mean(kr)),
        "knee_angle_l_mean": float(np.mean(kl)),
        "knee_angle_r_peak": float(np.max(kr)),
        "knee_angle_l_peak": float(np.max(kl)),
        "knee_angle_mean_abs_asymmetry": float(abs(np.mean(kr) - np.mean(kl))),
        "knee_adduction_r_mean": float(np.mean(adr)),
        "knee_adduction_l_mean": float(np.mean(adl)),
        "knee_adduction_mean_abs_asymmetry": float(abs(np.mean(adr) - np.mean(adl))),
        "hip_flexion_bilateral_mean": float((hr + hl) / 2),
        "lumbar_extension_mean": float(np.mean(values("lumbar_extension"))),
    }


def load_subject_table():
    raw = xlsx_rows(LABEL_FILE)
    header_index = next(i for i, row in enumerate(raw) if row.get("B") == "sub")
    records = []
    for row in raw[header_index + 1:]:
        if not row.get("B"):
            continue
        subject = int(row["B"])
        acl_leg = int(row["H"])  # Explicit source meaning: 0 control, 1/2 ACL side.
        group_code = int(row["C"])  # Source header: 1 control, 2 ACL.
        target = int(acl_leg != 0)
        if group_code != (2 if target else 1):
            raise ValueError(f"Conflicting group and ACL-side labels for subject {subject}")
        records.append({
            "subject": subject,
            "target": target,
            "condition": int(row["E"]),
            "missing": int(row["I"]),
        })
    grouped = defaultdict(list)
    for record in records:
        grouped[record["subject"]].append(record)
    for subject, trials in grouped.items():
        if len(trials) != 6:
            raise ValueError(f"Expected six labelled CMJ trials for sub{subject:02d}; got {len(trials)}")
        if len({trial["target"] for trial in trials}) != 1:
            raise ValueError(f"Inconsistent target labels for sub{subject:02d}")
        if [trial["condition"] for trial in trials] != [0, 0, 0, 1, 1, 1]:
            raise ValueError(f"Unexpected trial ordering for sub{subject:02d}")
    return grouped


def dataset():
    groups = load_subject_table()
    columns = angle_columns()
    if len(columns) != 44 or columns[0] != "time":
        raise ValueError("Unexpected IK column label layout")
    mats = loadmat(MAT_FILE)["CMJ"]
    if mats.shape != (44, 1):
        raise ValueError(f"Unexpected participant array: {mats.shape}")

    feature_names = list(feature_row.__annotations__)  # stable declaration below
    rows, labels, subject_ids, per_subject = [], [], [], {}
    for subject, trial_labels in sorted(groups.items()):
        entry = mats[subject - 1, 0]
        trials = entry["CMJ_bil"][0, 0]["sub_data"][0, 0]
        if trials.shape[0] != 6:
            raise ValueError(f"Expected six MAT trials for sub{subject:02d}; got {trials.shape[0]}")
        selected = []
        for index in range(3):
            label = trial_labels[index]
            trial = trials[index, 0]
            name = str(np.asarray(trial["File"]).squeeze())
            if not name.startswith("CMJ_") or name.startswith("f_"):
                raise ValueError(f"Unexpected non-fatigued trial name {name!r} for sub{subject:02d}")
            if label["condition"] != 0:
                raise ValueError(f"Trial condition mismatch for {name}")
            if label["missing"]:
                continue
            selected.append(feature_row(trial, columns))
        if len(selected) < 2:
            raise ValueError(f"Fewer than two usable non-fatigued trials for sub{subject:02d}")
        names = list(selected[0])
        aggregated = {name: float(np.median([r[name] for r in selected])) for name in names}
        rows.append(aggregated)
        labels.append(trial_labels[0]["target"])
        subject_ids.append(subject)
        per_subject[str(subject)] = len(selected)

    X = pd.DataFrame(rows, index=subject_ids)
    y = np.asarray(labels, dtype=int)
    return X, y, np.asarray(subject_ids), per_subject


def score(y, probability):
    prediction = (probability >= 0.5).astype(int)
    return {
        "accuracy": float(accuracy_score(y, prediction)),
        "balanced_accuracy": float(balanced_accuracy_score(y, prediction)),
        "precision": float(precision_score(y, prediction, zero_division=0)),
        "recall": float(recall_score(y, prediction, zero_division=0)),
        "f1": float(f1_score(y, prediction, zero_division=0)),
        "average_precision": float(average_precision_score(y, probability)),
        "roc_auc": float(roc_auc_score(y, probability)),
        "confusion_matrix": confusion_matrix(y, prediction, labels=[0, 1]).tolist(),
    }


def summarize(metrics):
    keys = ["accuracy", "balanced_accuracy", "precision", "recall", "f1",
            "average_precision", "roc_auc"]
    return {key: {"mean": float(np.mean([m[key] for m in metrics])),
                  "sd": float(np.std([m[key] for m in metrics], ddof=1)),
                  "min": float(np.min([m[key] for m in metrics])),
                  "max": float(np.max([m[key] for m in metrics]))}
            for key in keys}


def pipeline(estimator, scale):
    steps = [("impute", SimpleImputer(strategy="median"))]
    if scale:
        steps.append(("scale", StandardScaler()))
    steps.append(("model", estimator))
    return Pipeline(steps)


def main():
    source_hashes = {str(p.relative_to(ROOT)): sha256(p)
                     for p in [MAT_FILE, LABEL_FILE, ANGLE_LABELS]}
    X, y, subjects, per_subject = dataset()
    if len(X) != 43 or int(np.sum(y)) != 21 or int(np.sum(y == 0)) != 22:
        raise ValueError(f"Unexpected cohort after filtering: n={len(X)}, classes={np.bincount(y)}")
    if not np.isfinite(X.to_numpy()).all():
        raise ValueError("Non-finite participant feature values remain")

    candidates = {
        # Predict the majority class in every fold; avoids fold-specific
        # prevalence probabilities creating spurious rankings in pooled OOF.
        "majority_class_baseline": pipeline(DummyClassifier(strategy="most_frequent"), False),
        "logistic_regression": pipeline(LogisticRegression(C=1, class_weight="balanced",
                                                              max_iter=5000, random_state=42), True),
        "random_forest": pipeline(RandomForestClassifier(n_estimators=300, max_depth=3,
                                                          min_samples_leaf=4,
                                                          class_weight="balanced",
                                                          random_state=42, n_jobs=1), False),
    }
    folds_by_model = defaultdict(list)
    primary_oof = {}
    repeated = defaultdict(list)
    for model_name, estimator in candidates.items():
        for seed in SEEDS:
            probabilities = np.full(len(y), np.nan)
            splitter = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=seed)
            for fold, (train, test) in enumerate(splitter.split(X, y, groups=subjects), 1):
                if set(subjects[train]) & set(subjects[test]):
                    raise ValueError("Participant leakage across folds")
                fitted = clone(estimator).fit(X.iloc[train], y[train])
                probabilities[test] = fitted.predict_proba(X.iloc[test])[:, 1]
                folds_by_model[model_name].append({
                    "seed": seed, "fold": fold, "n_train": len(train), "n_test": len(test),
                    "n_acl_train": int(y[train].sum()), "n_acl_test": int(y[test].sum()),
                })
            if not np.isfinite(probabilities).all():
                raise ValueError("Missing held-out predictions")
            metrics = score(y, probabilities)
            repeated[model_name].append(metrics)
            if seed == 42:
                primary_oof[model_name] = {
                    "metrics": metrics,
                    "predictions": [{"subject": int(s), "target": int(t),
                                     "probability_acl_history": float(p)}
                                    for s, t, p in zip(subjects, y, probabilities)],
                }

    trained = clone(candidates["random_forest"]).fit(X, y)
    model_path = OUT / "random_forest_acl_history.joblib"
    joblib.dump({
        "pipeline": trained,
        "feature_names": list(X.columns),
        "target": "prior ACL injury history vs control group",
        "training_subjects": subjects.tolist(),
        "source_doi": "10.6084/m9.figshare.28890545.v1",
        "scope": "Experimental only; not future injury prediction and not integrated in KINETIQ.",
    }, model_path)

    results = {
        "scope": "Experimental classification of prior ACL injury history from lab-derived CMJ kinematics. Not future injury prediction, clinical risk estimation, video pose validation, or the KINETIQ production score.",
        "source": {
            "citation": "Calisti, M., Mohr, M. & Federolf, P. (2025). Motion capture data of six jump-landing, fatigued and non-fatigued, after anterior cruciate ligament injury. Scientific Data 12, 1645.",
            "doi": "10.6084/m9.figshare.28890545.v1",
            "license": "CC BY 4.0",
            "hashes_sha256": source_hashes,
        },
        "cohort": {
            "participants": len(y), "control": int(np.sum(y == 0)), "prior_acl": int(np.sum(y == 1)),
            "excluded_subject_ids": [5],
            "trials_per_participant": "Up to 3 non-fatigued CMJ trials; median feature values aggregate usable trials.",
            "usable_nonfatigued_trials_per_subject": per_subject,
            "missing_data_trials_in_source_sheet": 2,
            "missing_nonfatigued_trials_excluded": 1,
            "target_provenance": "ACL injured leg field: 0=control, 1/2=prior ACL group; cross-checked against the labeling sheet's group code (1=control, 2=ACL). Participant-log group numeric codes use the opposite mapping, so they were not used as the target.",
        },
        "feature_protocol": {
            "unit_of_analysis": "one aggregated row per participant",
            "task": "bilateral countermovement jump",
            "condition": "non-fatigued trials only",
            "window": "knee initial contact through 200 ms after contact, inclusive; source sampling 250 Hz; MATLAB one-based event indices converted to Python indices",
            "features": list(X.columns),
            "aggregation": "median across each participant's usable non-fatigued trials",
            "preprocessing": "Median imputation in each training fold; standardization only for logistic regression.",
        },
        "evaluation": {
            "protocol": "5-fold StratifiedGroupKFold with participant IDs as groups; one row per participant; 10 split seeds (42-51); fixed probability threshold 0.5; no hyperparameter or threshold tuning.",
            "primary_seed": 42,
            "interpretation": "Repeated CV estimates are exploratory split sensitivity on the same 43 participants, not independent validation or confidence intervals.",
            "models": {name: {
                "primary_oof_metrics": primary_oof[name]["metrics"],
                "repeat_split_summary": summarize(repeated[name]),
                "folds": folds_by_model[name],
            } for name in candidates},
            "primary_oof_predictions": {name: primary_oof[name]["predictions"] for name in candidates},
        },
        "final_model": {
            "artifact": model_path.name,
            "algorithm": "RandomForestClassifier(n_estimators=300, max_depth=3, min_samples_leaf=4, class_weight='balanced', random_state=42)",
            "fit_on": "all 43 participants after cross-validation; artifact is for isolated research only",
            "artifact_sha256": sha256(model_path),
        },
        "versions": {"python": platform.python_version(), "numpy": np.__version__,
                     "pandas": pd.__version__, "scipy": scipy.__version__,
                     "scikit_learn": sklearn.__version__},
    }
    if source_hashes != {str(p.relative_to(ROOT)): sha256(p)
                         for p in [MAT_FILE, LABEL_FILE, ANGLE_LABELS]}:
        raise ValueError("Source dataset changed during the experiment")
    (OUT / "results.json").write_text(json.dumps(results, indent=2, allow_nan=False), encoding="utf-8")
    print(json.dumps({name: results["evaluation"]["models"][name]["primary_oof_metrics"]
                      for name in candidates}, indent=2))
    print(f"Saved isolated fitted model: {model_path}")
    print(f"Saved results: {OUT / 'results.json'}")


if __name__ == "__main__":
    main()
