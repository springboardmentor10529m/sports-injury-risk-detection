import json
import math


# Minimum visibility required before using a landmark.
MIN_VISIBILITY = 0.5


def landmark_is_visible(landmark):
    """
    Check whether a landmark has sufficient visibility.
    """

    if landmark is None:
        return False

    return landmark.get("visibility", 0) >= MIN_VISIBILITY


def calculate_angle(point_a, point_b, point_c):
    """
    Calculate the angle ABC in degrees.

    point_b is the joint whose angle we want to calculate.
    """

    if not all([
        landmark_is_visible(point_a),
        landmark_is_visible(point_b),
        landmark_is_visible(point_c),
    ]):
        return None

    vector_ba = {
        "x": point_a["x"] - point_b["x"],
        "y": point_a["y"] - point_b["y"],
        "z": point_a["z"] - point_b["z"],
    }

    vector_bc = {
        "x": point_c["x"] - point_b["x"],
        "y": point_c["y"] - point_b["y"],
        "z": point_c["z"] - point_b["z"],
    }

    dot_product = (
        vector_ba["x"] * vector_bc["x"]
        + vector_ba["y"] * vector_bc["y"]
        + vector_ba["z"] * vector_bc["z"]
    )

    magnitude_ba = math.sqrt(
        vector_ba["x"] ** 2
        + vector_ba["y"] ** 2
        + vector_ba["z"] ** 2
    )

    magnitude_bc = math.sqrt(
        vector_bc["x"] ** 2
        + vector_bc["y"] ** 2
        + vector_bc["z"] ** 2
    )

    if magnitude_ba == 0 or magnitude_bc == 0:
        return None

    cosine_angle = dot_product / (
        magnitude_ba * magnitude_bc
    )

    # Protect against small floating-point errors.
    cosine_angle = max(
        -1.0,
        min(1.0, cosine_angle)
    )

    angle = math.degrees(
        math.acos(cosine_angle)
    )

    return round(angle, 2)


def calculate_knee_angles(landmarks):
    """
    Calculate left and right knee angles.

    Hip -> Knee -> Ankle
    """

    left_knee_angle = calculate_angle(
        landmarks.get("left_hip"),
        landmarks.get("left_knee"),
        landmarks.get("left_ankle"),
    )

    right_knee_angle = calculate_angle(
        landmarks.get("right_hip"),
        landmarks.get("right_knee"),
        landmarks.get("right_ankle"),
    )

    return {
        "left_knee_angle": left_knee_angle,
        "right_knee_angle": right_knee_angle,
    }


def calculate_hip_angles(landmarks):
    """
    Calculate left and right hip angles.

    Shoulder -> Hip -> Knee
    """

    left_hip_angle = calculate_angle(
        landmarks.get("left_shoulder"),
        landmarks.get("left_hip"),
        landmarks.get("left_knee"),
    )

    right_hip_angle = calculate_angle(
        landmarks.get("right_shoulder"),
        landmarks.get("right_hip"),
        landmarks.get("right_knee"),
    )

    return {
        "left_hip_angle": left_hip_angle,
        "right_hip_angle": right_hip_angle,
    }


def calculate_knee_symmetry(knee_angles):
    """
    Calculate the difference between left and right knee angles.
    """

    left = knee_angles.get("left_knee_angle")
    right = knee_angles.get("right_knee_angle")

    if left is None or right is None:
        return None

    return round(abs(left - right), 2)


def calculate_trunk_lean(landmarks):
    """
    Estimate trunk lean using the midpoint between
    the shoulders and the midpoint between the hips.

    The result represents deviation from vertical
    in the 2D image plane.
    """

    required_landmarks = [
        "left_shoulder",
        "right_shoulder",
        "left_hip",
        "right_hip",
    ]

    if not all(
        landmark_is_visible(landmarks.get(name))
        for name in required_landmarks
    ):
        return None

    shoulder_x = (
        landmarks["left_shoulder"]["x"]
        + landmarks["right_shoulder"]["x"]
    ) / 2

    shoulder_y = (
        landmarks["left_shoulder"]["y"]
        + landmarks["right_shoulder"]["y"]
    ) / 2

    hip_x = (
        landmarks["left_hip"]["x"]
        + landmarks["right_hip"]["x"]
    ) / 2

    hip_y = (
        landmarks["left_hip"]["y"]
        + landmarks["right_hip"]["y"]
    ) / 2

    delta_x = shoulder_x - hip_x
    delta_y = shoulder_y - hip_y

    if delta_y == 0:
        return None

    lean_angle = math.degrees(
        math.atan2(
            abs(delta_x),
            abs(delta_y)
        )
    )

    return round(lean_angle, 2)


def analyze_frame(frame_data):
    """
    Calculate biomechanical features for one frame.
    """

    if not frame_data.get("pose_detected"):
        return None

    landmarks = frame_data.get("landmarks")

    if not landmarks:
        return None

    knee_angles = calculate_knee_angles(
        landmarks
    )

    hip_angles = calculate_hip_angles(
        landmarks
    )

    knee_symmetry = calculate_knee_symmetry(
        knee_angles
    )

    trunk_lean = calculate_trunk_lean(
        landmarks
    )    
    knee_alignment = calculate_knee_alignment(
    landmarks
    )    
    

    return {
        "frame_index": frame_data["frame_index"],
        "frame_file": frame_data["frame_file"],

        "knee_angles": knee_angles,

        "hip_angles": hip_angles,

        "knee_symmetry_difference": knee_symmetry,

        "trunk_lean_angle": trunk_lean,
        "knee_alignment": knee_alignment,
    }


def analyze_pose_file(pose_file):
    """
    Analyze all pose frames stored in a JSON file.
    """

    with open(
        pose_file,
        "r",
        encoding="utf-8"
    ) as file:

        pose_data = json.load(file)

    results = []

    for frame in pose_data:

        analysis = analyze_frame(frame)

        if analysis is not None:
            results.append(analysis)

    return results


def calculate_range_of_motion(values):
    """
    Calculate range of motion from a list of joint angles.
    """

    if not values:
        return None

    return round(
        max(values) - min(values),
        2
    )

def summarize_analysis_basic(results):
    """
    Generate basic biomechanical summary measurements
    without calculating anomaly or movement scores.
    """

    left_knee_angles = [
        result["knee_angles"]["left_knee_angle"]
        for result in results
        if result["knee_angles"]["left_knee_angle"] is not None
    ]

    right_knee_angles = [
        result["knee_angles"]["right_knee_angle"]
        for result in results
        if result["knee_angles"]["right_knee_angle"] is not None
    ]

    left_hip_angles = [
        result["hip_angles"]["left_hip_angle"]
        for result in results
        if result["hip_angles"]["left_hip_angle"] is not None
    ]

    right_hip_angles = [
        result["hip_angles"]["right_hip_angle"]
        for result in results
        if result["hip_angles"]["right_hip_angle"] is not None
    ]

    knee_symmetry_values = [
        result["knee_symmetry_difference"]
        for result in results
        if result["knee_symmetry_difference"] is not None
    ]

    trunk_lean_values = [
        result["trunk_lean_angle"]
        for result in results
        if result["trunk_lean_angle"] is not None
    ]

    left_knee_alignment_values = [
        result["knee_alignment"]["left_knee_alignment"]
        for result in results
        if result["knee_alignment"]["left_knee_alignment"] is not None
    ]

    right_knee_alignment_values = [
        result["knee_alignment"]["right_knee_alignment"]
        for result in results
        if result["knee_alignment"]["right_knee_alignment"] is not None
    ]

    anomaly_analysis = calculate_movement_anomaly(
        results
    )

    return {
        "frames_analyzed": len(results),

        "left_knee_rom": calculate_range_of_motion(
            left_knee_angles
        ),

        "right_knee_rom": calculate_range_of_motion(
            right_knee_angles
        ),

        "left_hip_rom": calculate_range_of_motion(
            left_hip_angles
        ),

        "right_hip_rom": calculate_range_of_motion(
            right_hip_angles
        ),

        "average_knee_symmetry_difference": (
            round(
                sum(knee_symmetry_values)
                / len(knee_symmetry_values),
                2
            )
            if knee_symmetry_values
            else None
        ),

        "maximum_trunk_lean": (
            round(
                max(trunk_lean_values),
                2
            )
            if trunk_lean_values
            else None
        ),

        "average_left_knee_alignment": (
            round(
                sum(left_knee_alignment_values)
                / len(left_knee_alignment_values),
                4
            )
            if left_knee_alignment_values
            else None
        ),

        "average_right_knee_alignment": (
            round(
                sum(right_knee_alignment_values)
                / len(right_knee_alignment_values),
                4
            )
            if right_knee_alignment_values
            else None
        ),

        "movement_anomaly_score": anomaly_analysis.get(
            "movement_anomaly_score",
            0
        ),
    }


def summarize_analysis(results):
    """
    Generate movement-level biomechanical features
    from frame-level analysis results.
    """

    left_knee_angles = [
        result["knee_angles"]["left_knee_angle"]
        for result in results
        if result["knee_angles"]["left_knee_angle"] is not None
    ]

    right_knee_angles = [
        result["knee_angles"]["right_knee_angle"]
        for result in results
        if result["knee_angles"]["right_knee_angle"] is not None
    ]

    left_hip_angles = [
        result["hip_angles"]["left_hip_angle"]
        for result in results
        if result["hip_angles"]["left_hip_angle"] is not None
    ]

    right_hip_angles = [
        result["hip_angles"]["right_hip_angle"]
        for result in results
        if result["hip_angles"]["right_hip_angle"] is not None
    ]

    knee_symmetry_values = [
        result["knee_symmetry_difference"]
        for result in results
        if result["knee_symmetry_difference"] is not None
    ]

    trunk_lean_values = [
        result["trunk_lean_angle"]
        for result in results
        if result["trunk_lean_angle"] is not None
    ]

    left_knee_alignment_values = [
        result["knee_alignment"]["left_knee_alignment"]
        for result in results
        if result["knee_alignment"]["left_knee_alignment"] is not None
    ]

    right_knee_alignment_values = [
        result["knee_alignment"]["right_knee_alignment"]
        for result in results
        if result["knee_alignment"]["right_knee_alignment"] is not None
    ]

    summary = {
        "frames_analyzed": len(results),

        "left_knee_rom": calculate_range_of_motion(
            left_knee_angles
        ),

        "right_knee_rom": calculate_range_of_motion(
            right_knee_angles
        ),

        "left_hip_rom": calculate_range_of_motion(
            left_hip_angles
        ),

        "right_hip_rom": calculate_range_of_motion(
            right_hip_angles
        ),

        "average_knee_symmetry_difference": (
            round(
                sum(knee_symmetry_values)
                / len(knee_symmetry_values),
                2
            )
            if knee_symmetry_values
            else None
        ),

        "maximum_trunk_lean": (
            round(
                max(trunk_lean_values),
                2
            )
            if trunk_lean_values
            else None
        ),

        "average_left_knee_alignment": (
            round(
                sum(left_knee_alignment_values)
                / len(left_knee_alignment_values),
                4
            )
            if left_knee_alignment_values
            else None
        ),

        "average_right_knee_alignment": (
            round(
                sum(right_knee_alignment_values)
                / len(right_knee_alignment_values),
                4
            )
            if right_knee_alignment_values
            else None
        ),
    }

    # -----------------------------
    # Movement Anomaly Analysis
    # -----------------------------

    anomaly_analysis = calculate_movement_anomaly(
        results
    )

    summary.update(
        anomaly_analysis
    )

    # -----------------------------
    # Overall Movement Scores
    # -----------------------------

    movement_scores = calculate_movement_scores(
        summary
    )

    summary.update(
        movement_scores
    )

        # -----------------------------
    # Early vs Late Movement Quality
    # -----------------------------

    if len(results) >= 4:

        split_point = len(results) // 2

        early_results = results[:split_point]
        late_results = results[split_point:]

        # Calculate biomechanical summary for early and late movement
        early_summary = summarize_analysis_basic(
            early_results
        )

        late_summary = summarize_analysis_basic(
            late_results
        )

        # Calculate movement quality using the same
        # biomechanical factors as the overall score
        early_movement_scores = calculate_movement_scores(
            early_summary
        )

        late_movement_scores = calculate_movement_scores(
            late_summary
        )

        summary[
            "early_movement_quality_score"
        ] = early_movement_scores.get(
            "movement_quality_score"
        )

        summary[
            "late_movement_quality_score"
        ] = late_movement_scores.get(
            "movement_quality_score"
        )

    else:

        summary[
            "early_movement_quality_score"
        ] = None

        summary[
            "late_movement_quality_score"
        ] = None

    return summary
def calculate_knee_alignment(landmarks):
    """
    Estimate knee alignment using the horizontal position
    of the knee relative to the hip and ankle.

    Positive/negative values indicate the direction of
    the knee deviation in the image plane.
    """

    left_hip = landmarks.get("left_hip")
    left_knee = landmarks.get("left_knee")
    left_ankle = landmarks.get("left_ankle")

    right_hip = landmarks.get("right_hip")
    right_knee = landmarks.get("right_knee")
    right_ankle = landmarks.get("right_ankle")

    left_alignment = None
    right_alignment = None

    if all([
        landmark_is_visible(left_hip),
        landmark_is_visible(left_knee),
        landmark_is_visible(left_ankle),
    ]):
        left_expected_x = (
            left_hip["x"] + left_ankle["x"]
        ) / 2

        left_alignment = round(
            left_knee["x"] - left_expected_x,
            4
        )

    if all([
        landmark_is_visible(right_hip),
        landmark_is_visible(right_knee),
        landmark_is_visible(right_ankle),
    ]):
        right_expected_x = (
            right_hip["x"] + right_ankle["x"]
        ) / 2

        right_alignment = round(
            right_knee["x"] - right_expected_x,
            4
        )

    return {
        "left_knee_alignment": left_alignment,
        "right_knee_alignment": right_alignment,
    }   

def calculate_movement_anomaly(results):
    """
    Detect sudden movement changes between consecutive frames.

    The score is based on changes in:
    - Knee symmetry
    - Trunk lean
    - Knee alignment

    Returns:
        dict containing anomaly score and anomaly count.
    """

    if len(results) < 2:
        return {
            "movement_anomaly_score": 0,
            "anomaly_count": 0,
        }

    anomaly_count = 0
    comparisons = 0

    for previous, current in zip(
        results,
        results[1:]
    ):

        frame_is_anomalous = False

        # Compare knee symmetry.
        previous_symmetry = previous.get(
            "knee_symmetry_difference"
        )

        current_symmetry = current.get(
            "knee_symmetry_difference"
        )

        if (
            previous_symmetry is not None
            and current_symmetry is not None
        ):

            symmetry_change = abs(
                current_symmetry -
                previous_symmetry
            )

            if symmetry_change > 10:
                frame_is_anomalous = True

        # Compare trunk lean.
        previous_trunk = previous.get(
            "trunk_lean_angle"
        )

        current_trunk = current.get(
            "trunk_lean_angle"
        )

        if (
            previous_trunk is not None
            and current_trunk is not None
        ):

            trunk_change = abs(
                current_trunk -
                previous_trunk
            )

            if trunk_change > 15:
                frame_is_anomalous = True

        # Compare left knee alignment.
        previous_left_alignment = (
            previous.get("knee_alignment", {})
            .get("left_knee_alignment")
        )

        current_left_alignment = (
            current.get("knee_alignment", {})
            .get("left_knee_alignment")
        )

        if (
            previous_left_alignment is not None
            and current_left_alignment is not None
        ):

            left_alignment_change = abs(
                current_left_alignment -
                previous_left_alignment
            )

            if left_alignment_change > 0.15:
                frame_is_anomalous = True

        # Compare right knee alignment.
        previous_right_alignment = (
            previous.get("knee_alignment", {})
            .get("right_knee_alignment")
        )

        current_right_alignment = (
            current.get("knee_alignment", {})
            .get("right_knee_alignment")
        )

        if (
            previous_right_alignment is not None
            and current_right_alignment is not None
        ):

            right_alignment_change = abs(
                current_right_alignment -
                previous_right_alignment
            )

            if right_alignment_change > 0.15:
                frame_is_anomalous = True

        comparisons += 1

        if frame_is_anomalous:
            anomaly_count += 1

    anomaly_percentage = (
        anomaly_count / comparisons
    ) * 100

    anomaly_score = min(
        round(anomaly_percentage),
        100
    )

    return {
        "movement_anomaly_score": anomaly_score,
        "anomaly_count": anomaly_count,
    }

def calculate_movement_scores(summary):
    """
    Calculate movement quality and biomechanical efficiency
    scores from the summarized biomechanical measurements.

    Scores range from 0 to 100.
    Higher scores indicate better movement characteristics.

    These are prototype analytical scores and are not
    clinical measurements.
    """

    # -----------------------------
    # Movement Quality Score
    # -----------------------------

    quality_penalty = 0

    knee_symmetry = summary.get(
        "average_knee_symmetry_difference"
    )

    if knee_symmetry is not None:

        if knee_symmetry > 10:
            quality_penalty += 30

        elif knee_symmetry > 5:
            quality_penalty += 15

    trunk_lean = summary.get(
        "maximum_trunk_lean"
    )

    if trunk_lean is not None:

        if trunk_lean > 20:
            quality_penalty += 30

        elif trunk_lean > 10:
            quality_penalty += 15

    left_alignment = abs(
        summary.get(
            "average_left_knee_alignment",
            0
        )
    )

    right_alignment = abs(
        summary.get(
            "average_right_knee_alignment",
            0
        )
    )

    maximum_alignment = max(
        left_alignment,
        right_alignment
    )

    if maximum_alignment > 0.15:
        quality_penalty += 20

    elif maximum_alignment > 0.08:
        quality_penalty += 10

    anomaly_score = summary.get(
        "movement_anomaly_score",
        0
    )

    quality_penalty += round(
        anomaly_score * 0.25
    )

    movement_quality_score = max(
        0,
        min(
            100,
            100 - quality_penalty
        )
    )

    # -----------------------------
    # Biomechanical Efficiency Score
    # -----------------------------

    efficiency_penalty = 0

    left_knee_rom = summary.get(
        "left_knee_rom"
    )

    right_knee_rom = summary.get(
        "right_knee_rom"
    )

    if (
        left_knee_rom is not None
        and right_knee_rom is not None
    ):

        knee_rom_difference = abs(
            left_knee_rom -
            right_knee_rom
        )

        if knee_rom_difference > 15:
            efficiency_penalty += 30

        elif knee_rom_difference > 10:
            efficiency_penalty += 20

        elif knee_rom_difference > 5:
            efficiency_penalty += 10

    left_hip_rom = summary.get(
        "left_hip_rom"
    )

    right_hip_rom = summary.get(
        "right_hip_rom"
    )

    if (
        left_hip_rom is not None
        and right_hip_rom is not None
    ):

        hip_rom_difference = abs(
            left_hip_rom -
            right_hip_rom
        )

        if hip_rom_difference > 15:
            efficiency_penalty += 20

        elif hip_rom_difference > 10:
            efficiency_penalty += 15

        elif hip_rom_difference > 5:
            efficiency_penalty += 10

    efficiency_penalty += round(
        anomaly_score * 0.25
    )

    biomechanical_efficiency_score = max(
        0,
        min(
            100,
            100 - efficiency_penalty
        )
    )

    return {
        "movement_quality_score":
            movement_quality_score,

        "biomechanical_efficiency_score":
            biomechanical_efficiency_score,
    }