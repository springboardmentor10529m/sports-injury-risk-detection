# KINETIQ --- Project Context for AI Coding Assistants

> **Read this document completely before modifying the repository.**
>
> This file is a handoff document for GitHub Copilot or another coding
> agent. It combines the original internship/project specification with
> the implementation decisions, safeguards, experiments, and validated
> project state reached during development.
>
> Repository code is authoritative for exact implementation details.
> Where this document describes historical results or decisions, verify
> the current repository before changing anything.
>
> **Do not modify, stage, commit, push, merge, or deploy anything until
> you have inspected the repository and explained the current system
> back to the user.**

**Context date:** 30 September 2026\
**Project:** KINETIQ --- Sports Injury Risk Detection from Video\
**Repository:** `springboardmentor10529m/sports-injury-risk-detection`\
**User development branch:** `samitha-muthyala`\
**Critical Git rule:** Work only on the user's branch unless explicitly
instructed otherwise. **Do not push to or modify `main`.**

------------------------------------------------------------------------

## 1. Project purpose

KINETIQ is an AI-assisted sports analytics platform designed to analyze
athlete movement videos and estimate injury-related movement risk.

The original project specification describes a broad platform combining:

-   Video processing.
-   Pose estimation.
-   Joint/keypoint tracking.
-   Biomechanical analysis.
-   Movement-quality assessment.
-   Movement anomaly detection.
-   Injury-risk scoring/prediction.
-   Fatigue/workload concepts.
-   Corrective recommendations.
-   Role-specific dashboards.
-   Reports/alerts.

The intended users include:

-   Athlete.
-   Coach.
-   Physiotherapist.
-   Sports Scientist.
-   Administrator.

The current implemented demo must be described more carefully than the
broad original vision.

The validated video pipeline is primarily:

**Athlete video → frame processing → MediaPipe pose extraction →
biomechanical/movement features → transparent scoring logic → 0--100
risk result / insufficient-data result → dashboard/history workflow**

Do not automatically describe the current video pipeline as a clinically
validated injury prediction model.

------------------------------------------------------------------------

## 2. Important distinction: specification vs implemented system

The original project document proposed many technologies and modules,
including PostgreSQL, MongoDB, YOLOv8, TensorFlow/PyTorch, XGBoost,
OpenPose, MoveNet, Detectron2, DeepSORT, cloud deployment, and broad
injury-category prediction.

Do **not** assume every technology or module listed in the specification
is actually implemented.

Inspect the repository first.

The development effort intentionally converged on a smaller,
demonstrable end-to-end workflow rather than fabricating capabilities
simply to match the broad specification.

Current core video analysis is based on **MediaPipe pose + transparent
biomechanical/movement scoring**, with safeguards for poor-quality
videos.

A separate Random Forest/workload experiment exists as experimental ML
research and is **not automatically part of the production video
pipeline**.

Do not silently integrate experimental models into the main application.

------------------------------------------------------------------------

## 3. Repository / Git rules

Repository:

`springboardmentor10529m/sports-injury-risk-detection`

User branch:

`samitha-muthyala`

Historical validated commit:

`370ee0c` --- `Fix video analysis scoring and pose quality safeguards`

That checkpoint reportedly changed 13 files and was kept on the user's
branch rather than pushed to main.

### Mandatory rule for coding agents

Before any work:

1.  Run/inspect `git status`.
2.  Confirm current branch.
3.  Confirm whether there are uncommitted changes.
4.  Inspect recent commits.
5.  Do not checkout/merge/rebase/push `main`.
6.  Do not overwrite mentor/team work.
7.  Do not force-push.
8.  Do not stage/commit/push unless the user explicitly asks.

If current Git state differs from this historical context, report it
before changing anything.

------------------------------------------------------------------------

## 4. Application architecture

### Frontend

The project uses:

-   React.
-   Vite.
-   React Router.
-   Role-specific dashboards.

Known roles/screens include:

-   Athlete.
-   Coach.
-   Physiotherapist.
-   Sports Scientist.
-   Administrator.

The application has included flows/components for:

-   Home/landing.
-   Role selection.
-   Registration/login.
-   Dashboard.
-   Athlete video upload.
-   Analysis/results/history-oriented UI.
-   Role-specific dashboard views.

Do not redesign the frontend simply because the UI could be improved.
Preserve the end-to-end demo unless a real blocker is identified.

### Backend

Backend is FastAPI/Python.

Known dependency direction has included:

-   `fastapi`
-   `uvicorn[standard]`
-   `python-multipart`
-   `python-jose[cryptography]`
-   `passlib[bcrypt]`
-   `sqlalchemy`
-   `python-dotenv`
-   `pydantic[email]`

The backend exposes health/API/upload functionality and later
development connected uploaded videos to the analysis pipeline.

Historical local endpoints included:

-   `/api/health`
-   upload/analysis-related API routes
-   Swagger/OpenAPI docs via `/docs`

Inspect current routes rather than assuming old route names remain
unchanged.

### Local development

Historical development used:

-   Backend around `127.0.0.1:8000`
-   Frontend around `localhost:5173`

Inspect scripts/config before using these values as authoritative.

------------------------------------------------------------------------

## 5. Original target workflow

The internship specification described:

**Video upload → video preprocessing/frame extraction → pose
estimation/skeleton tracking → biomechanical analysis → movement anomaly
assessment → risk scoring/prediction → recommendations →
dashboards/reports/alerts**

The broad specification includes biomechanical concepts such as:

-   Joint angles.
-   Range of motion.
-   Movement symmetry.
-   Knee valgus.
-   Hip stability.
-   Trunk lean.
-   Landing mechanics.
-   Stride length.
-   Joint alignment.
-   Balance.

It also describes risk concepts such as:

-   ACL risk.
-   Hamstring risk.
-   Ankle sprain risk.
-   Shoulder risk.
-   Lower-back risk.
-   Overuse risk.

Do not claim every listed biomechanical metric or injury category is
currently implemented. Verify code.

------------------------------------------------------------------------

## 6. Current video/AI pipeline

The current demonstrable AI portion was deliberately kept interpretable.

High-level pipeline:

1.  Athlete uploads a supported movement video.
2.  Backend validates/opens the video.
3.  Video is processed frame by frame.
4.  MediaPipe pose estimates body landmarks.
5.  Frames with usable pose data are retained.
6.  Required landmarks/geometry are used to derive
    movement/biomechanical features.
7.  Movement behavior is aggregated across valid frames.
8.  Transparent scoring logic converts observed movement features into a
    risk score.
9.  Pose-quality/data-sufficiency checks determine whether the system
    has enough evidence to produce a result.
10. If data is insufficient, the pipeline returns **insufficient data**
    instead of fabricating a risk score.
11. If sufficient, a 0--100 risk score and category are returned to the
    application.
12. Result is displayed in the athlete workflow/dashboard/history.

Do not describe the MediaPipe pipeline as a black-box trained injury
classifier unless the code actually changes to one.

------------------------------------------------------------------------

## 7. Pose estimation

MediaPipe is used for the current pose-estimation path.

Important implementation principle:

-   Pose state must be fresh for each upload/analysis.
-   Do not accidentally reuse tracking state from a previous
    athlete/video.

A previous safeguard explicitly required **fresh MediaPipe state per
upload**.

This prevents one upload's tracking state/timestamps from contaminating
another analysis.

Do not "optimize" by making a single global pose tracker persistent
across unrelated uploads unless carefully designed and validated.

------------------------------------------------------------------------

## 8. Pose/data-quality safeguards

One of the most important fixes made near the end of the project was to
avoid confident-looking results when the video does not contain enough
reliable pose information.

Historical validated safeguard:

-   At least **10 valid frames**.
-   At least **50% valid-frame coverage**.
-   Required pose coverage based on **8 landmarks**.

If those conditions are not met, return/propagate an
**insufficient_data** result rather than a normal injury-risk score.

This safeguard is important for cases such as:

-   No person in video.
-   Person mostly outside frame.
-   Severe occlusion.
-   Poor pose detection.
-   Too few usable frames.
-   Extremely short/invalid movement sample.

Do not weaken or remove the insufficient-data behavior simply to make
every upload return a score.

Before changing exact thresholds, inspect the current
implementation/tests.

------------------------------------------------------------------------

## 9. Risk score and categories

Historical risk bins used in the validated implementation:

-   **LOW:** `[0, 35]`
-   **MODERATE:** `(35, 60]`
-   **HIGH:** `(60, 80]`
-   **CRITICAL:** `(80, 100]`

These boundaries were specifically completed/fixed so the entire 0--100
range has deterministic classification.

Do not introduce gaps/overlaps in category boundaries.

If the code currently differs, report the discrepancy before changing
it.

------------------------------------------------------------------------

## 10. Scoring philosophy

The original specification proposed a weighted injury-risk model:

-   Biomechanical deviations --- **35%**
-   Historical injury factors --- **20%**
-   Movement asymmetry --- **20%**
-   Training-load indicators --- **15%**
-   Fatigue indicators --- **10%**

However, the current video demo should not pretend that all five
components are necessarily populated from validated real data.

The current video pipeline primarily derives movement/pose/biomechanical
evidence from the uploaded video.

Historical injury, workload, and fatigue inputs must only contribute if
the actual application/data path genuinely provides them.

Do not invent missing athlete history, training load, fatigue, or injury
labels.

Do not fabricate model inputs just to satisfy the original formula.

------------------------------------------------------------------------

## 11. Movement / zero-value safeguard

A prior bug/safeguard involved legitimate zero movement/fatigue-like
values.

A valid computed zero must not automatically be treated as missing/false
simply because Python/JavaScript considers `0` falsy.

Preserve explicit `None`/missing checks where appropriate.

Do not replace them with truthiness checks that turn a legitimate zero
into missing data.

------------------------------------------------------------------------

## 12. Risk calculation behavior

The scoring system is intended to be understandable enough for a
mentor/demo explanation.

A suitable conceptual explanation is:

**Pose landmarks → joint/movement measurements →
deviations/asymmetry/movement behavior → normalized component scores →
weighted/aggregated 0--100 risk score → category**

Do not claim medical diagnosis.

The risk output should be presented as an estimate based on observed
movement/available project inputs.

The system is an educational/project sports analytics tool, not a
substitute for clinical assessment.

------------------------------------------------------------------------

## 13. No-person / poor-video behavior

A validated demo case used a video without a usable person/pose and
produced **insufficient_data** rather than an arbitrary LOW/HIGH score.

This is expected behavior.

If future changes cause a no-person video to return a normal injury-risk
category, treat that as a regression unless requirements explicitly
change.

------------------------------------------------------------------------

## 14. Per-upload state reset

Each video analysis should start cleanly.

Important state to review/reset per upload includes:

-   Pose/tracker state.
-   Frame counters.
-   Valid-frame counters.
-   Timestamps/timing state.
-   Movement accumulators.
-   Landmark history.
-   Feature accumulators.
-   Scoring state.

Do not allow data from a prior athlete/video to affect the next upload.

------------------------------------------------------------------------

## 15. Notifications must not break analysis

A secondary notification/alert failure should not convert an otherwise
successful video analysis into an analysis failure.

The core analysis result should remain available even if a non-critical
notification mechanism fails.

Preserve this separation unless current code intentionally differs.

------------------------------------------------------------------------

## 16. Experimental workload ML

A separate machine-learning experiment was conducted around
workload/injury-related tabular data.

This experiment is **separate from the MediaPipe video risk pipeline**.

Do not tell users/mentors that the Random Forest is currently predicting
the video result unless repository code explicitly integrates it.

The purpose of the experiment was to evaluate whether available
workload/tabular datasets could support a meaningful injury-related ML
component.

### Competitive-runners dataset: verified source and label

The CSV files `day_approach_maskedID_timeseries.csv` and
`week_approach_maskedID_timeseries.csv` come from the competitive-runners
study by L\u00f6vdal, den Hartigh, and Azzopardi (2021), *Injury Prediction in
Competitive Runners With Machine Learning*, DOI
`10.1123/ijspp.2020-0518`. The dataset record is DataverseNL DOI
`10.34894/UWU9PV`.

The paper defines an injury event as a training-log flag meaning the runner
was unable to complete the scheduled session because of injury. Injury
events within three weeks of a preceding injury were filtered as the same
injury. Healthy event examples were required to be fully fit for three
weeks before and after the event. The study contains 74 runners and reports
583 injury events for the day approach and 575 for the week approach.

These are two separate event-level datasets and must not be joined into one
feature table. The day approach represents the seven days before the event
as seven ordered daily feature vectors (70 features; day 0 is the day
before the event). The week approach represents the prior three weeks with
weekly aggregate workload features and relative-volume features (69
features). The integer `Date` indexes the study timeline; rows are sampled
event examples, not a complete daily panel.

The local experiment keeps the approaches separate and uses athlete-held-out
GroupKFold, which tests generalization to runners absent from training. It is
not a reproduction of the paper's balanced bagged XGBoost evaluation, and
candidate ranking uses the same folds as metric reporting. Treat results as
exploratory and do not claim independent external or prospective deployment
validation. This workload experiment remains separate from the production
MediaPipe video-risk path.

------------------------------------------------------------------------

## 17. Experimental datasets

Historical experiment results recorded two datasets:

### Collegiate dataset

-   **200 rows**
-   Negative / positive: **186 / 14**
-   Positive share: **7.00%**
-   Publisher described the data as **synthetic**.

### Multimodal dataset

-   **5,430 rows**
-   Negative / positive: **5,160 / 270**
-   Positive share: **4.97%**

Both are highly imbalanced.

The experiment recorded confusion matrices, fold metrics/repeated split
variability, and reproducibility details in its report.

Do not hide the imbalance.

Do not claim clinical validity from these experiments.

Do not claim synthetic data represents real-world injury incidence.

------------------------------------------------------------------------

## 18. Experimental report

Historical report location:

`experiments/workload_20260907/REPORT.md`

The report was intended to include:

-   Dataset provenance.
-   Target definitions.
-   Row/class counts.
-   Fold-level metrics.
-   Confusion matrices.
-   Repeated-split variability.
-   Reproducibility details.

Before explaining exact experimental metrics, read the current report
rather than inventing values from memory.

------------------------------------------------------------------------

## 19. Dataset provenance / usage discipline

The original project specification referenced datasets such as:

-   Human3.6M.
-   MPII Human Pose.
-   COCO Keypoints.
-   SportsPose.
-   FIFA injury data/reference.

Later exploration also considered sports/biomechanics/workload datasets.

Critical rule:

**Pose/action datasets must not be treated as injury-labelled datasets
unless they genuinely contain valid injury targets.**

Do not fabricate injury labels from pose datasets.

Do not train a model to "predict injury" from labels that were
manufactured from pose deviations merely to produce accuracy numbers.

Separate:

-   Pose-estimation datasets.
-   Biomechanics/movement datasets.
-   Injury/workload-labelled datasets.

Document provenance and target meaning.

------------------------------------------------------------------------

## 20. Recommended dataset architecture

Historical project planning used a separation such as:

-   `data/raw/`
-   `data/processed/`
-   `scripts/`
-   experiment-specific output directories

Large raw datasets and generated model artifacts should generally not be
committed unless repository policy explicitly requires them.

Inspect `.gitignore` and existing repository conventions.

Do not add large datasets to Git casually.

------------------------------------------------------------------------

## 21. Random Forest experiment status

The Random Forest/workload work should be treated as:

**experimental research / validation work**

and not as:

**the main production injury-risk engine**

unless the repository now explicitly integrates it.

This distinction is critical for mentor explanations.

Current demo story:

> Video analysis uses MediaPipe pose and transparent
> movement/biomechanical scoring.

Separate research story:

> We also evaluated a tabular ML approach on workload/injury-related
> datasets to understand whether a supervised model could complement the
> system, while documenting class imbalance and dataset limitations.

------------------------------------------------------------------------

## 22. Test checkpoint

Historical final backend/demo checkpoint:

-   **43 tests passed**

This was associated with the end-stage scoring/pose-quality safeguards.

Do not assume 43 remains the current count. Run the repository's current
tests.

Important regression areas include:

-   Complete 0--100 risk categories.
-   Minimum pose quality.
-   Insufficient-data behavior.
-   Fresh state per upload.
-   Valid zero values.
-   Notification failure isolation.
-   API response compatibility.
-   Registration/login/dashboard/upload/result/history workflow.

------------------------------------------------------------------------

## 23. Historical demo validation

A Docker/backend demo historically validated:

-   Athlete registration/login.
-   Video upload/analysis.
-   One video around **10.5 seconds**.
-   Another around **7.3 seconds**.
-   A normal test video produced a **HIGH** risk result.
-   A no-person video produced **insufficient_data**.
-   43 tests passed.

These are historical test/demo outcomes, not universal expected outputs.

Do not hard-code the system to reproduce HIGH risk for arbitrary videos.

------------------------------------------------------------------------

## 24. End-to-end workflow to preserve

For the athlete demo, verify:

**Registration → Login → Athlete Dashboard → Upload Video → Processing →
Analysis Result → History/dashboard state**

The exact current route names/UI may differ; inspect the app.

The user previously demonstrated only the athlete flow to the mentor
because a full role-by-role video would take too long.

Do not break the athlete flow while modifying experimental ML.

------------------------------------------------------------------------

## 25. Role dashboards

The broader application contains/targets dashboards for:

### Athlete

-   Injury-risk result.
-   Movement analysis.
-   Progress/history.
-   Recommendations/performance information.

### Coach

-   Team/athlete risk overview.
-   Performance/movement quality.
-   Training recommendations.

### Physiotherapist

-   Rehabilitation/risk monitoring.
-   Movement correction/recovery information.

### Sports Scientist

-   Biomechanical analytics.
-   Performance trends.
-   Injury-related insights/research-oriented information.

### Administrator

-   User/platform/system/report management concepts.

Some dashboard data may be demo/static/derived rather than fully backed
by production analytics. Verify before claiming live data.

------------------------------------------------------------------------

## 26. Corrective recommendations

The original specification includes exercise, mobility, strengthening,
recovery, and training-modification recommendations.

Do not make medical/clinical claims from generic recommendations.

If recommendations are rule-based/demo content, describe them as such.

Do not claim personalized medical treatment unless the system actually
has validated clinical logic---which this project should not assume.

------------------------------------------------------------------------

## 27. Original broad technology list

The project specification mentioned:

-   Python.
-   FastAPI.
-   React.
-   PostgreSQL.
-   MongoDB.
-   OpenCV.
-   YOLOv8.
-   MediaPipe.
-   TensorFlow.
-   PyTorch.
-   scikit-learn.
-   XGBoost.
-   Pandas.
-   NumPy.
-   OpenPose.
-   MoveNet.
-   Detectron2.
-   FFmpeg.
-   DeepSORT.
-   Plotly.
-   Matplotlib.
-   Chart.js.
-   Docker/Docker Compose.
-   AWS/Azure.
-   GitHub Actions.
-   Postman.

This is a **specification/tool direction**, not proof of implementation.

Never add dependencies solely so the repository appears to match the
original document.

Use the simplest validated implementation.

------------------------------------------------------------------------

## 28. Python / MediaPipe compatibility

During development, the user had Python **3.14.3**, and a requested
MediaPipe version such as `0.10.14` was not available/compatible in that
environment.

Do not blindly pin/install an old MediaPipe version without checking the
current environment and project setup.

Before dependency changes:

-   Inspect current Python version.
-   Inspect requirements/lockfiles.
-   Inspect Docker environment.
-   Preserve the environment that produced the validated demo unless
    there is a real issue.

------------------------------------------------------------------------

## 29. Docker

Docker was used for the validated backend/demo workflow.

Do not assume local host Python behavior and Docker behavior are
identical.

For changes to the AI pipeline, validate in the environment used for the
actual demo where practical.

Do not perform unnecessary deployment/cloud work merely because
AWS/Azure was mentioned in the original specification.

------------------------------------------------------------------------

## 30. Model/metric claim discipline

Do not claim:

-   "85% injury prevention accuracy" from a UI mockup.
-   Medical diagnostic accuracy without evidence.
-   Clinically validated injury prediction.
-   Injury prevention effectiveness.
-   Early-warning effectiveness unless actually evaluated.
-   Real-world generalization from synthetic/imbalanced experiments.
-   Random Forest performance without reading the experiment report.
-   That pose-estimation accuracy equals injury-prediction accuracy.

Keep separate:

1.  Pose detection quality.
2.  Biomechanical/movement feature logic.
3.  Risk scoring.
4.  Experimental supervised ML.
5.  Clinical injury outcomes.

------------------------------------------------------------------------

## 31. What to say to a mentor about the AI pipeline

A safe technical explanation:

> KINETIQ takes an athlete's movement video and processes it frame by
> frame. MediaPipe Pose extracts body landmarks from usable frames. From
> those landmarks, the system derives movement and biomechanical
> indicators such as joint geometry, symmetry/deviation and movement
> behavior. It aggregates those observations across the video and
> converts them into an interpretable 0--100 movement-related
> injury-risk score. Before producing a score, the pipeline checks
> whether enough reliable pose data was available. If fewer than the
> required valid frames or coverage are present, it returns insufficient
> data rather than fabricating a result. The score is then mapped to
> Low, Moderate, High or Critical risk. Separately, we experimented with
> a Random Forest on workload/injury-related tabular datasets, but that
> experiment is not presented as the model generating the current video
> risk score.

Before using this wording verbatim, verify the exact feature names in
current code.

------------------------------------------------------------------------

## 32. What not to do

Future coding assistants must not:

-   Push to `main`.
-   Merge main into the user's branch without approval.
-   Force-push.
-   Rewrite working frontend unnecessarily.
-   Replace the transparent scoring pipeline with a random model merely
    to say "ML".
-   Integrate the workload Random Forest into production without
    explicit approval.
-   Fabricate injury labels.
-   Treat pose datasets as injury datasets.
-   Remove insufficient-data safeguards.
-   Return a risk score for a no-person video merely for demo
    appearance.
-   Reuse MediaPipe/tracker state across independent uploads.
-   Turn valid zero values into missing data via truthiness bugs.
-   Let notification failure fail the analysis.
-   Hard-code a HIGH result.
-   Claim clinical/medical validation.
-   Claim unsupported accuracy percentages.
-   Add large datasets/model artifacts to Git without checking policy.
-   Change API contracts without checking frontend compatibility.
-   Add heavyweight dependencies just because they were listed in the
    project brief.
-   Deploy to AWS/Azure merely because the specification mentions cloud
    deployment.

------------------------------------------------------------------------

## 33. What to preserve

Preserve these project qualities:

-   Working athlete end-to-end demo.
-   React/FastAPI integration.
-   MediaPipe-based local/server-side video pose workflow as
    implemented.
-   Transparent scoring.
-   Full 0--100 risk-bin coverage.
-   Insufficient-data behavior.
-   Minimum pose-quality thresholds.
-   Fresh analysis state per upload.
-   Valid zero handling.
-   Notification isolation.
-   Focused regression tests.
-   Experimental-vs-production separation.
-   Honest dataset/model claims.
-   User branch isolation.

------------------------------------------------------------------------

## 34. Current engineering strategy

The project is near/end-stage rather than an open-ended research
rewrite.

Prefer:

**inspect → understand → reproduce tests → smallest fix → focused tests
→ verify end-to-end**

Avoid:

**redesign architecture → add many ML libraries → change frontend →
retrain speculative model → break demo**

If the user asks for a new research experiment, keep it isolated from
the working application unless explicit integration is requested.

------------------------------------------------------------------------

## 35. Immediate next steps for Copilot

On first use, Copilot should not code.

It should:

1.  Read this file.
2.  Inspect repository tree.
3.  Read README/docs.
4.  Confirm branch/status.
5.  Inspect current backend routes.
6.  Locate video analysis/MediaPipe pipeline.
7.  Locate risk scoring/category logic.
8.  Locate pose-quality/insufficient-data logic.
9.  Locate tests for safeguards.
10. Locate workload experiment/report.
11. Inspect frontend API contract and athlete workflow.
12. Inspect Docker setup.
13. Explain the current architecture back to the user.
14. Identify any discrepancy between this historical handoff and
    repository code.
15. Wait for approval.

------------------------------------------------------------------------

## 36. First prompt for GitHub Copilot Agent

Paste this into Copilot Agent:

> Read `docs/PROJECT_CONTEXT_FOR_AI.md` completely. Then inspect the
> entire KINETIQ repository enough to verify the current architecture.
> Read the README/docs, current Git status and branch, recent commits,
> backend routes, video-analysis/MediaPipe code, biomechanical/risk
> scoring logic, insufficient-data safeguards, tests, workload
> experiments/report, frontend API calls, athlete workflow, and Docker
> configuration.
>
> Do **not** modify, stage, commit, push, merge, rebase, install,
> retrain, or deploy anything yet.
>
> First explain back to me: 1. What KINETIQ currently does versus what
> the original project specification only proposed. 2. The complete
> athlete video-analysis pipeline from upload to risk result. 3. Which
> features are derived from MediaPipe/biomechanics. 4. How the 0--100
> risk score and categories are calculated in the actual code. 5.
> Exactly how pose quality and `insufficient_data` are handled. 6. How
> state is reset between uploads. 7. The role of
> fatigue/workload/history in the actual current pipeline. 8. What the
> Random Forest workload experiment does and whether it is integrated.
> 9. Dataset provenance/class balance and limitations visible in the
> experiment report. 10. Current tests/build/Docker status that you can
> verify. 11. Current frontend/backend API contract and athlete
> end-to-end workflow. 12. Current Git branch/status and whether my
> `samitha-muthyala` branch is clean. 13. Any differences between
> repository reality and `PROJECT_CONTEXT_FOR_AI.md`.
>
> Clearly separate repository-verified facts from historical context. Do
> not touch `main`. Wait for my approval before making any change.

------------------------------------------------------------------------

## 37. Final instruction to AI coding assistants

KINETIQ does not need to look more "AI-heavy" at the cost of
correctness.

The most important engineering behavior is that the system:

-   processes a real athlete video,
-   extracts usable pose information,
-   derives understandable movement evidence,
-   refuses to fabricate a result when pose data is inadequate,
-   returns a deterministic risk result when data is sufficient,
-   preserves the working application workflow,
-   and describes experimental ML honestly.

Do not sacrifice those properties simply to add another model, dataset,
framework, or accuracy number.
