# Paired video and reference measurement template

Use this manifest to organize a movement-measurement evaluation. Each row represents one video trial paired with the corresponding lab-reference trial. It is a data collection template, not a clinical assessment form.

## Before collecting data

- Obtain the participant consent and institutional approval required for your setting before recording or using identifiable video or health-related information.
- Use a pseudonymous `participant_code`; keep any identity key separately in approved, access-controlled storage. Do not put names, contact details, or raw videos in Git.
- Confirm the video and reference system can be synchronized. Record how you synchronized them, then mark initial contact in both sources.
- Keep the task, instructions, warm-up, camera view, camera placement, and recording settings consistent across trials. Capture the full body, especially shoulders, hips, knees, and ankles.
- Record the reference method and angle definition. Lab joint angles may use a different coordinate/sign convention from KINETIQ's hip-knee-ankle angle, so document this before comparing values.

## Fields

| Field group | Fields | What to record |
|---|---|---|
| Identity and trial | `participant_code`, `session_code`, `task`, `trial_number`, `condition` | Pseudonymous participant/session codes, task such as `CMJ`, trial sequence, and condition such as `nonfatigued`. One participant may have multiple rows. |
| Video | `camera_view`, `video_filename`, `video_sha256`, `video_fps`, `video_width_px`, `video_height_px`, `camera_distance_m` | Recording view (`front`, `side`, or `oblique`), private-storage filename, checksum, and camera setup. Keep source video outside the repository. |
| Alignment | `synchronization_method`, `video_initial_contact_frame`, `reference_initial_contact_time_s`, `reference_window_end_time_s` | Synchronization method and matched initial-contact/event window. For the example CMJ protocol, the reference window can end 0.200 seconds after initial contact. |
| Reference | `reference_filename`, `reference_method`, `reference_sampling_rate_hz`, `reference_angle_definition`, and `reference_*_deg` | The matching lab file, capture method, rate, documented angle convention, and left/right knee angles at initial contact and the peak during the first 200 ms. Leave values blank if unavailable; do not estimate them. |
| Quality and consent | `video_qc_pass`, `reference_qc_pass`, `consent_confirmed`, `ethics_approval_reference`, `exclusion_reason` | Use `true`/`false`; explain exclusions. Store approval references without participant identity details. |
| KINETIQ output | `kinetiq_analysis_id`, `kinetiq_status`, `kinetiq_detection_rate`, `kinetiq_frames_with_pose`, `kinetiq_*_knee_angle_*`, `kinetiq_processing_time_s` | Record matched-event KINETIQ angles at initial contact and their peak in the 200 ms window, plus the app's existing video-level averages where available. Record `insufficient_data` as a result; do not convert it to a low-risk score. |

## Evaluation notes

1. Freeze the task, angle definitions, event window, quality rules, and metrics before looking at held-out results.
2. Keep all trials from one participant in the same split. Use participants held out from any development or tuning when reporting final measurement agreement.
3. Compare like with like: align timestamps and use the same event window and angle convention on both systems. KINETIQ's existing aggregate knee angles are computed over detected video frames; if the reference is event-specific, obtain per-frame KINETIQ angles or update the evaluator to calculate the matched event window before calculating error.
4. Report the number of participants and trials, mean absolute error in degrees, error spread, agreement across participants, pose-data coverage, and the share of clips returning `insufficient_data`. These describe measurement performance, not injury-prediction accuracy.
5. The downloaded Figshare CMJ dataset provides lab kinematics but not the participants' original video. It cannot populate the video columns or validate KINETIQ's pose extraction. Use this template with genuinely paired participant video and reference data.
